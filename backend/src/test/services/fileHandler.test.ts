/**
 * Pruebas Unitarias de Manejo de Archivos
 * 
 * @group fileHandler
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const testFilesPath = path.join(import.meta.dir, '../../../test-files-temp');

async function getHash4(): Promise<string> {
  return crypto.randomBytes(2).toString('hex');
}

function getFileExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-word': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/zip': 'zip',
  };
  return map[mime] || 'bin';
}

async function saveMediaFile(
  media: { data: string; mimetype: string },
  timestamp: number
): Promise<{ path: string; filename: string; mime: string }> {
  await mkdir(testFilesPath, { recursive: true });
  const hash = await getHash4();
  const ext = getFileExtension(media.mimetype);
  const filename = `${hash}-${timestamp}.${ext}`;
  const filepath = path.join(testFilesPath, filename);
  await writeFile(filepath, Buffer.from(media.data, 'base64'));
  return {
    path: filepath,
    filename,
    mime: media.mimetype,
  };
}

describe('FileHandler - getFileExtension', () => {
  test('extensiones de imágenes correctas', () => {
    expect(getFileExtension('image/jpeg')).toBe('jpg');
    expect(getFileExtension('image/png')).toBe('png');
    expect(getFileExtension('image/gif')).toBe('gif');
    expect(getFileExtension('image/webp')).toBe('webp');
  });

  test('extensiones de audio correctas', () => {
    expect(getFileExtension('audio/ogg')).toBe('ogg');
    expect(getFileExtension('audio/mpeg')).toBe('mp3');
    expect(getFileExtension('audio/wav')).toBe('wav');
  });

  test('extensiones de video correctas', () => {
    expect(getFileExtension('video/mp4')).toBe('mp4');
    expect(getFileExtension('video/3gpp')).toBe('3gp');
  });

  test('extensiones de documentos correctas', () => {
    expect(getFileExtension('application/pdf')).toBe('pdf');
    expect(getFileExtension('application/vnd.ms-excel')).toBe('xls');
    expect(getFileExtension('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
    expect(getFileExtension('application/vnd.ms-word')).toBe('doc');
    expect(getFileExtension('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(getFileExtension('application/zip')).toBe('zip');
  });

  test('mime desconocido retorna bin', () => {
    expect(getFileExtension('application/octet-stream')).toBe('bin');
    expect(getFileExtension('unknown/type')).toBe('bin');
    expect(getFileExtension('')).toBe('bin');
  });
});

describe('FileHandler - saveMediaFile', () => {
  beforeEach(async () => {
    await mkdir(testFilesPath, { recursive: true });
  });

  afterEach(async () => {
    await rm(testFilesPath, { recursive: true, force: true });
  });

  test('guarda archivo con nombre correcto', async () => {
    const timestamp = 1700000000000;
    const media = { data: 'SGVsbG8=', mimetype: 'text/plain' };
    
    const result = await saveMediaFile(media, timestamp);
    
    expect(result.filename).toMatch(/^[0-9a-f]{4}-1700000000000\.\w+$/);
    expect(result.filename).toContain('-1700000000000.');
  });

  test('guarda imagen jpg correctamente', async () => {
    const timestamp = 1700000000001;
    const media = { data: 'SGVsbG8=', mimetype: 'image/jpeg' };
    
    const result = await saveMediaFile(media, timestamp);
    
    expect(result.filename).toEndWith('.jpg');
    expect(result.mime).toBe('image/jpeg');
  });

  test('guarda pdf correctamente', async () => {
    const timestamp = 1700000000002;
    const media = { data: 'SGVsbG8=', mimetype: 'application/pdf' };
    
    const result = await saveMediaFile(media, timestamp);
    
    expect(result.filename).toEndWith('.pdf');
    expect(result.mime).toBe('application/pdf');
  });

  test('guarda archivo con contenido correcto', async () => {
    const timestamp = 1700000000003;
    const data = 'Hello'; // base64 of "Hello" is SGVsbG8=
    const media = { data: btoa(data), mimetype: 'text/plain' };
    
    const result = await saveMediaFile(media, timestamp);
    const content = await readFile(result.path, 'utf8');
    
    expect(content).toBe(data);
  });

  test('genera hash de 4 dígitos hex', async () => {
    const hashes = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const hash = await getHash4();
      hashes.add(hash);
    }
    
    // Todos deben ser de exactamente 4 caracteres hex
    for (const hash of hashes) {
      expect(hash).toMatch(/^[0-9a-f]{4}$/);
    }
  });
});

describe('FileHandler - Formato de nombre', () => {
  test('formato: hash-timestamp.extension', async () => {
    const timestamp = 1700000000000;
    const media = { data: 'SGVsbG8=', mimetype: 'image/png' };
    
    const result = await saveMediaFile(media, timestamp);
    
    // Formato esperado: xxxx-1700000000000.png
    expect(result.filename).toMatch(/^[0-9a-f]{4}-\d{13}\.png$/);
  });
});