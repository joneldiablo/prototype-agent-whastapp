import QRCode from 'qrcode';
import type { WhatsAppStatus } from '../types/index.js';

let status: WhatsAppStatus = {
  connected: false,
};

let qrCodeData: string | null = null;

export async function generateQR(): Promise<string> {
  const sessionId = `whatsapp-session-${Date.now()}`;
  qrCodeData = await QRCode.toDataURL(sessionId);
  status.qr = qrCodeData;
  return qrCodeData;
}

export function getWhatsAppStatus(): WhatsAppStatus {
  return status;
}

export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  await generateQR();
  return status;
}

export function setWhatsAppConnected(phone: string): void {
  status = {
    connected: true,
    phone,
    lastSync: new Date().toISOString(),
  };
  qrCodeData = undefined;
}

export function disconnectWhatsApp(): void {
  status = {
    connected: false,
  };
}

export async function sendMessage(to: string, message: string): Promise<boolean> {
  if (!status.connected) {
    throw new Error('WhatsApp no conectado');
  }
  console.log(`[WhatsApp] Enviando a ${to}: ${message}`);
  return true;
}

export function isConnected(): boolean {
  return status.connected;
}