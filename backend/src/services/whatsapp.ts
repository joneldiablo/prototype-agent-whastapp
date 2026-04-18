/**
 * WhatsApp Service
 * 
 * Maneja la conexión con WhatsApp Web usando Puppeteer.
 * 
 * Responsabilidades:
 * - Inicializar cliente WhatsApp
 * - Conectar/desconectar cliente
 * - Recibir y enviar mensajes
 * - Gestión de sesiones stale
 * 
 * @module services/whatsapp
 */

// ============================================================
// IMPORTS
// ============================================================

import { Client, LocalAuth, type Message } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { rm } from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import type { WhatsAppStatus } from '../types/index.js';
import { setConfig, logMessage } from '../db/index.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const ENV = process.env.ENV || '';
const isProd = ENV.toLowerCase() === 'prod';

/**
 * Logger para acciones del sistema (siempre visible)
 */
function log(...args: unknown[]) {
  if (isProd) {
    console.log(...args.map(maskPhoneNumbers));
  } else {
    console.log(...args);
  }
}

/**
 * Logger para información sensible (solo en desarrollo)
 */
function logSensitive(...args: unknown[]) {
  if (isProd) return;
  console.log(...args);
}

/**
 * Enmascara números de teléfono en mensajes de log (solo PROD)
 * 7209281757@c.us → 720*******@c.us
 * 7200009281757@g.us → 720*******@g.us
 */
function maskPhoneNumbers(arg: unknown): unknown {
  if (typeof arg !== 'string') return arg;
  return arg.replace(/\b(\d{3})(\d+)@([cg])\.us\b/g, '$1*******@$3.us');
}

// ============================================================
// ESTADO
// ============================================================

let client: Client | null = null;
let status: WhatsAppStatus = { connected: false };
let onMessageCallback: ((from: string, message: string, imageData?: string) => void) | null = null;

const sessionPath = path.join(import.meta.dir, '../../data/whatsapp-sessions');

// ============================================================
// CALLBACKS
// ============================================================

/**
 * Registra el handler para mensajes entrantes.
 * 
 * @param callback - Función a ejecutar cuando llegue un mensaje
 * 
 * @example
 * setMessageHandler((from, message, imageData) => {
 *   console.log(`De ${from}: ${message}`);
 * });
 */
export function setMessageHandler(callback: (from: string, message: string, imageData?: string) => void) {
  onMessageCallback = callback;
}

// ============================================================
// FUNCIONES PRIVADAS (Limpieza)
// ============================================================

/**
 * Mata procesos de Chrome/Chromium huérfanos.
 */
async function killChromeProcesses(): Promise<void> {
  return new Promise((resolve) => {
    exec('pkill -f chrome || pkill -f chromium || true', () => {
      setTimeout(resolve, 500);
    });
  });
}

/**
 * Limpia sesión stale de WhatsApp.
 * Remove el directorio de sesión y el lockfile.
 */
async function cleanupStaleSession(): Promise<void> {
  const sessionDir = path.join(sessionPath, 'session');
  const lockFile = path.join(sessionDir, 'lockfile');

  try {
    await rm(sessionPath, { recursive: true, force: true });
  } catch {
    try {
      await rm(lockFile, { force: true });
    } catch {}
  }
}

// ============================================================
// FUNCIONES PRIVADAS (Inicialización)
// ============================================================

/**
 * Crea el cliente WhatsApp.
 * Configura eventos y autenticación local.
 */
async function initClient(): Promise<Client> {
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './data/whatsapp-sessions',
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  // Evento: QR recibido
  client.on('qr', async (qr) => {
    const qrDataUrl = await QRCode.toDataURL(qr);
    status = { ...status, qr: qrDataUrl };
    log('[WhatsApp] QR recibido. Escanea con tu teléfono.');
  });

  // Evento: Cliente conectado
  client.on('ready', () => {
    const phone = client?.info?.wid?.user || 'unknown';
    status = { connected: true, phone, lastSync: new Date().toISOString() };
    setConfig('whatsapp_connected', 'true');
    log(`[WhatsApp] Cliente listo. Teléfono: ${phone}`);
  });

  // Evento: Desconexión
  client.on('disconnected', (reason) => {
    status = { connected: false };
    setConfig('whatsapp_connected', 'false');
    log(`[WhatsApp] Desconectado: ${reason}`);
  });

  // Evento: Mensaje recibido
  client.on('message', async (msg: Message) => {
    if (msg.fromMe) return;
    
    const from = msg.from;
    let body = msg.body;
    let imageData: string | undefined;
    
    // Si es imagen, descargar y obtener caption
    if (msg.type === 'image' || msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          imageData = `data:${media.mimetype};base64,${media.data}`;
          const hasText = msg.body && msg.body.length > 0;
          if (hasText) {
            body = `[Imagen] ${msg.body}`;
          } else {
            body = `[Imagen] (sin descripción)`;
          }
          logSensitive(`[WhatsApp] Imagen recibida de ${from}, mime: ${media.mimetype}, size: ${media.data.length}`);
        }
      } catch (err) {
        logSensitive(`[WhatsApp] Error al descargar imagen: ${err}`);
        body = '[Imagen] (error al procesar)';
      }
    }
    
    logSensitive(`[WhatsApp] Mensaje de ${from}: ${body}`);
    logMessage(from, body);
    
    if (onMessageCallback) {
      onMessageCallback(from, body, imageData);
    }
  });

  return client;
}

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

/**
 * Conecta al cliente WhatsApp.
 * 
 * @returns Estado de conexión
 * @throws Error si no se puede conectar después de reintentos
 * 
 * @example
 * const status = await connectWhatsApp();
 * console.log(status.connected); // true/false
 */
export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  if (client?.info?.wid) {
    return { connected: true, phone: client.info.wid.user };
  }

  try {
    client = await initClient();
    await client.initialize();
    return status;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('browser is already running') || errMsg.includes('userDataDir')) {
      log('[WhatsApp] Navegador stale detectado. Matando procesos y reintentando...');
      await killChromeProcesses();
      await cleanupStaleSession();
      try {
        client = await initClient();
        await client.initialize();
        return status;
      } catch (retryError) {
        log('[WhatsApp] Retry falló, intentando una vez más...');
        await killChromeProcesses();
        await cleanupStaleSession();
        try {
          client = await initClient();
          await client.initialize();
          return status;
        } catch {
          throw new Error('No se pudo conectar a WhatsApp después de múltiples intentos');
        }
      }
    }
    log('[WhatsApp] Error al inicializar:', errMsg);
    throw error;
  }
}

/**
 * Obtiene el estado actual de conexión.
 * 
 * @returns Objeto con estado y detalles
 * 
 * @example
 * const status = getWhatsAppStatus();
 * if (status.connected) { ... }
 */
export function getWhatsAppStatus(): WhatsAppStatus {
  return status;
}

/**
 * Envía un mensaje por WhatsApp.
 * 
 * @param to - Número destinatario
 * @param message - Mensaje a enviar
 * @returns true si se envió correctamente
 * @throws Error si no está conectado
 * 
 * @example
 * await sendMessage('+5215555555555', 'Hola!');
 */
export async function sendMessage(to: string, message: string): Promise<boolean> {
  if (!client || !status.connected) {
    throw new Error('WhatsApp no conectado');
  }

  try {
    await client.sendMessage(to, message);
    log(`[WhatsApp] Enviado a ${to}: ✓`);
    return true;
  } catch (error) {
    log(`[WhatsApp] Error al enviar:`, error);
    throw error;
  }
}

/**
 * Verifica si está conectado.
 * 
 * @returns true si conectado
 * 
 * @example
 * if (isConnected()) { ... }
 */
export function isConnected(): boolean {
  return status.connected;
}

/**
 * Desconecta y destruye el cliente.
 * 
 * @example
 * await disconnectWhatsApp();
 */
export async function disconnectWhatsApp(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
    status = { connected: false };
    setConfig('whatsapp_connected', 'false');
    log('[WhatsApp] Cliente destruido');
  }
}

/**
 * Obtiene el QR code actual para escanear.
 * 
 * @returns DataURL de la imagen QR o null
 * 
 * @example
 * const qr = await getQR();
 */
export async function getQR(): Promise<string | null> {
  if (status.qr) return status.qr;
  
  if (!client) {
    const tempClient = await initClient();
    await tempClient.initialize();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return status.qr || null;
  }
  
  return null;
}

export interface ContactSearchResult {
  id: string;
  name?: string;
  pushName?: string;
  phone?: string;
  isGroup: boolean;
}

/**
 * Busca contactos y grupos por nombre, teléfono o ID.
 * 
 * @param query - Texto a buscar (mínimo 2 caracteres)
 * @returns Array de contactos/grupos encontrados
 * 
 * @example
 * const results = await searchContacts('Juan');
 * // [{ id: '5215555555555@c.us', name: 'Juan', phone: '5215555555555', isGroup: false }]
 */
export async function searchContacts(query: string): Promise<ContactSearchResult[]> {
  if (!client || !status.connected) {
    return [];
  }

  const results: ContactSearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  try {
    const chats = await client.getChats();
    
    for (const chat of chats) {
      const chatName = chat.name || '';
      const contact = chat.id;
      
      if (contact.server === 'g.us') {
        if (chatName.toLowerCase().includes(lowerQuery) || contact._serialized.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: contact._serialized,
            name: chatName,
            isGroup: true,
          });
        }
      } else if (contact.server === 'c.us') {
        const contactObj = await client.getContactById(contact._serialized);
        const name = contactObj.pushName || contactObj.shortName || contactObj.name || '';
        
        if (name.toLowerCase().includes(lowerQuery) || contact._serialized.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: contact._serialized,
            name: name,
            pushName: contactObj.pushName,
            phone: contact._serialized.replace('@c.us', ''),
            isGroup: false,
          });
        }
      }

      if (results.length >= 20) break;
    }
  } catch (error) {
    log('[WhatsApp] Error searching contacts:', error);
  }

  return results;
}