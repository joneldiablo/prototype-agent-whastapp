import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import basicAuth from 'express-basic-auth';
import { mkdir } from 'fs/promises';
import path from 'path';

import whatsappRoutes from './routes/whatsapp.js';
import whitelistRoutes from './routes/whitelist.js';
import configRoutes from './routes/config.js';
import { connectWhatsApp, setMessageHandler, sendMessage, isConnected } from './services/whatsapp.js';
import { chatWithBigPickle, isOpenCodeConfigured } from './services/opencode.js';
import { initDb, getWhitelist, getConfig, logMessage } from './db/index.js';

const ADMIN_USER_PASS = (process.env.OPENCODE_USER_PASSWORD || 'admin:password123').split(':');
const adminUser = ADMIN_USER_PASS[0];
const adminPass = ADMIN_USER_PASS[1];

const app = express();
const PORT = process.env.PORT || 3000;

await mkdir('./data', { recursive: true });
await initDb();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  console.log(`[REQ] Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[REQ] Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

const authMiddleware = basicAuth({
  users: { [adminUser]: adminPass },
  challenge: true,
});

app.use('/api/whitelist', authMiddleware, whitelistRoutes);
app.use('/api/config', authMiddleware, configRoutes);

async function handleIncomingMessage(from: string, message: string) {
  if (!isOpenCodeConfigured()) {
    console.log('[Agent] OpenCode no configurado. Ignorando mensaje.');
    return;
  }

  const whitelist = getWhitelist() as Array<{ phone: string; prompt: string | null; enabled: number; is_blacklist: number }>;
  
  const entry = whitelist.find(w => w.phone === from);
  
  if (entry && entry.is_blacklist) {
    console.log(`[Agent] Número ${from} en blacklist. Ignorando.`);
    return;
  }

  if (entry && !entry.enabled) {
    console.log(`[Agent] Número ${from} deshabilitado. Ignorando.`);
    return;
  }

  const systemPrompt = getConfig('system_prompt') || 'Eres un asistente útil y amigable.';
  const customPrompt = entry?.prompt || null;
  
  const finalPrompt = customPrompt ? `${systemPrompt}\n\nInstrucciones adicionales: ${customPrompt}` : systemPrompt;

  try {
    console.log(`[Agent] Enviando mensaje a Big Pickle...`);
    const response = await chatWithBigPickle(message, finalPrompt);
    console.log(`[Agent] Respuesta: ${response.substring(0, 100)}...`);
    
    logMessage(from, message, response);
    
    if (isConnected()) {
      await sendMessage(from, response);
      console.log(`[Agent] Respuesta enviada a ${from}`);
    }
  } catch (error) {
    console.error('[Agent] Error al procesar mensaje:', error);
  }
}

setMessageHandler(handleIncomingMessage);

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

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(import.meta.dir, '../../frontend/index.html'));
});

app.get('/', (_req, res) => {
  res.redirect('/admin');
});

app.use((_req, res) => {
  res.json({
    success: false,
    error: true,
    status: 404,
    code: 404,
    message: 'Ruta no encontrada',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;