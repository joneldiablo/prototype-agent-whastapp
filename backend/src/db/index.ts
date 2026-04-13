import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(import.meta.dir, '../../data/whatsapp.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    prompt TEXT,
    enabled INTEGER DEFAULT 1,
    is_blacklist INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_number TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const initConfig = db.prepare('INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)');
initConfig.run('system_prompt', 'Eres un asistente útil y amigable. Responde de manera concisa.');
initConfig.run('whatsapp_connected', 'false');

export default db;

export function getWhitelist() {
  return db.prepare('SELECT * FROM whitelist ORDER BY created_at DESC').all();
}

export function addToWhitelist(phone: string, prompt?: string) {
  const stmt = db.prepare('INSERT INTO whitelist (phone, prompt) VALUES (?, ?)');
  return stmt.run(phone, prompt || null);
}

export function updateWhitelistEntry(id: number, data: { phone?: string; prompt?: string; enabled?: boolean; is_blacklist?: boolean }) {
  const updates: string[] = [];
  const values: unknown[] = [];
  
  if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
  if (data.prompt !== undefined) { updates.push('prompt = ?'); values.push(data.prompt); }
  if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.is_blacklist !== undefined) { updates.push('is_blacklist = ?'); values.push(data.is_blacklist ? 1 : 0); }
  
  if (updates.length === 0) return { changes: 0 };
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  return db.prepare(`UPDATE whitelist SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteFromWhitelist(id: number) {
  return db.prepare('DELETE FROM whitelist WHERE id = ?').run(id);
}

export function getConfig(key: string): string | null {
  const row = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string) {
  return db.prepare('INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
}

export function logMessage(from: string, message: string, response?: string) {
  return db.prepare('INSERT INTO messages_log (from_number, message, response) VALUES (?, ?, ?)').run(from, message, response || null);
}

export function getMessagesLog(limit = 50) {
  return db.prepare('SELECT * FROM messages_log ORDER BY timestamp DESC LIMIT ?').all(limit);
}