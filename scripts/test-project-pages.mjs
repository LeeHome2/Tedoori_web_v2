const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${url}\n${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

async function run() {
  const sampleSize = Number(process.env.SAMPLE_SIZE || 5);
  const projects = await fetchJson(`${BASE_URL}/api/projects`);
  const sample = projects.slice(0, sampleSize);

  console.log(`Checking ${sample.length} project pages...`);

  for (const p of sample) {
    const pageUrl = `${BASE_URL}/projet/${encodeURIComponent(p.slug)}`;
    const res = await fetch(pageUrl);
    const html = await res.text();
    if (!res.ok) {
      console.error(`❌ ${p.slug} -> ${res.status}`);
      continue;
    }
    const hasTitle = html.includes(p.title);
    console.log(`✅ ${p.slug} -> 200${hasTitle ? '' : ' (title not found in HTML)'}`);
  }
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

