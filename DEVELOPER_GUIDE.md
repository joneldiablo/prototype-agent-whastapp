# Developer Guide - Prototype Agent WhatsApp

## 🚀 Inicio Rápido

### Requisitos
- **Bun** 1.0+ ([Descargar](https://bun.sh))
- **Node.js** 18+ (para npm packages)
- **Docker** (opcional, para deployment)
- **OpenCode API Key** ([Obtener](https://opencode.ai))

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/joneldiablo/prototype-agent-whastapp.git
cd prototype-agent-whastapp

# 2. Instalar dependencias
bun install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar servidor
bun start

# El servidor estará en http://localhost:3000
# WebSocket en ws://localhost:3001
```

---

## 📁 Estructura de Proyecto

### Backend

```
backend/src/
├── index.ts              # Servidor principal
├── db/
│   └── index.ts          # SQLite management
├── services/
│   ├── opencode.ts       # Cliente OpenCode AI
│   ├── whatsapp.ts       # Cliente WhatsApp Web
│   └── auth.ts           # Autenticación
├── routes/
│   ├── whatsapp.ts       # Endpoints WhatsApp
│   ├── whitelist.ts      # Endpoints contactos
│   └── config.ts         # Endpoints configuración
├── middleware/
│   └── auth.ts           # Validación de tokens
├── types/
│   └── index.ts          # Interfaces TypeScript
└── test/                 # Pruebas unitarias
    ├── setup.ts
    ├── mockups/
    ├── db.test.ts
    ├── routes.test.ts
    └── services/
```

### Frontend

```
frontend/
├── src/
│   ├── index.ts          # Punto de entrada
│   └── ...componentes
├── index.html
└── dist/                 # Output (en backend/public/)
```

---

## 🛠️ Desarrollo

### Comandos Útiles

```bash
# Desarrollo con hot-reload
bun run dev

# Build de backend
cd backend && bun run build

# Build de frontend
cd frontend && bun run build

# Ejecutar tests
bun test

# Ejecutar con watch para tests
bun test --watch

# Limpiar base de datos
rm data/whatsapp.db

# Ver logs en tiempo real
tail -f logs/*.log
```

### Estructura de un Endpoint

**Patrón general:**

```typescript
import { Router } from 'express';
import type { Response, Request } from 'express';
import { validateToken } from '../services/auth.js';

const router = Router();

// Middleware de autenticación
function requireAuth(req: Request, res: Response, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: true, 
      message: 'Token requerido' 
    });
  }
  const token = auth.substring(7);
  const validation = validateToken(token);
  if (!validation.valid) {
    return res.status(401).json({ 
      success: false, 
      error: true, 
      message: 'Token inválido o expirado' 
    });
  }
  next();
}

// Endpoint protegido
router.get('/status', requireAuth, (_req, res) => {
  res.json({
    success: true,
    error: false,
    status: 200,
    code: 200,
    message: 'Estado obtenido',
    data: { /* tu data aquí */ }
  });
});

export default router;
```

### Agregar Nuevo Servicio

**1. Crear archivo en `services/mynewservice.ts`:**

```typescript
/**
 * My New Service
 * 
 * Descripción de responsabilidades
 * @module services/mynewservice
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG_VAR = process.env.MY_CONFIG || '';

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

export async function myPublicFunction(): Promise<string> {
  // Implementación
  return 'resultado';
}

/**
 * Descripción detallada
 */
export function myOtherFunction(param: string): void {
  // Implementación
}
```

**2. Importar en `index.ts`:**

```typescript
import { myPublicFunction, myOtherFunction } from './services/mynewservice.js';
```

### Agregar Nuevo Endpoint

**1. Crear archivo en `routes/myroute.ts`:**

```typescript
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse } from '../types/index.js';
import { myPublicFunction } from '../services/mynewservice.js';
import { validateToken } from '../services/auth.js';

const router = Router();

function requireAuth(req: Request, res: Response, next: any) {
  // ... validar token
}

router.get('/myendpoint', requireAuth, async (req, res: Response<ApiResponse>) => {
  try {
    const result = await myPublicFunction();
    res.json({
      success: true,
      error: false,
      status: 200,
      code: 200,
      message: 'Operación exitosa',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: true,
      status: 500,
      code: 500,
      message: 'Error interno'
    });
  }
});

export default router;
```

**2. Registrar en `index.ts`:**

```typescript
import myRoutes from './routes/myroute.js';

app.use('/api/myroute', myRoutes);
```

### Sistema de Logging

Se utilizan dos niveles de logging:

```typescript
// Siempre visible (incluso en PROD)
function log(...args: unknown[]) {
  console.log('[PREFIX]', ...args);
}

// Solo en DEV (será silent en PROD)
function logSensitive(...args: unknown[]) {
  if (isProd) return;
  console.log('[PREFIX]', ...args);
}
```

**Uso:**

```typescript
// Información general
log('[OpenCode] Cliente conectado');

// Números de teléfono u info sensible
logSensitive('[DB] Usuario:', phone);
```

### Mascaramiento de Datos en Logs

En PROD, los números de teléfono se enmascaran automáticamente:

```
Original: [DB] Desde 7209281757@c.us
PROD:     [DB] Desde 720*******@c.us
```

---

## 🧪 Testing

### Estructura de Tests

```typescript
import { describe, it, expect } from 'bun:test';
import { myFunction } from '../services/myservice';

describe('MyService', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe('expected');
  });

  it('should handle errors', () => {
    expect(() => {
      myFunction(null);
    }).toThrow();
  });
});
```

### Ejecutar Tests Específicos

```bash
# Todos los tests
bun test

# Test específico
bun test db.test.ts

# Con patrón
bun test --pattern="whitelist"

# Watch mode
bun test --watch
```

### Mocking

Ejemplos de mocking disponibles en `src/test/mockups/`:

```typescript
// mock SQL.js
import { mockDatabase } from './mockups/sql.js';

// mock OpenCode
import { mockOpencodeClient } from './mockups/opencode.js';

// mock WhatsApp
import { mockWhatsAppClient } from './mockups/whatsapp.js';

// mock Express
import { mockRequest, mockResponse } from './mockups/express.js';
```

---

## 🐛 Debugging

### Ver Logs Detallados

```bash
# En desarrollo, todos los logs son visibles
ENV=dev bun start

# En producción, solo logs generales
ENV=prod bun start
```

### Debugger de Bun

```bash
# Iniciar con debugger
bun --inspect run src/index.ts

# Luego visita chrome://inspect en Chrome
```

### Revisar Base de Datos

```bash
# Exportar dump SQLite
sqlite3 data/whatsapp.db ".dump"

# Ver tabla específica
sqlite3 data/whatsapp.db "SELECT * FROM sessions;"

# Limpiar todo
rm data/whatsapp.db
```

### WebSocket Debug

```javascript
// En la consola del navegador:
const ws = new WebSocket(
  'ws://localhost:3001?token=tu_token'
);
ws.onmessage = (e) => console.log('Mensaje:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

---

## 📝 Guía de Estilos

### TypeScript

```typescript
// Tipos siempre explícitos
function myFunction(
  param: string,
  optional?: number
): Promise<string> {
  return Promise.resolve('result');
}

// Interfaces para estructuras
interface MyInterface {
  id: number;
  name: string;
  active?: boolean;
}

// Enums para constantes relacionadas
enum Status {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Connecting = 'connecting'
}
```

### Comentarios

```typescript
/**
 * Descripción de qué hace la función
 * 
 * @param param - Descripción del parámetro
 * @returns Descripción del retorno
 * @throws Error que puede lanzar
 * @example
 * const result = myFunction('test');
 */
export function myFunction(param: string): string {
  // Comentarios en línea para lógica compleja
  const value = calculateThing(); // ¿Por qué esto?
  return value;
}
```

### Estructura de Archivo

```typescript
/**
 * Module Title
 * @module path/to/module
 */

// ============================================================
// IMPORTS
// ============================================================

import express from 'express';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = process.env.CONFIG || 'default';

// ============================================================
// TIPOS
// ============================================================

interface MyInterface {
  // ...
}

// ============================================================
// ESTADO
// ============================================================

let globalState = null;

// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

function privateHelper(): void {
  // ...
}

// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

export function publicFunction(): string {
  // ...
}
```

---

## 🔑 Variables de Entorno

### Desarrollo

```env
# .env.local (gitignored)
PORT=3000
ENV=dev
OPENCODE_API_KEY=sk-test-key
OPENCODE_USER_PASSWORD=admin:password
WATCH=true
```

### Producción

```env
# .env.prod (en servidor)
PORT=3000
ENV=prod
OPENCODE_API_KEY=sk-real-key
OPENCODE_USER_PASSWORD=usuario:contraseña_segura
SYSTEM_PROMPT="Prompt del sistema"
TOKEN_EXPIRY_HOURS=24
```

### Cargar variables en desarrollo

```bash
# Con .env
bun start

# Con .env.local
ENV=dev bun start

# Variables inline
PORT=4000 ENV=dev bun start
```

---

## 🚀 Build & Deploy

### Build Local

```bash
# Backend
cd backend && bun run build

# Frontend
cd frontend && bun run build

# Ambos
bun run build
```

### Docker

```bash
# Build imagen
docker-compose build

# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f whatsapp-agent

# Shell en contenedor
docker exec -it whatsapp-agent bash

# Detener
docker-compose down
```

### Release

```bash
# Version bump automático
./release.sh

# Manual:
# 1. Editar version en package.json
# 2. git add package.json
# 3. git commit -m "release: v1.0.4"
# 4. git tag v1.0.4
# 5. git push origin dev --tags
# 6. Merge a main
```

---

## 🔨 Troubleshooting

### Error: "OPENCODE_API_KEY no configurada"

**Problema:** El servidor no inicia sin API key.

**Solución:**
```bash
# Copiar .env.example
cp .env.example .env

# Editar .env con tus credenciales
```

### Error: "EADDRINUSE: port 3000 already in use"

**Problema:** Puerto en uso.

**Solución:**
```bash
# Cambiar puerto
PORT=4000 bun start

# O matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9
```

### Error: "Failed to find Chromium"

**Problema:** Puppeteer no puede encontrar Chrome.

**Solución:**
```bash
# Instalar Chrome
apt-get install chromium-browser

# O especificar ruta
CHROME_PATH=/usr/bin/chromium bun start
```

### WhatsApp: "Qrcode not found"

**Problema:** QR no se genera.

**Solución:**
```bash
# Limpiar sesión
rm -rf data/whatsapp-sessions

# Reconectar
POST /api/whatsapp/connect

# Escanear nuevo QR
GET /api/whatsapp/qr
```

### Test Fall: "Database not initialized"

**Problema:** BD no se inicializa en tests.

**Solución:**
```bash
# Los tests tienen setup.ts que mockea todo
# Si falla, revisar src/test/setup.ts
bun test --verbose
```

### OpenCode: "Connection refused to 127.0.0.1:4099"

**Problema:** Puerto OpenCode no está en uso.

**Solución:**
```bash
# Verificar que OpenCode está corriendo
lsof -i :4099

# O cambiar puerto
OPENCODE_PORT=5000 bun start
```

---

## 📚 Recursos

- [Bun Documentation](https://bun.sh/docs)
- [Express Documentation](https://expressjs.com)
- [WhatsApp Web.js](https://docs.wwebjs.dev)
- [OpenCode AI](https://opencode.ai/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## 💡 Tips & Tricks

### Hot Reload en Desarrollo

```bash
bun run dev  # Auto-recompila al cambiar archivos
```

### Prototipar Rápido

```typescript
// Usar REPL de Bun
bun repl

// Importar y probar
import { login } from './backend/src/services/auth.ts';
await login('admin', 'pass');
```

### Inspeccionar Requests

```typescript
// En middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});
```

### Performance Profiling

```bash
bun --prof run src/index.ts
# Genera archivo .prof que se puede analizar
```

---

## 🤝 Contributing

### Flujo de Contribución

1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/my-feature`
3. Hacer commits: `git commit -am "Add feature"`
4. Push a rama: `git push origin feature/my-feature`
5. Crear Pull Request

### Checklist Antes de PR

- [ ] Tests pasan: `bun test`
- [ ] Sin errores TypeScript: `bun run build`
- [ ] Código sigue estilos
- [ ] Comentarios y documentación
- [ ] Commit messages claros

---

**Última actualización:** 2026-04-18  
**Mantén este documento actualizado** cuando agregues nuevas características.
