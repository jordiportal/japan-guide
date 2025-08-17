import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { db, initializeSchema, all, get, run } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
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
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const row = await get(db, 'SELECT * FROM places WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const tags = await all(db, `SELECT t.* FROM tags t JOIN place_tags pt ON pt.tag_id = t.id WHERE pt.place_id = ? ORDER BY t.name`, [req.params.id]);
    const image = row.local_image_path ? `/media/${path.basename(row.local_image_path)}` : row.image_url || null;
    res.json({ ...row, tags, image });
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


