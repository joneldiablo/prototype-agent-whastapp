/**
 * Pruebas de Auth Service
 * 
 * @group auth
 */

import { describe, expect, test } from 'bun:test';
import { login, logout, validateToken } from '../../services/auth.js';

const CREDENTIALS = process.env.OPENCODE_USER_PASSWORD?.split(':');
const HAS_CREDS = CREDENTIALS?.length >= 2;
const USER = CREDENTIALS?.[0];
const PASS = CREDENTIALS?.[1];

describe.skipIf(!HAS_CREDS)('Auth - Login', () => {
  test('Login con credenciales válidas retorna token', async () => {
    const result = await login(USER!, PASS!);
    expect(result).not.toBeNull();
    expect(result?.token).toBeDefined();
  });

  test('Login con contraseña inválida retorna null', async () => {
    const result = await login(USER!, 'wrong');
    expect(result).toBeNull();
  });

  test('Login con usuario inválido retorna null', async () => {
    const result = await login('invalid', PASS!);
    expect(result).toBeNull();
  });
});

describe.skipIf(!HAS_CREDS)('Auth - Validate', () => {
  test('Token válido retorna valid true', async () => {
    const result = await login(USER!, PASS!);
    const v = validateToken(result!.token);
    expect(v.valid).toBe(true);
  });

  test('Token inválido retorna valid false', () => {
    const v = validateToken('invalid');
    expect(v.valid).toBe(false);
  });
});

describe.skipIf(!HAS_CREDS)('Auth - Logout', () => {
  test('Logout invalida token', async () => {
    const result = await login(USER!, PASS!);
    const token = result!.token;
    
    expect(validateToken(token).valid).toBe(true);
    logout(token);
    expect(validateToken(token).valid).toBe(false);
  });
});

