/**
 * Pruebas Unitarias de OpenCode Service
 * 
 * @group services
 */

import { describe, expect, test } from 'bun:test';

// Importar mockup de forma directa
const { 
  createMockOpencodeClient,
  createMockOpencodeClientWithConnectionError,
  createMockOpencodeClientWithError,
} = await import('../mockups/opencode.js');

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

describe('OpenCode - Manejo de Imágenes', () => {
  test('Mock debe procesar partes con tipo file (imagen)', async () => {
    const client = createMockOpencodeClient();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    const promptRes = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [
          {
            type: 'file',
            mime: 'image/jpeg',
            url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          } as any,
          {
            type: 'text',
            text: 'Analiza esta imagen',
          }
        ]
      }
    });
    
    expect(promptRes.data?.parts).toBeDefined();
    expect(promptRes.data?.parts?.[0]?.text).toContain('imagen image/jpeg');
  });

  test('Mock debe soportar solo texto sin imágenes', async () => {
    const client = createMockOpencodeClient();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    const promptRes = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: 'Hola amigo' }]
      }
    });
    
    expect(promptRes.data?.parts?.[0]?.text).toContain('Hola amigo');
    // Confirmar que NO hay información de imagen en la respuesta
    expect(promptRes.data?.parts?.[0]?.text).not.toContain('con imagen');
  });

  test('Mock debe soportar múltiples tipos de imagen', async () => {
    const client = createMockOpencodeClient();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    const mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    for (const mimeType of mimeTypes) {
      const promptRes = await client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [
            {
              type: 'file',
              mime: mimeType,
              url: `data:${mimeType};base64,ABC123...`,
            } as any,
            { type: 'text', text: 'Procesa esto' }
          ]
        }
      });
      
      expect(promptRes.data?.parts?.[0]?.text).toContain(`imagen ${mimeType}`);
    }
  });
});

describe('OpenCode - Manejo de Errores y Auto-Recovery', () => {
  test('Mock debe lanzar ECONNREFUSED cuando está configurado', async () => {
    const client = createMockOpencodeClientWithConnectionError();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    let errorThrown = false;
    let errorCode = '';
    
    try {
      await client.session.prompt({
        path: { id: sessionId },
        body: { parts: [{ type: 'text', text: 'Hola' }] }
      });
    } catch (err) {
      errorThrown = true;
      errorCode = (err as any).code || String(err).substring(0, 30);
    }
    
    expect(errorThrown).toBe(true);
    expect(errorCode).toContain('ECONNREFUSED');
  });

  test('Mock debe recuperarse después de ECONNREFUSED (simula auto-recovery)', async () => {
    const client = createMockOpencodeClientWithConnectionError();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    // Primera llamada falla
    let firstFailed = false;
    try {
      await client.session.prompt({
        path: { id: sessionId },
        body: { parts: [{ type: 'text', text: 'Intento 1' }] }
      });
    } catch (err) {
      firstFailed = true;
    }
    
    // Segunda llamada debe exitir (simula nueva sesión)
    const secondRes = await client.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: 'text', text: 'Intento 2' }] }
    });
    
    expect(firstFailed).toBe(true);
    expect(secondRes.data?.parts).toBeDefined();
    expect(secondRes.data?.parts?.[0]?.text).toContain('Intento 2');
  });

  test('Mock debe retornar error genérico cuando está configurado', async () => {
    const client = createMockOpencodeClientWithError();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    const promptRes = await client.session.prompt({
      path: { id: sessionId },
      body: { parts: [{ type: 'text', text: 'Hola' }] }
    });
    
    expect(promptRes.error).toBeDefined();
    expect(promptRes.error?.name).toBe('SessionExpiredError');
  });

  test('Mock - sesión debe persistir en memoria', async () => {
    const client = createMockOpencodeClient();
    
    const createRes = await client.session.create({ body: { title: 'Session 1' } });
    const sessionId = createRes.data!.id;
    
    // Verificar que la sesión existe
    const getRes = await client.session.get({ path: { id: sessionId } });
    
    expect(getRes.data?.id).toBe(sessionId);
    expect(getRes.data?.title).toBe('Session 1');
  });

  test('Mock - get debe fallar para sesión inexistente', async () => {
    const client = createMockOpencodeClient();
    
    const getRes = await client.session.get({ path: { id: 'ses_inexistente' } });
    
    expect(getRes.error).toBeDefined();
    expect(getRes.error?.name).toBe('NotFoundError');
  });

  test('Mock - delete debe remover sesión', async () => {
    const client = createMockOpencodeClient();
    
    const createRes = await client.session.create({ body: { title: 'Test' } });
    const sessionId = createRes.data!.id;
    
    const deleteRes = await client.session.delete({ path: { id: sessionId } });
    expect(deleteRes.data).toBe(true);
    
    // Intentar usar sesión eliminada debe fallar
    const getRes = await client.session.get({ path: { id: sessionId } });
    expect(getRes.error).toBeDefined();
  });
});