import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse } from '../types/index.js';
import { getConfig, setConfig, getMessagesLog } from '../db/index.js';
import { getAvailableModels } from '../services/opencode.js';
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

const AVAILABLE_MODELS = [
  'opencode/big-pickle',
  'opencode/claude-3-5-haiku',
  'opencode/claude-opus-4-5',
  'opencode/claude-opus-4-6',
  'opencode/claude-opus-4-7',
  'opencode/claude-sonnet-4-5',
  'opencode/claude-sonnet-4-6',
  'opencode/gpt-5',
  'opencode/gpt-5.1',
  'opencode/gpt-5.2',
  'opencode/gpt-5.4',
  'opencode/gpt-5.5',
  'anthropic/claude-opus-4-5',
  'anthropic/claude-opus-4-7',
  'anthropic/claude-sonnet-4-5',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemma-3-27b-it',
  'ollama/llama3.1',
  'opencode/minimax-m2.5-free',
];

router.get('/models', async (_req, res: Response<ApiResponse>) => {
  const models = await getAvailableModels();
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Modelos disponibles',
    data: models,
  });
});

router.get('/model', async (_req, res: Response<ApiResponse>) => {
  const model = getConfig('model');
  const models = await getAvailableModels();
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Modelo configurado',
    data: { model: model || models[0] || 'opencode/big-pickle' },
  });
});

router.put('/model', async (req: Request<Record<string, never>, unknown, { model: string }>, res: Response<ApiResponse>) => {
  const { model } = req.body;
  
  if (!model) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'El modelo es requerido',
    });
  }
  
  const models = await getAvailableModels();
  if (!models.includes(model)) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: `Modelo inválido. Modelos disponibles: ${models.slice(0, 10).join(', ')}...`,
    });
  }
  
  setConfig('model', model);
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Modelo actualizado',
  });
});

router.get('/timeout', (_req, res: Response<ApiResponse>) => {
  const timeout = getConfig('request_timeout');
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Timeout configurado',
    data: { timeout: timeout ? parseInt(timeout, 10) : 120000 },
  });
});

router.put('/timeout', (req: Request<Record<string, never>, unknown, { timeout: number }>, res: Response<ApiResponse>) => {
  const { timeout } = req.body;
  
  if (!timeout || timeout < 10000) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'Timeout mínimo es 10000ms (10 segundos)',
    });
  }
  
  if (timeout > 3600000) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'Timeout máximo es 3600000ms (1 hora)',
    });
  }
  
  setConfig('request_timeout', String(timeout));
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Timeout actualizado',
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