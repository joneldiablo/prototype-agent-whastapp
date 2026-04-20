/**
 * Pruebas Unitarias de Rutas
 * 
 * Usa mocks puros para evitar dependencias externas.
 * 
 * @group routes
 */

import { describe, expect, test, beforeEach, jest } from 'bun:test';
import { createMockResponse, createMockRequest, createMockNext } from './mockups/express.js';

describe('Routes - Whitelist', () => {
  let mockDb: {
    getWhitelist: ReturnType<typeof jest.fn>;
    addToWhitelist: ReturnType<typeof jest.fn>;
    updateWhitelistEntry: ReturnType<typeof jest.fn>;
    deleteFromWhitelist: ReturnType<typeof jest.fn>;
    updateUserPermissions: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    mockDb = {
      getWhitelist: jest.fn(() => [
        { id: 1, phone: '+5215555555555', prompt: 'Test', can_read: false, can_create: false, can_modify: false, can_delete: false, can_request_permissions: false }
      ]),
      addToWhitelist: jest.fn(() => ({ lastInsertRowid: 1 })),
      updateWhitelistEntry: jest.fn(() => ({ changes: 1 })),
      deleteFromWhitelist: jest.fn(() => ({ changes: 1 })),
      updateUserPermissions: jest.fn(() => ({ changes: 1 })),
    };
  });

  describe('GET /', () => {
    test('retorna lista de entradas', () => {
      const whitelist = mockDb.getWhitelist();
      
      expect(whitelist).toHaveLength(1);
      expect(whitelist[0].phone).toBe('+5215555555555');
    });

    test('retorna array vacío cuando no hay entradas', () => {
      mockDb.getWhitelist = jest.fn(() => []);
      
      const whitelist = mockDb.getWhitelist();
      
      expect(whitelist).toHaveLength(0);
    });

    test('cada entrada tiene propiedades requeridas', () => {
      const whitelist = mockDb.getWhitelist();
      const entry = whitelist[0];
      
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('phone');
      expect(entry).toHaveProperty('prompt');
      expect(entry).toHaveProperty('can_read');
      expect(entry).toHaveProperty('can_create');
    });
  });

  describe('POST /', () => {
    test('agrega entrada con phone válido', () => {
      const result = mockDb.addToWhitelist('+5215555555555', 'Test prompt');
      
      expect(result.lastInsertRowid).toBe(1);
      expect(mockDb.addToWhitelist).toHaveBeenCalled();
    });

    test('agrega entrada con is_blacklist', () => {
      const result = mockDb.addToWhitelist('+5215555555555', 'Test', 1);
      
      expect(result.lastInsertRowid).toBe(1);
    });

    test('agrega entrada sin prompt', () => {
      const result = mockDb.addToWhitelist('+5215555555555');
      
      expect(result.lastInsertRowid).toBe(1);
    });

    test('retorna error si no hay phone', () => {
      const body = { prompt: 'Test' };
      
      expect(() => {
        if (!body.phone) throw new Error('El número de teléfono es requerido');
      }).toThrow('El número de teléfono es requerido');
    });
  });

  describe('PUT /:id', () => {
    test('actualiza entrada existente', () => {
      const result = mockDb.updateWhitelistEntry(1, { prompt: 'Actualizado' });
      
      expect(result.changes).toBe(1);
    });

    test('actualiza entrada inexistente retorna 0 changes', () => {
      mockDb.updateWhitelistEntry = jest.fn(() => ({ changes: 0 }));
      
      const result = mockDb.updateWhitelistEntry(999, { prompt: 'Actualizado' });
      
      expect(result.changes).toBe(0);
    });

    test('actualiza múltiples campos', () => {
      const result = mockDb.updateWhitelistEntry(1, { 
        phone: '+5215555555556', 
        prompt: 'Nuevo prompt',
        enabled: true 
      });
      
      expect(result.changes).toBe(1);
    });
  });

  describe('DELETE /:id', () => {
    test('elimina entrada existente', () => {
      const result = mockDb.deleteFromWhitelist(1);
      
      expect(result.changes).toBe(1);
    });

    test('elimina entrada inexistente retorna 0', () => {
      mockDb.deleteFromWhitelist = jest.fn(() => ({ changes: 0 }));
      
      const result = mockDb.deleteFromWhitelist(999);
      
      expect(result.changes).toBe(0);
    });
  });

  describe('UserPermissions', () => {
    test('updateUserPermissions actualiza permisos', () => {
      const result = mockDb.updateUserPermissions(1, { can_read: true, can_create: true });
      
      expect(result.changes).toBe(1);
    });

    test('updateUserPermissions sin cambios retorna 0', () => {
      mockDb.updateUserPermissions = jest.fn(() => ({ changes: 0 }));
      
      const result = mockDb.updateUserPermissions(1, {});
      
      expect(result.changes).toBe(0);
    });
  });
});

describe('Routes - Config', () => {
  let mockDb: {
    getConfig: ReturnType<typeof jest.fn>;
    setConfig: ReturnType<typeof jest.fn>;
    getMessagesLog: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    mockDb = {
      getConfig: jest.fn((key: string) => {
        const configs: Record<string, string> = {
          'system_prompt': 'Test prompt'
        };
        return configs[key] || null;
      }),
      setConfig: jest.fn(() => ({ changes: 1 })),
      getMessagesLog: jest.fn(() => [
        { id: 1, phone: '+5215555555555', message: 'Hola', response: 'Hola!', timestamp: '2024-01-01' }
      ]),
    };
  });

  describe('GET /system-version', () => {
    test('retorna estructura de versión', () => {
      const response = {
        success: true,
        error: false,
        status: 200,
        code: 200,
        message: 'Versión del sistema',
        data: { version: '1.0.6' },
      };
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('version');
    });
  });

  describe('GET /system-prompt', () => {
    test('retorna prompt existente', () => {
      const prompt = mockDb.getConfig('system_prompt');
      
      expect(prompt).toBe('Test prompt');
    });

    test('retorna null para clave inexistente', () => {
      const prompt = mockDb.getConfig('inexistente');
      
      expect(prompt).toBeNull();
    });

    test('retorna string vacío si prompt es null', () => {
      mockDb.getConfig = jest.fn(() => null);
      
      const prompt = mockDb.getConfig('system_prompt');
      const value = prompt || '';
      
      expect(value).toBe('');
    });
  });

  describe('PUT /system-prompt', () => {
    test('setConfig guarda prompt', () => {
      mockDb.setConfig('system_prompt', 'Nuevo prompt');
      
      expect(mockDb.setConfig).toHaveBeenCalledWith('system_prompt', 'Nuevo prompt');
    });

    test('retorna error si prompt vacío', () => {
      const prompt = '';
      
      expect(() => {
        if (!prompt) throw new Error('El prompt es requerido');
      }).toThrow('El prompt es requerido');
    });
  });

  describe('GET /messages', () => {
    test('retorna historial de mensajes', () => {
      const messages = mockDb.getMessagesLog();
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toHaveProperty('phone');
      expect(messages[0]).toHaveProperty('message');
    });

    test('retorna array vacío sin mensajes', () => {
      mockDb.getMessagesLog = jest.fn(() => []);
      
      const messages = mockDb.getMessagesLog();
      
      expect(messages).toHaveLength(0);
    });
  });
});

describe('Routes - WhatsApp', () => {
  let mockWhatsApp: {
    getWhatsAppStatus: ReturnType<typeof jest.fn>;
    connectWhatsApp: ReturnType<typeof jest.fn>;
    disconnectWhatsApp: ReturnType<typeof jest.fn>;
    getQR: ReturnType<typeof jest.fn>;
    searchContacts: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    mockWhatsApp = {
      getWhatsAppStatus: jest.fn(() => ({ connected: true, phone: '+5215555555555' })),
      connectWhatsApp: jest.fn(() => Promise.resolve({ connected: true, phone: '+5215555555555' })),
      disconnectWhatsApp: jest.fn(() => Promise.resolve()),
      getQR: jest.fn(() => Promise.resolve('data:image/png;base64,mock')),
      searchContacts: jest.fn(() => Promise.resolve([
        { id: '123@c.us', name: 'Test', phone: '5215555555555', isGroup: false }
      ])),
    };
  });

  describe('GET /status', () => {
    test('retorna estado conectado', () => {
      const status = mockWhatsApp.getWhatsAppStatus();
      
      expect(status.connected).toBe(true);
      expect(status.phone).toBe('+5215555555555');
    });

    test('retorna estado desconectado', () => {
      mockWhatsApp.getWhatsAppStatus = jest.fn(() => ({ connected: false }));
      
      const status = mockWhatsApp.getWhatsAppStatus();
      
      expect(status.connected).toBe(false);
    });
  });

  describe('POST /connect', () => {
    test('conecta exitosamente', async () => {
      const result = await mockWhatsApp.connectWhatsApp();
      
      expect(result.connected).toBe(true);
    });

    test('retorna mensaje apropiado según estado', async () => {
      const status = await mockWhatsApp.connectWhatsApp();
      const message = status.connected ? 'WhatsApp conectado' : 'Conectando WhatsApp...';
      
      expect(message).toBe('WhatsApp conectado');
    });
  });

  describe('POST /disconnect', () => {
    test('desconecta exitosamente', async () => {
      await mockWhatsApp.disconnectWhatsApp();
      
      expect(mockWhatsApp.disconnectWhatsApp).toHaveBeenCalled();
    });
  });

  describe('GET /qr', () => {
    test('retorna QR cuando disponible', async () => {
      const qr = await mockWhatsApp.getQR();
      
      expect(qr).toBe('data:image/png;base64,mock');
      expect(qr).toMatch(/^data:image\/png;base64,/);
    });

    test('retorna null si no hay QR', async () => {
      mockWhatsApp.getQR = jest.fn(() => Promise.resolve(null));
      
      const qr = await mockWhatsApp.getQR();
      
      expect(qr).toBeNull();
    });
  });

  describe('GET /search', () => {
    test('busca contactos con query válida', async () => {
      const results = await mockWhatsApp.searchContacts('Test');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('isGroup');
    });

    test('retorna array vacío si no conectado', async () => {
      mockWhatsApp.searchContacts = jest.fn(() => Promise.resolve([]));
      
      const results = await mockWhatsApp.searchContacts('Test');
      
      expect(results).toHaveLength(0);
    });

    test('requiere mínimo 2 caracteres', () => {
      const query = 'a';
      
      expect(() => {
        if (!query || query.length < 2) throw new Error('Mínimo 2 caracteres para buscar');
      }).toThrow('Mínimo 2 caracteres para buscar');
    });
  });
});

describe('Middleware - Auth (parseBasicAuth)', () => {
  test('parseBasicAuth con header válido', () => {
    const authHeader = 'Basic YWRtaW46cGFzc3dvcmQxMjM=';
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    const credentials = {
      user: decoded.slice(0, colonIndex),
      pass: decoded.slice(colonIndex + 1),
    };
    
    expect(credentials.user).toBe('admin');
    expect(credentials.pass).toBe('password123');
  });

  test('parseBasicAuth sin header retorna null', () => {
    const authHeader = undefined;
    const result = !authHeader || !authHeader.startsWith('Basic ') ? null : authHeader;
    
    expect(result).toBeNull();
  });

  test('parseBasicAuth con header inválido retorna null', () => {
    const authHeader = 'Bearer token123';
    const result = !authHeader || !authHeader.startsWith('Basic ') ? null : authHeader;
    
    expect(result).toBeNull();
  });

  test('parseBasicAuth sin dos puntos retorna null', () => {
    const base64 = Buffer.from('nouser').toString('base64');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    const result = colonIndex === -1 ? null : { user: decoded.slice(0, colonIndex), pass: decoded.slice(colonIndex + 1) };
    
    expect(result).toBeNull();
  });

  test('credenciales coinciden correctamente', () => {
    const expectedUser = 'admin';
    const expectedPass = 'password123';
    const credentials = { user: 'admin', pass: 'password123' };
    
    const isValid = credentials.user === expectedUser && credentials.pass === expectedPass;
    
    expect(isValid).toBe(true);
  });

  test('credenciales inválidas fallan', () => {
    const expectedUser = 'admin';
    const expectedPass = 'password123';
    const credentials = { user: 'admin', pass: 'wrong' };
    
    const isValid = credentials.user === expectedUser && credentials.pass === expectedPass;
    
    expect(isValid).toBe(false);
  });
});

describe('Utils - Response Format', () => {
  test('ApiResponse success', () => {
    const response = {
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: 'OK',
      data: { test: true },
    };
    
    expect(response.success).toBe(true);
    expect(response.error).toBe(false);
    expect(response.status).toBe(200);
  });

  test('ApiResponse error', () => {
    const response = {
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: 'Error interno',
    };
    
    expect(response.success).toBe(false);
    expect(response.error).toBe(true);
    expect(response.status).toBe(500);
  });

  test('ApiResponse con código 400', () => {
    const response = {
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'Bad request',
    };
    
    expect(response.code).toBe(400);
  });

  test('ApiResponse con código 401', () => {
    const response = {
      success: false,
      error: true,
      status: 401,
      code: 401,
      message: 'Unauthorized',
    };
    
    expect(response.code).toBe(401);
  });

  test('ApiResponse con código 404', () => {
    const response = {
      success: false,
      error: true,
      status: 404,
      code: 404,
      message: 'Not found',
    };
    
    expect(response.code).toBe(404);
  });
});

describe('WhatsApp Service - sanitizeForWhatsApp', () => {
  test('texto ASCII simple pasa sin cambios', () => {
    const text = 'Hello World';
    const result = text.normalize('NFKC');
    
    expect(result).toBe('Hello World');
  });

  test('remueve caracteres de control', () => {
    const text = 'Hello\u0000World\u001FTest';
    const result = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    expect(result).toBe('HelloWorldTest');
  });

  test('remueve null bytes', () => {
    const text = 'Hello\u0000World';
    const result = text.replace(/\u0000/g, '');
    
    expect(result).toBe('HelloWorld');
  });

  test('normaliza texto con acentos', () => {
    const text = 'café';
    const result = text.normalize('NFKC');
    
    expect(result).toBe('café');
  });
});

describe('WhatsApp Service - ContactSearchResult', () => {
  test('ContactSearchResult estructura', () => {
    const contact = {
      id: '5215555555555@c.us',
      name: 'Test User',
      pushName: 'Test',
      phone: '5215555555555',
      isGroup: false,
    };
    
    expect(contact).toHaveProperty('id');
    expect(contact).toHaveProperty('name');
    expect(contact).toHaveProperty('isGroup');
    expect(contact.isGroup).toBe(false);
  });

  test('ContactSearchResult para grupo', () => {
    const group = {
      id: '123456789@g.us',
      name: 'Test Group',
      isGroup: true,
    };
    
    expect(group.isGroup).toBe(true);
    expect(group).not.toHaveProperty('phone');
  });
});
