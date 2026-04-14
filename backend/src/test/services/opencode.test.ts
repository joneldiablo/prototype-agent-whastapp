/**
 * Pruebas Unitarias de OpenCode Service
 * 
 * @group services
 */

import { describe, expect, test } from 'bun:test';

// Importar mockup de forma directa
const { createMockOpencodeClient } = await import('../mockups/opencode.js');

describe('OpenCode Service - Mock Tests', () => {
  test('createMockOpencodeClient - createSession', async () => {
    const client = createMockOpencodeClient();
    
    const result = await client.session.create({
      body: { title: 'Test Session' }
    });
    
    expect(result.data?.id).toBeDefined();
    expect(result.data?.id).toContain('ses_');
  });

  test('createMockOpencodeClient - prompt', async () => {
    const client = createMockOpencodeClient();
    
    // Crear sesión primero
    const createResult = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createResult.data?.id;
    
    const result = await client.session.prompt({
      path: { id: sessionId! },
      body: { parts: [{ type: 'text', text: 'Hola' }] }
    });
    
    expect(result.data?.parts).toBeDefined();
    expect(result.data?.parts[0]?.type).toBe('text');
  });

  test('createMockOpencodeClient - error para sesión inexistente', async () => {
    const client = createMockOpencodeClient();
    
    const result = await client.session.prompt({
      path: { id: 'ses_inexistente' },
      body: { parts: [{ type: 'text', text: 'Hola' }] }
    });
    
    expect(result.error).toBeDefined();
    expect(result.error?.name).toBe('NotFoundError');
  });
});

describe('OpenCode Mock - Validaciones', () => {
  test('Mock crea sesión con ID válido', async () => {
    const mockClient = createMockOpencodeClient();
    const result = await mockClient.session.create({ body: { title: 'Test' } });
    expect(result.data?.id).toMatch(/^ses_/);
  });

  test('Mock response tiene estructura correcta', async () => {
    const mockClient = createMockOpencodeClient();
    const createRes = await mockClient.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    const promptRes = await mockClient.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: 'text', text: 'Hola' }] }
    });
    
    expect(promptRes.data).toHaveProperty('parts');
    expect(promptRes.data).toHaveProperty('info');
  });
});