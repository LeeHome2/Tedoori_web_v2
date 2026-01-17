import { loadEnv } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';

loadEnv();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function parseBool(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  const v = String(value).toLowerCase().trim();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'y') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'n') return false;
  return defaultValue;
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function appendJsonl(filePath, event) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}

function ensurePosix(p) {
  return p.replace(/\\/g, '/');
}

async function listFilesRecursively(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function toNumber(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = b;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function retry(fn, { retries, baseDelayMs, factor, onRetry }) {
  let attempt = 0;
  while (true) {
    try {
      return await fn(attempt);
    } catch (e) {
      attempt += 1;
      if (attempt > retries) throw e;
      const delay = Math.round(baseDelayMs * factor ** (attempt - 1));
      if (onRetry) onRetry({ attempt, delayMs: delay, error: e });
      await sleep(delay);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const bucket = String(args.bucket || process.env.TEDOORI_SUPABASE_BUCKET || 'project-images');
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const projectsRoot = path.join(outRoot, 'projects');
  const dryRun = parseBool(args.dryRun, false);
  const overwrite = parseBool(args.overwrite, true);
  const concurrency = args.concurrency ? Number(args.concurrency) : Number(process.env.TEDOORI_UPLOAD_CONCURRENCY || 3);
  const verifyChecksum = parseBool(args.verifyChecksum, true);
  const retries = toNumber(args.retries, Number(process.env.TEDOORI_UPLOAD_RETRIES || 3));
  const baseDelayMs = toNumber(args.baseDelayMs, Number(process.env.TEDOORI_UPLOAD_RETRY_BASE_DELAY_MS || 500));
  const retryFactor = toNumber(args.retryFactor, Number(process.env.TEDOORI_UPLOAD_RETRY_FACTOR || 2));
  const cacheControl = String(args.cacheControl || process.env.TEDOORI_UPLOAD_CACHE_CONTROL || '3600');
  const maxFiles = args.maxFiles ? Number(args.maxFiles) : undefined;
  const maxFileMb = toNumber(args.maxFileMb, Number(process.env.TEDOORI_UPLOAD_MAX_FILE_MB || 50));
  const verifyMaxMb = toNumber(args.verifyMaxMb, Number(process.env.TEDOORI_UPLOAD_VERIFY_MAX_MB || 20));
  const prefix = args.prefix ? String(args.prefix) : String(process.env.TEDOORI_UPLOAD_PREFIX || '');
  const webhookUrl = String(process.env.TEDOORI_UPLOAD_WEBHOOK_URL || '');

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files = await listFilesRecursively(projectsRoot);
  const uploadFiles = files
    .filter((f) => f.includes(`${path.sep}images${path.sep}optimized${path.sep}`))
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .sort((a, b) => a.localeCompare(b));
  const limitedFiles = maxFiles ? uploadFiles.slice(0, maxFiles) : uploadFiles;

  const limit = pLimit(concurrency);
  const mappings = [];
  const eventsPath = path.join(outRoot, '_scrape', 'upload-supabase.events.jsonl');

  const withSizes = await Promise.all(
    limitedFiles.map(async (filePath) => {
      const stat = await fs.stat(filePath);
      return { filePath, size: stat.size };
    })
  );
  const totalBytes = withSizes.reduce((acc, x) => acc + x.size, 0);
  let uploadedBytes = 0;
  let doneCount = 0;
  const startedAt = Date.now();

  await appendJsonl(eventsPath, {
    type: 'run_start',
    createdAt: new Date().toISOString(),
    bucket,
    dryRun,
    overwrite,
    verifyChecksum,
    retries,
    baseDelayMs,
    retryFactor,
    cacheControl,
    prefix,
    fileCount: withSizes.length,
    totalBytes,
  });

  await Promise.all(
    withSizes.map(({ filePath, size }) =>
      limit(async () => {
        const relToProjects = ensurePosix(path.relative(projectsRoot, filePath));
        const prefixClean = prefix ? String(prefix).replace(/^\/+|\/+$/g, '') : '';
        const storagePath = ensurePosix(path.posix.join(prefixClean ? `${prefixClean}` : '', 'projects', relToProjects));
        const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${storagePath}`;

        const fileInfo = {
          file: relToProjects,
          size,
          contentType: 'image/webp',
          storagePath,
          publicUrl,
        };

        if (size > maxFileMb * 1024 * 1024) {
          const rec = { ...fileInfo, uploaded: false, skipped: true, error: `file_too_large>${maxFileMb}MB` };
          mappings.push(rec);
          doneCount += 1;
          await appendJsonl(eventsPath, { type: 'file_skip', createdAt: new Date().toISOString(), ...rec });
          process.stdout.write(
            `[${doneCount}/${withSizes.length}] skip ${relToProjects} (${formatBytes(size)})\n`
          );
          return;
        }

        if (dryRun) {
          const body = await fs.readFile(filePath);
          const sha256 = sha256Buffer(body);
          const rec = { ...fileInfo, sha256, uploaded: false, dryRun: true };
          mappings.push(rec);
          doneCount += 1;
          await appendJsonl(eventsPath, { type: 'file_dry_run', createdAt: new Date().toISOString(), ...rec });
          process.stdout.write(
            `[${doneCount}/${withSizes.length}] dry-run ${relToProjects} (${formatBytes(size)})\n`
          );
          return;
        }

        const body = await fs.readFile(filePath);
        const sha256 = sha256Buffer(body);
        const started = Date.now();

        const res = await retry(
          async (attempt) => {
            const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
              contentType: 'image/webp',
              upsert: overwrite,
              cacheControl,
            });
            if (error) throw new Error(error.message);

            let verified = null;
            if (verifyChecksum) {
              if (size <= verifyMaxMb * 1024 * 1024) {
                const { data, error: dlErr } = await supabase.storage.from(bucket).download(storagePath);
                if (dlErr) throw new Error(dlErr.message);
                const ab = await data.arrayBuffer();
                const remoteHash = sha256Buffer(Buffer.from(ab));
                verified = remoteHash === sha256;
                if (!verified) throw new Error('checksum_mismatch');
              } else {
                verified = null;
              }
            }

            return { attempt, verified };
          },
          {
            retries,
            baseDelayMs,
            factor: retryFactor,
            onRetry: ({ attempt, delayMs, error }) => {
              appendJsonl(eventsPath, {
                type: 'file_retry',
                createdAt: new Date().toISOString(),
                file: relToProjects,
                attempt,
                delayMs,
                error: String(error?.message || error),
              }).catch(() => {});
            },
          }
        );

        const durationMs = Date.now() - started;
        const rec = {
          ...fileInfo,
          sha256,
          uploaded: true,
          verified: res.verified,
          retriesUsed: res.attempt,
          durationMs,
        };
        mappings.push(rec);

        uploadedBytes += size;
        doneCount += 1;

        const elapsedS = Math.max(0.001, (Date.now() - startedAt) / 1000);
        const rate = uploadedBytes / elapsedS;
        const pct = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 100;

        await appendJsonl(eventsPath, { type: 'file_done', createdAt: new Date().toISOString(), ...rec, pct });
        process.stdout.write(
          `[${doneCount}/${withSizes.length}] ok ${relToProjects} (${formatBytes(size)}) total ${pct}% @ ${formatBytes(rate)}/s\n`
        );
      })
    )
  );

  const summary = {
    bucket,
    dryRun,
    overwrite,
    verifyChecksum,
    retries,
    baseDelayMs,
    retryFactor,
    cacheControl,
    prefix,
    createdAt: new Date().toISOString(),
    count: mappings.length,
    totalBytes,
    uploadedBytes,
    succeeded: mappings.filter((m) => m.uploaded).length,
    failed: mappings.filter((m) => m.error).length,
    skipped: mappings.filter((m) => m.skipped).length,
    mappings,
  };

  await writeJson(path.join(outRoot, '_scrape', 'upload-supabase.json'), summary);
  await appendJsonl(eventsPath, {
    type: 'run_done',
    createdAt: new Date().toISOString(),
    ...summary,
  });

  if (!dryRun && webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'tedoori_upload_done',
          createdAt: summary.createdAt,
          bucket: summary.bucket,
          count: summary.count,
          succeeded: summary.succeeded,
          failed: summary.failed,
          skipped: summary.skipped,
          totalBytes: summary.totalBytes,
          uploadedBytes: summary.uploadedBytes,
        }),
      });
    } catch {
      // ignore
    }
  }

  process.stdout.write(`Prepared ${mappings.length} uploads\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
