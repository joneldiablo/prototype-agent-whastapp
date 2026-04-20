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
const MAX_MESSAGE_LENGTH = 4000;

export function sanitizeForWhatsApp(text: string): string {
  const allowedRanges = [
    [0x0000, 0x007F],
    [0x00A0, 0x00FF],
    [0x0100, 0x017F],
    [0x0180, 0x024F],
    [0x0250, 0x02AF],
    [0x02B0, 0x02FF],
    [0x0300, 0x036F],
    [0x0370, 0x03FF],
    [0x0400, 0x04FF],
    [0x0500, 0x052F],
    [0x0530, 0x058F],
    [0x0590, 0x05FF],
    [0x0600, 0x06FF],
    [0x0700, 0x074F],
    [0x0750, 0x077F],
    [0x0780, 0x07BF],
    [0x07C0, 0x07FF],
    [0x0800, 0x083F],
    [0x0900, 0x097F],
    [0x0980, 0x09FF],
    [0x0A00, 0x0A7F],
    [0x0A80, 0x0AFF],
    [0x0B00, 0x0B7F],
    [0x0B80, 0x0BFF],
    [0x0C00, 0x0C7F],
    [0x0C80, 0x0CFF],
    [0x0D00, 0x0D7F],
    [0x0D80, 0x0DFF],
    [0x0E00, 0x0E7F],
    [0x0E80, 0x0EFF],
    [0x0F00, 0x0FFF],
    [0x1000, 0x109F],
    [0x10A0, 0x10FF],
    [0x1100, 0x11FF],
    [0x1200, 0x137F],
    [0x1380, 0x139F],
    [0x13A0, 0x13FF],
    [0x1400, 0x167F],
    [0x1680, 0x169F],
    [0x16A0, 0x16FF],
    [0x1700, 0x171F],
    [0x1720, 0x173F],
    [0x1740, 0x175F],
    [0x1760, 0x177F],
    [0x1780, 0x17FF],
    [0x1800, 0x18AF],
    [0x1900, 0x194F],
    [0x1950, 0x197F],
    [0x1980, 0x19DF],
    [0x19E0, 0x19FF],
    [0x1A00, 0x1A1F],
    [0x1A20, 0x1AFF],
    [0x1B00, 0x1B7F],
    [0x1B80, 0x1BFF],
    [0x1C00, 0x1C4F],
    [0x1C50, 0x1C7F],
    [0x1D00, 0x1D7F],
    [0x1D80, 0x1DBF],
    [0x1DC0, 0x1DFF],
    [0x1E00, 0x1E7F],
    [0x1E80, 0x1EFF],
    [0x1F00, 0x1FFF],
    [0x2000, 0x206F],
    [0x2070, 0x209F],
    [0x20A0, 0x20CF],
    [0x20D0, 0x20FF],
    [0x2100, 0x214F],
    [0x2150, 0x215F],
    [0x2160, 0x216F],
    [0x2170, 0x217F],
    [0x2180, 0x218F],
    [0x2190, 0x21FF],
    [0x2200, 0x22FF],
    [0x2300, 0x23FF],
    [0x2400, 0x243F],
    [0x2440, 0x245F],
    [0x2460, 0x24FF],
    [0x2500, 0x257F],
    [0x2580, 0x259F],
    [0x25A0, 0x25FF],
    [0x2600, 0x26FF],
    [0x2700, 0x27BF],
    [0x27C0, 0x27EF],
    [0x27F0, 0x27FF],
    [0x2800, 0x28FF],
    [0x2900, 0x297F],
    [0x2980, 0x29FF],
    [0x2A00, 0x2AFF],
    [0x2B00, 0x2BFF],
    [0x2C00, 0x2C5F],
    [0x2C60, 0x2C7F],
    [0x2C80, 0x2CFF],
    [0x2D00, 0x2D2F],
    [0x2D30, 0x2D7F],
    [0x2D80, 0x2DDF],
    [0x2E00, 0x2E7F],
    [0x2E80, 0x2EFF],
    [0x2F00, 0x2FDF],
    [0x2FE0, 0x2FEF],
    [0x2FF0, 0x2FFF],
    [0x3000, 0x303F],
    [0x3040, 0x309F],
    [0x30A0, 0x30FF],
    [0x3100, 0x312F],
    [0x3130, 0x318F],
    [0x3190, 0x319F],
    [0x31A0, 0x31BF],
    [0x31C0, 0x31EF],
    [0x31F0, 0x31FF],
    [0x3200, 0x32FF],
    [0x3300, 0x33FF],
    [0x3400, 0x34FF],
    [0x3500, 0x35FF],
    [0x3600, 0x36FF],
    [0x3700, 0x37FF],
    [0x3800, 0x38FF],
    [0x3900, 0x39FF],
    [0x3A00, 0x3AFF],
    [0x3B00, 0x3BFF],
    [0x3C00, 0x3CFF],
    [0x3D00, 0x3DFF],
    [0x3E00, 0x3EFF],
    [0x3F00, 0x3FFF],
    [0x4000, 0x40FF],
    [0x4100, 0x41FF],
    [0x4200, 0x42FF],
    [0x4300, 0x43FF],
    [0x4400, 0x44FF],
    [0x4500, 0x45FF],
    [0x4600, 0x46FF],
    [0x4700, 0x47FF],
    [0x4800, 0x48FF],
    [0x4900, 0x49FF],
    [0x4A00, 0x4AFF],
    [0x4B00, 0x4BFF],
    [0x4C00, 0x4CFF],
    [0x4D00, 0x4DFF],
    [0x4E00, 0x4EFF],
    [0x4F00, 0x4FFF],
    [0x5000, 0x50FF],
    [0x5100, 0x51FF],
    [0x5200, 0x52FF],
    [0x5300, 0x53FF],
    [0x5400, 0x54FF],
    [0x5500, 0x55FF],
    [0x5600, 0x56FF],
    [0x5700, 0x57FF],
    [0x5800, 0x58FF],
    [0x5900, 0x59FF],
    [0x5A00, 0x5AFF],
    [0x5B00, 0x5BFF],
    [0x5C00, 0x5CFF],
    [0x5D00, 0x5DFF],
    [0x5E00, 0x5EFF],
    [0x5F00, 0x5FFF],
    [0x6000, 0x60FF],
    [0x6100, 0x61FF],
    [0x6200, 0x62FF],
    [0x6300, 0x63FF],
    [0x6400, 0x64FF],
    [0x6500, 0x65FF],
    [0x6600, 0x66FF],
    [0x6700, 0x67FF],
    [0x6800, 0x68FF],
    [0x6900, 0x69FF],
    [0x6A00, 0x6AFF],
    [0x6B00, 0x6BFF],
    [0x6C00, 0x6CFF],
    [0x6D00, 0x6DFF],
    [0x6E00, 0x6EFF],
    [0x6F00, 0x6FFF],
    [0x7000, 0x70FF],
    [0x7100, 0x71FF],
    [0x7200, 0x72FF],
    [0x7300, 0x73FF],
    [0x7400, 0x74FF],
    [0x7500, 0x75FF],
    [0x7600, 0x76FF],
    [0x7700, 0x77FF],
    [0x7800, 0x78FF],
    [0x7900, 0x79FF],
    [0x7A00, 0x7AFF],
    [0x7B00, 0x7BFF],
    [0x7C00, 0x7CFF],
    [0x7D00, 0x7DFF],
    [0x7E00, 0x7EFF],
    [0x7F00, 0x7FFF],
    [0x8000, 0x80FF],
    [0x8100, 0x81FF],
    [0x8200, 0x82FF],
    [0x8300, 0x83FF],
    [0x8400, 0x84FF],
    [0x8500, 0x85FF],
    [0x8600, 0x86FF],
    [0x8700, 0x87FF],
    [0x8800, 0x88FF],
    [0x8900, 0x89FF],
    [0x8A00, 0x8AFF],
    [0x8B00, 0x8BFF],
    [0x8C00, 0x8CFF],
    [0x8D00, 0x8DFF],
    [0x8E00, 0x8EFF],
    [0x8F00, 0x8FFF],
    [0x9000, 0x90FF],
    [0x9100, 0x91FF],
    [0x9200, 0x92FF],
    [0x9300, 0x93FF],
    [0x9400, 0x94FF],
    [0x9500, 0x95FF],
    [0x9600, 0x96FF],
    [0x9700, 0x97FF],
    [0x9800, 0x98FF],
    [0x9900, 0x99FF],
    [0x9A00, 0x9AFF],
    [0x9B00, 0x9BFF],
    [0x9C00, 0x9CFF],
    [0x9D00, 0x9DFF],
    [0x9E00, 0x9EFF],
    [0x9F00, 0x9FFF],
    [0xA000, 0xA0FF],
    [0xA100, 0xA1FF],
    [0xA200, 0xA2FF],
    [0xA300, 0xA3FF],
    [0xA400, 0xA4FF],
    [0xA500, 0xA5FF],
    [0xA600, 0xA6FF],
    [0xA700, 0xA7FF],
    [0xA800, 0xA8FF],
    [0xA900, 0xA9FF],
    [0xAA00, 0xAAFF],
    [0xAB00, 0xABFF],
    [0xAC00, 0xACFF],
    [0xAD00, 0xADFF],
    [0xAE00, 0xAEFF],
    [0xAF00, 0xAFFF],
    [0xB000, 0xB0FF],
    [0xB100, 0xB1FF],
    [0xB200, 0xB2FF],
    [0xB300, 0xB3FF],
    [0xB400, 0xB4FF],
    [0xB500, 0xB5FF],
    [0xB600, 0xB6FF],
    [0xB700, 0xB7FF],
    [0xB800, 0xB8FF],
    [0xB900, 0xB9FF],
    [0xBA00, 0xBAFF],
    [0xBB00, 0xBBFF],
    [0xBC00, 0xBCFF],
    [0xBD00, 0xBDFF],
    [0xBE00, 0xBEFF],
    [0xBF00, 0xBFFF],
    [0xC000, 0xC0FF],
    [0xC100, 0xC1FF],
    [0xC200, 0xC2FF],
    [0xC300, 0xC3FF],
    [0xC400, 0xC4FF],
    [0xC500, 0xC5FF],
    [0xC600, 0xC6FF],
    [0xC700, 0xC7FF],
    [0xC800, 0xC8FF],
    [0xC900, 0xC9FF],
    [0xCA00, 0xCAFF],
    [0xCB00, 0xCBFF],
    [0xCC00, 0xCCFF],
    [0xCD00, 0xCDFF],
    [0xCE00, 0xCEFF],
    [0xCF00, 0xCFFF],
    [0xD000, 0xD0FF],
    [0xD100, 0xD1FF],
    [0xD200, 0xD2FF],
    [0xD300, 0xD3FF],
    [0xD400, 0xD4FF],
    [0xD500, 0xD5FF],
    [0xD600, 0xD6FF],
    [0xD700, 0xD7FF],
    [0xD800, 0xD8FF],
    [0xD900, 0xD9FF],
    [0xDA00, 0xDAFF],
    [0xDB00, 0xDBFF],
    [0xDC00, 0xDCFF],
    [0xDD00, 0xDDFF],
    [0xDE00, 0xDEFF],
    [0xDF00, 0xDFFF],
    [0xE000, 0xE0FF],
    [0xE100, 0xE1FF],
    [0xE200, 0xE2FF],
    [0xE300, 0xE3FF],
    [0xE400, 0xE4FF],
    [0xE500, 0xE5FF],
    [0xE600, 0xE6FF],
    [0xE700, 0xE7FF],
    [0xE800, 0xE8FF],
    [0xE900, 0xE9FF],
    [0xEA00, 0xEAFF],
    [0xEB00, 0xEBFF],
    [0xEC00, 0xECFF],
    [0xED00, 0xEDFF],
    [0xEE00, 0xEEFF],
    [0xEF00, 0xEFFF],
    [0xF000, 0xF0FF],
    [0xF100, 0xF1FF],
    [0xF200, 0xF2FF],
    [0xF300, 0xF3FF],
    [0xF400, 0xF4FF],
    [0xF500, 0xF5FF],
    [0xF600, 0xF6FF],
    [0xF700, 0xF7FF],
    [0xF800, 0xF8FF],
    [0xF900, 0xF9FF],
    [0xFA00, 0xFAFF],
    [0xFB00, 0xFBFF],
    [0xFC00, 0xFCFF],
    [0xFD00, 0xFDFF],
    [0xFE00, 0xFEFF],
    [0xFE70, 0xFEFE],
    [0xFF00, 0xFFFF],
  ];

  return text
    .normalize('NFKC')
    .split('')
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return allowedRanges.some(([start, end]) => code >= start && code <= end);
    })
    .join('')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\u0000/g, '');
}

export async function sendMessage(to: string, message: string): Promise<boolean> {
  if (!client || !status.connected) {
    throw new Error('WhatsApp no conectado');
  }

  const sanitized = sanitizeForWhatsApp(message);

  if (sanitized.length <= MAX_MESSAGE_LENGTH) {
    await client.sendMessage(to, sanitized);
    log(`[WhatsApp] Enviado a ${to}: ✓`);
    return true;
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of sanitized.split('\n')) {
    if ((currentChunk + '\n' + paragraph).length <= MAX_MESSAGE_LENGTH) {
      currentChunk += (currentChunk ? '\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `[${i + 1}/${chunks.length}]\n` : '';
    await client.sendMessage(to, prefix + chunks[i]);
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  log(`[WhatsApp] Enviado a ${to}: ${chunks.length} fragmentos ✓`);
  return true;
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