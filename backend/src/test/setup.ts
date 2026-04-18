/**
 * Setup de Pruebas
 * 
 * Configura el entorno para pruebas unitarias.
 * 
 * @file test/setup.ts
 */

import { mock } from 'bun:test';

// Mock variables de entorno para tests
process.env.ENV = 'test';
process.env.OPENCODE_PORT = '4099';
process.env.PORT = '3000';

// Mock de console.log para tests
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  // En test, solo loguea si es necesario
};
