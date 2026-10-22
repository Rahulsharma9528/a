const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'library.db');
const db = new DatabaseSync(dbPath);

// Enable foreign key constraints
db.exec(`PRAGMA foreign_keys = ON;`);

// Create Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    publisher TEXT DEFAULT '',
    published_year INTEGER DEFAULT 2024,
    shelf_location TEXT DEFAULT 'General',
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Student',
    department TEXT DEFAULT 'General',
    status TEXT NOT NULL DEFAULT 'Active',
    max_books INTEGER NOT NULL DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'Issued',
    fine_amount REAL DEFAULT 0.0,
    fine_paid INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    renew_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper to log activities
function logActivity(action, details) {
  try {
    const stmt = db.prepare('INSERT INTO activity_logs (action, details) VALUES (?, ?)');
    stmt.run(action, details);
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

// Seed default settings if empty
const getSetting = (key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
};

const setSetting = (key, value) => {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
};

if (!getSetting('library_name')) {
  setSetting('library_name', 'Rahul Sharma & Mukesh Prajapati Library Management System');
  setSetting('fine_per_day', '1.00'); // $1 or ₹1 per day late
  setSetting('currency_symbol', '$');
  setSetting('default_loan_days', '14');
}

module.exports = {
  db,
  logActivity,
  getSetting,
  setSetting
};

