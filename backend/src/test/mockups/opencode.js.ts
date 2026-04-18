/**
 * Mockup del SDK de OpenCode para pruebas unitarias
 */

import type { Part } from '@opencode-ai/sdk';

export interface MockSession {
  id: string;
  title: string;
  version: string;
}

export interface MockResponse<T = unknown> {
  data?: T;
  error?: {
    name: string;
    data: unknown;
  };
  request?: unknown;
  response?: unknown;
}

export interface MockSessionClient {
  create(options: { body: { title: string } }): Promise<MockResponse<{ id: string }>>;
  get(options: { path: { id: string } }): Promise<MockResponse<MockSession>>;
  prompt(options: { path: { id: string }; body: { parts: Part[] } }): Promise<MockResponse<{ info: unknown; parts: Part[] }>>;
  delete(options: { path: { id: string } }): Promise<MockResponse<boolean>>;
}

export interface MockClient {
  session: MockSessionClient;
}

export interface MockOpenCodeOptions {
  port?: number;
  config?: unknown;
  baseUrl?: string;
  failNextPrompt?: boolean;
  failWithConnectionError?: boolean;
}

/**
 * Crea un cliente mock de OpenCode para testing.
 * 
 * Soporta escenarios de error:
 * - failNextPrompt: Falla la siguiente llamada a prompt()
 * - failWithConnectionError: Simula ECONNREFUSED
 */
export function createMockOpencodeClient(options?: MockOpenCodeOptions): MockClient {
  const sessions = new Map<string, MockSession>();
  let failNextPrompt = options?.failNextPrompt || false;
  let failWithConnectionError = options?.failWithConnectionError || false;
  let promptCallCount = 0;

  return {
    session: {
      async create({ body }) {
        const id = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
          id,
          title: body.title,
          version: '1.4.3',
        };
        sessions.set(id, session);
        return { data: { id } };
      },
      async get({ path }) {
        const session = sessions.get(path.id);
        if (!session) {
          return { error: { name: 'NotFoundError', data: { message: 'Session not found' } } };
        }
        return { data: session };
      },
      async prompt({ path, body }) {
        promptCallCount++;
        
        // Simular ECONNREFUSED si está activado
        if (failWithConnectionError && promptCallCount === 1) {
          failWithConnectionError = false; // Solo fallar una vez
          const error = new Error('ECONNREFUSED: Connection refused');
          (error as any).code = 'ECONNREFUSED';
          throw error;
        }
        
        // Simular falla genérica si está activado
        if (failNextPrompt) {
          failNextPrompt = false; // Solo fallar una vez
          return {
            error: {
              name: 'SessionExpiredError',
              data: { message: 'Session has expired' }
            }
          };
        }

        const session = sessions.get(path.id) || sessions.values().next().value;
        if (!session) {
          return { error: { name: 'NotFoundError', data: { message: 'Session not found' } } };
        }
        
        // Validar y procesar parts
        const parts = body.parts || [];
        let textContent = '';
        let imageInfo = '';
        
        for (const part of parts) {
          if (part.type === 'text') {
            textContent = part.text || '';
          } else if (part.type === 'file' && (part as any).mime?.startsWith('image/')) {
            imageInfo = ` (con imagen ${(part as any).mime})`;
          }
        }
        
        // Generar respuesta: solo incluir "imagen" si realmente hay una
        const responseMessage = imageInfo 
          ? `Mock response to: ${textContent}${imageInfo}`
          : `Mock response to: ${textContent}`;
        
        return {
          data: {
            info: { sessionID: path.id },
            parts: [
              {
                type: 'text',
                text: responseMessage,
                id: `prt_${Date.now()}`,
                sessionID: path.id,
                messageID: `msg_${Date.now()}`,
              },
            ],
          },
        };
      },
      async delete({ path }) {
        sessions.delete(path.id);
        return { data: true };
      },
    },
  };
}

/**
 * Crea una respuesta mock exitosa.
 */
export function createMockSuccess<T>(data: T): MockResponse<T> {
  return { data };
}

/**
 * Crea una respuesta mock de error.
 */
export function createMockError(name: string, data: unknown): MockResponse {
  return { error: { name, data } };
}

/**
 * Crea un cliente mock que simula ECONNREFUSED en la primera llamada a prompt().
 * Útil para probar auto-recovery de sesiones expiradas.
 */
export function createMockOpencodeClientWithConnectionError(): MockClient {
  return createMockOpencodeClient({ failWithConnectionError: true });
}

/**
 * Crea un cliente mock que devuelve error genérico en la siguiente llamada.
 */
export function createMockOpencodeClientWithError(): MockClient {
  return createMockOpencodeClient({ failNextPrompt: true });
}

export default {
  createMockOpencodeClient,
  createMockSuccess,
  createMockError,
  createMockOpencodeClientWithConnectionError,
  createMockOpencodeClientWithError,
};