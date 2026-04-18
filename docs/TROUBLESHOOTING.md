# Troubleshooting & Best Practices

Guía para resolver problemas comunes y seguir mejores prácticas.

## 🚨 Problemas Comunes

### 1. "OpenCode no inicializado"

**Síntomas:**
```
[OpenCode] Error en consulta: OpenCode no inicializado
```

**Causas:**
- Variable `OPENCODE_API_KEY` no configurada
- OpenCode tardó en conectar
- Error al iniciar el servidor

**Soluciones:**

```bash
# 1. Verificar .env
grep OPENCODE_API_KEY .env

# 2. Asegurar que está configurada
# En .env:
OPENCODE_API_KEY=sk-xxxxx

# 3. Reiniciar servidor
bun start

# 4. Ver logs
tail -f logs/*.log
```

---

### 2. "ECONNREFUSED - Unable to connect"

**Síntomas:**
```
[OpenCode] Error en consulta: ConnectionRefused
Unable to connect to http://127.0.0.1:4099/session/ses_xxx/message
```

**Causa:** Sesión de OpenCode expiró o nodo se reinició.

**Solución automática:**
Sistema ahora detecta esto automáticamente y:
1. Descarta sessionId antiguo
2. Crea nueva sesión
3. Reintenta envío

**En logs:**
```
[OpenCode] Sesión no disponible. Descartando y reintentando...
[OpenCode] Nueva sesión creada, reintentando envío...
```

**Si persiste** → aumentar intentos de reconexión:

```typescript
// En sendToSession(), modificar retry logic
const MAX_RETRIES = 3;
let attempts = 0;

while (attempts < MAX_RETRIES) {
  try {
    // intento...
    break;
  } catch (err) {
    attempts++;
    if (attempts < MAX_RETRIES) {
      await sleep(1000); // esperar 1s
    }
  }
}
```

---

### 3. "Failed to find Chromium"

**Síntomas:**
```
Failed to find Chromium revision. 
This is expected if you are not on a Linux system.
```

**Causa:** Puppeteer no puede encontrar cromio/Chrome.

**Soluciones:**

**Linux:**
```bash
# Instalar Chromium
apt-get update
apt-get install chromium-browser

# Especificar ruta
CHROME_PATH=/usr/bin/chromium bun start
```

**Mac:**
```bash
# Instalar Chrome manualmente o con brew
brew install --cask google-chrome

# Especificar ruta (puede variar)
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
bun start
```

**Windows:**
```bash
# Considerar Docker o WSL
# O especificar ruta si Chrome está instalado
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
bun start
```

---

### 4. "EADDRINUSE: port 3000 already in use"

**Síntomas:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Soluciones:**

**Opción 1: Usar puerto diferente**
```bash
PORT=4000 bun start
```

**Opción 2: Matar proceso en puerto**
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID {PID} /F
```

**Opción 3: Cambiar puerto en .env**
```env
PORT=4000
```

---

### 5. "Token inválido o expirado"

**Síntomas:**
```json
{
  "success": false,
  "error": true,
  "message": "Token inválido o expirado"
}
```

**Causas:**
- Token expiró (default 24 horas)
- Token corrupto
- Token de otra sesión

**Soluciones:**

```bash
# 1. Login nuevamente para obtener nuevo token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 2. Cambiar expiración en .env
TOKEN_EXPIRY_HOURS=48

# 3. Reiniciar servidor
bun start
```

---

### 6. "WhatsApp QR not found"

**Síntomas:**
```
Error: QR not found, please run client.initialize() first
```

**Causa:** Cliente no está en estado "conectando".

**Soluciones:**

```bash
# 1. Conectar nuevamente
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Authorization: Bearer {token}"

# 2. Si persiste, limpiar sesión
rm -rf data/whatsapp-sessions

# 3. Reintentar
bun start
```

---

### 7. "Database locked"

**Síntomas:**
```
Error: database is locked
```

**Causa:** Múltiples conexiones SQLite simultáneas.

**Soluciones:**

```bash
# 1. Limpiar DB
rm data/whatsapp.db

# 2. Reiniciar servidor
bun start

# 3. Si es persistente, usar WAL mode
# En db/index.ts:
db.run('PRAGMA journal_mode = WAL;');
```

---

### 8. "Credenciales inválidas"

**Síntomas:**
```
POST /api/auth/login
Response: 401 Unauthorized
```

**Soluciones:**

```bash
# 1. Verificar credenciales en .env
grep OPENCODE_USER_PASSWORD .env

# Debe estar en format usuario:contraseña
# Ejemplo: admin:Qwerty1236!

# 2. Sin espacios alrededor
OPENCODE_USER_PASSWORD=admin:password  # ✅
OPENCODE_USER_PASSWORD= admin:password # ❌ (espacio)

# 3. Caracteres especiales - usar comillas
OPENCODE_USER_PASSWORD="admin:Pa$sw0rd!"

# 4. Probar credentials
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"username":"admin","password":"password"}'
```

---

### 9. "WebSocket connection refused"

**Síntomas:**
```javascript
WebSocket is closed with code 1006
```

**Causas:**
- Token inválido en query string
- WebSocket server no corriendo
- Puerto bloqueado

**Soluciones:**

```javascript
// 1. Asegurar token válido
const ws = new WebSocket(
  'ws://localhost:3001?token=TOKEN_VALIDO'
);

// 2. Verificar que WebSocket está en puerto PORT+1
// Si PORT=3000, WebSocket debe estar en 3001

// 3. Verificar firewall
lsof -i :3001  # Linux/Mac
netstat -an | findstr :3001  # Windows

// 4. Revisar logs del servidor
bun start 2>&1 | grep WebSocket
```

---

### 10. "No hay respuesta de OpenCode"

**Síntomas:**
```
Mensaje se envía pero no hay respuesta
Espera indefinida
```

**Causas:**
- OpenCode server inactivo
- Sesión no válida
- Error en prompt

**Soluciones:**

```bash
# 1. Verificar que OpenCode está corriendo
lsof -i :4099

# 2. Revisar logs de OpenCode
# Si estás usando OpenCode localmente, debe mostrar logs

# 3. Probar conexión directa
curl http://127.0.0.1:4099/health

# 4. Aumentar timeout
# En services/opencode.ts:
const TIMEOUT = 30000; // 30 segundos
```

---

## ✅ Mejores Prácticas

### 1. Gestión de Credenciales

**❌ NO hacer:**
```bash
# Nunca commitear credenciales
git add .env
git commit -m "Add credentials"

# Nunca hardcodear
const PASSWORD = "admin:password";
```

**✅ Hacer:**
```bash
# Usar .env.example como template
cp .env.example .env

# En .gitignore
.env
.env.local

# Cargar del entorno
const password = process.env.OPENCODE_USER_PASSWORD;
```

---

### 2. Manejo de Errores

**❌ NO hacer:**
```typescript
// Silent fail
try {
  await sendToOpenCode();
} catch (err) {
  // Ignorar error
}
```

**✅ Hacer:**
```typescript
// Loguear y propagar
try {
  await sendToOpenCode();
} catch (err) {
  log('[OpenCode] Error:', err.message);
  throw err; // O manejar específicamente
}
```

---

### 3. Logging

**❌ NO hacer:**
```typescript
// Loguear números completos en PROD
console.log(`[Msg] From: ${phoneNumber}`);

// Variable sensitiv sin filtro
logSensitive(`[DB] Query: ${query}`);
```

**✅ Hacer:**
```typescript
// Usar mascaramiento
const short = phone.replace(/^\+/, '').replace(/^521/, '');
log(`[Msg] From: ${short}`);

// Usar logSensitive para info sensitive
logSensitive(`[DB] Query: ${query}`);

// En PROD, logSensitive es silent
if (!isProd) {
  logSensitive('Sensitive data:', sensitiveData);
}
```

---

### 4. Validación de Entrada

**❌ NO hacer:**
```typescript
router.post('/config', async (req, res) => {
  const { key, value } = req.body;
  setConfig(key, value); // ¿Qué si son undefined?
});
```

**✅ Hacer:**
```typescript
router.post('/config', async (req, res) => {
  const { key, value } = req.body;
  
  if (!key || typeof key !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Key es requerido y debe ser string'
    });
  }
  
  if (!value || typeof value !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Value es requerido y debe ser string'
    });
  }
  
  setConfig(key, value);
  res.json({ success: true });
});
```

---

### 5. Async/Await

**❌ NO hacer:**
```typescript
// Callback hell
function handleMessage() {
  sendToOpenCode(() => {
    getResponse(() => {
      sendToWhatsApp(() => {
        logMessage(() => {
          // ...
        });
      });
    });
  });
}
```

**✅ Hacer:**
```typescript
// Async/await limpio
async function handleMessage() {
  try {
    const response = await sendToOpenCode();
    await sendToWhatsApp(response);
    await logMessage(response);
  } catch (err) {
    log('[Error]:', err);
  }
}
```

---

### 6. Database Operations

**❌ NO hacer:**
```typescript
// Query injection
db.run(`SELECT * FROM users WHERE phone = '${phone}'`);
```

**✅ Hacer:**
```typescript
// Usar parámetros
db.run(
  'SELECT * FROM users WHERE phone = ?',
  [phone]
);
```

---

### 7. Type Safety

**❌ NO hacer:**
```typescript
// Any types
function process(data: any): any {
  return data.something;
}
```

**✅ Hacer:**
```typescript
// Tipado explícito
interface Message {
  from: string;
  body: string;
  timestamp: Date;
}

function process(data: Message): string {
  return data.body;
}
```

---

### 8. Testing

**❌ NO hacer:**
```typescript
// Ignorar tests
skip('debería procesar', () => { });
```

**✅ Hacer:**
```typescript
// Tests significativos
describe('handleMessage', () => {
  it('should process valid message', () => {
    const result = handleMessage(validMessage);
    expect(result.success).toBe(true);
  });

  it('should reject invalid message', () => {
    expect(() => handleMessage(null)).toThrow();
  });
});
```

---

### 9. Performance

**❌ NO hacer:**
```typescript
// Búsquedas secuenciales
const whitelist = getWhitelist();
for (const entry of whitelist) {
  if (entry.phone === phone) {
    // encontrado
  }
}
```

**✅ Hacer:**
```typescript
// Índice en memoria o query directa
const entry = getWhitelistByPhone(phone);
if (entry) {
  // encontrado
}
```

---

### 10. Documentation

**❌ NO hacer:**
```typescript
function process(p, m, d) {
  // algún procesamiento
  return result;
}
```

**✅ Hacer:**
```typescript
/**
 * Procesa mensaje y envía a OpenCode
 * 
 * @param phone - Número de teléfono del remitente
 * @param message - Contenido del mensaje
 * @param imageData - Imagen en base64 (opcional)
 * @returns Respuesta del agente de IA
 * @throws Error si OpenCode no está disponible
 */
function process(
  phone: string,
  message: string,
  imageData?: string
): Promise<string> {
  // implementación
}
```

---

## 🔍 Debugging Tips

### 1. Usar Chrome DevTools

```javascript
// Para WebSocket debugging
const ws = new WebSocket('ws://localhost:3001?token=xxx');
window.ws = ws; // Global reference

// En console:
ws.send(JSON.stringify({...}));
```

### 2. Debugger de Bun

```bash
bun --inspect run src/index.ts
# Luego visita chrome://inspect
```

### 3. Logs Detallados

```bash
# Máximo logging
DEBUG=* ENV=dev bun start
```

### 4. Network Inspector (browser)

```javascript
// Interceptar fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0], args[1]);
  return originalFetch.apply(this, args)
    .then(r => {
      console.log('Response:', r);
      return r;
    });
};
```

### 5. Database Inspector

```bash
# Ver contenido de BD
sqlite3 data/whatsapp.db

# Comandos útiles
> .tables  # Listar tablas
> SELECT * FROM whitelist;  # Ver contenido
> .schema sessions  # Ver estructura
```

---

## 📊 Performance Optimization

### Database

```typescript
// Crear índices para búsquedas rápidas
db.run('CREATE INDEX idx_phone ON whitelist(phone)');
db.run('CREATE INDEX idx_session_phone ON sessions(phone)');
```

### Caching

```typescript
// Cache en memoria para whitelist
let whitelistCache = null;
let cacheExpiry = 0;

function getWhitelist() {
  const now = Date.now();
  if (whitelistCache && now < cacheExpiry) {
    return whitelistCache;
  }
  
  whitelistCache = db.exec('SELECT * FROM whitelist');
  cacheExpiry = now + 60000; // 60 segundos
  return whitelistCache;
}
```

### Monitoring

```typescript
// Track performance
const startTime = Date.now();
await sendToOpenCode();
const duration = Date.now() - startTime;

if (duration > 5000) {
  log('[Perf Warning] OpenCode took', duration, 'ms');
}
```

---

## 🔐 Security Checklist

- [ ] Variables sensibles en `.env` (no en código)
- [ ] CORS configurado correctamente
- [ ] Validación de entrada en todos los endpoints
- [ ] Rate limiting (considerar agregar)
- [ ] Tokens con expiry
- [ ] HTTPS en producción
- [ ] SQL injection prevention (usar parámetros)
- [ ] XSS prevention en responses
- [ ] CORS headers ajustados
- [ ] No loguear credenciales

---

**Última actualización:** 2026-04-18  
**Versión:** 1.0.3
