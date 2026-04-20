# TODO - Sistema de Permisos por Usuario

Agenda de tareas para implementar el sistema de permisos granulares por usuario en la whitelist.

## Visión General

Agregar control de permisos granular a cada usuario en la whitelist:
- `can_read` - acceso de lectura
- `can_create` - crear archivos
- `can_modify` - modificar archivos
- `can_delete` - eliminar archivos
- `can_request_permissions` - solicitar permisos

Default: todos en `false` (sin acceso)

---

## Tareas

### 1. Estructura de permisos en DB

**Archivo**: `backend/src/db/index.ts`

Añadir columnas a la tabla `whitelist`:
```sql
can_read INTEGER DEFAULT 0
can_create INTEGER DEFAULT 0
can_modify INTEGER DEFAULT 0
can_delete INTEGER DEFAULT 0
can_request_permissions INTEGER DEFAULT 0
```

**Estado**: 🟡 Pending

---

### 2. Actualizar tipos TypeScript

**Archivo**: `backend/src/types/index.ts`

Actualizar interfaz `WhitelistEntry`:
```typescript
export interface UserPermissions {
  can_read: boolean;
  can_create: boolean;
  can_modify: boolean;
  can_delete: boolean;
  can_request_permissions: boolean;
}

export interface WhitelistEntry {
  id?: number;
  phone: string;
  prompt?: string;
  enabled: boolean;
  is_blacklist: boolean;
  permissions?: UserPermissions;
  created_at?: string;
  updated_at?: string;
}
```

**Estado**: 🟡 Pending

---

### 3. API REST /whitelist

**Archivo**: `backend/src/routes/whitelist.ts`

Endpoints a modificar:
- `GET /whitelist` - incluir permisos en respuesta
- `POST /whitelist` - aceptar permisos opcionales
- `PUT /:id` - aceptar permisos para actualizar

_REQUEST Body example_:
```json
{
  "phone": "+5215555555555",
  "prompt": "Usuario administrador",
  "permissions": {
    "can_read": true,
    "can_create": true,
    "can_modify": true,
    "can_delete": false,
    "can_request_permissions": true
  }
}
```

**Estado**: 🟡 Pending

---

### 4. Funciones DB para permisos

**Archivo**: `backend/src/db/index.ts`

Nuevas funciones:
```typescript
export function getUserPermissions(phone: string): UserPermissions | null
export function updateUserPermissions(id: number, perms: Partial<UserPermissions>): { changes: number }
```

**Estado**: 🟡 Pending

---

### 5. Aplicar permisos en OpenCode Service

**Archivo**: `backend/src/services/opencode.ts`

En `sendToSession()`, obtener permisos del usuario y aplicarlos:

```typescript
// Obtener permisos del usuario
const userPerms = getUserPermissions(phone);

// Mapear permisos a formato OpenCode SDK
const permission: Record<string, unknown> = {
  read: userPerms?.can_read ? "allow" : "deny",
  write: userPerms?.can_create ? "allow" : "deny",
  edit: userPerms?.can_modify ? "allow" : "deny",
  bash: userPerms?.can_modify ? { "*": "allow" } : { "*": "deny" }
};

// En la llamada SDK
await client.session.prompt({
  path: { id: sessionId },
  body: {
    system: fullPrompt,
    parts,
    permission
  }
});
```

**Estado**: 🟡 Pending

---

### 6. Pruebas unitarias - DB

**Archivo**: `backend/src/test/db.test.ts`

Casos de prueba:
- `getUserPermissions` returns null for unknown phone
- `getUserPermissions` returns correct permissions
- `updateUserPermissions` updates only specified fields
- `updateUserPermissions` returns 0 changes for invalid id
- Whitelist GET includes permissions
- Whitelist POST accepts permissions
- Whitelist PUT updates permissions

**Estado**: 🟡 Pending

---

### 7. Pruebas unitarias - OpenCode Service

**Archivo**: `backend/src/test/services/opencode.test.ts`

Casos de prueba:
- `sendToSession` applies permissions when user has can_read
- `sendToSession` applies permissions when user has can_create
- `sendToSession` denies read when can_read is false
- `sendToSession` denies write when can_create is false

**Estado**: 🟡 Pending

---

### 8. Documentación

**Archivos**:
- `docs/PERMISSIONS.md` - guía de uso
- `docs/API.md` - actualizar endpoints

**Contenido**:
- Esquema de permisos
- Ejemplos de uso
- Comandos disponibles

**Estado**: ✅ Completed

---

## 10. Frontend con permisos

**Archivo**: `frontend/index.html`

Modificaciones:
- Tabla whitelist ahora tiene columnas de permisos (checkboxes)
- Checkboxes para permisos: Leer, Crear, Modificar, Eliminar, Pedir Permisos
- Función `updatePermission(id, permission, value)` para actualizar indiv.
- Sección para agregar usuario con permisos por defecto
- Colores diferenciados por tipo de permiso

**Características**:
- Toggle switches con colores por tipo de permiso
- Tooltips en hover
- Eliminar deshabilitado si está bloqueado

**Estado**: ✅ Completed

---

## Dependencias

```
1. DB → 2. Tipos → 3. Funciones DB → 4. API → 5. OpenCode Service
                                    ↓
                              6. Pruebas DB
                                    ↓
                              7. Pruebas OpenCode
                                    ↓
                              8. Documentación
```

---

## 9. Sanitización de mensajes para WhatsApp

**Archivo**: `backend/src/services/whatsapp.ts`

Funciones añadidas:
- `sanitizeForWhatsApp(text)` - limpia texto manteniendo solo UTF-8 válido + emojis
- `MAX_MESSAGE_LENGTH = 4000` - límite optimal
- `sendMessage` ahora fragmenta mensajes largos automáticamente

**Características**:
- Elimina caracteres de control inválidos
- Mantiene rangos UTF-8 latino/europeo + emojis
- Fragmenta mensajes > 4000 chars
- Añade prefijo `[1/N]` en fragmentos multiplos

**Estado**: ✅ Completed

---

## Notes

- Los permisos se aplican por petición al SDK (no globales)
- Bug conocido: #6396 - permisos deny pueden no respetarse completamente via SDK
- Verificar versión del SDK
- Default: todos los permisos en `false`