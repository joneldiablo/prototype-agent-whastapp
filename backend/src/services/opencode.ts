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
import { getSessionByPhone, createSession, getConfig, deleteSession, getUserPermissions, getWhitelist, addPendingPermission } from '../db/index.js';
import { createServer } from 'net';
import { execSync } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OPENCODE_PORT = parseInt(process.env.OPENCODE_PORT || '4099', 10);
const ENV = process.env.ENV || '';
const SYSTEM_PROMPT_DEFAULT = process.env.SYSTEM_PROMPT || '';

function getRequestTimeout(): number {
  const timeoutStr = getConfig('request_timeout');
  return timeoutStr ? parseInt(timeoutStr, 10) : 120000;
}

const AVAILABLE_MODELS = [
  'opencode/big-pickle',
  'opencode/claude-3-5-haiku',
  'opencode/claude-opus-4-5',
  'opencode/claude-opus-4-6',
  'opencode/claude-opus-4-7',
  'opencode/claude-sonnet-4-5',
  'opencode/claude-sonnet-4-6',
  'opencode/gpt-5',
  'opencode/gpt-5.1',
  'opencode/gpt-5.2',
  'opencode/gpt-5.4',
  'opencode/gpt-5.5',
  'anthropic/claude-opus-4-5',
  'anthropic/claude-opus-4-7',
  'anthropic/claude-sonnet-4-5',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemma-3-27b-it',
  'ollama/llama3.1',
  'opencode/minimax-m2.5-free',
];

function parseModelString(modelStr: string): { providerID: string; modelID: string } {
  const [providerID, modelID] = modelStr.split('/');
  return { providerID: providerID || 'opencode', modelID: modelID || modelStr };
}

function getConfiguredModel(): string {
  const model = getConfig('model');
  return model || AVAILABLE_MODELS[0];
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const output = execSync('opencode models', { 
      encoding: 'utf8', 
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });
    
    const models = output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('=') && !line.includes('Models'));
    
    if (models.length > 0) {
      return models;
    }
  } catch (err) {
    log('[OpenCode] Error al obtener modelos:', err);
  }
  
  return AVAILABLE_MODELS;
}

const isProd = ENV.toLowerCase() === 'prod';

const TMP_DIR = path.join(process.cwd(), 'tmp');
const LAST_RESPONSE_FILE = path.join(TMP_DIR, 'last-response.json');

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      log(`[OpenCode] Timeout en ${label} (${ms}ms)`);
      reject(new Error(`Timeout: ${label}超过了${ms}ms`));
    }, ms);
    
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function saveLastResponse(data: any) {
  try {
    await mkdir(TMP_DIR, { recursive: true });
    await writeFile(LAST_RESPONSE_FILE, JSON.stringify(data, null, 2));
    log('[OpenCode] Response guardada en tmp/last-response.json');
  } catch (err) {
    log('[OpenCode] Error guardando response:', err);
  }
}

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
 * Construye el prompt completo del sistema.
 * 
 * @param customPrompt Prompt personalizado del contacto (prioridad alta)
 * @param systemPrompt Prompt global del sistema
 * @param version Versión actual del sistema
 * @returns Prompt concatenado
 */
function buildSystemPrompt(customPrompt: string | null | undefined, systemPrompt: string | null, version: string): string {
  let basePrompt = SYSTEM_PROMPT_DEFAULT.replace(/\$\{version\}/g, version);
  
  // Prioridad: prompt personalizado del contacto > prompt global del sistema
  if (customPrompt && customPrompt.trim()) {
    return basePrompt + '\n\n' + customPrompt.trim();
  }
  
  if (systemPrompt && systemPrompt.trim()) {
    return basePrompt + '\n\n' + systemPrompt.trim();
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
    
    startPermissionEventListener();
  } catch (err) {
    log('[OpenCode] Error al conectar:', err);
  }
}

let permissionCallback: ((phone: string, requestId: string, permission: string, patterns: string[]) => void) | null = null;

export function onPermissionAsked(callback: (phone: string, requestId: string, permission: string, patterns: string[]) => void) {
  permissionCallback = callback;
}

async function startPermissionEventListener() {
  if (!client || !permissionCallback) return;
  
  try {
    const events = await client.global.event();
    if (!events.stream) {
      log('[OpenCode] No hay stream de eventos disponible');
      return;
    }
    
    log('[OpenCode] Escuchando eventos de permisos...');
    
    for await (const rawEvent of events.stream) {
      const event = (rawEvent as any);
      const type = event.type;
      
      if (type === 'permission.asked') {
        const props = event.properties || {};
        const requestId = props.id || props.requestID;
        const permission = props.permission || 'unknown';
        const patterns = props.patterns || props.pattern || [];
        
        log(`[OpenCode] Permiso solicitado: ${permission} ${JSON.stringify(patterns)}`);
        
        if (permissionCallback) {
          permissionCallback('', requestId, permission, patterns);
        }
      }
    }
  } catch (err) {
    log('[OpenCode] Error en event listener:', err);
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

  const whitelist = getWhitelist();
  const contactEntry = whitelist.find(w => w.phone === phone);
  const customPrompt = contactEntry?.prompt;

  // Obtener prompt global del sistema
  const systemPrompt = getConfig('system_prompt');

  // Verificar si el mensaje contiene archivos
  const fileMatches = message.matchAll(/\[Archivo: ([^\]]+)\]/g);
  
  let parts: Part[] = [];
  let textContent = message;
  
  for (const match of fileMatches) {
    const filePath = match[1];
    textContent = textContent.replace(match[0], '').trim();
    
    // Agregar archivo como file part
    parts.push({
      type: 'file',
      url: filePath,
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

    let fullPrompt = buildSystemPrompt(customPrompt, systemPrompt, appVersion);
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

    const configuredModel = getConfiguredModel();
    const modelObj = parseModelString(configuredModel);
    
    logSensitive('[OpenCode] Modelo configurado:', configuredModel, modelObj);
    logSensitive('[OpenCode] Permisos aplicados:', JSON.stringify(permission));
    
    const requestBody = {
      model: modelObj,
      system: fullPrompt,
      parts,
      permission,
    };
    
    await saveLastResponse({ request: requestBody });
    
    let response: any;
    try {
      response = await withTimeout(
        client.session.prompt({
          path: { id: sessionId },
          body: requestBody,
        }),
        getRequestTimeout(),
        'session.prompt'
      );
    } catch (timeoutErr) {
      const errStr = String(timeoutErr);
      log('[OpenCode] Timeout o error en prompt:', errStr);
      
      if (errStr.includes('Timeout') || errStr.includes('超时')) {
        deleteSession(phone);
        try {
          const { sessionId: newSessionId } = await getOrCreateSession(phone);
          log('[OpenCode] Nueva sesión creada, reintentando...');
          response = await withTimeout(
            client.session.prompt({
              path: { id: newSessionId },
              body: requestBody,
            }),
            getRequestTimeout(),
            'session.prompt retry'
          );
        } catch (retryTimeout) {
          log('[OpenCode] También timeout en retry:', retryTimeout);
          return 'Lo siento, el servicio está tardando mucho. Por favor, intenta de nuevo en unos segundos.';
        }
      } else {
        throw timeoutErr;
      }
    }

    log(`[OpenCode] Respuesta recibida desde ${fromShort}`);

    const responseAny = response as any;
    logSensitive('[OpenCode] Response raw:', JSON.stringify(responseAny).substring(0, 800) + '...');
    
    await saveLastResponse(responseAny);
    
    if (!responseAny) {
      log('[OpenCode] Response vacío');
      return 'Sin respuesta';
    }

    const hasRequestEcho = responseAny.model && responseAny.system && responseAny.parts;
    
    if (hasRequestEcho) {
      log('[OpenCode] Respuesta parece ser echo de request, tratando como error');
      throw new Error('El modelo no generó respuesta, recibió echo de la request');
    }
    
    const responseError = responseAny?.error;
    
    if (responseError && typeof responseError !== 'undefined') {
      const errorInfo = responseError;
      const errorMsg = typeof errorInfo === 'object' 
        ? `${errorInfo.name || 'UnknownError'}: ${JSON.stringify(errorInfo.data || errorInfo).substring(0, 300)}`
        : String(errorInfo);
      log(`[OpenCode] Error en respuesta: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const dataError = responseAny.data?.error;
    if (dataError) {
      const errorMsg = `${dataError.name || 'DataError'}: ${JSON.stringify(dataError.data || dataError).substring(0, 300)}`;
      log(`[OpenCode] Error en data: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const infoError = responseAny.data?.info?.error;
    if (infoError) {
      const errorMsg = `${infoError.name || 'InfoError'}: ${JSON.stringify(infoError.data || infoError).substring(0, 300)}`;
      log(`[OpenCode] Error en info: ${errorMsg}`);
      
      if (infoError.name === 'ContextOverflowError' || infoError.data?.message?.includes('context')) {
        log(`[OpenCode] Context overflow detectado. Reiniciando sesión...`);
        deleteSession(phone);
        
        try {
          const { sessionId: newSessionId } = await getOrCreateSession(phone);
          log(`[OpenCode] Nueva sesión creada para ${fromShort}, reintentando...`);
          
          const retryModelObj = parseModelString(configuredModel);
          const retryResponse = await client.session.prompt({
            path: { id: newSessionId },
            body: {
              model: retryModelObj,
              system: fullPrompt + '\n\nEl chat se ha reiniciado. Saluda al usuario amablemente.',
              parts,
              permission,
            },
          });
          
          const retryAny = retryResponse as any;
          const retryParts = retryAny.data?.parts || retryAny.parts || [];
          const retryText = retryAny.data?.text || retryAny.text;
          
          if (retryParts.length === 0 && retryText) {
            log(`[OpenCode] Nueva sesión respondió para ${fromShort}`);
            return '⚠️ Tu chat se ha reiniciado debido a que excediste el límite de mensajes. ¡Hola de nuevo! ¿En qué puedo ayudarte hoy?';
          }
          
          return extractTextFromResponse(retryParts);
        } catch (retryErr) {
          log('[OpenCode] Error en retry tras context overflow:', retryErr);
          return '⚠️ Tu chat se ha reiniciado. ¡Hola de nuevo! ¿En qué puedo ayudarte?';
        }
      }
      
      throw new Error(errorMsg);
    }

    let responseParts = responseAny.data?.parts || responseAny.parts || [];
    let responseText = responseAny.data?.text || responseAny.text || responseAny.content || responseAny.response;
    
    if (!responseParts || responseParts.length === 0) {
      if (responseText) {
        log('[OpenCode] Usando campo text/content del response');
        return responseText;
      }
      if (typeof responseAny === 'string') {
        log('[OpenCode] Response es string directo');
        return responseAny;
      }
      if (responseAny.data && typeof responseAny.data === 'string') {
        log('[OpenCode] Response.data es string directo');
        return responseAny.data;
      }
      logSensitive('[OpenCode] Parts vacíos, response completo:', response);
      return 'Sin respuesta';
    }
    
    return extractTextFromResponse(responseParts);
  } catch (err) {
    const errStr = String(err);

    if (errStr.includes('ContextOverflowError') || errStr.includes('context limit')) {
      log(`[OpenCode] Context overflow para ${fromShort}. Reiniciando sesión...`);
      deleteSession(phone);
      
      try {
        const { sessionId: newSessionId } = await getOrCreateSession(phone);
        log(`[OpenCode] Nueva sesión creada para ${fromShort}, reintentando...`);
        
        const retryModelObj = parseModelString(configuredModel);
        const retryResponse = await client.session.prompt({
          path: { id: newSessionId },
          body: {
            model: retryModelObj,
            system: fullPrompt + '\n\nEl chat se ha reiniciado. Saluda al usuario amablemente.',
            parts,
            permission,
          },
        });
        
        const retryAny = retryResponse as any;
        const retryParts = retryAny.data?.parts || retryAny.parts || [];
        const retryText = retryAny.data?.text || retryAny.text;
        
        if (retryParts.length === 0 && retryText) {
          log(`[OpenCode] Nueva sesión respondió para ${fromShort}`);
          return '⚠️ Tu chat se ha reiniciado debido a que excediste el límite de mensajes. ¡Hola de nuevo!¿En qué puedo ayudarte hoy?';
        }
        
        return extractTextFromResponse(retryParts);
      } catch (retryErr) {
        log('[OpenCode] Error en retry tras context overflow:', retryErr);
        return '⚠️ Tu chat se ha reiniciado. ¡Hola de nuevo! ¿En qué puedo ayudarte?';
      }
    }

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
        let retryPrompt = buildSystemPrompt(customPrompt, systemPrompt, appVersion);
        retryPrompt += '\n\nNota: Este es el primer mensaje de esta sesión. El contexto se ha reiniciado. Saluda al usuario amablemente y pregúntale en qué puedes ayudarle.';
        
        const retryPerms = getUserPermissions(phone);
        const retryPermission: Record<string, unknown> = {
          read: retryPerms?.can_read ? 'allow' : 'deny',
          write: retryPerms?.can_create ? 'allow' : 'deny',
          edit: retryPerms?.can_modify ? 'allow' : 'deny',
          bash: retryPerms?.can_modify ? { '*': 'allow' } : { '*': 'deny' },
        };

        const retryModelObj = parseModelString(configuredModel);

        const retryResponse = await client.session.prompt({
          path: { id: newSessionId },
          body: {
            model: retryModelObj,
            system: retryPrompt,
            parts,
            permission: retryPermission,
          },
        });

        const retryAny = retryResponse as any;
        if (retryAny.error) {
          const errInfo = retryAny.error;
          throw new Error(`${errInfo.name || 'Error'}: ${JSON.stringify(errInfo.data || errInfo).substring(0, 300)}`);
        }

        log(`[OpenCode] Respuesta reintentada recibida desde ${fromShort}`);
        
        let retryParts = retryAny.data?.parts || retryAny.parts || [];
        let retryText = retryAny.data?.text || retryAny.text;
        
        if (retryParts.length === 0 && retryText) {
          return retryText;
        }
        
        return extractTextFromResponse(retryParts);
      } catch (retryErr) {
        log('[OpenCode] Error en reintento:', retryErr);
        return `Lo siento, ocurrió un error al procesar tu mensaje. El servicio de IA está temporalmente indisponible. Por favor, intenta de nuevo en unos minutos.`;
      }
    }

    // Si no es error de conexión, lanzar el error original
    log('[OpenCode] Error en consulta:', err);
    if (String(err).includes('Timeout')) {
      return 'Lo siento, el modelo tardó mucho en responder. Por favor, intenta de nuevo.';
    }
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

export function getOpenCodePort(): number {
  return OPENCODE_PORT;
}

export function getOpenCodeClient(): any {
  return client;
}
