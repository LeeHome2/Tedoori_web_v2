import { loadEnv } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import SftpClient from 'ssh2-sftp-client';
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

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const projectsRoot = path.join(outRoot, 'projects');
  const dryRun = parseBool(args.dryRun, false);
  const overwrite = parseBool(args.overwrite, true);
  const concurrency = args.concurrency ? Number(args.concurrency) : Number(process.env.TEDOORI_UPLOAD_CONCURRENCY || 3);

  const host = String(process.env.SFTP_HOST || '');
  const port = Number(process.env.SFTP_PORT || 22);
  const username = String(process.env.SFTP_USERNAME || '');
  const password = process.env.SFTP_PASSWORD ? String(process.env.SFTP_PASSWORD) : undefined;
  const privateKeyPath = process.env.SFTP_PRIVATE_KEY_PATH ? String(process.env.SFTP_PRIVATE_KEY_PATH) : undefined;
  const remoteBase = String(process.env.SFTP_REMOTE_BASE || '/projects');
  const publicBaseUrl = process.env.SFTP_PUBLIC_BASE_URL ? String(process.env.SFTP_PUBLIC_BASE_URL).replace(/\/$/, '') : '';

  if (!host) throw new Error('Missing SFTP_HOST');
  if (!username) throw new Error('Missing SFTP_USERNAME');
  if (!password && !privateKeyPath) throw new Error('Provide SFTP_PASSWORD or SFTP_PRIVATE_KEY_PATH');

  const sftp = new SftpClient();
  const connectConfig = {
    host,
    port,
    username,
    ...(password ? { password } : {}),
    ...(privateKeyPath ? { privateKey: await fs.readFile(privateKeyPath, 'utf8') } : {}),
  };

  const files = await listFilesRecursively(projectsRoot);
  const uploadFiles = files.filter((f) => f.includes(`${path.sep}images${path.sep}optimized${path.sep}`));
  const limit = pLimit(concurrency);
  const mappings = [];

  if (!dryRun) {
    await sftp.connect(connectConfig);
  }

  try {
    await Promise.all(
      uploadFiles.map((localPath) =>
        limit(async () => {
          const relToProjects = ensurePosix(path.relative(projectsRoot, localPath));
          const remotePath = ensurePosix(path.posix.join(remoteBase, relToProjects));
          const remoteDir = remotePath.split('/').slice(0, -1).join('/');
          const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${relToProjects}` : '';

          if (dryRun) {
            mappings.push({ file: relToProjects, remotePath, publicUrl, uploaded: false });
            return;
          }

          await sftp.mkdir(remoteDir, true).catch(() => {});
          if (!overwrite) {
            const exists = await sftp.exists(remotePath);
            if (exists) {
              mappings.push({ file: relToProjects, remotePath, publicUrl, uploaded: false, skipped: true });
              return;
            }
          }

          await sftp.fastPut(localPath, remotePath);
          mappings.push({ file: relToProjects, remotePath, publicUrl, uploaded: true });
        })
      )
    );
  } finally {
    if (!dryRun) {
      await sftp.end();
    }
  }

  await writeJson(path.join(outRoot, '_scrape', 'upload-sftp.json'), {
    dryRun,
    overwrite,
    remoteBase,
    publicBaseUrl,
    createdAt: new Date().toISOString(),
    count: mappings.length,
    mappings,
  });

  process.stdout.write(`Prepared ${mappings.length} uploads\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
