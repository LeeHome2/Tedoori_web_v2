import { loadEnv } from './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import robotsParser from 'robots-parser';
import * as cheerio from 'cheerio';
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

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, { userAgent }) {
  const res = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function isLikelyProjectUrl(url) {
  const pathname = url.pathname.toLowerCase();
  if (pathname.includes('/projet/') || pathname.includes('/project/')) return true;
  if (pathname.includes('/works/') || pathname.includes('/work/')) return true;
  if (pathname.includes('/portfolio/')) return true;
  if (pathname.startsWith('/entry/')) return true;
  return false;
}

function isSameOrigin(a, b) {
  return a.origin === b.origin;
}

function normalizeUrl(u) {
  const x = new URL(u.toString());
  x.hash = '';
  return x.toString();
}

function isSkippableUrl(u) {
  const pathname = u.pathname.toLowerCase();
  const ext = pathname.split('.').pop();
  if (ext && ['pdf', 'zip', 'css', 'js', 'ico'].includes(ext)) {
    return true;
  }
  return false;
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSrcset(srcset) {
  if (!srcset) return [];
  return srcset
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const [u, size] = part.split(/\s+/);
      const w = size && size.endsWith('w') ? Number(size.slice(0, -1)) : undefined;
      return { url: u, width: Number.isFinite(w) ? w : undefined };
    })
    .filter((x) => x.url);
}

function extractBackgroundImageUrls(styleValue) {
  if (!styleValue) return [];
  const matches = styleValue.match(/url\(([^)]+)\)/g) || [];
  return matches
    .map((m) => m.replace(/^url\(/, '').replace(/\)$/, '').trim())
    .map((u) => u.replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function pickBestByWidth(candidates) {
  const withW = candidates.filter((c) => Number.isFinite(c.width));
  if (withW.length === 0) return candidates[0] || null;
  withW.sort((a, b) => (b.width || 0) - (a.width || 0));
  return withW[0] || null;
}

function shortHash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 10);
}

function widthHintFromUrl(url) {
  const m1 = url.match(/\/R(\d+)x/i);
  if (m1) return Number(m1[1]);
  const m2 = url.match(/\/C(\d+)x/i);
  if (m2) return Number(m2[1]);
  return undefined;
}

function expandThumbFname(url) {
  try {
    const u = new URL(url);
    const fname = u.searchParams.get('fname');
    if (!fname) return [];
    const decoded = decodeURIComponent(fname);
    if (!decoded.startsWith('http')) return [];
    return [decoded];
  } catch {
    return [];
  }
}

function isThumbUrl(url) {
  return url.includes('daumcdn.net/thumb/') || url.includes('kakaocdn.net/thumb/');
}

function isLikelySmallThumb(url) {
  const w = widthHintFromUrl(url);
  if (w !== undefined && w < 600) return true;
  if (url.includes('/thumb/C')) return true;
  return false;
}

function pickSelectedGallery(images) {
  const enriched = images.map((x) => ({
    ...x,
    widthHint: x.width ?? widthHintFromUrl(x.url),
  }));

  const expanded = [];
  for (const img of enriched) {
    expanded.push(img);
    for (const original of expandThumbFname(img.url)) {
      expanded.push({
        url: original,
        type: `${img.type}:fname`,
        origin: new URL(original).origin,
        widthHint: widthHintFromUrl(original),
      });
    }
  }

  const dedup = new Map();
  for (const img of expanded) {
    const key = img.url;
    const prev = dedup.get(key);
    if (!prev) dedup.set(key, img);
    else {
      const pw = prev.widthHint ?? 0;
      const nw = img.widthHint ?? 0;
      if (nw > pw) dedup.set(key, img);
    }
  }

  const all = Array.from(dedup.values()).filter((x) => !isLikelySmallThumb(x.url));
  const nonThumb = all.filter((x) => !isThumbUrl(x.url));
  if (nonThumb.length > 0) return nonThumb;

  const byWidth = all
    .slice()
    .sort((a, b) => (b.widthHint ?? 0) - (a.widthHint ?? 0));
  return byWidth;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = ensureTrailingSlash(String(args.baseUrl || process.env.TEDOORI_BASE_URL || 'https://tedoori.net'));
  const outRoot = path.resolve(process.cwd(), String(args.outDir || process.env.TEDOORI_OUT_DIR || 'assets'));
  const scrapeDir = path.join(outRoot, '_scrape');
  const userAgent = String(
    args.userAgent ||
      process.env.TEDOORI_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  const force = Boolean(args.force || process.env.TEDOORI_FORCE === 'true');
  const limit = args.limit ? Number(args.limit) : undefined;
  const maxPages = args.maxPages ? Number(args.maxPages) : Number(process.env.TEDOORI_MAX_PAGES || 50);
  const maxDepth = args.maxDepth ? Number(args.maxDepth) : Number(process.env.TEDOORI_MAX_DEPTH || 2);
  const delayMs = args.delayMs ? Number(args.delayMs) : Number(process.env.TEDOORI_DELAY_MS || 250);
  const saveHtml = Boolean(args.saveHtml || process.env.TEDOORI_SAVE_HTML === 'true');
  const withImages = parseBool(args.withImages, true);
  const projectConcurrency = args.projectConcurrency ? Number(args.projectConcurrency) : Number(process.env.TEDOORI_PROJECT_CONCURRENCY || 3);
  const checkExternalRobots = parseBool(args.checkExternalRobots, true);

  const base = new URL(baseUrl);
  const robotsUrl = new URL('/robots.txt', base).toString();

  let robots;
  try {
    const { ok, text } = await fetchText(robotsUrl, { userAgent });
    robots = robotsParser(robotsUrl, ok ? text : '');
  } catch {
    robots = robotsParser(robotsUrl, '');
  }

  const homepageUrl = base.toString();
  if (!force && robots && !robots.isAllowed(homepageUrl, userAgent)) {
    throw new Error(`robots.txt disallows crawling: ${homepageUrl}`);
  }

  const robotsCache = new Map([[base.origin, robots]]);
  async function getRobotsForOrigin(origin) {
    const cached = robotsCache.get(origin);
    if (cached) return cached;
    const robotsUrl = `${origin}/robots.txt`;
    try {
      const { ok, text } = await fetchText(robotsUrl, { userAgent });
      const r = robotsParser(robotsUrl, ok ? text : '');
      robotsCache.set(origin, r);
      return r;
    } catch {
      const r = robotsParser(robotsUrl, '');
      robotsCache.set(origin, r);
      return r;
    }
  }

  const visited = new Set();
  const projectSet = new Set();
  const discovered = new Set();
  const queue = [{ url: homepageUrl, depth: 0 }];

  while (queue.length > 0) {
    if (visited.size >= maxPages) break;
    if (limit && projectSet.size >= limit) break;

    const { url, depth } = queue.shift();
    if (!url) break;

    const normalized = normalizeUrl(new URL(url));
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    if (!force && robots && !robots.isAllowed(normalized, userAgent)) continue;

    await sleep(delayMs);
    const { ok, status, text } = await fetchText(normalized, { userAgent });
    if (!ok) {
      process.stderr.write(`Skip ${status}: ${normalized}\n`);
      continue;
    }

    if (saveHtml && visited.size === 1) {
      await fs.mkdir(scrapeDir, { recursive: true });
      await fs.writeFile(path.join(scrapeDir, 'homepage.html'), text, 'utf8');
    }

    const $ = cheerio.load(text);
    const imgCount = $('img').length;
    const pageTitle = ($('title').first().text() || '').trim();
    const pageUrl = new URL(normalized);

    const isHome = pageUrl.pathname === '/';
    const isListing = pageUrl.pathname.toLowerCase().startsWith('/category/') || pageUrl.pathname.toLowerCase().startsWith('/tag/');

    if (!isHome && !isListing && (isLikelyProjectUrl(pageUrl) || (imgCount >= 3 && pageTitle.length > 0))) {
      projectSet.add(normalized);
    }

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const u = new URL(href, base);
        if (!isSameOrigin(u, base)) return;
        if (isSkippableUrl(u)) return;
        const nextUrl = normalizeUrl(u);
        discovered.add(nextUrl);
        if (depth + 1 <= maxDepth && !visited.has(nextUrl)) {
          queue.push({ url: nextUrl, depth: depth + 1 });
        }
      } catch {
        return;
      }
    });
  }

  const projectUrls = uniq(Array.from(projectSet)).slice(0, limit ?? projectSet.size);
  const projectLimit = pLimit(projectConcurrency);
  const projects = withImages
    ? await Promise.all(
        projectUrls.map((u) =>
          projectLimit(async () => {
            await sleep(delayMs);
            const { ok, status, text } = await fetchText(u, { userAgent });
            if (!ok) {
              return { url: u, error: `fetch_failed_${status}` };
            }

            const pageUrl = new URL(u);
            const $ = cheerio.load(text);

            const title =
              ($('meta[property="og:title"]').attr('content') || '').trim() ||
              ($('h1').first().text() || '').trim() ||
              ($('title').first().text() || '').trim();

            const slugFromPath = decodePathSegment(
              pageUrl.pathname
                .split('/')
                .filter(Boolean)
                .slice(-1)[0]
            );
            let slug = slugify(slugFromPath || title || pageUrl.pathname);
            if (!slug || slug.length < 3) {
              slug = `p-${shortHash(u)}`;
            }

            const candidates = [];

            const ogImage = ($('meta[property="og:image"]').attr('content') || '').trim();
            if (ogImage) candidates.push({ url: ogImage, type: 'og:image' });

            $('img').each((_, el) => {
              const src = ($(el).attr('src') || '').trim();
              if (src) candidates.push({ url: src, type: 'img:src' });
              const srcset = ($(el).attr('srcset') || '').trim();
              parseSrcset(srcset).forEach((x) => candidates.push({ url: x.url, type: 'img:srcset', width: x.width }));
            });

            $('source').each((_, el) => {
              const srcset = ($(el).attr('srcset') || '').trim();
              parseSrcset(srcset).forEach((x) => candidates.push({ url: x.url, type: 'source:srcset', width: x.width }));
            });

            $('[style]').each((_, el) => {
              const style = ($(el).attr('style') || '').trim();
              extractBackgroundImageUrls(style).forEach((x) => candidates.push({ url: x, type: 'css:bg' }));
            });

            const normalizedCandidates = candidates
              .map((c) => {
                try {
                  const abs = new URL(c.url, pageUrl).toString();
                  const origin = new URL(abs).origin;
                  return { ...c, url: abs, origin };
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
              .filter((c) => {
                try {
                  const cu = new URL(c.url);
                  if (!['http:', 'https:'].includes(cu.protocol)) return false;
                  if (isSkippableUrl(cu)) return false;
                  return true;
                } catch {
                  return false;
                }
              });

            const dedupMap = new Map();
            for (const c of normalizedCandidates) {
              const key = c.url;
              const prev = dedupMap.get(key);
              if (!prev) {
                dedupMap.set(key, c);
              } else {
                const prevW = prev.width || 0;
                const nextW = c.width || 0;
                if (nextW > prevW) dedupMap.set(key, c);
              }
            }

            const images = Array.from(dedupMap.values()).map((x) => ({ ...x, width: x.width ?? widthHintFromUrl(x.url) }));
            const selectedImages = pickSelectedGallery(images);

            return {
              url: u,
              slug,
              title,
              images,
              selectedImages,
            };
          })
        )
      )
    : [];
  const run = {
    baseUrl: base.toString(),
    userAgent,
    date: String(args.date || process.env.TEDOORI_DATE || nowYmd()),
    projectUrlCount: projectUrls.length,
    visitedPageCount: visited.size,
    discoveredUrlCount: discovered.size,
    withImages,
    projectConcurrency,
    generatedAt: new Date().toISOString(),
  };

  await writeJson(path.join(scrapeDir, 'run.json'), run);
  await writeJson(path.join(scrapeDir, 'project-urls.json'), projectUrls);
  await writeJson(path.join(scrapeDir, 'visited-urls.json'), Array.from(visited));
  if (withImages) {
    await writeJson(path.join(scrapeDir, 'projects.json'), projects);
  }

  process.stdout.write(`Collected ${projectUrls.length} project URLs\n`);
  process.stdout.write(`Output: ${path.relative(process.cwd(), scrapeDir)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.message || err}\n`);
  process.exit(1);
});
