import { loadEnv } from './env.mjs';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
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

function nowYmd() {
  const d = new Date();
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function normalizeKey(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

function shortHash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 10);
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function fileExtFromContentType(contentType) {
  const ct = (contentType || '').split(';')[0].trim().toLowerCase();
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  if (ct === 'image/svg+xml') return 'svg';
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const scrapeDir = path.join(outRoot, '_scrape');
  const projectRoot = path.join(outRoot, 'projects');
  const date = String(args.date || process.env.TEDOORI_DATE || nowYmd());
  const concurrency = args.concurrency ? Number(args.concurrency) : Number(process.env.TEDOORI_DOWNLOAD_CONCURRENCY || 3);
  const userAgent = String(
    args.userAgent ||
      process.env.TEDOORI_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  const dryRun = parseBool(args.dryRun, false);
  const maxProjects = args.maxProjects ? Number(args.maxProjects) : undefined;
  const maxImages = args.maxImages ? Number(args.maxImages) : undefined;

  const projects = await readJson(path.join(scrapeDir, 'projects.json'));
  const limitedProjects = maxProjects ? projects.slice(0, maxProjects) : projects;
  const limit = pLimit(concurrency);

  const run = {
    outRoot,
    date,
    concurrency,
    projectCount: limitedProjects.length,
    startedAt: new Date().toISOString(),
  };
  await writeJson(path.join(scrapeDir, 'download-run.json'), run);

  for (const project of limitedProjects) {
    const slug = project.slug || `p-${shortHash(project.url)}`;
    const title = project.title || slug;
    const projDir = path.join(projectRoot, slug);
    const originalDir = path.join(projDir, 'images', 'original');
    const infoPath = path.join(projDir, 'project_info.json');

    const images = Array.isArray(project.selectedImages) && project.selectedImages.length > 0 ? project.selectedImages : project.images || [];
    const unique = [];
    const seen = new Set();
    for (const img of images) {
      const u = typeof img === 'string' ? img : img.url;
      if (!u) continue;
      const key = normalizeKey(u);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(u);
    }
    const limitedImages = maxImages ? unique.slice(0, maxImages) : unique;

    const info = {
      slug,
      title,
      source: {
        pageUrl: project.url,
        scrapedAt: new Date().toISOString(),
      },
      metadata: {
        description: '',
        date: '',
        categories: [],
      },
      images: {
        original: [],
      },
    };

    const results = await Promise.all(
      limitedImages.map((u, index) =>
        limit(async () => {
          const tempName = `${slug}_${date}_${String(index + 1).padStart(2, '0')}`;
          if (dryRun) {
            return {
              ok: true,
              url: u,
              filePath: path.join(originalDir, `${tempName}.img`),
              contentType: null,
              skipped: true,
            };
          }

          const dl = await (async () => {
            const res = await fetch(u, {
              headers: {
                'user-agent': userAgent,
                accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
              },
              redirect: 'follow',
            });

            if (!res.ok) return { ok: false, status: res.status, error: `http_${res.status}` };
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.toLowerCase().startsWith('image/')) {
              return { ok: false, status: res.status, error: `not_image_${contentType}` };
            }
            if (!res.body) return { ok: false, status: res.status, error: 'no_body' };

            const ext = fileExtFromContentType(contentType) || 'img';
            const filePath = path.join(originalDir, `${tempName}.${ext}`);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            const nodeStream = Readable.fromWeb(res.body);
            await pipeline(nodeStream, createWriteStream(filePath));
            return { ok: true, status: res.status, contentType, filePath };
          })();

          return { ...dl, url: u };
        })
      )
    );

    const downloaded = results
      .filter((r) => r.ok)
      .map((r) => ({
        url: r.url,
        file: path.relative(projDir, r.filePath).replace(/\\/g, '/'),
        contentType: r.contentType || '',
      }));

    const failed = results
      .filter((r) => !r.ok)
      .map((r) => ({
        url: r.url,
        error: r.error || 'unknown',
        status: r.status || 0,
      }));

    info.images.original = downloaded;

    await fs.mkdir(projDir, { recursive: true });
    await writeJson(infoPath, info);
    await writeJson(path.join(projDir, 'download.json'), { downloaded, failed });

    process.stdout.write(`Downloaded ${downloaded.length}/${limitedImages.length} for ${slug}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
