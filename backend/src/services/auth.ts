/**
 * Auth Service - OAuth2.0 style login
 * 
 * - Login con usuario/contraseña → devuelve token
 * - Token con expiry
 * - Logout inválida token
 */

const TOKEN_SECRET = process.env.TOKEN_SECRET;
const TOKEN_EXPIRY_HOURS = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);

// Credenciales desde variable de entorno - REQUERIDA
if (!process.env.OPENCODE_USER_PASSWORD) {
  throw new Error('OPENCODE_USER_PASSWORD no está configurada en .env');
}

const ADMIN_USER_PASS = process.env.OPENCODE_USER_PASSWORD.split(':');
const VALID_USER = ADMIN_USER_PASS[0];
const VALID_PASS = ADMIN_USER_PASS[1];

// In-memory token store
const tokens = new Map<string, { user: string; exp: number }>();

/**
 * Genera token aleatorio
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Login - valida credenciales y devuelve token
 */
export async function login(username: string, password: string): Promise<{ token: string; expiresIn: number } | null> {
  if (username !== VALID_USER || password !== VALID_PASS) {
    return null;
  }
  
  const token = generateToken();
  const exp = Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  tokens.set(token, { user: username, exp });
  
  return { token, expiresIn: TOKEN_EXPIRY_HOURS * 3600 };
}

/**
 * Logout - invalida token
 */
export function logout(token: string): boolean {
  return tokens.delete(token);
}

/**
 * Valida token
 */
export function validateToken(token: string): { valid: boolean; user?: string } {
  const tokenData = tokens.get(token);
  
  if (!tokenData) {
    return { valid: false };
  }
  
  if (Date.now() > tokenData.exp) {
    tokens.delete(token);
    return { valid: false };
  }
  
  return { valid: true, user: tokenData.user };
}

/**
 * Limpia tokens expirados
 */
export function cleanupTokens() {
  const now = Date.now();
  for (const [token, data] of tokens) {
    if (now > data.exp) {
      tokens.delete(token);
    }
  }
}

// Limpiar cada hora
setInterval(cleanupTokens, 60 * 60 * 1000);

export default { login, logout, validateToken };