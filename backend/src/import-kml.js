import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import sanitizeHtml from 'sanitize-html';
import { db, initializeSchema, run, get } from './db.js';
import { normalizeCatalanText, splitJaFromCa, ensureTitle } from './utils/text.js';
import { findImageForPlace } from './utils/images.js';

function parseCoordinates(coordStr) {
  const raw = coordStr.trim().split(',');
  const [lng, lat] = [parseFloat(raw[0]), parseFloat(raw[1])];
  return { lat, lng };
}

async function upsertFolder(name) {
  const existing = await get(db, 'SELECT id FROM folders WHERE name = ?', [name]);
  if (existing?.id) return existing.id;
  const res = await run(db, 'INSERT INTO folders(name) VALUES (?)', [name]);
  return res.lastID;
}

async function importPlacemark(folderId, placemark) {
  const nameRaw = placemark.name?.[0] || '';
  const descriptionRaw = placemark.description?.[0] || '';
  const descriptionClean = sanitizeHtml(descriptionRaw, { allowedTags: [], allowedAttributes: {} });
  const descriptionCa = normalizeCatalanText(descriptionClean);
  const { ca: nameCaBase, ja: nameJa } = splitJaFromCa(nameRaw);
  const name_ca = ensureTitle(nameCaBase || '', descriptionCa);
  const name_ja = nameJa || '';
  const coords = placemark.Point?.[0]?.coordinates?.[0] || '';
  if (!coords) return;
  const { lat, lng } = parseCoordinates(coords);

  let image_url = null;
  try {
    image_url = await findImageForPlace({ name_ca, name_ja });
  } catch {}

  await run(db,
    `INSERT INTO places (name_ca, name_ja, description_ca, description_ja, folder_id, latitude, longitude, image_url, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name_ca, name_ja, descriptionCa, '', folderId, lat, lng, image_url, 'kml']
  );
}

export async function importKml(filePath) {
  initializeSchema();
  const xml = fs.readFileSync(filePath, 'utf-8');
  const parser = new xml2js.Parser();
  const kml = await parser.parseStringPromise(xml);
  const document = kml.kml?.Document?.[0];
  const folders = document?.Folder || [];
  for (const folder of folders) {
    const folderName = folder.name?.[0] || 'Sense carpeta';
    const folderId = await upsertFolder(folderName);
    const placemarks = folder.Placemark || [];
    for (const placemark of placemarks) {
      await importPlacemark(folderId, placemark);
    }
  }
}

if (process.argv[1] && path.basename(process.argv[1]) === 'import-kml.js') {
  const target = process.argv[2] || path.resolve(process.cwd(), '../Mapa sense títol.kml.xml');
  importKml(target).then(() => {
    console.log('Importació completada');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}



