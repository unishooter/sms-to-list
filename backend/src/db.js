const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');
const { CREATE_SMS_MESSAGES, CREATE_LISTS, CREATE_LIST_ITEMS } = require('./schema');

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, '../data/sms-list.sqlite');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(CREATE_SMS_MESSAGES);
  db.exec(CREATE_LISTS);
  db.exec(CREATE_LIST_ITEMS);

  console.log(`Database ready: ${DB_PATH}`);
  return db;
}

module.exports = { getDb, initDb };
