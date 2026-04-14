import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse } from '../types/index.js';
import { getConfig, setConfig, getMessagesLog } from '../db/index.js';
import fs from 'fs';
import path from 'path';

const router = Router();

function getAppVersion(): string {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

router.get('/system-version', (_req, res: Response<ApiResponse>) => {
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Versión del sistema',
    data: { version: getAppVersion() },
  });
});

router.get('/system-prompt', (_req, res: Response<ApiResponse>) => {
  const prompt = getConfig('system_prompt');
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Prompt del sistema',
    data: { prompt: prompt || '' },
  });
});

router.put('/system-prompt', (req: Request<Record<string, never>, unknown, { prompt: string }>, res: Response<ApiResponse>) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'El prompt es requerido',
    });
  }
  
  setConfig('system_prompt', prompt);
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Prompt del sistema actualizado',
  });
});

router.get('/messages', (_req, res: Response<ApiResponse>) => {
  const messages = getMessagesLog();
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Historial de mensajes',
    data: messages,
  });
});

export default router;