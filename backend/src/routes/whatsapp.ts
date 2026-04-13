import { Router } from 'express';
import type { Response } from 'express';
import type { ApiResponse } from '../types/index.js';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp, getQR } from '../services/whatsapp.js';

const router = Router();

router.get('/status', (_req, res: Response<ApiResponse>) => {
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

router.post('/connect', async (_req, res: Response<ApiResponse>) => {
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

router.post('/disconnect', async (_req, res: Response<ApiResponse>) => {
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

router.get('/qr', async (_req, res: Response<ApiResponse>) => {
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