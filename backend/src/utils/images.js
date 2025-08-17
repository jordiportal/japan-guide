import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const GOOGLE_CSE_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';

async function searchWikipedia(title) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageimages',
    format: 'json',
    piprop: 'thumbnail|original',
    pithumbsize: '640',
    generator: 'search',
    gsrlimit: '1',
    gsrsearch: title
  });
  const url = `${WIKI_API}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia request failed: ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages || {};
  const first = Object.values(pages)[0];
  return first?.thumbnail?.source || first?.original?.source || null;
}

export async function findImageForPlace({ name_ca, name_ja }) {
  const candidates = [name_ca, name_ja].filter(Boolean);
  for (const c of candidates) {
    try {
      const img = await searchWikipedia(c);
      if (img) return img;
    } catch {}
  }
  return null;
}

export async function downloadImage(url, destDir, filenameBase) {
  if (!url) return null;
  await fs.promises.mkdir(destDir, { recursive: true });
  const ext = (new URL(url).pathname.split('.').pop() || 'jpg').split('?')[0];
  const filename = `${filenameBase}.${ext}`.replace(/[^a-z0-9._-]/gi, '_');
  const dest = path.join(destDir, filename);
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
  return dest;
}

export async function searchOpenverse(query) {
  const endpoint = 'https://api.openverse.engineering/v1/images/';
  const url = `${endpoint}?q=${encodeURIComponent(query)}&page_size=1&license_type=all`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const first = data?.results?.[0];
  return first?.url || first?.thumbnail || null;
}

export async function searchGoogleCSE(query) {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;
  const params = new URLSearchParams({
    key,
    cx,
    q: query,
    searchType: 'image',
    num: '1',
    safe: 'active',
    imgSize: 'large',
  });
  const url = `${GOOGLE_CSE_ENDPOINT}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const item = data?.items?.[0];
  return item?.link || item?.image?.thumbnailLink || null;
}



