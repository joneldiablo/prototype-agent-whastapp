/**
 * Mockup de WhatsApp Web.js para pruebas unitarias
 */

import type { Message, Client } from 'whatsapp-web.js';

export interface MockWhatsAppStatus {
  connected: boolean;
  phone?: string;
  qr?: string;
  lastSync?: string;
}

export interface MockMessage {
  from: string;
  fromMe: boolean;
  body: string;
  id: string;
}

/**
 * Crea un cliente mock de WhatsApp para testing.
 */
export function createMockWhatsAppClient(): Partial<Client> {
  let messageHandler: ((msg: Message) => void) | null = null;
  let currentStatus: MockWhatsAppStatus = { connected: false };
  const messageQueue: MockMessage[] = [];

  const client = {
    on(event: string, callback: unknown) {
      if (event === 'qr') {
        // QR callback
      } else if (event === 'ready') {
        // Ready callback
      } else if (event === 'disconnected') {
        // Disconnected callback
      } else if (event === 'message') {
        messageHandler = callback as (msg: Message) => void;
      }
      return client;
    },
    async initialize() {
      currentStatus = { 
        connected: true, 
        phone: '+5215555555555',
        lastSync: new Date().toISOString() 
      };
      return currentStatus;
    },
    async sendMessage(to: string, message: string) {
      messageQueue.push({ from: to, fromMe: true, body: message, id: `msg_${Date.now()}` });
      return true;
    },
    async destroy() {
      currentStatus = { connected: false };
      return;
    },
    get info() {
      return {
        wid: {
          user: currentStatus.phone,
        },
      };
    },
    emit(event: string, ...args: unknown[]) {
      if (event === 'message' && messageHandler) {
        const msg = args[0] as Message;
        messageHandler(msg);
      }
    },
  };

  return client as Partial<Client>;
}

/**
 * Crea un mensaje mock de WhatsApp.
 */
export function createMockMessage(overrides?: Partial<MockMessage>): MockMessage {
  return {
    from: '+5215555555555',
    fromMe: false,
    body: 'Hola',
    id: `msg_${Date.now()}`,
    ...overrides,
  };
}

/**
 * Crea un estado mock de conexión.
 */
export function createMockStatus(overrides?: Partial<MockWhatsAppStatus>): MockWhatsAppStatus {
  return {
    connected: false,
    ...overrides,
  };
}

export default {
  createMockWhatsAppClient,
  createMockMessage,
  createMockStatus,
};