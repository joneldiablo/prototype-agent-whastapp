/**
 * Servidor Principal
 * 
 * Punto de entrada de la aplicación.
 * 
 * Inicializa:
 * - Base de datos SQLite
 * - Cliente OpenCode
 * - Cliente WhatsApp
 * - Rutas API
 * - Middleware
 * 
 * @module index
 */

// ============================================================
// IMPORTS
// ============================================================

import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import basicAuth from 'express-basic-auth';
import { mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';

import whatsappRoutes from './routes/whatsapp.js';
import whitelistRoutes from './routes/whitelist.js';
import configRoutes from './routes/config.js';

const APP_VERSION = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version || '1.0.0';

// ============================================================
// WEBSOCKET SERVER
// ============================================================

const WS_PORT = parseInt(process.env.PORT || '3000', 10) + 1;
const wss = new WebSocketServer({ port: WS_PORT });

const clients = new Set<any>();

wss.on('connection', (ws, req) => {
  // Validar token en query string
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  
  if (!token || !validateToken(token).valid) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

/**
 * Envía mensaje a todos los clientes conectados.
 */
export function broadcastNewMessage(message: { from: string; body: string; response?: string; timestamp: string }) {
  const payload = JSON.stringify({ type: 'new_message', data: message });
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// ============================================================
// SERVICES
// ============================================================
// CONFIGURACIÓN
// ============================================================

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

/**
 * Logger conditional según entorno.
 */
function log(...args: unknown[]) {
  if (!isProd) console.log(...args);
}

// Credenciales admin
const ADMIN_USER_PASS = (process.env.OPENCODE_USER_PASSWORD || 'admin:password123').split(':');
const adminUser = ADMIN_USER_PASS[0];
const adminPass = ADMIN_USER_PASS[1];

// Servidor
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// IMPORTS (DB & Services)
// ============================================================

import { initDb, getWhitelist, logMessage as dbLogMessage } from './db/index.js';
import { initOpenCode, sendToSession, isOpenCodeConfigured } from './services/opencode.js';
import { connectWhatsApp, setMessageHandler, sendMessage, isConnected } from './services/whatsapp.js';
import { login as authLogin, logout as authLogout, validateToken } from './services/auth.js';

// ============================================================
// INICIALIZACIÓN
// ============================================================

await mkdir('./data', { recursive: true });
await initDb();
await initOpenCode(APP_VERSION);
await connectWhatsApp();

// Wrapper para guardar mensaje y hacer broadcast
function logMessage(from: string, message: string, response?: string) {
  dbLogMessage(from, message, response);
  broadcastNewMessage({
    from,
    body: message,
    response: response || '',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// Logging de requests (solo en desarrollo)
app.use((req, _res, next) => {
  if (!isProd) {
    console.log(`[REQ] ${req.method} ${req.url}`);
  }
  next();
});

// Auth para rutas protegidas
const authMiddleware = basicAuth({
  users: { [adminUser]: adminPass },
  challenge: true,
});

// Rutas públicas
app.get('/api/config/system-version', (_req, res) => {
  res.json({ success: true, version: APP_VERSION });
});

// Auth routes
app.post('/api/auth/login', express.json(), async (req, res) => {
  const { username, password } = req.body;
  const result = await authLogin(username, password);
  
  if (!result) {
    return res.json({ success: false, error: true, message: 'Credenciales inválidas' });
  }
  
  res.json({ success: true, token: result.token, expiresIn: result.expiresIn });
});

app.post('/api/auth/logout', (_req, res) => {
  const auth = _req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    authLogout(auth.substring(7));
  }
  res.json({ success: true });
});

// Middleware para validar token
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: true, message: 'Token requerido' });
  }
  
  const token = auth.substring(7);
  const validation = validateToken(token);
  
  if (!validation.valid) {
    return res.status(401).json({ success: false, error: true, message: 'Token inválido o expirado' });
  }
  
  next();
}

app.get('/api/config/system-prompt-preview', (_req, res) => {
  const dbPrompt = getConfig('system_prompt');
  const systemPromptEnv = process.env.SYSTEM_PROMPT || '';
  const fullPrompt = systemPromptEnv.includes('${version}') 
    ? systemPromptEnv.replace('${version}', APP_VERSION) 
    : systemPromptEnv + (dbPrompt ? '\n\n' + dbPrompt : '');
  res.json({ 
    success: true, 
    env: systemPromptEnv,
    db: dbPrompt || '',
    full: fullPrompt
  });
});

// Rutas con authentication (token bearer)
app.use('/api/whitelist', requireAuth, whitelistRoutes);
app.use('/api/config', requireAuth, configRoutes);

// ============================================================
// HANDLER DE MENSAJES
// ============================================================

/**
 * Maneja mensajes entrantes de WhatsApp.
 * 
 * Flujo:
 * 1. Verifica que OpenCode esté configurado
 * 2. Verifica whitelist (si enabled y no en blacklist)
 * 3. Envía mensaje a OpenCode y obtiene respuesta
 * 4. Guarda en historial
 * 5. Envía respuesta por WhatsApp
 * 
 * @param from - Número remitente
 * @param message - Mensaje recibido
 */
async function handleIncomingMessage(from: string, message: string) {
  if (!isOpenCodeConfigured()) {
    return;
  }

  const whitelist = getWhitelist() as Array<{
    phone: string; 
    prompt: string | null; 
    enabled: number; 
    is_blacklist: number 
  }>;
  
  const entry = whitelist.find(w => w.phone === from);
  
  if (entry && (entry.is_blacklist || !entry.enabled)) {
    return;
  }

  try {
    const response = await sendToSession(from, message);
    
    logMessage(from, message, response);
    
    if (isConnected()) {
      await sendMessage(from, response);
    }
  } catch (error) {
    log('[Agent] Error al procesar mensaje:', error);
  }
}

setMessageHandler(handleIncomingMessage);

// ============================================================
// RUTAS
// ============================================================

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Servidor funcionando',
  });
});

app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/config', configRoutes);

// Frontend
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(import.meta.dir, '../../frontend/index.html'));
});

app.get('/', (_req, res) => {
  res.redirect('/admin');
});

// 404
app.use((_req, res) => {
  res.json({
    success: false,
    error: true,
    status: 404,
    code: 404,
    message: 'Ruta no encontrada',
  });
});

// ============================================================
// INICIO
// ============================================================

app.listen(PORT, () => {
  log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;