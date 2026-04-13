import { Router } from 'express';
import type { Response } from 'express';
import type { ApiResponse } from '../types/index.js';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp, generateQR } from '../services/whatsapp.js';

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
      message: 'Conectando WhatsApp',
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

router.post('/disconnect', (_req, res: Response<ApiResponse>) => {
  disconnectWhatsApp();
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'WhatsApp desconectado',
  });
});

router.get('/qr', async (_req, res: Response<ApiResponse>) => {
  try {
    const qr = await generateQR();
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: 'QR generado',
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