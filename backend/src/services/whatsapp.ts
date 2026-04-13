import { Client, LocalAuth, type Message } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import type { WhatsAppStatus } from '../types/index.js';
import { setConfig, getConfig, logMessage } from '../db/index.js';

let client: Client | null = null;
let status: WhatsAppStatus = { connected: false };
let onMessageCallback: ((from: string, message: string) => void) | null = null;

export function setMessageHandler(callback: (from: string, message: string) => void) {
  onMessageCallback = callback;
}

async function initClient(): Promise<Client> {
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './data/whatsapp-sessions',
    }),
    puppeteer: {
      headless: true,
      userDataDir: './data/.wwebjs_cache',
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

  client.on('qr', async (qr) => {
    const qrDataUrl = await QRCode.toDataURL(qr);
    status = { ...status, qr: qrDataUrl };
    console.log('[WhatsApp] QR recibido. Escanea con tu teléfono.');
  });

  client.on('ready', () => {
    const phone = client?.info?.wid?.user || 'unknown';
    status = { connected: true, phone, lastSync: new Date().toISOString() };
    setConfig('whatsapp_connected', 'true');
    console.log(`[WhatsApp] Cliente listo. Teléfono: ${phone}`);
  });

  client.on('disconnected', (reason) => {
    status = { connected: false };
    setConfig('whatsapp_connected', 'false');
    console.log(`[WhatsApp] Desconectado: ${reason}`);
  });

  client.on('message', async (msg: Message) => {
    if (msg.fromMe) return;
    
    const from = msg.from;
    const body = msg.body;
    
    console.log(`[WhatsApp] Mensaje de ${from}: ${body}`);
    logMessage(from, body);
    
    if (onMessageCallback) {
      onMessageCallback(from, body);
    }
  });

  return client;
}

export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  if (client?.info?.wid) {
    return { connected: true, phone: client.info.wid.user };
  }

  try {
    client = await initClient();
    await client.initialize();
    return status;
  } catch (error) {
    console.error('[WhatsApp] Error al inicializar:', error);
    throw error;
  }
}

export function getWhatsAppStatus(): WhatsAppStatus {
  return status;
}

export async function sendMessage(to: string, message: string): Promise<boolean> {
  if (!client || !status.connected) {
    throw new Error('WhatsApp no conectado');
  }

  try {
    await client.sendMessage(to, message);
    console.log(`[WhatsApp] Enviado a ${to}: ${message}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Error al enviar:`, error);
    throw error;
  }
}

export function isConnected(): boolean {
  return status.connected;
}

export async function disconnectWhatsApp(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
    status = { connected: false };
    setConfig('whatsapp_connected', 'false');
    console.log('[WhatsApp] Cliente destruido');
  }
}

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