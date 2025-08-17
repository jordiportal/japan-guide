import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { db, initializeSchema, all, get, run } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const app = express();
app.set('trust proxy', true);
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    callback(null, allowed);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

initializeSchema();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/media', express.static(path.resolve(__dirname, '../../data/images')));
const uploadDir = path.resolve(__dirname, '../../data/images');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    cb(null, `place_${req.params.id}.${ext}`);
  }
});
const upload = multer({ storage });

app.get('/__health', (req, res) => {
  res.json({ ok: true, cwd: process.cwd() });
});

app.get('/__routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      routes.push({ method: Object.keys(m.route.methods)[0]?.toUpperCase(), path: m.route.path });
    }
  });
  res.json(routes);
});

app.get('/api/folders', async (req, res) => {
  try {
    const rows = await all(db, 'SELECT id, name FROM folders ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const { folderId, q, tag } = req.query;
    const params = [];
    let sql = 'SELECT p.* FROM places p';
    const where = [];
    if (tag) { sql += ' JOIN place_tags pt ON pt.place_id = p.id JOIN tags t ON t.id = pt.tag_id'; where.push('t.name = ?'); params.push(String(tag)); }
    if (folderId) { where.push('p.folder_id = ?'); params.push(folderId); }
    if (q) { where.push('(p.name_ca LIKE ? OR p.name_ja LIKE ? OR p.description_ca LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY p.name_ca';
    const rows = await all(db, sql, params);
    const base = `${req.protocol}://${req.get('host')}`;
    const withImages = rows.map(r => ({
      ...r,
      image: r.local_image_path ? `${base}/media/${path.basename(r.local_image_path)}` : r.image_url || null,
    }));
    res.json(withImages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const row = await get(db, 'SELECT * FROM places WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const tags = await all(db, `SELECT t.* FROM tags t JOIN place_tags pt ON pt.tag_id = t.id WHERE pt.place_id = ? ORDER BY t.name`, [req.params.id]);
    const base = `${req.protocol}://${req.get('host')}`;
    const image = row.local_image_path ? `${base}/media/${path.basename(row.local_image_path)}` : row.image_url || null;
    res.json({ ...row, tags, image });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/places/:id', async (req, res) => {
  try {
    const { name_ca, description_ca } = req.body || {};
    if (!name_ca) return res.status(400).json({ error: 'name_ca required' });
    await run(db, `UPDATE places SET name_ca = ?, description_ca = ?, updated_at = datetime('now') WHERE id = ?`, [name_ca, description_ca || '', req.params.id]);
    const row = await get(db, 'SELECT * FROM places WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/places/:id/image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file required' });
    await run(db, `UPDATE places SET local_image_path = ?, updated_at = datetime('now') WHERE id = ?`, [file.path, req.params.id]);
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ ok: true, image: `${base}/media/${path.basename(file.path)}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/tags', async (req, res) => {
  try {
    const rows = await all(db, 'SELECT * FROM tags ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/places/:id/tags/:tagName', async (req, res) => {
  try {
    const tagName = decodeURIComponent(req.params.tagName);
    const color = req.body?.color || '#616161';
    const placeId = Number(req.params.id);
    const tag = await get(db, 'SELECT id FROM tags WHERE name = ?', [tagName]);
    const tagId = tag?.id ? tag.id : (await run(db, 'INSERT INTO tags(name, color) VALUES (?, ?)', [tagName, color])).lastID;
    await run(db, 'INSERT OR IGNORE INTO place_tags(place_id, tag_id) VALUES (?, ?)', [placeId, tagId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));


