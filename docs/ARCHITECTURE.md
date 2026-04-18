# Arquitectura - Prototype Agent WhatsApp

## 📋 Índice
1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Componentes Principales](#componentes-principales)
5. [Flujo de Datos](#flujo-de-datos)
6. [Base de Datos](#base-de-datos)
7. [Autenticación y Seguridad](#autenticación-y-seguridad)
8. [APIs y Endpoints](#apis-y-endpoints)
9. [WebSocket en Tiempo Real](#websocket-en-tiempo-real)
10. [Deployment](#deployment)
11. [Manejo de Errores](#manejo-de-errores)

---

## Visión General

**Prototype Agent WhatsApp** es un sistema automatizado que conecta WhatsApp Web con el modelo de IA **Big Pickle** de OpenCode. 

### Propósito
- Automatizar respuestas en WhatsApp mediante un agente de IA
- Proporcionar un panel administrativo seguro para gestión
- Mantener control sobre contactos con whitelist/blacklist
- Registrar conversaciones y estadísticas

### Flujo Principal
```
Usuario WhatsApp
       ↓
WhatsApp Web (Puppeteer)
       ↓
Backend API (Express)
       ↓
OpenCode AI (Big Pickle)
       ↓
Respuesta al usuario
       ↓
BD Local (SQLite) - histórico
       ↓
WebSocket → Panel Admin (tiempo real)
```

---

## Stack Tecnológico

### Backend
- **Runtime**: Bun (JavaScript superset con native TypeScript)
- **Framework**: Express.js (REST API)
- **WebSocket**: ws (comunicación en tiempo real)
- **Autenticación**: JWT-like tokens con expiry
- **Base de Datos**: SQLite + sql.js
- **WhatsApp**: whatsapp-web.js + Puppeteer (Chrome automation)
- **IA**: OpenCode SDK (@opencode-ai/sdk)
- **Testing**: Bun's built-in test runner

### Frontend
- **Compilador**: Bun (TypeScript → JavaScript)
- **Tipo**: SPA (Single Page Application)
- **Integración**: Bundled en backend/public/

### DevOps
- **Contenedorización**: Docker + Docker Compose
- **Versionamiento**: Semántico (major.minor.patch)
- **Package Manager**: Bun

---

## Estructura de Carpetas

```
prototype-agent-whastapp/
│
├── backend/                          # API REST
│   ├── src/
│   │   ├── index.ts                 # Punto de entrada principal
│   │   ├── db/
│   │   │   └── index.ts             # Gestión SQLite
│   │   ├── services/
│   │   │   ├── opencode.ts          # Cliente OpenCode AI
│   │   │   ├── whatsapp.ts          # Cliente WhatsApp Web
│   │   │   └── auth.ts              # Autenticación OAuth2-style
│   │   ├── routes/
│   │   │   ├── whatsapp.ts          # Rutas WhatsApp
│   │   │   ├── whitelist.ts         # Rutas gestión contactos
│   │   │   └── config.ts            # Rutas configuración
│   │   ├── middleware/
│   │   │   └── auth.ts              # Middleware de validación token
│   │   ├── types/
│   │   │   └── index.ts             # Interfaces TypeScript
│   │   ├── test/                    # Pruebas unitarias
│   │   │   ├── setup.ts
│   │   │   ├── db.test.ts
│   │   │   ├── routes.test.ts
│   │   │   ├── utils.test.ts
│   │   │   ├── granular.test.ts
│   │   │   ├── services/
│   │   │   └── mockups/
│   │   └── public/                  # Frontend compilado (generado)
│   ├── dist/                        # Salida build (generado)
│   ├── package.json
│   ├── tsconfig.json
│   └── release.sh
│
├── frontend/                         # Panel administrativo
│   ├── src/
│   │   ├── index.ts                 # Punto de entrada
│   │   └── ...componentes.ts
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
│
├── data/                            # Datos persistentes
│   ├── whatsapp-sessions/           # Sesiones Puppeteer
│   └── whatsapp.db                  # Base de datos SQLite
│
├── scripts/
│   └── start.js                     # Script de inicio (multiplatform)
│
├── Dockerfile                       # Imagen Docker
├── docker-compose.yml
├── DOCKER.md
├── README.md
├── ARCHITECTURE.md                  # Este archivo
├── .env.example                     # Template de configuración
└── .gitignore
```

---

## Componentes Principales

### 1. **Backend Server** (index.ts)

**Responsabilidades:**
- Inicializar Express app con CORS
- Configurar WebSocket server para updates en tiempo real
- Registrar rutas API
- Inicializar bases de datos y servicios
- Manejo centralizado de mensajes

**Puertos:**
- `PORT` (default 3000): HTTP API
- `PORT + 1` (3001): WebSocket

**Inicialización:**
```typescript
// 1. Cargar variables .env
// 2. Inicializar DB SQLite
// 3. Conectar cliente OpenCode
// 4. Preparar cliente WhatsApp
// 5. Registrar rutas y middleware
// 6. Iniciar servidor HTTP y WebSocket
```

### 2. **OpenCode Service** (services/opencode.ts)

**Responsabilidades:**
- Cliente de IA Big Pickle
- Gestión de sesiones por usuario
- Envío de prompts y recepción de respuestas
- Soporte de imágenes en base64
- Reintentos automáticos en caso de sesiones expiradas

**Flujo de sesiones:**
```
Usuario envía mensaje
       ↓
¿Sesión existe en BD?
    ├─ Sí → Validar en OpenCode
    │       ├─ Válida → Usar
    │       └─ Expirada → Eliminar, crear nueva
    └─ No → Crear nueva sesión
       ↓
Enviar prompt + mensaje a OpenCode
       ↓
Recibir respuesta (texto/imágenes/archivos)
```

**Características:**
- Prompts customizables por usuario
- Sistema de versión para prompts
- Soporte para imágenes en base64
- Logging sensible (mascarado en PROD)
- Reconexión automática del cliente

**Nueva Feature (Últimos commits):**
- Detección de `ConnectionRefused` → sesión expirada
- Descarte automático de sessionId antiguo
- Reintento automático con nueva sesión
- Manejo transparente para el usuario

### 3. **WhatsApp Service** (services/whatsapp.ts)

**Responsabilidades:**
- Instancia de WhatsApp Web (whatsapp-web.js)
- Conexión/desconexión
- Manejo de mensajes entrantes
- Generación de QR para login
- Detección de cambios de estado

**Estados del cliente:**
- `disconnected`: Sin conectar
- `connecting`: Esperando QR
- `connected`: Listo para enviar/recibir
- `qr`: Código QR disponible

**Almacenamiento:**
- Sesiones en `data/whatsapp-sessions/` (Puppeteer cache)
- LocalAuth usando credenciales guardadas

**Características de logging:**
- Mascaramiento de números en PROD
- Logs solo sensibles en DEV
- Timestamps automáticos

### 4. **Auth Service** (services/auth.ts)

**Modelo:** OAuth2.0 simplificado

**Flujo:**
```
POST /api/auth/login
  ↓
Validar credenciales (usuario:contraseña)
  ↓
Generar token aleatorio (32 bytes hexadecimal)
  ↓
Guardar en memoria con timestamp de expiración
  ↓
Devolver token + expiresIn (36000 segundos)
```

**Validación en rutas:**
```
Authorization: Bearer {token}
  ↓
Buscar token en memoria
  ↓
Validar no expirado (24h default)
  ↓
Permitir/denegar acceso
```

**Limpieza:**
- Tokens expirados se eliminan automáticamente
- Función `cleanupTokens()` ejecutada periódicamente

### 5. **Database Service** (db/index.ts)

**Tablas SQLite:**

#### Sessions
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  phone TEXT UNIQUE,
  opencode_session_id TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```
Rastrea sesiones OpenCode por teléfono.

#### Whitelist
```sql
CREATE TABLE whitelist (
  id INTEGER PRIMARY KEY,
  phone TEXT UNIQUE,
  prompt TEXT,              -- Custom prompt por usuario
  enabled INTEGER,          -- 0/1
  is_blacklist INTEGER,     -- 1 = blacklist, 0 = whitelist
  created_at DATETIME,
  updated_at DATETIME
);
```
Gestión de contactos permitidos/bloqueados.

#### System Config
```sql
CREATE TABLE system_config (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,          -- 'system_prompt', 'whatsapp_connected'
  value TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```
Configuración global del sistema.

#### Messages Log
```sql
CREATE TABLE messages_log (
  id INTEGER PRIMARY KEY,
  from_number TEXT,
  message TEXT,
  response TEXT,
  timestamp DATETIME
);
```
Histórico completo de conversaciones.

---

## Flujo de Datos

### 📩 Mensaje Entrante

```
1. WhatsApp recibe mensaje
2. whatsapp-web.js detecta evento 'message'
3. handleIncomingMessage() activado
   │
   ├─ Verificar disponibilidad de OpenCode local
   ├─ Verificar whitelist
   │  ├─ ¿Está bloqueado globalmente (wildcard)?
   │  ├─ ¿Está en blacklist?
   │  ├─ ¿No está en whitelist? → FILTRAR
   │  └─ ¿Habilitado? → PROCESAR
   │
   ├─ Enviar a OpenCode.sendToSession()
   │  ├─ Obtener/crear sesión para ese teléfono
   │  ├─ Enviar prompt + mensaje
   │  ├─ En caso de error ConnectionRefused:
   │  │  ├─ Descartar sessionId antiguo
   │  │  ├─ Crear nueva sesión
   │  │  └─ Reintentar
   │  └─ Obtener respuesta
   │
   ├─ Guardar en BD (logMessage)
   ├─ Enviar respuesta por WhatsApp
   └─ Broadcast a WebSocket (admin panel)
```

### 🔐 Login

```
1. Usuario ingresa credenciales
2. POST /api/auth/login
3. Validar usuario:contraseña
4. Generar token
5. Retornar { token, expiresIn: 86400 }
6. Cliente guarda token localmente
7. Siguiente petición: Authorization: Bearer {token}
```

### 📤 Envío de Respuesta

```
1. Botón "Enviar" en panel admin
2. POST /api/whitelist/add (con token)
3. Validar token
4. Guardar en BD
5. Actualizar whitelist en memoria
6. Broadcast a WebSocket
```

---

## Base de Datos

### Inicialización
```typescript
await initDb()
  ├─ Conectar a SQLite (data/whatsapp.db)
  ├─ Crear tablas si no existen
  ├─ Seed: Bloquear broadcasts y números especiales
  ├─ Seed: Añadir wildcard bloqueador como default
  └─ Guardar cambios
```

### Características
- **sql.js**: En-memory SQLite con persistencia a archivo
- **Auto-save**: Cada operación guarda a disco
- **Transacciones**: No inmediatas, pero secuenciales
- **Performance**: Optimizada para lectura

### Operaciones Principales

#### Whitelist
- `getWhitelist()` - Obtener todos
- `addToWhitelist(phone, prompt?, isBlacklist)` - Añadir
- `deleteFromWhitelist(id)` - Eliminar
- `updateWhitelistEntry(id, data)` - Actualizar

#### Sessions
- `getSessionByPhone(phone)` - Obtener sesión
- `createSession(phone, opencodeSessionId)` - Crear
- `deleteSession(phone)` - **NEW**: Descartar expirada
- `updateSessionPhone(phone, opencodeSessionId)` - Actualizar

#### Config
- `getConfig(key)` - Leer configuración
- `setConfig(key, value)` - Guardar configuración

#### Logs
- `logMessage(from, message, response)` - Registrar conversación
- `getMessagesLog(limit)` - Obtener histórico

---

## Autenticación y Seguridad

### Implementación

#### 1. **Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "supersecret"
}
```

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Login exitoso",
  "data": {
    "token": "a1b2c3d4e5f6...",
    "expiresIn": 86400
  }
}
```

#### 2. **Uso del Token**
```bash
GET /api/whatsapp/status
Authorization: Bearer a1b2c3d4e5f6...
```

#### 3. **Logout**
```bash
POST /api/auth/logout
Authorization: Bearer a1b2c3d4e5f6...
```

### Credenciales
- Definidas en `.env` como `OPENCODE_USER_PASSWORD=usuario:contraseña`
- Requerida al iniciar servidor
- Token expire: `TOKEN_EXPIRY_HOURS` (default 24)

### Rutas Protegidas (requieren token)
- `GET /api/whatsapp/status`
- `GET /api/whatsapp/qr`
- `POST /api/whatsapp/connect`
- `POST /api/whatsapp/disconnect`
- `GET /api/whitelist` (listar)
- `POST /api/whitelist/add`
- `DELETE /api/whitelist/:id`
- `PUT /api/whitelist/:id`
- `GET /api/config/*` (excepto /system-version)

### Rutas Públicas
- `GET /api/config/system-version` - Ver versión
- `GET /api/config/system-prompt-preview` - Ver prompt completo

---

## APIs y Endpoints

### Autenticación

#### POST `/api/auth/login`
Obtener token de acceso
```json
{"username": "admin", "password": "pass"}
→ {"token": "...", "expiresIn": 86400}
```

#### POST `/api/auth/logout`
Invalidar token actual

---

### WhatsApp

#### GET `/api/whatsapp/status` ✅
Obtener estado de conexión
```json
{
  "connected": true|false,
  "qr": "data:image/png;base64,...",  // Si conectando
  "phone": "+5215555555555",          // Si conectado
  "lastSync": "2026-04-18T01:02:03Z"
}
```

#### GET `/api/whatsapp/qr` ✅
Obtener QR actual en PNG
```
Content-Type: image/png
[PNG binary data]
```

#### POST `/api/whatsapp/connect` ✅
Conectar a WhatsApp (genera QR)

#### POST `/api/whatsapp/disconnect` ✅
Desconectar de WhatsApp

#### GET `/api/whatsapp/search?q={query}` ✅
Buscar contactos

---

### Whitelist/Blacklist

#### GET `/api/whitelist`
Listar todos los contactos
```json
[
  {
    "id": 1,
    "phone": "+5215555555555",
    "prompt": "Eres mi asistente...",
    "enabled": 1,
    "is_blacklist": 0,
    "created_at": "2026-04-18T...",
    "updated_at": "2026-04-18T..."
  }
]
```

#### POST `/api/whitelist/add`
Añadir contacto a whitelist o blacklist
```json
{
  "phone": "+5215555555555",
  "prompt": "Custom prompt aquí",
  "is_blacklist": 0,
  "enabled": 1
}
```

#### PUT `/api/whitelist/:id`
Actualizar contacto

#### DELETE `/api/whitelist/:id`
Eliminar contacto

#### POST `/api/whitelist/clear`
Limpiar toda la whitelist (SOLO ADMINS)

---

### Configuración

#### GET `/api/config/system-version` 🌐
Versión actual (pública)
```json
{"version": "1.0.3"}
```

#### GET `/api/config/system-prompt-preview` ✅
Ver prompt completo
```json
{"prompt": "Eres un asistente..."}
```

#### GET `/api/config`
Obtener todas las configuraciones

#### POST `/api/config`
Establecer configuración
```json
{"key": "system_prompt", "value": "..."}
```

---

## WebSocket en Tiempo Real

### Conexión
```javascript
const ws = new WebSocket(
  'ws://localhost:3001?token=a1b2c3...'
);
```

### Mensajes Compatibles

#### Nuevo mensaje
```json
{
  "type": "new_message",
  "data": {
    "from": "+5215555555555",
    "body": "Hola",
    "response": "Hola! ¿Cómo estás?",
    "timestamp": "2026-04-18T01:02:03Z"
  }
}
```

#### Estado de conexión
```json
{
  "type": "status_change",
  "data": {
    "connected": true,
    "timestamp": "2026-04-18T01:02:03Z"
  }
}
```

#### Nuevo QR
```json
{
  "type": "qr_generated",
  "data": {
    "qr": "data:image/png;base64,...",
    "timestamp": "2026-04-18T01:02:03Z"
  }
}
```

---

## Deployment

### Docker

#### Buildear imagen
```bash
docker-compose build
```

#### Ejecutar contenedor
```bash
docker-compose up -d
```

#### Ver logs
```bash
docker-compose logs -f whatsapp-agent
```

#### Detener
```bash
docker-compose down
```

### Configuración requerida (.env)
```env
PORT=3000
ENV=prod|dev
OPENCODE_USER_PASSWORD=admin:password
OPENCODE_PORT=4099
SYSTEM_PROMPT="Tu prompt aquí"
TOKEN_EXPIRY_HOURS=24
```

### Volúmenes Docker
- `/app/data/` - Sesiones y BD SQLite
- `/app/node_modules/` - Dependencias

---

## Manejo de Errores

### Error: ConnectionRefused (Sesión expirada)

**Problema:**
```
[OpenCode] Error en consulta: Unable to connect to 
http://127.0.0.1:4099/session/ses_xxx/message
code: "ConnectionRefused"
```

**Solución implementada:**
1. Detectar patrón `ConnectionRefused|ECONNREFUSED|Unable to connect`
2. Eliminar sessionId obsoleto de BD
3. Crear nueva sesión en OpenCode
4. Reintentar envío automáticamente
5. Si falla de nuevo → error final

**Log de recuperación:**
```
[OpenCode] Sesión no disponible para 5215555555. 
Descartando y reintentando...
[OpenCode] Nueva sesión creada para 5215555555, 
reintentando envío...
[OpenCode] Respuesta reintentada recibida
```

### Error: OpenCode no inicializado
```
[OpenCode] Cliente no inicializado, intentando 
reconectar...
```
Se reconecta automáticamente.

### Error: Whitelist bloqueado
```
[Msg] incoming from 5215555555: FILTRADO - Bloqueado: 
wildcard activo sin whitelist
```
Mensaje ignorado, no se procesa.

### Error: Token expirado
```json
{
  "success": false,
  "error": true,
  "status": 401,
  "message": "Token inválido o expirado"
}
```

---

## Testing

### Ejecutar tests
```bash
bun test
```

### Archivos de test
- `src/test/db.test.ts` - BD
- `src/test/routes.test.ts` - Rutas API
- `src/test/services/` - Servicios individuales
- `src/test/utils.test.ts` - Utilidades

### Setup de test
```typescript
// src/test/setup.ts
- Mock OpenCode
- Mock WhatsApp
- Mock SQL.js
- Base de datos limpia
```

---

## Versionamiento

### Release Workflow
```bash
./release.sh
```

1. Bump version semántico en `package.json`
2. Commit y tag en git
3. Merge `dev` → `main`
4. Push a branch remota

### Archivos de versión
- `package.json` - Versión root + workspace
- `backend/package.json` - Versión backend
- `frontend/package.json` - Versión frontend

---

## Variables de Entorno

### Requeridas
```env
OPENCODE_USER_PASSWORD=usuario:contraseña
```

### Opcionales
```env
PORT=3000                    # Puerto HTTP
OPENCODE_PORT=4099          # Puerto OpenCode
ENV=dev|prod                # Modo
SYSTEM_PROMPT="..."         # Prompt por defecto
TOKEN_EXPIRY_HOURS=24       # Expiración token
WATCH=false                 # Hot-reload
CHROME_PATH=/usr/bin/chrome # Path personalizado
```

---

## Próximas Mejoras

- [ ] Soporte para múltiples instancias OpenCode
- [ ] Caché de respuestas por similaridad
- [ ] Dashboard de analytics
- [ ] Integración con otras plataformas (Telegram, etc)
- [ ] Rate limiting por usuario
- [ ] Webhooks personalizados
- [ ] Sistema de plugins

---

**Documento actualizado:** 2026-04-18  
**Versión:** 1.0.3  
**Autor:** joneldiablo
