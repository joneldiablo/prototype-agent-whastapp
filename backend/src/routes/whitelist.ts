import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, WhitelistEntry } from '../types/index.js';
import { getWhitelist, addToWhitelist, updateWhitelistEntry, deleteFromWhitelist } from '../db/index.js';

const router = Router();

router.get('/', (_req, res: Response<ApiResponse<WhitelistEntry[]>>) => {
  const entries = getWhitelist();
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Lista blanca recuperada',
    data: entries,
  });
});

router.post('/', (req: Request<Record<string, never>, unknown, { phone: string; prompt?: string; is_blacklist?: boolean }>, res: Response<ApiResponse>) => {
  const { phone, prompt, is_blacklist } = req.body;
  
  if (!phone) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'El número de teléfono es requerido',
    });
  }
  
  try {
    const result = addToWhitelist(phone, prompt, is_blacklist ? 1 : 0);
    res.json({
      success: true,
      error: false,
      status: 201,
      code: 201,
      message: 'Entrada agregada a la lista',
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    res.json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: error instanceof Error ? error.message : 'Error al agregar entrada',
    });
  }
});

router.put('/:id', (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'ID inválido',
    });
  }
  
  const { phone, prompt, enabled, is_blacklist } = req.body;
  
  try {
    const result = updateWhitelistEntry(id, { phone, prompt, enabled, is_blacklist });
    
    if (result.changes === 0) {
      return res.json({
        success: false,
        error: true,
        status: 404,
        code: 404,
        message: 'Entrada no encontrada',
      });
    }
    
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: 'Entrada actualizada',
    });
  } catch (error) {
    res.json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: error instanceof Error ? error.message : 'Error al actualizar entrada',
    });
  }
});

router.delete('/:id', (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  const id = parseInt(req.params.id, 10);
  
  if (isNaN(id)) {
    return res.json({
      success: false,
      error: true,
      status: 400,
      code: 400,
      message: 'ID inválido',
    });
  }
  
  try {
    const result = deleteFromWhitelist(id);
    
    if (result.changes === 0) {
      return res.json({
        success: false,
        error: true,
        status: 404,
        code: 404,
        message: 'Entrada no encontrada',
      });
    }
    
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: 'Entrada eliminada',
    });
  } catch (error) {
    res.json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: error instanceof Error ? error.message : 'Error al eliminar entrada',
    });
  }
});

export default router;