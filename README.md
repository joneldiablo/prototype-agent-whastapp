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

```bash
# Instalar dependencias
bun install

# O usar yarn si prefieres
yarn install
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
bun run start

# O con watch para desarrollo
bun run start:watch
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