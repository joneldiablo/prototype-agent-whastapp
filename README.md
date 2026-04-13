# Prototype Agent WhatsApp

Prototipo de comunicación por WhatsApp con agente Big Pickle de OpenCode.

## Descripción

Sistema que conecta WhatsApp con el modelo Big Pickle de OpenCode para automatizar respuestas. Incluye panel administrativo para gestionar la whitelist/blacklist y prompts personalizados.

## Estructura

```
├── backend/          # API REST con Express + SQLite
│   ├── src/
│   │   ├── routes/   # Endpoints API
│   │   ├── services/ # WhatsApp y OpenCode
│   │   ├── db/       # Base de datos SQLite
│   │   └── types/    # TypeScript types
│   └── .env          # Configuración
├── frontend/         # Panel administrativo SPA
├── agents/           # Documentación para agentes
└── package.json      # Workspace root
```

## Requisitos

- Bun (gestor de paquetes y runtime)
- Node.js (alternativo)

## Instalación

### Instalación de Bun

**IMPORTANTE**: No installes Bun usando `snap` en Linux. La versión de snap encapsula Bun y causa conflictos con Puppeteer/Chromium. Instala Bun directamente desde el script oficial:

```bash
# Verificar si tienes Bun instalado por snap
which bun || snap list | grep bun

# Si está instalado via snap, removerlo primero
sudo snap remove bun-js

# Instalar Bun correctamente
curl -fsSL https://bun.sh/install | bash

# Cargarlo en el shell actual
source ~/.bashrc

# Verificar instalación
bun -v
```

### Instalar dependencias

```bash
# Remover node_modules si existe (por si hay conflictos)
rm -rf node_modules

# Instalar dependencias
bun install

# Instalar navegador Chromium para Puppeteer
bun x puppeteer browsers install chrome
```

### Docker

Para ejecutar el proyecto isolado usando Docker:

```bash
# Construir imagen
docker build -t whatsapp-agent .

# O usar docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## Configuración

Editar `backend/.env`:

```
PORT=3000
OPENCODE_USER_PASSWORD=admin:password123
OPENCODE_API_KEY=tu_api_key_aqui
```

## Uso

```bash
# Iniciar servidor (desde la raíz del proyecto)
yarn start
```

El servidor cargará las variables del `.env` en la raíz.

## Panel Admin

Acceder a `http://localhost:\${PORT}/admin` (default 4000) y usar las credenciales del `.env` para autenticación Basic Auth.

## API Endpoints

### WhatsApp
- `GET /api/whatsapp/status` - Estado de conexión
- `POST /api/whatsapp/connect` - Iniciar conexión
- `POST /api/whatsapp/disconnect` - Desconectar
- `GET /api/whatsapp/qr` - Obtener QR

### Whitelist (requiere auth)
- `GET /api/whitelist` - Listar entradas
- `POST /api/whitelist` - Agregar entrada
- `PUT /api/whitelist/:id` - Actualizar entrada
- `DELETE /api/whitelist/:id` - Eliminar entrada

### Config (requiere auth)
- `GET /api/config/system-prompt` - Obtener prompt global
- `PUT /api/config/system-prompt` - Actualizar prompt global
- `GET /api/config/messages` - Ver historial de mensajes

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

## Tecnologías

- **Backend**: Express, SQLite (better-sqlite3), Bun
- **Frontend**: Vanilla JS + HTML
- **WhatsApp**: webwhatsappjs (a implementar)
- **AI**: OpenCode Big Pickle API

## Notas de Desarrollo

- Los endpoints de whitelist y config requieren Basic Auth
- La contraseña se configura en .env formato "user:password"
- El servidor crea automáticamente la base de datos SQLite en `backend/data/`