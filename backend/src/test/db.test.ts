/**
 * Pruebas del Database Module
 * 
 * @group db
 */

import { describe, expect, test, beforeEach, beforeAll } from 'bun:test';
import { initDb, getWhitelist, addToWhitelist, updateWhitelistEntry, deleteFromWhitelist, setConfig, getConfig, logMessage, getMessagesLog, getSessionByPhone, createSession, deleteSession, clearDb, getUserPermissions, updateUserPermissions } from '../db/index';

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

    test('createSession con INSERT OR REPLACE debe actualizar si existe', () => {
      createSession('+5215555555555', 'ses_test123');
      const session1 = getSessionByPhone('+5215555555555');
      expect(session1?.opencode_session_id).toBe('ses_test123');
      
      // Llamar de nuevo con mismo teléfono pero diferente sessionId
      createSession('+5215555555555', 'ses_updated999');
      const session2 = getSessionByPhone('+5215555555555');
      
      expect(session2?.opencode_session_id).toBe('ses_updated999');
      // INSERT OR REPLACE actualiza el valor sin duplicar registros
      expect(session2?.phone).toBe('+5215555555555');
    });

    test('deleteSession debe eliminar una sesión', () => {
      createSession('+5215555555555', 'ses_test123');
      expect(getSessionByPhone('+5215555555555')).toBeDefined();
      
      const result = deleteSession('+5215555555555');
      
      expect(result.changes).toBeGreaterThan(0);
      expect(getSessionByPhone('+5215555555555')).toBeNull();
    });

    test('deleteSession debe retornar changes=0 si no existe', () => {
      const result = deleteSession('+5219999999999');
      
      expect(result.changes).toBe(0);
    });

    test('deleteSession debe limpiar solo la sesión especificada', () => {
      createSession('+5215555555555', 'ses_test123');
      createSession('+5215555555556', 'ses_test456');

      deleteSession('+5215555555555');

      expect(getSessionByPhone('+5215555555555')).toBeNull();
      expect(getSessionByPhone('+5215555555556')).toBeDefined();
    });
  });

  describe('UserPermissions', () => {
    test('getUserPermissions retorna null para teléfono no existente', async () => {
      const perms = getUserPermissions('+5210000000000');
      expect(perms).toBeNull();
    });

    test('getUserPermissions retorna permisos por defecto (todos false)', async () => {
      await addToWhitelist('+5215555555555', 'Test user');

      const perms = getUserPermissions('+5215555555555');

      expect(perms).toBeDefined();
      expect(perms?.can_read).toBe(false);
      expect(perms?.can_create).toBe(false);
      expect(perms?.can_modify).toBe(false);
      expect(perms?.can_delete).toBe(false);
      expect(perms?.can_request_permissions).toBe(false);
    });

    test('updateUserPermissions actualiza permisos específicos', async () => {
      const result = await addToWhitelist('+5215555555555', 'Test user');
      const id = result.lastInsertRowid;

      await updateUserPermissions(id, {
        can_read: true,
        can_create: true,
      });

      const perms = getUserPermissions('+5215555555555');

      expect(perms?.can_read).toBe(true);
      expect(perms?.can_create).toBe(true);
      expect(perms?.can_modify).toBe(false);
      expect(perms?.can_delete).toBe(false);
    });

    test('updateUserPermissions retorna 0 changes para id inválido', async () => {
      const result = await updateUserPermissions(99999, { can_read: true });

      expect(result.changes).toBe(0);
    });

    test('updateUserPermissions no actualiza si no hay cambios', async () => {
      const result = await updateUserPermissions(1, {});

      expect(result.changes).toBe(0);
    });

    test('getWhitelist incluye columnas de permisos', async () => {
      await addToWhitelist('+5215555555555', 'Test user');
      await updateUserPermissions(1, { can_read: true, can_create: true });

      const whitelist = getWhitelist();
      const entry = whitelist[0];

      expect(entry).toHaveProperty('can_read');
      expect(entry).toHaveProperty('can_create');
      expect(entry).toHaveProperty('can_modify');
      expect(entry).toHaveProperty('can_delete');
      expect(entry).toHaveProperty('can_request_permissions');
    });
  });
});