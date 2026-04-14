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
}

/**
 * Crea un cliente mock de OpenCode para testing.
 */
export function createMockOpencodeClient(options?: MockOpenCodeOptions): MockClient {
  const sessions = new Map<string, MockSession>();

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
        const session = sessions.get(path.id) || sessions.values().next().value;
        if (!session) {
          return { error: { name: 'NotFoundError', data: { message: 'Session not found' } } };
        }
        const text = body.parts?.[0]?.text || 'test';
        return {
          data: {
            info: { sessionID: path.id },
            parts: [
              {
                type: 'text',
                text: `Mock response to: ${text}`,
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

export default {
  createMockOpencodeClient,
  createMockSuccess,
  createMockError,
};