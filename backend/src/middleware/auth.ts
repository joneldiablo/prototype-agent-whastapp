/**
 * Basic Auth Middleware (Legacy - ya no usado)
 * 
 * Este archivo se mantiene por compatibilidad pero ya no se usa.
 * El sistema ahora usa OAuth2.0 con tokens en services/auth.ts
 */

import type { Request, Response, NextFunction } from 'express';

// Credenciales desde variable de entorno
if (!process.env.OPENCODE_USER_PASSWORD) {
  throw new Error('OPENCODE_USER_PASSWORD no está configurada');
}

const ADMIN_CREDENTIALS = process.env.OPENCODE_USER_PASSWORD.split(':');
const EXPECTED_USER = ADMIN_CREDENTIALS[0];
const EXPECTED_PASS = ADMIN_CREDENTIALS[1];

/**
 * Parsea el header Authorization: Basic base64(user:pass)
 */
function parseBasicAuth(authHeader: string | undefined): { user: string; pass: string } | null {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }
  
  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const colonIndex = decoded.indexOf(':');
  
  if (colonIndex === -1) {
    return null;
  }
  
  return {
    user: decoded.slice(0, colonIndex),
    pass: decoded.slice(colonIndex + 1),
  };
}

/**
 * Middleware de autenticación básica.
 * (ya no usado - reemplazo por OAuth2.0)
 */
export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const credentials = parseBasicAuth(authHeader);
  
  if (!credentials || credentials.user !== EXPECTED_USER || credentials.pass !== EXPECTED_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    res.status(401).json({
      success: false,
      error: true,
      status: 401,
      code: 401,
      message: 'Unauthorized: Credenciales inválidas',
    });
    return;
  }
  
  next();
}