# Prototype Agent WhatsApp

Prototipo de comunicación por WhatsApp con agente Big Pickle de OpenCode.

## Descripción

Sistema que conecta WhatsApp con el modelo Big Pickle de OpenCode para automatizar respuestas. Incluye panel administrativo con login seguro (OAuth2.0), WebSocket para mensajes en tiempo real, y gestión de whitelist/blacklist.

## Estructura

```
prototype-agent-whastapp/
├── backend/                 # API REST con Express + SQLite
│   ├── src/
│   │   ├── routes/        # Endpoints API
│   │   ├── services/       # WhatsApp, OpenCode, Auth
│   │   ├── db/            # Base de datos SQLite
│   │   ├── middleware/    # Middleware Express
│   │   ├── types/         # Tipos TypeScript
│   │   ├── test/          # Pruebas unitarias
│   │   └── index.ts       # Punto de entrada
│   ├── package.json
├── frontend/               # Panel administrativo SPA
├── scripts/               # Scripts de inicio
├── release.sh            # Pipeline de release
├── update-version.js     # Versionador semántico
├── .env                  # Configuración (no commitear)
└── .env.example          # Plantilla de configuración
```

## Requisitos

- **Runtime**: Bun
- **Navegador**: Chromium para Puppeteer

## Instalación

```bash
# Instalar dependencias
bun install

# Copiar .env.example a .env y configurar
cp .env.example .env
```

## Configuración (.env)

### Variables Requeridas

| Variable | Descripción |
|----------|-------------|
| `OPENCODE_USER_PASSWORD` | Credenciales admin (formato: `user:pass`) |
| `OPENCODE_API_KEY` | API Key de OpenCode |

### Variables Opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 3000 | Puerto HTTP |
| `NODE_ENV` | development | Entorno (development/production) |
| `WATCH` | false | Auto-reload |
| `OPENCODE_PORT` | 4099 | Puerto servidor OpenCode |
| `SYSTEM_PROMPT` | - | Prompt base del sistema |
| `TOKEN_EXPIRY_HOURS` | 24 | Expiración token |

## Uso

```bash
# Iniciar servidor
bun start

# Ejecutar tests
bun test

# Release (version bump + merge a main)
./release.sh
```

## Seguridad

### Autenticación

El sistema usa OAuth2.0 style:

1. **Login**: `POST /api/auth/login` con `{username, password}`
2. **Token**: Devuelve token bearer con expiry (24h por defecto)
3. **Uso**: Header `Authorization: Bearer {token}`

### Rutas Protegidas

Las siguientes rutas **requieren token válido**:

- `/api/whatsapp/*` - Estado, conectar, desconectar, QR
- `/api/whitelist/*` - Gestión de contactos
- `/api/config/*` - Configuración del sistema

Las rutas **públicas** (sin auth):

- `/api/config/system-version` - Versión del sistema
- `/api/config/system-prompt-preview` - Ver prompt completo
- `/api/auth/login` - Login
- `/api/auth/logout` - Logout

### WebSocket

Puerto: 4001 (requiere token en query string)

```javascript
const ws = new WebSocket('ws://localhost:4001?token={token}');
```

El WebSocket solo conecta cuando hay sesión válida. Se desconecta en logout.

## API Endpoints

### Público (sin auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/config/system-version` | Versión del sistema |
| GET | `/api/config/system-prompt-preview` | Ver prompt completo |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |

### Protegido (token requerido)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/status` | Estado de WhatsApp |
| POST | `/api/whatsapp/connect` | Conectar WhatsApp |
| POST | `/api/whatsapp/disconnect` | Desconectar WhatsApp |
| GET | `/api/whatsapp/qr` | Obtener QR |
| GET | `/api/whatsapp/search?q=` | Buscar contactos/grupos |
| GET/POST/PUT/DELETE | `/api/whitelist/*` | Lista contactos |
| GET/PUT | `/api/config/*` | Configuración |

## Arquitectura

### Servicios

- **Auth Service**: Login/logout, validación token OAuth2.0
- **WhatsApp Service**: Conexión con WhatsApp Web usando whatsapp-web.js
- **OpenCode Service**: Comunicación con OpenCode AI via SDK

### Principios SOLID

- **S**ingle Responsibility: Funciones con una responsabilidad
- **O**pen/Closed: Abierto extensión, cerrado modificación
- **L**iskov Substitution: Interfaces coherentes
- **I**nterface Segregation: Módulos pequeños
- **D**ependency Inversion: Dependencia de abstracciones

## Pruebas Unitarias

```bash
bun test
# 98 tests, ~80% coverage
```

## Dependencias

### Runtime
- `express` - Servidor HTTP
- `cors` - CORS
- `dotenv` - Variables de entorno
- `whatsapp-web.js` - Cliente WhatsApp Web
- `@opencode-ai/sdk` - SDK de OpenCode
- `qrcode` - Generación QR
- `ws` - WebSocket
- `sql.js` - SQLite en memoria

### Desarrollo
- `bun` - Runtime y tests
- `typescript` - Tipado

## Notas

- Las sesiones de WhatsApp se guardan en `data/whatsapp-sessions/`
- La DB SQLite se crea en `backend/data/whatsapp.db`
- Los tokens se almacenan en memoria (en prod usar Redis)
- El servidor de OpenCode inicia en puerto configurable (default 4099)

## Changelog

### v1.0.2
- Search: Buscador de contactos y grupos en WhatsApp
- Frontend: Panel de búsqueda con resultados en tiempo real
- Frontend: Actualización automática de tabla al cambiar estado

### v1.0.1
- Seguridad: Rutas `/api/whatsapp/*` ahora requieren token bearer
- Frontend: Login valida credenciales antes de mostrar contenido
- WebSocket: Solo conecta cuando hay sesión válida

### v1.0.0
- Login OAuth2.0 con token bearer
- WebSocket para mensajes en tiempo real
- Prompt del sistema concatenable (env + BD)
- Whitelist/Blacklist con UI mejorada
- Pruebas unitarias (~80% coverage)
- Pipeline de release automatizado