import { loadEnv } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
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

function ensurePosix(p) {
  return p.replace(/\\/g, '/');
}

async function optimizeOne({ inputPath, outputPath, width, quality, overwrite }) {
  try {
    if (!overwrite) {
      await fs.access(outputPath);
      const meta = await sharp(outputPath).metadata();
      return { ok: true, width: meta.width || null, height: meta.height || null, skipped: true };
    }
  } catch {
    // continue
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const image = sharp(inputPath).rotate().resize({ width, withoutEnlargement: true });
  await image.webp({ quality }).toFile(outputPath);
  const meta = await sharp(outputPath).metadata();
  return { ok: true, width: meta.width || null, height: meta.height || null, skipped: false };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const projectsRoot = path.join(outRoot, 'projects');
  const overwrite = parseBool(args.overwrite, false);
  const concurrency = args.concurrency ? Number(args.concurrency) : Number(process.env.TEDOORI_OPTIMIZE_CONCURRENCY || 2);
  const quality = args.quality ? Number(args.quality) : Number(process.env.TEDOORI_WEBP_QUALITY || 82);
  const maxProjects = args.maxProjects ? Number(args.maxProjects) : undefined;

  const sizes = [
    { key: 'lg', width: 1920 },
    { key: 'md', width: 1280 },
    { key: 'sm', width: 640 },
  ];

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const projectDirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(projectsRoot, e.name));
  const limitedProjects = maxProjects ? projectDirs.slice(0, maxProjects) : projectDirs;
  const limit = pLimit(concurrency);

  for (const projDir of limitedProjects) {
    const infoPath = path.join(projDir, 'project_info.json');
    let info;
    try {
      info = await readJson(infoPath);
    } catch {
      continue;
    }

    const originals = Array.isArray(info?.images?.original) ? info.images.original : [];
    const optimized = { lg: [], md: [], sm: [] };

    const tasks = [];
    for (const original of originals) {
      const relFile = original.file;
      if (!relFile) continue;
      const inputPath = path.join(projDir, relFile);
      const baseName = path.basename(relFile, path.extname(relFile));

      for (const s of sizes) {
        const outRel = path.join('images', 'optimized', s.key, `${baseName}.webp`);
        const outputPath = path.join(projDir, outRel);
        tasks.push(
          limit(async () => {
            const r = await optimizeOne({ inputPath, outputPath, width: s.width, quality, overwrite });
            optimized[s.key].push({
              source: relFile,
              file: ensurePosix(outRel),
              width: r.width,
              height: r.height,
            });
          })
        );
      }
    }

    await Promise.all(tasks);

    info.images.optimized = optimized;
    await writeJson(infoPath, info);

    process.stdout.write(`Optimized ${path.basename(projDir)}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
