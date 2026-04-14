# Prototype Agent WhatsApp

Prototipo de comunicación por WhatsApp con agente Big Pickle de OpenCode.

## Descripción

Sistema que conecta WhatsApp con el modelo Big Pickle de OpenCode para automatizar respuestas. Incluye panel administrativo para gestionar la whitelist/blacklist y prompts personalizados.

## Estructura

```
prototype-agent-whastapp/
├── backend/                 # API REST con Express + SQLite
│   ├── src/
│   │   ├── routes/        # Endpoints API
│   │   ├── services/       # WhatsApp y OpenCode
│   │   ├── db/            # Base de datos SQLite
│   │   ├── middleware/    # Middleware Express
│   │   ├── types/         # Tipos TypeScript
│   │   └── index.ts       # Punto de entrada
│   ├── package.json
│   └── .env
├── frontend/               # Panel administrativo SPA
├── scripts/               # Scripts de inicio
├── package.json           # Workspace root
└── .env                  # Configuración
```

## Requisitos

- **Runtime**: Bun (gestor de paquetes y runtime)
- **Navegador**: Chromium para Puppeteer

## Instalación

### Instalar Bun

**IMPORTANTE**: No instales Bun usando `snap` en Linux. La versión de snap encapsula Bun y causa conflictos con Puppeteer/Chromium.

```bash
# Verificar si tienes Bun instalado
which bun

# Si está instalado via snap, removerlo primero
sudo snap remove bun-js

# Instalar Bun correctamente
curl -fsSL https://bun.sh/install | bash

# Verificar instalación
bun -v
```

### Instalar dependencias

```bash
# Instalar dependencias del workspace
bun install

# Instalar Chromium para Puppeteer
bun x puppeteer browsers install chrome
```

### Configuración

Editar `.env`:

```bash
# Puerto del servidor
PORT=4000

# Entorno: development o production
NODE_ENV=development

# Modo watch
WATCH=true

# Credenciales admin (formato: usuario:contraseña)
OPENCODE_USER_PASSWORD=admin:password123

# API Key de OpenCode
OPENCODE_API_KEY=tu_api_key_aqui

# Puerto de OpenCode
OPENCODE_PORT=4099

# Máximo de caracteres para contexto
MAX_CONTEXT_CHARS=80000
```

## Uso

```bash
# Iniciar servidor (desde la raíz)
yarn start

# O directamente con bun
bun run scripts/start.js
```

El servidor cargará las variables del `.env` en la raíz.

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 3000 | Puerto del servidor HTTP |
| `NODE_ENV` | development | Entorno (development/production) |
| `WATCH` | false | Modo watch (auto-reload) |
| `OPENCODE_USER_PASSWORD` | admin:password123 | Credenciales admin |
| `OPENCODE_API_KEY` | - | API Key de OpenCode |
| `OPENCODE_PORT` | 4099 | Puerto del servidor OpenCode |
| `OPENCODE_BASE_URL` | https://opencode.ai | URL base OpenCode |

## API Endpoints

### WhatsApp (públicos)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/status` | Estado de conexión |
| POST | `/api/whatsapp/connect` | Iniciar conexión |
| POST | `/api/whatsapp/disconnect` | Desconectar |
| GET | `/api/whatsapp/qr` | Obtener QR |

### Whitelist (requiere auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whitelist` | Listar entradas |
| POST | `/api/whitelist` | Agregar entrada |
| PUT | `/api/whitelist/:id` | Actualizar entrada |
| DELETE | `/api/whitelist/:id` | Eliminar entrada |

### Config (requiere auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/config/system-prompt` | Obtener prompt global |
| PUT | `/api/config/system-prompt` | Actualizar prompt global |
| GET | `/api/config/messages` | Ver historial de mensajes |

### Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/admin` | Panel administrativo |
| GET | `/` | Redirecciona a /admin |

## Formato de Respuesta API

```json
{
  "success": boolean,
  "error": boolean,
  "status": number,
  "code": number,
  "message": string,
  "data": any
}
```

## Arquitectura

### Servicios

- **WhatsApp Service** (`services/whatsapp.ts`): Maneja conexión con WhatsApp Web
- **OpenCode Service** (`services/opencode.ts`): Maneja comunicación con OpenCode
- **Database** (`db/index.ts`): SQLite para persistencia

### Principios SOLID Aplicados

- **S**ingle Responsibility: Cada función tiene una responsabilidad
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Interfaces coherentes
- **I**nterface Segregation: Módulos pequeños
- **D**ependency Inversion: Dependencia de abstracciones

## Pruebas Unitarias

```bash
# Ejecutar pruebas (si están configuradas)
bun test
```

## Logging

El logging funciona según el entorno:

- **development**: Muestra todos los logs
- **production**: Solo errores esenciales

## Docker

```bash
# Construir imagen
docker build -t whatsapp-agent .

# Ejecutar
docker run -p 4000:4000 whatsapp-agent
```

## Dependencias

### Runtime

- `express` - Servidor HTTP
- `cors` - CORS
- `dotenv` - Variables de entorno
- `whatsapp-web.js` - Cliente WhatsApp Web
- `@opencode-ai/sdk` - SDK de OpenCode
- `qrcode` - Generación QR
- `puppeteer` - Navegador headless
- `sql.js` - SQLite en memoria

### Tipos

- `@types/express`
- `@types/cors`
- `@types/qrcode`
- `@types/sql.js`

## Notas de Desarrollo

- Los endpoints de whitelist y config requieren Basic Auth
- La contraseña se configura en `.env` formato "usuario:contraseña"
- El servidor crea automáticamente la base de datos SQLite en `backend/data/`
- Las sesiones de WhatsApp se guardan en `data/whatsapp-sessions/`
- OpenCode inicia en puerto 4099 por defecto (configurable)

## Licencia

MIT