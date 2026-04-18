# API Reference - Prototype Agent WhatsApp

Referencia completa de todos los endpoints disponibles.

## Base URL

```
Development:  http://localhost:3000/api
Production:   https://yourdomain.com/api
WebSocket:    ws://localhost:3001
```

## Autenticación

La mayoría de endpoints requieren autenticación Bearer:

```
Authorization: Bearer {token}
```

Obtener token:
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

---

## 🔐 Authentication

### POST `/auth/login`

**Autenticación:** Ninguna (pública)

**Descripción:** Obtener token de acceso

**Request:**
```json
{
  "username": "admin",
  "password": "password"
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
    "token": "aabbccdd1122334455...",
    "expiresIn": 86400
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": true,
  "status": 401,
  "code": 401,
  "message": "Credenciales inválidas"
}
```

---

### POST `/auth/logout`

**Autenticación:** Requerida ✅

**Descripción:** Invalidar token actual

**Request:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Logout exitoso"
}
```

---

## 📱 WhatsApp

### GET `/whatsapp/status`

**Autenticación:** Requerida ✅

**Descripción:** Obtener estado actual de conexión

**Response (200) - Desconectado:**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Estado de WhatsApp",
  "data": {
    "connected": false
  }
}
```

**Response (200) - Conectando (esperando QR):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Estado de WhatsApp",
  "data": {
    "connected": false,
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }
}
```

**Response (200) - Conectado:**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Estado de WhatsApp",
  "data": {
    "connected": true,
    "phone": "+5215555555555",
    "lastSync": "2026-04-18T01:02:03.000Z"
  }
}
```

---

### GET `/whatsapp/qr`

**Autenticación:** Requerida ✅

**Descripción:** Obtener imagen QR actual (PNG)

**Response (200):**
```
Content-Type: image/png
[Binary PNG image data]
```

**Response (400) - No está conectando:**
```json
{
  "success": false,
  "error": true,
  "status": 400,
  "code": 400,
  "message": "No hay QR disponible"
}
```

---

### POST `/whatsapp/connect`

**Autenticación:** Requerida ✅

**Descripción:** Conectar a WhatsApp (genera QR)

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Conectando a WhatsApp...",
  "data": {
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }
}
```

**Flujo:**
1. Escanear QR con WhatsApp
2. Esperar ~5 segundos
3. Verificar `/whatsapp/status` → `connected: true`

---

### POST `/whatsapp/disconnect`

**Autenticación:** Requerida ✅

**Descripción:** Desconectar de WhatsApp

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Desconectado de WhatsApp"
}
```

---

### GET `/whatsapp/search`

**Autenticación:** Requerida ✅

**Descripción:** Buscar contactos en WhatsApp

**Query Params:**
- `q` (string, required): Término de búsqueda

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Contactos encontrados",
  "data": [
    {
      "name": "Juan Pérez",
      "number": "+5215555555555",
      "isBusiness": false
    },
    {
      "name": "Empresa XYZ",
      "number": "+5215555555556",
      "isBusiness": true
    }
  ]
}
```

---

## 📋 Whitelist/Blacklist

### GET `/whitelist`

**Autenticación:** Requerida ✅

**Descripción:** Listar todos los contactos (whitelist y blacklist)

**Query Params (opcionales):**
- `enabled` (0|1): Filtrar por estado
- `is_blacklist` (0|1): Filtrar por tipo

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Lista de contactos",
  "data": [
    {
      "id": 1,
      "phone": "+5215555555555",
      "prompt": "Eres un asistente de soporte...",
      "enabled": 1,
      "is_blacklist": 0,
      "created_at": "2026-04-17T10:30:00.000Z",
      "updated_at": "2026-04-17T10:30:00.000Z"
    },
    {
      "id": 2,
      "phone": "+5215555555556",
      "prompt": null,
      "enabled": 1,
      "is_blacklist": 1,
      "created_at": "2026-04-17T10:30:00.000Z",
      "updated_at": "2026-04-17T10:30:00.000Z"
    }
  ]
}
```

---

### POST `/whitelist/add`

**Autenticación:** Requerida ✅

**Descripción:** Añadir contacto a whitelist o blacklist

**Request:**
```json
{
  "phone": "+5215555555555",
  "prompt": "Eres un asistente de ventas. Ayuda a los clientes a comprar.",
  "is_blacklist": 0,
  "enabled": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "error": false,
  "status": 201,
  "code": 201,
  "message": "Contacto añadido",
  "data": {
    "id": 3,
    "phone": "+5215555555555",
    "prompt": "Eres un asistente de ventas...",
    "enabled": 1,
    "is_blacklist": 0,
    "created_at": "2026-04-18T01:02:03.000Z",
    "updated_at": "2026-04-18T01:02:03.000Z"
  }
}
```

**Response (400) - Contacto duplicado:**
```json
{
  "success": false,
  "error": true,
  "status": 400,
  "code": 400,
  "message": "El contacto ya existe"
}
```

---

### PUT `/whitelist/:id`

**Autenticación:** Requerida ✅

**Descripción:** Actualizar contacto

**Path Params:**
- `id` (number): ID del contacto

**Request (actualizar solo lo necesario):**
```json
{
  "prompt": "Nuevo prompt aquí",
  "enabled": 0
}
```

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Contacto actualizado",
  "data": {
    "id": 3,
    "phone": "+5215555555555",
    "prompt": "Nuevo prompt aquí",
    "enabled": 0,
    "is_blacklist": 0,
    "created_at": "2026-04-18T01:02:03.000Z",
    "updated_at": "2026-04-18T01:02:10.000Z"
  }
}
```

---

### DELETE `/whitelist/:id`

**Autenticación:** Requerida ✅

**Descripción:** Eliminar contacto

**Path Params:**
- `id` (number): ID del contacto

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Contacto eliminado"
}
```

**Response (404):**
```json
{
  "success": false,
  "error": true,
  "status": 404,
  "code": 404,
  "message": "Contacto no encontrado"
}
```

---

### POST `/whitelist/clear`

**Autenticación:** Requerida ✅

**Descripción:** Limpiar toda la whitelist (solo ADMINS)

⚠️ **PELIGROSO**: Elimina todos los contactos

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Whitelist limpiada"
}
```

---

## ⚙️ Configuration

### GET `/config/system-version`

**Autenticación:** Ninguna (pública) 🌐

**Descripción:** Obtener versión del sistema

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Versión del sistema",
  "data": {
    "version": "1.0.3"
  }
}
```

---

### GET `/config/system-prompt-preview`

**Autenticación:** Requerida ✅ (en algunos casos)

**Descripción:** Ver prompt completo del sistema

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Preview del prompt",
  "data": {
    "prompt": "Eres un asistente útil y amigable.\n\nResponde de manera concisa y clara.\n\nSiempre sé respetuoso."
  }
}
```

---

### GET `/config`

**Autenticación:** Requerida ✅

**Descripción:** Obtener todas las configuraciones

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Configuraciones",
  "data": [
    {
      "id": 1,
      "key": "system_prompt",
      "value": "Eres un asistente...",
      "created_at": "2026-04-17T10:30:00.000Z",
      "updated_at": "2026-04-17T10:30:00.000Z"
    },
    {
      "id": 2,
      "key": "whatsapp_connected",
      "value": "true",
      "created_at": "2026-04-17T10:30:00.000Z",
      "updated_at": "2026-04-18T01:00:00.000Z"
    }
  ]
}
```

---

### POST `/config`

**Autenticación:** Requerida ✅

**Descripción:** Guardar/actualizar configuración

**Request:**
```json
{
  "key": "system_prompt",
  "value": "Eres un asistente de soporte técnico..."
}
```

**Response (200):**
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 200,
  "message": "Configuración guardada",
  "data": {
    "id": 1,
    "key": "system_prompt",
    "value": "Eres un asistente de soporte técnico...",
    "updated_at": "2026-04-18T01:02:03.000Z"
  }
}
```

---

## 🔄 WebSocket

### Conexión

```
ws://localhost:3001?token={token}
```

**JavaScript:**
```javascript
const ws = new WebSocket(
  'ws://localhost:3001?token=tu_token_aqui'
);

ws.onopen = () => console.log('Conectado');
ws.onmessage = (e) => console.log('Mensaje:', e.data);
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Desconectado');
```

---

### Eventos Disponibles

#### `new_message`
**Tipo:** Broadcast cuando llega nuevo mensaje

**Payload:**
```json
{
  "type": "new_message",
  "data": {
    "from": "+5215555555555",
    "body": "Hola, ¿cuál es tu horario?",
    "response": "Nuestro horario es de 9AM a 6PM.",
    "timestamp": "2026-04-18T01:02:03.000Z"
  }
}
```

---

#### `status_change`
**Tipo:** Broadcast cuando cambia estado de WhatsApp

**Payload:**
```json
{
  "type": "status_change",
  "data": {
    "connected": true,
    "phone": "+5215555555555",
    "timestamp": "2026-04-18T01:02:03.000Z"
  }
}
```

---

#### `qr_generated`
**Tipo:** Broadcast cuando se genera nuevo QR

**Payload:**
```json
{
  "type": "qr_generated",
  "data": {
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "timestamp": "2026-04-18T01:02:03.000Z"
  }
}
```

---

## Error Codes

| Código | Significado | Acción |
|--------|------------|--------|
| 200 | OK (éxito) | Continuar |
| 201 | Created (creado) | Continuar |
| 400 | Bad Request | Revisar parámetros |
| 401 | Unauthorized | Login nuevamente |
| 403 | Forbidden | Permisos insuficientes |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Recurso duplicado |
| 500 | Internal Server Error | Contactar admin |

---

## Tipos de Respuesta

Todas las respuestas siguen este patrón:

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;        // true si OK, false si error
  error: boolean;         // true si hay error, false si OK
  status: number;         // HTTP status code (200, 400, 500, etc)
  code: number;           // Same as status
  message: string;        // Mensaje descriptivo
  data?: T;               // Payload (opcional)
}
```

---

## Ejemplos de Uso

### JavaScript/Fetch

```javascript
// Login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'password'
  })
});

const { data } = await loginRes.json();
const token = data.token;

// Obtener estado
const statusRes = await fetch('/api/whatsapp/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const status = await statusRes.json();
console.log('Conectado:', status.data.connected);
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Obtener estado (con token)
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/whatsapp/status
```

### Python

```python
import requests

# Login
response = requests.post(
    'http://localhost:3000/api/auth/login',
    json={'username': 'admin', 'password': 'password'}
)

token = response.json()['data']['token']

# Obtener estado
response = requests.get(
    'http://localhost:3000/api/whatsapp/status',
    headers={'Authorization': f'Bearer {token}'}
)

print(response.json())
```

---

**Documento actualizado:** 2026-04-18  
**Versión:** 1.0.3
