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

import { createOpencode, createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import type { Part } from '@opencode-ai/sdk';
import { getSessionByPhone, createSession, getConfig, deleteSession, getUserPermissions } from '../db/index.js';
import { createServer } from 'net';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OPENCODE_PORT = parseInt(process.env.OPENCODE_PORT || '4099', 10);
const ENV = process.env.ENV || '';
const SYSTEM_PROMPT_DEFAULT = process.env.SYSTEM_PROMPT || '';

const isProd = ENV.toLowerCase() === 'prod';

/**
 * Verifica si un puerto está en uso.
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Logger para acciones del sistema (siempre visible)
 */
function log(...args: unknown[]) {
  console.log(...args);
}

/**
 * Logger para información sensible (solo en desarrollo)
 */
function logSensitive(...args: unknown[]) {
  if (isProd) return;
  console.log(...args);
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

function isConnectionError(err: unknown): boolean {
  const errStr = String(err);
  return (
    errStr.includes('ECONNREFUSED') ||
    errStr.includes('ConnectionRefused') ||
    errStr.includes('connection refused') ||
    errStr.includes('Unable to connect')
  );
}

function isRecoverableOpenCodeError(err: unknown): boolean {
  const errStr = String(err);
  return (
    isConnectionError(err) ||
    errStr.includes('Servidor de OpenCode no disponible') ||
    errStr.includes('OpenCode no inicializado')
  );
}

async function recoverOpenCodeClient(): Promise<boolean> {
  try {
    log('[OpenCode] Intentando reinicializar cliente/servidor...');
    await closeOpenCode();
    await initOpenCode();
    return await isOpenCodeServerAvailable();
  } catch (err) {
    log('[OpenCode] Falló la reinicialización:', err);
    return false;
  }
}

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
  
  if (client) {
    try {
      const health = await client.global.health();
      if (health.healthy) {
        log('[OpenCode] Cliente ya conectado y saludable');
        return;
      }
    } catch {
      client = null;
    }
  }
  
  try {
    const portInUse = await isPortInUse(OPENCODE_PORT);
    
    if (portInUse) {
      log(`[OpenCode] Puerto ${OPENCODE_PORT} ya está en uso, conectando al servidor existente...`);
      client = createOpencodeClient({
        baseUrl: `http://localhost:${OPENCODE_PORT}`,
      });
      log('[OpenCode] Cliente conectado al servidor existente');
      return;
    }

    const oc = await createOpencode({
      port: OPENCODE_PORT,
    });
    
    client = oc.client;
    serverClose = oc.server.close;
    log('[OpenCode] Cliente inicializado');
  } catch (err) {
    log('[OpenCode] Error al conectar:', err);
  }
}

/**
 * Obtiene o crea una sesión para un teléfono.
 * 
 * @param phone - Número de teléfono
 * @returns {sessionId: string, isNew: boolean} ID de la sesión y si es nueva
 * @throws Error si no está inicializado o falla la petición
 * 
 * @example
 * const { sessionId, isNew } = await getOrCreateSession('+5215555555555');
 */
export async function getOrCreateSession(phone: string): Promise<{ sessionId: string; isNew: boolean }> {
  if (!client) {
    throw new Error('OpenCode no inicializado');
  }

  // Verificar si existe sesión en DB
  const existing = getSessionByPhone(phone);
  if (existing) {
    try {
      await client.session.get({ path: { id: existing.opencode_session_id } });
      logSensitive(`[OpenCode] Sesión válida encontrada para ${phone.replace(/^\+/, '').replace(/^521/, '')}`);
      return { sessionId: existing.opencode_session_id, isNew: false };
    } catch (err) {
      if (isRecoverableOpenCodeError(err)) {
        throw err;
      }

      // Sesión no existe en OpenCode o está expirada
      const errMsg = String(err);
      logSensitive(`[OpenCode] Sesión expirada/no válida para ${phone}, descartando: ${errMsg.substring(0, 100)}`);
      deleteSession(phone);
    }
  }

  // Crear nueva sesión
  const session = await client.session.create({
    body: { title: `WhatsApp: ${phone}` },
  });

  const sessionId = session.data?.id || session.id;
  
  if (existing) {
    // Si existía, actualizar el registro
    logSensitive(`[OpenCode] Actualizando sesión para ${phone}`);
    createSession(phone, sessionId); // INSERT OR REPLACE cuando sea necesario
  } else {
    logSensitive(`[OpenCode] Creando sesión nueva para ${phone}`);
    createSession(phone, sessionId);
  }

  return { sessionId, isNew: true };
}

/**
 * Envía un mensaje a una sesión existente.
 * 
 * Maneja automáticamente sesiones expiradas:
 * - Si la sesión no responde (ConnectionRefused), la descarta
 * - Crea una nueva sesión y reintenta
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
    log('[OpenCode] Cliente no inicializado, intentando reconectar...');
    await initOpenCode();
    if (!client) {
      throw new Error('OpenCode no inicializado');
    }
  }

  const fromShort = phone.replace(/^\+/, '').replace(/^521/, '');

  // Obtener prompt de BD y construir prompt completo
  const dbPrompt = getConfig('system_prompt');

  // Verificar si el mensaje contiene una imagen en base64
  const imageMatch = message.match(/\[Imagen: (data:image\/(\w+);base64,.+)\]/);
  
  let parts: Part[] = [];
  let textContent = message;
  
  if (imageMatch) {
    const imageData = imageMatch[1];
    const mimeType = `image/${imageMatch[2]}`;
    textContent = message.replace(/\[Imagen: data:image\/\w+;base64,.+\]/, '').trim();
    
    // Agregar imagen como file part (formato correcto para OpenCode/AI SDK)
    parts.push({
      type: 'file',
      mime: mimeType,
      url: imageData,
    } as Part);
  }
  
  // Agregar texto
  if (textContent) {
    parts.push({
      type: 'text',
      text: textContent,
    } as Part);
  }

  log(`[OpenCode] Enviando consulta desde ${fromShort}...`);

  try {
    const { sessionId, isNew } = await getOrCreateSession(phone);

    let fullPrompt = buildSystemPrompt(dbPrompt, appVersion);
    if (isNew) {
      fullPrompt += '\n\nNota: Este es el primer mensaje de esta sesión. El contexto se ha reiniciado. Saluda al usuario amablemente y pregúntale en qué puedes ayudarle.';
    }

    logSensitive('[OpenCode] Prompt completo:', fullPrompt.substring(0, 200) + '...');

    const userPerms = getUserPermissions(phone);
    const permission: Record<string, unknown> = {
      read: userPerms?.can_read ? 'allow' : 'deny',
      write: userPerms?.can_create ? 'allow' : 'deny',
      edit: userPerms?.can_modify ? 'allow' : 'deny',
      bash: userPerms?.can_modify ? { '*': 'allow' } : { '*': 'deny' },
    };

    logSensitive('[OpenCode] Permisos aplicados:', JSON.stringify(permission));

    const response = await client.session.prompt({
      path: { id: sessionId },
      body: {
        system: fullPrompt,
        parts,
        permission,
      },
    });

    log(`[OpenCode] Respuesta recibida desde ${fromShort}`);

    if (response.error) {
      throw new Error(response.error.name + ': ' + JSON.stringify(response.error.data));
    }

    logSensitive('[OpenCode] Response raw:', JSON.stringify(response));

    const responseParts = response.data?.parts || response.parts || [];
    if (!responseParts || responseParts.length === 0) {
      logSensitive('[OpenCode] Parts vacíos o undefined, respuesta completa:', response);
    }
    return extractTextFromResponse(responseParts);
  } catch (err) {
    const errStr = String(err);

    if (isRecoverableOpenCodeError(err)) {
      log(`[OpenCode] Error de conexión para ${fromShort} (${errStr.substring(0, 80)}...). Verificando servidor...`);

      let serverAvailable = await isOpenCodeServerAvailable();
      if (!serverAvailable) {
        serverAvailable = await recoverOpenCodeClient();
      }

      if (!serverAvailable) {
        log(`[OpenCode] Servidor no disponible en puerto ${OPENCODE_PORT}. No se puede hacer auto-recovery.`);
        return `Lo siento, el servicio de IA no está disponible en este momento. Por favor, intenta más tarde o contacta al administrador del sistema.`;
      }
      
      log(`[OpenCode] Servidor disponible, descartando sesión expirada y reintentando...`);
      
      // Descartar sesión expirada
      deleteSession(phone);
      
      // Reintentar con nueva sesión
      try {
        const { sessionId: newSessionId } = await getOrCreateSession(phone);
        log(`[OpenCode] Nueva sesión creada para ${fromShort}, reintentando envío...`);
        
        // Reconstruir prompt (está puede ser una nueva sesión)
        let retryPrompt = buildSystemPrompt(dbPrompt, appVersion);
        retryPrompt += '\n\nNota: Este es el primer mensaje de esta sesión. El contexto se ha reiniciado. Saluda al usuario amablemente y pregúntale en qué puedes ayudarle.';
        
        const retryPerms = getUserPermissions(phone);
        const retryPermission: Record<string, unknown> = {
          read: retryPerms?.can_read ? 'allow' : 'deny',
          write: retryPerms?.can_create ? 'allow' : 'deny',
          edit: retryPerms?.can_modify ? 'allow' : 'deny',
          bash: retryPerms?.can_modify ? { '*': 'allow' } : { '*': 'deny' },
        };

        const retryResponse = await client.session.prompt({
          path: { id: newSessionId },
          body: {
            system: retryPrompt,
            parts,
            permission: retryPermission,
          },
        });

        if (retryResponse.error) {
          throw new Error(retryResponse.error.name + ': ' + JSON.stringify(retryResponse.error.data));
        }

        log(`[OpenCode] Respuesta reintentada recibida desde ${fromShort}`);
        const responseParts = retryResponse.data?.parts || retryResponse.parts || [];
        return extractTextFromResponse(responseParts);
      } catch (retryErr) {
        log('[OpenCode] Error en reintento:', retryErr);
        return `Lo siento, ocurrió un error al procesar tu mensaje. El servicio de IA está temporalmente indisponible. Por favor, intenta de nuevo en unos minutos.`;
      }
    }

    // Si no es error de conexión, lanzar el error original
    log('[OpenCode] Error en consulta:', err);
    throw err;
  }
}

/** * Verifica si el servidor de OpenCode está disponible.
 */
export async function isOpenCodeServerAvailable(): Promise<boolean> {
  if (!client) return false;
  
  try {
    await client.global.health();
    return true;
  } catch {
    return false;
  }
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
  } else if (client) {
    client = null;
    log('[OpenCode] Cliente desconectado del servidor externo');
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
