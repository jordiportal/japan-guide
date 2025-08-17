import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initializeSchema, all, run } from './db.js';
import { findImageForPlace, downloadImage, searchOpenverse, searchGoogleCSE } from './utils/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mediaDir = path.resolve(__dirname, '../../data/images');

async function pickImageUrl(place) {
  // Prioridad: Wikipedia -> Openverse
  const fromWiki = await findImageForPlace({ name_ca: place.name_ca, name_ja: place.name_ja });
  if (fromWiki) return fromWiki;
  const fromGoogle = await searchGoogleCSE(`${place.name_ca} ${place.name_ja || ''}`.trim());
  if (fromGoogle) return fromGoogle;
  const fromOv = await searchOpenverse(`${place.name_ca} ${place.name_ja || ''}`.trim());
  return fromOv;
}

async function processBatch(limit = 20) {
  const places = await all(db, `SELECT * FROM places WHERE (local_image_path IS NULL OR local_image_path = '') LIMIT ?`, [limit]);
  for (const p of places) {
    try {
      const url = await pickImageUrl(p);
      if (!url) continue;
      const local = await downloadImage(url, mediaDir, `place_${p.id}`);
      if (local) {
        await run(db, `UPDATE places SET local_image_path = ?, image_url = COALESCE(image_url, ?) , updated_at = datetime('now') WHERE id = ?`, [local, url, p.id]);
        console.log(`Saved image for #${p.id}: ${local}`);
      }
    } catch (e) {
      console.warn(`Image fetch failed for #${p.id}:`, e.message);
    }
  }
}

(async () => {
  initializeSchema();
  const iterations = Number(process.argv[2] || 5);
  for (let i = 0; i < iterations; i++) {
    await processBatch(30);
  }
  process.exit(0);
})();


