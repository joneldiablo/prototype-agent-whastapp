/**
 * Pruebas del Database Module
 * 
 * @group db
 */

import { describe, expect, test, beforeEach, beforeAll } from 'bun:test';
import { initDb, getWhitelist, addToWhitelist, updateWhitelistEntry, deleteFromWhitelist, setConfig, getConfig, logMessage, getMessagesLog, getSessionByPhone, createSession, clearDb } from '../db/index';

describe('Database', () => {
  beforeAll(async () => {
    await initDb();
  });
  
  beforeEach(async () => {
    await clearDb();
  });

  describe('Whitelist', () => {
    test('addToWhitelist debe agregar entrada', async () => {
      const result = await addToWhitelist('+5215555555555', 'Hola');
      
      expect(result.lastInsertRowid).toBeGreaterThan(0);
      
      const whitelist = getWhitelist();
      const entry = whitelist.find(w => w.phone === '+5215555555555');
      
      expect(entry).toBeDefined();
      expect(entry?.prompt).toBe('Hola');
    });

    test('getWhitelist debe retornar array', () => {
      const whitelist = getWhitelist();
      
      expect(Array.isArray(whitelist)).toBe(true);
    });

    test('updateWhitelistEntry debe actualizar entrada', async () => {
      await addToWhitelist('+5215555555555', 'Hola');
      
      const whitelist = getWhitelist();
      const entry = whitelist[0];
      
      await updateWhitelistEntry(entry.id, { prompt: 'Hola actualizado' });
      
      const updated = getWhitelist()[0];
      expect(updated.prompt).toBe('Hola actualizado');
    });

    test('deleteFromWhitelist debe eliminar entrada', async () => {
      await addToWhitelist('+5215555555555', 'Hola');
      
      const whitelist = getWhitelist();
      const entry = whitelist[0];
      
      await deleteFromWhitelist(entry.id);
      
      const updated = getWhitelist();
      expect(updated.length).toBe(0);
    });
  });

  describe('Config', () => {
    test('setConfig y getConfig deben funcionar', () => {
      setConfig('test_key', 'test_value');
      
      const value = getConfig('test_key');
      
      expect(value).toBe('test_value');
    });

    test('getConfig debe retornar null para clave inexistente', () => {
      const value = getConfig('inexistente');
      
      expect(value).toBeNull();
    });
  });

  describe('Messages', () => {
    test('logMessage debe guardar mensaje', () => {
      logMessage('+5215555555555', 'Hola mundo', 'Hola back');
      
      const messages = getMessagesLog();
      
      expect(messages.length).toBe(1);
      expect(messages[0].message).toBe('Hola mundo');
    });

    test('getMessages debe filtrar por teléfono', () => {
      logMessage('+5215555555555', 'Mensaje 1', 'Respuesta 1');
      logMessage('+5215555555556', 'Mensaje 2', 'Respuesta 2');
      
      const messages = getMessagesLog();
      
      expect(messages.length).toBe(2);
    });
  });

  describe('Sessions', () => {
    test('createSession y getSessionByPhone deben funcionar', () => {
      createSession('+5215555555555', 'ses_test123');
      
      const session = getSessionByPhone('+5215555555555');
      
      expect(session).toBeDefined();
      expect(session?.opencode_session_id).toBe('ses_test123');
    });

    test('getSessionByPhone debe retornar null para teléfono inexistente', () => {
      const session = getSessionByPhone('+5219999999999');
      
      expect(session).toBeNull();
    });
  });
});