import fetch from 'node-fetch';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

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



