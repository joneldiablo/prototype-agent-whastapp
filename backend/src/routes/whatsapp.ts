import { Router } from 'express';
import type { Response, Request } from 'express';
import type { ApiResponse } from '../types/index.js';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp, getQR } from '../services/whatsapp.js';
import { validateToken } from '../services/auth.js';

const router = Router();

function requireAuth(req: Request, res: Response, next: any) {
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

router.get('/status', requireAuth, (_req, res: Response<ApiResponse>) => {
  const status = getWhatsAppStatus();
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Estado de WhatsApp',
    data: status,
  });
});

router.post('/connect', requireAuth, async (_req, res: Response<ApiResponse>) => {
  try {
    const status = await connectWhatsApp();
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: status.connected ? 'WhatsApp conectado' : 'Conectando WhatsApp...',
      data: status,
    });
  } catch (error) {
    res.json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: error instanceof Error ? error.message : 'Error al conectar',
    });
  }
});

router.post('/disconnect', requireAuth, async (_req, res: Response<ApiResponse>) => {
  try {
    await disconnectWhatsApp();
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: 'WhatsApp desconectado',
    });
  } catch (error) {
    res.json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: error instanceof Error ? error.message : 'Error al desconectar',
    });
  }
});

router.get('/qr', requireAuth, async (_req, res: Response<ApiResponse>) => {
  try {
    const qr = await getQR();
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: qr ? 'QR disponible' : 'Generando QR...',
      data: { qr },
    });
  } catch (error) {
    res.json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: error instanceof Error ? error.message : 'Error al generar QR',
    });
  }
});

export default router;