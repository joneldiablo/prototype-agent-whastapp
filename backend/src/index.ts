import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { mkdir } from 'fs/promises';
import path from 'path';

import whatsappRoutes from './routes/whatsapp.js';
import whitelistRoutes from './routes/whitelist.js';
import configRoutes from './routes/config.js';
import { basicAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

await mkdir('./data', { recursive: true });

app.use(cors());
app.use(express.json());

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