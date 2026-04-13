import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { mkdir } from 'fs/promises';
import path from 'path';

import whatsappRoutes from './routes/whatsapp.js';
import whitelistRoutes from './routes/whitelist.js';
import configRoutes from './routes/config.js';
import { basicAuth } from './middleware/auth.js';
import { connectWhatsApp, setMessageHandler, sendMessage, isConnected } from './services/whatsapp.js';
import { chatWithBigPickle, isOpenCodeConfigured } from './services/opencode.js';
import { initDb, getWhitelist, getConfig, logMessage } from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

await mkdir('./data', { recursive: true });
await initDb();

app.use(cors());
app.use(express.json());

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

app.use('/api/whitelist', basicAuth, whitelistRoutes);

app.use('/api/config', basicAuth, configRoutes);

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