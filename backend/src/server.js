import express from 'express';
import cors from 'cors';
import { db, initializeSchema, all, get } from './db.js';

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
    const { folderId, q } = req.query;
    const params = [];
    let sql = 'SELECT * FROM places';
    const where = [];
    if (folderId) { where.push('folder_id = ?'); params.push(folderId); }
    if (q) { where.push('(name_ca LIKE ? OR name_ja LIKE ? OR description_ca LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY name_ca';
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
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));


