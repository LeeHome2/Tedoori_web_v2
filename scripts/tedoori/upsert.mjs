import { loadEnv } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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

function ensurePosix(p) {
  return p.replace(/\\/g, '/');
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function shortHash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 10);
}

function indexMappings(mappings) {
  const map = new Map();
  for (const m of mappings || []) {
    if (!m?.file || !m?.publicUrl) continue;
    map.set(ensurePosix(m.file), m.publicUrl);
  }
  return map;
}

function pickCoverUrl(info, publicUrlByFile) {
  const md = info?.images?.optimized?.md || [];
  const first = md[0];
  if (!first?.file) return null;
  const fileKey = ensurePosix(first.file);
  const fileKeyWithSlug = ensurePosix(`${info.slug}/${first.file}`);
  return publicUrlByFile.get(fileKeyWithSlug) || publicUrlByFile.get(fileKey) || null;
}

function buildGallery(info, publicUrlByFile) {
  const lg = info?.images?.optimized?.lg || [];
  const items = [];
  for (const img of lg) {
    const fileKey = ensurePosix(img.file);
    const fileKeyWithSlug = ensurePosix(`${info.slug}/${img.file}`);
    const publicUrl = publicUrlByFile.get(fileKeyWithSlug) || publicUrlByFile.get(fileKey);
    if (!publicUrl) continue;
    const idBase = path.basename(img.file, path.extname(img.file));
    items.push({
      type: 'image',
      id: `${info.slug}-${idBase}-${shortHash(publicUrl)}`,
      src: publicUrl,
      width: img.width || 1200,
      height: img.height || 800,
      alt: info.title || info.slug,
      visibility: 'public',
    });
  }
  return items;
}

function mergeGallery(existing, incoming) {
  const out = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(out.map((x) => (x && x.src ? x.src : '')));
  for (const item of incoming) {
    if (!item?.src) continue;
    if (seen.has(item.src)) continue;
    seen.add(item.src);
    out.push(item);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const projectsRoot = path.join(outRoot, 'projects');
  const scrapeRoot = path.join(outRoot, '_scrape');

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  const apply = parseBool(args.apply, false);
  const merge = parseBool(args.merge, false);
  const mappingFile = String(args.mapping || path.join(scrapeRoot, 'upload-supabase.json'));

  const mappingJson = await readJson(mappingFile);
  const publicUrlByFile = indexMappings(mappingJson.mappings);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingProjects, error: existingError } = await supabase
    .from('projects')
    .select('id, slug, display_order, gallery_images')
    .order('display_order', { ascending: true });

  if (existingError) throw new Error(existingError.message);

  const existingBySlug = new Map();
  for (const p of existingProjects || []) {
    existingBySlug.set(p.slug, p);
  }

  let maxOrder = (existingProjects || []).reduce((acc, p) => Math.max(acc, p.display_order ?? 0), 0);

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(projectsRoot, e.name));

  const planned = [];
  for (const dir of dirs) {
    const infoPath = path.join(dir, 'project_info.json');
    let info;
    try {
      info = await readJson(infoPath);
    } catch {
      continue;
    }

    if (!info?.slug || !info?.title) continue;

    const coverUrl = pickCoverUrl(info, publicUrlByFile);
    const gallery = buildGallery(info, publicUrlByFile);
    if (!coverUrl || gallery.length === 0) {
      planned.push({ slug: info.slug, title: info.title, status: 'skipped_missing_urls' });
      continue;
    }

    const existing = existingBySlug.get(info.slug);
    const id = existing?.id || info.slug;
    const display_order = existing ? existing.display_order : ++maxOrder;
    const gallery_images = merge && existing ? mergeGallery(existing.gallery_images, gallery) : gallery;

    planned.push({
      slug: info.slug,
      title: info.title,
      id,
      display_order,
      image_url: coverUrl,
      gallery_count: gallery_images.length,
      mode: existing ? 'update' : 'insert',
    });

    if (apply) {
      const { error } = await supabase.from('projects').upsert(
        {
          id,
          title: info.title,
          slug: info.slug,
          image_url: coverUrl,
          link: `/projet/${info.slug}`,
          details: info?.metadata?.details || {},
          gallery_images,
          is_visible: 'public',
          display_order,
        },
        { onConflict: 'slug' }
      );
      if (error) {
        planned[planned.length - 1].status = 'error';
        planned[planned.length - 1].error = error.message;
      } else {
        planned[planned.length - 1].status = 'applied';
      }
    } else {
      planned[planned.length - 1].status = 'dry_run';
    }
  }

  await writeJson(path.join(scrapeRoot, 'upsert-report.json'), {
    apply,
    merge,
    mappingFile: ensurePosix(mappingFile),
    createdAt: new Date().toISOString(),
    planned,
  });

  process.stdout.write(`Planned ${planned.length} projects\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
