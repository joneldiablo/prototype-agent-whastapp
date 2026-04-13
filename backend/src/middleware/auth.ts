import type { Request, Response, NextFunction } from 'express';

const ADMIN_CREDENTIALS = process.env.OPENCOD_USER_PASSWORD || 'admin:password123';

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

function validateCredentials(user: string, pass: string): boolean {
  const [expectedUser, expectedPass] = ADMIN_CREDENTIALS.split(':');
  return user === expectedUser && pass === expectedPass;
}

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const credentials = parseBasicAuth(authHeader);
  
  if (!credentials || !validateCredentials(credentials.user, credentials.pass)) {
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