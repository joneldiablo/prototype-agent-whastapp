/**
 * Pruebas Unitarias de WhatsApp Service
 * Usa mockups para independencia de servicios externos.
 * 
 * @group services
 */

import { describe, expect, test } from 'bun:test';
import { createMockWhatsAppClient, createMockMessage, createMockStatus } from '../mockups/whatsapp.js';

describe('WhatsApp Mock Tests', () => {
  test('Mock crea cliente con métodos requeridos', async () => {
    const mockClient = createMockWhatsAppClient();
    
    // Verificar que tiene los métodos
    expect(mockClient.on).toBeDefined();
    expect(typeof mockClient.on).toBe('function');
    expect(mockClient.initialize).toBeDefined();
    expect(mockClient.sendMessage).toBeDefined();
  });

  test('Mock initialize conecta exitosamente', async () => {
    const mockClient = createMockWhatsAppClient();
    const status = await mockClient.initialize!();
    
    expect(status.connected).toBe(true);
    expect(status.phone).toBeDefined();
  });

  test('Mock sendMessage retorna true', async () => {
    const mockClient = createMockWhatsAppClient();
    const result = await mockClient.sendMessage!('+5215555555555', 'Hola test');
    
    expect(result).toBe(true);
  });

  test('Mock destroy desconecta', async () => {
    const mockClient = createMockWhatsAppClient();
    await mockClient.initialize!();
    
    await mockClient.destroy!();
    
    expect(mockClient.info).toBeDefined();
  });
});

describe('WhatsApp - Helpers', () => {
  test('createMockMessage crea mensaje válido', () => {
    const msg = createMockMessage();
    
    expect(msg.from).toBeDefined();
    expect(msg.fromMe).toBe(false);
    expect(msg.body).toBe('Hola');
  });

  test('createMockStatus crea estado válido', () => {
    const status = createMockStatus({ connected: true });
    
    expect(status.connected).toBe(true);
  });

  test('createMockStatus默认值 false', () => {
    const status = createMockStatus();
    
    expect(status.connected).toBe(false);
  });
});