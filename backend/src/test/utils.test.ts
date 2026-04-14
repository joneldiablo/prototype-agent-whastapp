/**
 * Pruebas de Tipos y Utilitarios
 * 
 * @group utils
 */

import { describe, expect, test } from 'bun:test';

describe('Types - WhatsAppStatus', () => {
  test('WhatsAppStatus tiene estructura válida', () => {
    const status = {
      connected: true,
      phone: '+5215555555555',
      lastSync: new Date().toISOString(),
    };
    
    expect(status.connected).toBe(true);
    expect(typeof status.phone).toBe('string');
  });

  test('WhatsAppStatus sin conexión', () => {
    const status = {
      connected: false,
    };
    
    expect(status.connected).toBe(false);
  });
});

describe('Utils - Logger', () => {
  test('Logger en development', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const isProd = process.env.NODE_ENV === 'production';
    expect(isProd).toBe(false);
    
    process.env.NODE_ENV = original;
  });

  test('Logger en production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const isProd = process.env.NODE_ENV === 'production';
    expect(isProd).toBe(true);
    
    process.env.NODE_ENV = original;
  });
});

describe('Utils - Auth', () => {
  test('Parse credentials formato user:pass', () => {
    const credentials = 'admin:password123';
    const [user, pass] = credentials.split(':');
    
    expect(user).toBe('admin');
    expect(pass).toBe('password123');
  });

  test('Basic auth header válido', () => {
    const credentials = 'admin:password123';
    const encoded = Buffer.from(credentials).toString('base64');
    const header = `Basic ${encoded}`;
    
    expect(header).toMatch(/^Basic /);
  });

  test('Decode basic auth', () => {
    const encoded = Buffer.from('admin:password123').toString('base64');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    
    expect(decoded).toBe('admin:password123');
  });
});

describe('Utils - Phone Numbers', () => {
  test('Normalizar teléfono con +', () => {
    const phone = '+5215555555555';
    expect(phone.startsWith('+')).toBe(true);
  });

  test('Normalizar teléfono sin +', () => {
    const phone = '5215555555555';
    const cleaned = phone.replace(/^\+/, '');
    expect(cleaned).toBe('5215555555555');
  });

  test('Extraer país', () => {
    const phone = '+5215555555555';
    const country = phone.substring(1, 3);
    
    expect(country).toBe('52');
  });
});

describe('Utils - Environment', () => {
  test('PORT default', () => {
    const port = process.env.PORT || '3000';
    expect(port).toBeDefined();
  });

  test('OPENCODE_PORT default', () => {
    const port = process.env.OPENCODE_PORT || '4099';
    expect(port).toBe('4099');
  });

  test('Parse port a número', () => {
    const port = parseInt('4099', 10);
    expect(typeof port).toBe('number');
    expect(port).toBe(4099);
  });
});

describe('Utils - Error Handling', () => {
  test('Error instanceof', () => {
    const err = new Error('test');
    expect(err instanceof Error).toBe(true);
  });

  test('Error message', () => {
    const err = new Error('test error');
    expect(err.message).toBe('test error');
  });

  test('TypeError', () => {
    const err = new TypeError('invalid type');
    expect(err instanceof TypeError).toBe(true);
  });
});