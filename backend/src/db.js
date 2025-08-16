import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/places.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

sqlite3.verbose();
export const db = new sqlite3.Database(dbPath);

export function initializeSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ca TEXT NOT NULL,
      name_ja TEXT,
      description_ca TEXT,
      description_ja TEXT,
      folder_id INTEGER,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      image_url TEXT,
      source TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(folder_id) REFERENCES folders(id)
    );`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_places_folder ON places(folder_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_places_name_ca ON places(name_ca);`);

    db.run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS place_tags (
      place_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY(place_id, tag_id),
      FOREIGN KEY(place_id) REFERENCES places(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_place_tags_tag ON place_tags(tag_id);`);
  });
}

export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}



