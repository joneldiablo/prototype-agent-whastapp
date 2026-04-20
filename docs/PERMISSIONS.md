# Sistema de Permisos

Control de acceso granular por usuario para el agente OpenCode.

## Visión General

Cada usuario en la whitelist tiene permisos específicos que determinan qué acciones puede realizar:

| Permiso | Descripción |
|---------|------------|
| `can_read` | Acceso de lectura al código |
| `can_create` | Crear nuevos archivos |
| `can_modify` | Modificar archivos existentes |
| `can_delete` | Eliminar archivos |
| `can_request_permissions` | Solicitar permisos elevados |

**Default**: Todos los permisos están en `false` (sin acceso).

---

## Estructura de Datos

### Columnas en Whitelist

```sql
whitelist (
  id INTEGER PRIMARY KEY,
  phone TEXT UNIQUE,
  prompt TEXT,
  enabled INTEGER DEFAULT 1,
  is_blacklist INTEGER DEFAULT 0,
  can_read INTEGER DEFAULT 0,
  can_create INTEGER DEFAULT 0,
  can_modify INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 0,
  can_request_permissions INTEGER DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
)
```

---

## API Endpoints

### GET /whitelist

Retorna todos los usuarios con sus permisos.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "phone": "+5215555555555",
      "prompt": "Usuario admin",
      "enabled": 1,
      "is_blacklist": 0,
      "can_read": 1,
      "can_create": 1,
      "can_modify": 1,
      "can_delete": 1,
      "can_request_permissions": 1
    }
  ]
}
```

### POST /whitelist

Agregar usuario con permisos opcionales.

**Request**:
```json
{
  "phone": "+5215555555555",
  "prompt": "Usuario estándar",
  "permissions": {
    "can_read": true,
    "can_create": false,
    "can_modify": false,
    "can_delete": false,
    "can_request_permissions": true
  }
}
```

### PUT /whitelist/:id

Actualizar permisos de usuario.

**Request**:
```json
{
  "permissions": {
    "can_read": true,
    "can_create": true,
    "can_modify": true,
    "can_delete": false,
    "can_request_permissions": false
  }
}
```

---

## Aplicación de Permisos

Los permisos se aplican por sesión via SDK de OpenCode:

```typescript
const userPerms = getUserPermissions(phone);

const permission = {
  read: userPerms?.can_read ? 'allow' : 'deny',
  write: userPerms?.can_create ? 'allow' : 'deny',
  edit: userPerms?.can_modify ? 'allow' : 'deny',
  bash: userPerms?.can_modify ? { '*': 'allow' } : { '*': 'deny' },
};

await client.session.prompt({
  path: { id: sessionId },
  body: {
    system: fullPrompt,
    parts,
    permission,
  },
});
```

### Mapeo de Permisos

| Permiso Usuario | Permission OpenCode |
|---------------|-------------------|
| `can_read: true` | `read: "allow"` |
| `can_read: false` | `read: "deny"` |
| `can_create: true` | `write: "allow"` |
| `can_create: false` | `write: "deny"` |
| `can_modify: true` | `edit: "allow"`, `bash: { "*": "allow" }` |
| `can_modify: false` | `edit: "deny"`, `bash: { "*": "deny" }` |

---

## Funciones DB

### getUserPermissions(phone: string)

Retorna los permisos de un usuario.

```typescript
const perms = getUserPermissions('+5215555555555');
// { can_read: true, can_create: false, can_modify: false, can_delete: false, can_request_permissions: true }
```

### updateUserPermissions(id: number, perms: Partial<UserPermissions>)

Actualiza permisos específicos.

```typescript
await updateUserPermissions(1, {
  can_read: true,
  can_create: true,
});
```

---

## Notas

- Los permisos se aplican **por petición** al SDK (no globales)
- Si el usuario no existe en whitelist, retorna `null` y se usan permisos por defecto (deny all)
- La migración agrega columnas automáticamente si no existen
- Bug conocido #6396: permisos `deny` pueden no respetarse completamente via SDK - verificar versión