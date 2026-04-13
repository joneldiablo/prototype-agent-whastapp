# Guía para Agentes - WhatsApp Agent

## Flujo de Trabajo Git

### Ramas
- **main**: Rama estable/producción
- **dev**: Rama de desarrollo activo
- **feature/***: Ramas de nuevas funcionalidades (crear desde dev)

### Proceso
1. Trabajar siempre desde rama `dev` o crear nueva rama desde `dev`
2. Crear rama: `git checkout -b feature/nombre-caracteristica dev`
3. Commits claros y frecuentes
4. Al terminar: PR a `dev`, luego merge
5. Eliminar rama tras merge

## Comandos Útiles

```bash
# Install dependencies
bun install

# Start dev server
cd backend && bun run dev

# View logs
# (pending implementation)

# Database
# SQLite en backend/data/whatsapp.db
```

## Arquitectura

### Stack
- Runtime: Bun
- Backend: Express + better-sqlite3
- Frontend: Vanilla JS
- WhatsApp: webwhatsappjs
- AI: OpenCode API

### Estructura de Respuestas API

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  error: boolean;
  status: number;  // HTTP status
  code: number;   // Custom error code
  message: string;
  data?: T;
}
```

### Rutas con Auth (Basic Auth)
- `/api/whitelist/*`
- `/api/config/*`

### Credenciales
- En `backend/.env` formato: `user:password`
- Basic Auth header requerido

## Pendientes (del todo.md)

- Implementar webwhatsappjs para conexión real WhatsApp
- Integrar OpenCode Big Pickle para respuestas AI
- Lógica de whitelist/blacklist
- Mejoras UI admin

## Notas
- El proyecto usa Bun como package manager
- Las dependencias se instalan en raíz con workspaces
- API abierta en `/api/whatsapp/*` sin auth
- Auth solo en rutas administrativas