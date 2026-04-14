/**
 * OpenCode Service
 * 
 * Maneja la comunicación con el servidor OpenCode.
 * 
 * Responsabilidades:
 * - Inicializar cliente OpenCode
 * - Crear/recuperar sesiones por teléfono
 * - Enviar prompts y recibir respuestas
 * 
 * @module services/opencode
 */

// ============================================================
// IMPORTS
// ============================================================

import { createOpencode, type OpencodeClient } from '@opencode-ai/sdk';
import type { Part } from '@opencode-ai/sdk';
import { getSessionByPhone, createSession, getConfig } from '../db/index.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || '';
const OPENCODE_PORT = parseInt(process.env.OPENCODE_PORT || '4099', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SYSTEM_PROMPT_DEFAULT = process.env.SYSTEM_PROMPT || '';

const isProd = NODE_ENV === 'production';

/**
 * Logger conditional según entorno.
 * Solo imprime en desarrollo.
 */
function log(...args: unknown[]) {
  if (!isProd) console.log(...args);
}

/**
 * Construye el prompt completo concatenando el de entorno + el de BD.
 * @param dbPrompt Prompt de la base de datos
 * @param version Versión actual del sistema
 * @returns Prompt concatenado
 */
function buildSystemPrompt(dbPrompt: string | null, version: string): string {
  let basePrompt = SYSTEM_PROMPT_DEFAULT.replace(/\$\{version\}/g, version);
  
  if (dbPrompt && dbPrompt.trim()) {
    return basePrompt + '\n\n' + dbPrompt.trim();
  }
  
  return basePrompt;
}

// ============================================================
// ESTADO
// ============================================================

let client: OpencodeClient | null = null;
let serverClose: (() => void) | null = null;
let appVersion = '1.0.0';

/**
 * Establece la versión de la aplicación.
 */
export function setSystemVersion(version: string) {
  appVersion = version;
}

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

/**
 * Obtiene el puerto configurado para OpenCode.
 */
export function getOpenCodePort(): number {
  return OPENCODE_PORT;
}

/**
 * Inicializa el cliente OpenCode.
 * 
 * @param version - Versión de la aplicación
 * @async
 * @returns {Promise<void>}
 * 
 * @example
 * await initOpenCode('1.0.0');
 */
export async function initOpenCode(version?: string): Promise<void> {
  if (version) {
    appVersion = version;
  }
  
  if (client) return;
  
  if (!OPENCODE_API_KEY) {
    log('[OpenCode] OPENCODE_API_KEY no configurada');
    return;
  }

  const oc = await createOpencode({
    port: OPENCODE_PORT,
  });
  
  client = oc.client;
  serverClose = oc.server.close;
  log('[OpenCode] Cliente inicializado');
}

/**
 * Obtiene o crea una sesión para un teléfono.
 * 
 * @param phone - Número de teléfono
 * @returns ID de la sesión en OpenCode
 * @throws Error si el cliente no está inicializado
 * 
 * @example
 * const sessionId = await getOrCreateSession('+5215555555555');
 */
export async function getOrCreateSession(phone: string): Promise<string> {
  if (!client) {
    throw new Error('OpenCode no inicializado');
  }

  // Verificar si existe sesión en DB
  const existing = getSessionByPhone(phone);
  if (existing) {
    try {
      await client.session.get({ path: { id: existing.opencode_session_id } });
      return existing.opencode_session_id;
    } catch {
      // Sesión no existe en OpenCode, crear nueva
    }
  }

  // Crear nueva sesión
  const session = await client.session.create({
    body: { title: `WhatsApp: ${phone}` },
  });

  const sessionId = session.data?.id || session.id;
  createSession(phone, sessionId);

  return sessionId;
}

/**
 * Envía un mensaje a una sesión existente.
 * 
 * @param phone - Número de teléfono
 * @param message - Mensaje a enviar
 * @returns Respuesta de texto del agente
 * @throws Error si no está inicializado o falla la petición
 * 
 * @example
 * const response = await sendToSession('+5215555555555', 'Hola');
 */
export async function sendToSession(phone: string, message: string): Promise<string> {
  if (!client) {
    throw new Error('OpenCode no inicializado');
  }

  const sessionId = await getOrCreateSession(phone);

  // Obtener prompt de BD y construir prompt completo
  const dbPrompt = getConfig('system_prompt');
  const fullPrompt = buildSystemPrompt(dbPrompt, appVersion);
  
  log('[OpenCode] Prompt completo:', fullPrompt.substring(0, 200) + '...');

  const response = await client.session.prompt({
    path: { id: sessionId },
    body: {
      system: fullPrompt,
      parts: [
        {
          type: 'text',
          text: message,
        },
      ],
    },
  });

  if (response.error) {
    throw new Error(response.error.name + ': ' + JSON.stringify(response.error.data));
  }

  log('[OpenCode] Response:', JSON.stringify(response).substring(0, 500));

  const parts = response.data?.parts || response.parts || [];
  return extractTextFromResponse(parts);
}

/**
 * Verifica si OpenCode está configurado.
 * 
 * @returns true si hay API key configurada
 * 
 * @example
 * if (isOpenCodeConfigured()) { ... }
 */
export function isOpenCodeConfigured(): boolean {
  return OPENCODE_API_KEY.length > 0;
}

/**
 * Cierra el cliente OpenCode y libera recursos.
 * 
 * @async
 * @returns {Promise<void>}
 * 
 * @example
 * await closeOpenCode();
 */
export async function closeOpenCode(): Promise<void> {
  if (serverClose) {
    serverClose();
    client = null;
    serverClose = null;
    log('[OpenCode] Cliente cerrado');
  }
}

// ============================================================
// FUNCIONES PRIVADAS (Helpers)
// ============================================================

/**
 * Extrae texto de una respuesta.
 * 
 * @param parts - Array de partes de la respuesta
 * @returns Primer texto encontrado o默认值
 */
function extractTextFromResponse(parts: Part[]): string {
  if (!parts || parts.length === 0) {
    return 'Sin respuesta';
  }
  for (const part of parts) {
    if (part.type === 'text' && part.text) {
      return part.text;
    }
  }
  return JSON.stringify(parts);
}