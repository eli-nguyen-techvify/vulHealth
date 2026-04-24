const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'vulhealth.db');
const SEED_PATH = path.join(__dirname, '..', 'seed.sql');

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function init() {
  const row = await get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (row) {
    console.log('[db] already initialized');
    return;
  }
  console.log('[db] seeding database from seed.sql');
  const sql = fs.readFileSync(SEED_PATH, 'utf-8');
  await exec(sql);
  console.log('[db] seed complete');
}

module.exports = { db, run, get, all, exec, init };
