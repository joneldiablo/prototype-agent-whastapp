/**
 * Pruebas de Manejo de Archivos en Index
 * Simula el flujo de archivos entrantes desde WhatsApp
 * 
 * @group indexFiles
 */

import { describe, expect, test } from 'bun:test';

interface FileInfo {
  path: string;
  filename: string;
  mime: string;
}

function parseFileMatches(message: string): string[] {
  const matches = message.matchAll(/\[Archivo: ([^\]]+)\]/g);
  return Array.from(matches, m => m[1]);
}

function hasTextMessage(message: string): boolean {
  return message.length > 0 && !message.startsWith('[');
}

function buildFullMessage(message: string, files: FileInfo[]): string {
  if (files.length === 0) return message;
  const filesInfo = files.map(f => `[Archivo: ${f.path}]`).join('\n');
  return message ? `${message}\n\n${filesInfo}` : filesInfo;
}

describe('Index - parseFileMatches', () => {
  test('parsea un archivo correctly', () => {
    const message = 'Analiza esto [Archivo: /home/diablo/files/ab12-1700000000001.jpg]';
    const files = parseFileMatches(message);
    
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('/home/diablo/files/ab12-1700000000001.jpg');
  });

  test('parsea múltiples archivos', () => {
    const message = 'Mira estos archivos [Archivo: /home/diablo/files/ab12-1700000000001.jpg] [Archivo: /home/diablo/files/cd34-1700000000002.pdf]';
    const files = parseFileMatches(message);
    
    expect(files).toHaveLength(2);
    expect(files[0]).toBe('/home/diablo/files/ab12-1700000000001.jpg');
    expect(files[1]).toBe('/home/diablo/files/cd34-1700000000002.pdf');
  });

  test('retorna array vacío sin archivos', () => {
    const message = 'Hola mundo';
    const files = parseFileMatches(message);
    
    expect(files).toHaveLength(0);
  });

  test('parsea archivo con espacios en ruta', () => {
    const message = '[Archivo: /home/diablo/files/my file-1700000000001.jpg]';
    const files = parseFileMatches(message);
    
    expect(files).toHaveLength(1);
  });
});

describe('Index - hasTextMessage', () => {
  test('detecta mensaje con texto', () => {
    expect(hasTextMessage('Analiza esto')).toBe(true);
    expect(hasTextMessage('Hola amigo')).toBe(true);
  });

  test('detecta que no hay texto cuando solo hay etiqueta', () => {
    expect(hasTextMessage('[Imagen]')).toBe(false);
    expect(hasTextMessage('[Archivo]')).toBe(false);
    expect(hasTextMessage('[Video] (sin descripción)')).toBe(false);
  });

  test('detecta mensaje vacío', () => {
    expect(hasTextMessage('')).toBe(false);
  });
});

describe('Index - buildFullMessage', () => {
  test('build mensaje sin archivos', () => {
    const result = buildFullMessage('Hola', []);
    expect(result).toBe('Hola');
  });

  test('build mensaje con un archivo', () => {
    const files: FileInfo[] = [{ path: '/home/diablo/files/ab12-1700000000001.jpg', filename: 'ab12-1700000000001.jpg', mime: 'image/jpeg' }];
    const result = buildFullMessage('Analiza esto', files);
    
    expect(result).toContain('[Archivo: /home/diablo/files/ab12-1700000000001.jpg]');
  });

  test('build mensaje con múltiples archivos', () => {
    const files: FileInfo[] = [
      { path: '/home/diablo/files/ab12-1700000000001.jpg', filename: 'ab12-1700000000001.jpg', mime: 'image/jpeg' },
      { path: '/home/diablo/files/cd34-1700000000002.pdf', filename: 'cd34-1700000000002.pdf', mime: 'application/pdf' },
    ];
    const result = buildFullMessage('Analiza', files);
    
    expect(result).toContain('[Archivo: /home/diablo/files/ab12-1700000000001.jpg]');
    expect(result).toContain('[Archivo: /home/diablo/files/cd34-1700000000002.pdf]');
  });

  test('build solo archivos sin mensaje', () => {
    const files: FileInfo[] = [{ path: '/home/diablo/files/ab12-1700000000001.jpg', filename: 'ab12-1700000000001.jpg', mime: 'image/jpeg' }];
    const result = buildFullMessage('', files);
    
    expect(result).toBe('[Archivo: /home/diablo/files/ab12-1700000000001.jpg]');
  });
});

describe('Index - Flujo Completo de Archivos', () => {
  test('flujo: archivo sin texto -> devuelve solo nombres', () => {
    const files: FileInfo[] = [
      { path: '/home/diablo/files/ab12-1700000000001.jpg', filename: 'ab12-1700000000001.jpg', mime: 'image/jpeg' },
      { path: '/home/diablo/files/cd34-1700000000002.pdf', filename: 'cd34-1700000000002.pdf', mime: 'application/pdf' },
    ];
    const message = '[Imagen] (sin descripción)';
    
    const hasText = hasTextMessage(message);
    const fileNames = files.map(f => f.filename).join(', ');
    
    expect(hasText).toBe(false);
    expect(fileNames).toBe('ab12-1700000000001.jpg, cd34-1700000000002.pdf');
  });

  test('flujo: archivo con texto -> pasa a opencode con ruta', () => {
    const files: FileInfo[] = [
      { path: '/home/diablo/files/ab12-1700000000001.jpg', filename: 'ab12-1700000000001.jpg', mime: 'image/jpeg' },
    ];
    const message = 'Analiza esta imagen';
    
    const hasText = hasTextMessage(message);
    const fullMessage = buildFullMessage(message, files);
    
    expect(hasText).toBe(true);
    expect(fullMessage).toContain('Analiza esta imagen');
    expect(fullMessage).toContain('[Archivo: /home/diablo/files/ab12-1700000000001.jpg]');
  });

  test('flujo: sin archivos -> pasa mensaje normal', () => {
    const files: FileInfo[] = [];
    const message = 'Hola mundo';
    
    const hasText = hasTextMessage(message);
    const fullMessage = buildFullMessage(message, files);
    
    expect(hasText).toBe(true);
    expect(fullMessage).toBe('Hola mundo');
  });
});