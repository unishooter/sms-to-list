const CREATE_SMS_MESSAGES = `
  CREATE TABLE IF NOT EXISTS sms_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    message_sid TEXT,
    from_number TEXT,
    to_number   TEXT,
    body        TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parse_status TEXT,
    parse_error  TEXT
  )
`;

const CREATE_LISTS = `
  CREATE TABLE IF NOT EXISTS lists (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT UNIQUE,
    display_name TEXT,
    status       TEXT DEFAULT 'active',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME
  )
`;

const CREATE_LIST_ITEMS = `
  CREATE TABLE IF NOT EXISTS list_items (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id              INTEGER NOT NULL,
    item_name            TEXT NOT NULL,
    status               TEXT DEFAULT 'open',
    source_sms_message_id INTEGER,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME,
    completed_at         DATETIME,
    FOREIGN KEY (list_id) REFERENCES lists(id)
  )
`;

module.exports = { CREATE_SMS_MESSAGES, CREATE_LISTS, CREATE_LIST_ITEMS };
