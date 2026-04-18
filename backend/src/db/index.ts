import initSqlJs, { Database } from 'sql.js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

let db: Database | null = null;
const dbPath = path.join(import.meta.dir, '../../data/whatsapp.db');

export async function initDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  await mkdir(path.dirname(dbPath), { recursive: true });

  try {
    const data = await readFile(dbPath);
    db = new SQL.Database(data);
  } catch {
    db = new SQL.Database();
  }

  db.run(`
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

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      opencode_session_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const configCheck = db.exec("SELECT COUNT(*) as count FROM system_config WHERE key = 'system_prompt'");
  if (configCheck[0]?.values[0]?.[0] === 0) {
    db.run("INSERT INTO system_config (key, value) VALUES ('system_prompt', 'Eres un asistente útil y amigable. Responde de manera concisa.')");
    db.run("INSERT INTO system_config (key, value) VALUES ('whatsapp_connected', 'false')");
  }

  // Seed: bloquear números y IDs no deseados
  db.run("INSERT OR IGNORE INTO whitelist (phone, is_blacklist, enabled) VALUES ('status@broadcast', 1, 1)");
  // Seed: wildcard para bloquear todo por defecto
  db.run("INSERT OR IGNORE INTO whitelist (phone, is_blacklist, enabled) VALUES ('*', 1, 1)");
  saveDb();

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFile(dbPath, buffer).catch(console.error);
}

export function getWhitelist() {
  if (!db) return [];
  const result = db.exec('SELECT * FROM whitelist ORDER BY created_at DESC');
  if (!result[0]) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export function addToWhitelist(phone: string, prompt?: string, isBlacklist = 0) {
  if (!db) return { lastInsertRowid: 0, changes: 0 };
  db.run('INSERT INTO whitelist (phone, prompt, is_blacklist, enabled) VALUES (?, ?, ?, 1)', [phone, prompt || null, isBlacklist]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  return { lastInsertRowid: result[0]?.values[0]?.[0] || 0, changes: 1 };
}

export function updateWhitelistEntry(id: number, data: { phone?: string; prompt?: string; enabled?: boolean; is_blacklist?: boolean }) {
  if (!db) return { changes: 0 };
  
  const updates: string[] = [];
  const values: unknown[] = [];
  
  if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
  if (data.prompt !== undefined) { updates.push('prompt = ?'); values.push(data.prompt); }
  if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.is_blacklist !== undefined) { updates.push('is_blacklist = ?'); values.push(data.is_blacklist ? 1 : 0); }
  
  if (updates.length === 0) return { changes: 0 };
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  db.run(`UPDATE whitelist SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();
  return { changes: db.getRowsModified() };
}

export function deleteFromWhitelist(id: number) {
  if (!db) return { changes: 0 };
  db.run('DELETE FROM whitelist WHERE id = ?', [id]);
  saveDb();
  return { changes: db.getRowsModified() };
}

export function getConfig(key: string): string | null {
  if (!db) return null;
  const result = db.exec('SELECT value FROM system_config WHERE key = ?', [key]);
  return result[0]?.values[0]?.[0] as string || null;
}

export function setConfig(key: string, value: string) {
  if (!db) return;
  db.run('INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value]);
  saveDb();
}

export function logMessage(from: string, message: string, response?: string) {
  if (!db) return;
  db.run('INSERT INTO messages_log (from_number, message, response) VALUES (?, ?, ?)', [from, message, response || null]);
  saveDb();
}

export function getMessagesLog(limit = 50) {
  if (!db) return [];
  const result = db.exec('SELECT * FROM messages_log ORDER BY timestamp DESC LIMIT ?', [limit]);
  if (!result[0]) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export function getSessionByPhone(phone: string): { id: number; phone: string; opencode_session_id: string } | null {
  if (!db) return null;
  const result = db.exec('SELECT id, phone, opencode_session_id FROM sessions WHERE phone = ?', [phone]);
  if (!result[0] || !result[0].values[0]) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => obj[col] = row[i]);
  return obj as { id: number; phone: string; opencode_session_id: string };
}

export function createSession(phone: string, opencodeSessionId: string): { lastInsertRowid: number; changes: number } {
  if (!db) return { lastInsertRowid: 0, changes: 0 };
  // Usar INSERT OR REPLACE para actualizar si ya existe
  db.run('INSERT OR REPLACE INTO sessions (phone, opencode_session_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [phone, opencodeSessionId]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  return { lastInsertRowid: result[0]?.values[0]?.[0] || 0, changes: 1 };
}

export function updateSessionPhone(phone: string, opencodeSessionId: string): { changes: number } {
  if (!db) return { changes: 0 };
  db.run('UPDATE sessions SET opencode_session_id = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?', [opencodeSessionId, phone]);
  saveDb();
  return { changes: db.getRowsModified() };
}

export function deleteSession(phone: string): { changes: number } {
  if (!db) return { changes: 0 };
  db.run('DELETE FROM sessions WHERE phone = ?', [phone]);
  saveDb();
  return { changes: db.getRowsModified() };
}

/**
 * Limpia la base de datos para testing.
 */
export async function clearDb() {
  if (!db) return;
  db.run('DELETE FROM whitelist');
  db.run('DELETE FROM system_config');
  db.run('DELETE FROM messages_log');
  db.run('DELETE FROM sessions');
  saveDb();
}