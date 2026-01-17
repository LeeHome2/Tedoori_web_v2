import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

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

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

function ensurePosix(p) {
  return p.replace(/\\/g, '/');
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const projectsRoot = path.join(outRoot, 'projects');
  const concurrency = args.concurrency ? Number(args.concurrency) : 4;
  const limit = pLimit(concurrency);

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(projectsRoot, e.name));

  const issues = [];
  const summary = {
    projectCount: dirs.length,
    ok: 0,
    warn: 0,
    error: 0,
  };

  for (const dir of dirs) {
    const infoPath = path.join(dir, 'project_info.json');
    const exists = await fileExists(infoPath);
    if (!exists) {
      issues.push({ project: path.basename(dir), level: 'error', message: 'missing_project_info.json' });
      summary.error += 1;
      continue;
    }

    const info = await readJson(infoPath);
    const slug = info.slug || path.basename(dir);

    const originals = Array.isArray(info?.images?.original) ? info.images.original : [];
    if (originals.length === 0) {
      issues.push({ project: slug, level: 'warn', message: 'no_original_images' });
      summary.warn += 1;
      continue;
    }

    const optimized = info?.images?.optimized || {};
    const sizes = ['lg', 'md', 'sm'];

    const checks = [];
    for (const orig of originals) {
      const rel = orig.file;
      if (!rel) continue;
      const abs = path.join(dir, rel);
      checks.push(
        limit(async () => {
          const ok = await fileExists(abs);
          if (!ok) {
            issues.push({ project: slug, level: 'error', message: 'missing_original_file', file: ensurePosix(rel) });
            summary.error += 1;
            return;
          }
          const stat = await fs.stat(abs);
          if (stat.size === 0) {
            issues.push({ project: slug, level: 'error', message: 'empty_original_file', file: ensurePosix(rel) });
            summary.error += 1;
            return;
          }
        })
      );
    }

    for (const size of sizes) {
      const arr = Array.isArray(optimized[size]) ? optimized[size] : [];
      if (arr.length === 0) {
        issues.push({ project: slug, level: 'warn', message: `missing_optimized_${size}` });
        summary.warn += 1;
        continue;
      }

      for (const item of arr) {
        const rel = item.file;
        if (!rel) continue;
        const abs = path.join(dir, rel);
        checks.push(
          limit(async () => {
            const ok = await fileExists(abs);
            if (!ok) {
              issues.push({ project: slug, level: 'error', message: `missing_optimized_file_${size}`, file: ensurePosix(rel) });
              summary.error += 1;
              return;
            }
            const stat = await fs.stat(abs);
            if (stat.size === 0) {
              issues.push({ project: slug, level: 'error', message: `empty_optimized_file_${size}`, file: ensurePosix(rel) });
              summary.error += 1;
              return;
            }
            const meta = await sharp(abs).metadata().catch(() => null);
            if (!meta || !meta.width || !meta.height) {
              issues.push({ project: slug, level: 'warn', message: `cannot_read_dimensions_${size}`, file: ensurePosix(rel) });
              summary.warn += 1;
            }
          })
        );
      }
    }

    await Promise.all(checks);
    if (!issues.find((x) => x.project === slug && x.level === 'error')) {
      summary.ok += 1;
    }
  }

  const report = {
    createdAt: new Date().toISOString(),
    outRoot,
    summary,
    issues,
  };

  await fs.mkdir(path.join(outRoot, '_scrape'), { recursive: true });
  await fs.writeFile(path.join(outRoot, '_scrape', 'validate-assets.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log(`Projects: ${summary.projectCount}, OK: ${summary.ok}, Warn: ${summary.warn}, Error: ${summary.error}`);
  if (summary.error > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
