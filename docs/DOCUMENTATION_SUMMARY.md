# Project Documentation Summary

Este resumen ejecutivo documenta el análisis completo del proyecto **Prototype Agent WhatsApp**.

## 📋 Documentación Creada

Se han generado **4 documentos completos**:

### 1. **[ARCHITECTURE.md](ARCHITECTURE.md)** 📐
Análisis técnico completo del proyecto

**Contenido:**
- Visión general y propósito del proyecto
- Stack tecnológico (Bun, Express, SQLite, OpenCode, WhatsApp Web)
- Estructura detallada de carpetas
- Descripción de componentes principales:
  - Backend Server (Express + WebSocket)
  - OpenCode Service (AI responses + auto-recovery)
  - WhatsApp Service (web client automation)
  - Auth Service (OAuth2-style tokens)
  - Database Service (SQLite)
- Flujo de datos completo (mensaje entrante → respuesta)
- Schema de base de datos (4 tablas)
- Autenticación y seguridad
- Referencia de APIs (resumen alto nivel)
- WebSocket en tiempo real
- Deployment con Docker
- Manejo de errores e recuperación automática

**Para:** Entender cómo funciona todo el sistema

---

### 2. **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** 🛠️
Guía práctica para desarrolladores

**Contenido:**
- Inicio rápido (requisitos, setup inicial)
- Estructura de proyecto explicada
- Cómo desarrollar localmente
- Patrones para crear nuevos servicios
- Patrones para crear nuevos endpoints
- Sistema de logging y mascaramiento
- Testing (estructura, ejecutar, mocking)
- Debugging (Bun debugger, WebSocket, DB)
- Guía de estilos TypeScript
- Variables de entorno
- Build y deployment
- Troubleshooting básico
- Resources y tips

**Para:** Desarrollar nuevas features

---

### 3. **[API_REFERENCE.md](API_REFERENCE.md)** 🔌
Referencia completa de endpoints

**Contenido:**
- Base URL y autenticación
- 25+ endpoints documentados:
  - Auth (login, logout)
  - WhatsApp (status, QR, connect, disconnect, search)
  - Whitelist (get, add, update, delete, clear)
  - Config (system version, prompt preview, get, set)
- WebSocket events detallados
- Error codes y significados
- Tipos de respuesta (patrón)
- Ejemplos en:
  - JavaScript/Fetch
  - cURL
  - Python

**Para:** Integración con el API

---

### 4. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** 🐛
Resolución de problemas y mejores prácticas

**Contenido:**
- 10 problemas comunes con soluciones:
  1. OpenCode no inicializado
  2. ConnectionRefused (sesión expirada)
  3. Failed to find Chromium
  4. EADDRINUSE (puerto en uso)
  5. Token inválido
  6. QR not found
  7. Database locked
  8. Credenciales inválidas
  9. WebSocket connection refused
  10. No hay respuesta de OpenCode
- 10 mejores prácticas:
  - Gestión de credenciales
  - Manejo de errores
  - Logging
  - Validación de entrada
  - Async/await
  - DB operations
  - Type safety
  - Testing
  - Performance
  - Documentation
- Tips de debugging
- Performance optimization
- Security checklist

**Para:** Resolver problemas y escribir mejor código

---

## 🎯 Qué es Prototype Agent WhatsApp

### Propósito
Automatizar respuestas en WhatsApp mediante un agente de IA (Big Pickle de OpenCode).

### Flujo Principal
```
Usuario WhatsApp
    ↓
WhatsApp Web (Puppeteer + whatsapp-web.js)
    ↓
Backend API REST (Express.js)
    ↓
OpenCode AI (envía mensaje + system prompt)
    ↓
Respuesta inteligente
    ↓
Enviar a WhatsApp
    ↓
Panel Admin en tiempo real (WebSocket)
    ↓
Histórico en BD SQLite
```

### Características Principales
✅ **Automatización**: Responde automáticamente usando IA  
✅ **Control**: Whitelist/blacklist de contactos  
✅ **Personalizacion**: Prompt customizable por usuario  
✅ **Admin Panel**: Interfaz web segura  
✅ **Tiempo Real**: WebSocket para updates instantáneos  
✅ **Histórico**: Todas las conversaciones guardadas  
✅ **Alta Disponibilidad**: Reconexión automática  
✅ **Containerizado**: Docker listo para producción  

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp User                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│       WhatsApp Web (whatsapp-web.js + Puppeteer)           │
│                                                             │
│  - Conecta con QR scan                                     │
│  - Recibe mensajes en tiempo real                          │
│  - Envía respuestas automáticamente                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│            Backend API REST (Express.js)                     │
│                                                              │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │ Auth Service │  │ Whatsapp    │  │ OpenCode     │        │
│  │              │  │ Service     │  │ Service      │        │
│  │ - Login      │  │             │  │              │        │
│  │ - Tokens     │  │ - Connect   │  │ - Sessions   │        │
│  │ - Validation │  │ - Messages  │  │ - Prompts    │        │
│  └──────────────┘  │ - QR        │  │ - Responses  │        │
│                    │ - Search    │  │ - Auto Retry │        │
│                    └─────────────┘  └──────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Database Service (SQLite)                  │   │
│  │                                                      │   │
│  │  - sessions: track OpenCode por teléfono           │   │
│  │  - whitelist: allow/block/custom prompt            │   │
│  │  - system_config: global settings                  │   │
│  │  - messages_log: historial conversaciones          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────┬─────────────────────────────┬────────────────────┬──┘
         │                             │                    │
         ↓                             ↓                    ↓
    ┌─────────┐              ┌──────────────┐         ┌────────┐
    │WebSocket│              │  OpenCode    │         │SQLite  │
    │Server   │              │ AI Backend   │         │Database│
    │(3001)   │              │ (4099)       │         │        │
    └────┬────┘              └──────────────┘         └────────┘
         │
         ↓
    ┌──────────────────┐
    │  Admin Panel     │
    │                  │
    │ - Ver estado     │
    │ - Gestionar      │
    │   contactos      │
    │ - Ver histórico  │
    │ - Config sistema │
    └──────────────────┘
```

---

## 📊 Tecnologías Utilizadas

| Layer | Tecnología | Versión | Propósito |
|-------|-----------|---------|----------|
| **Runtime** | Bun | 1.0+ | JS/TS execution |
| **API** | Express.js | 4.21 | HTTP REST API |
| **DB** | sql.js | 1.10 | SQLite in-memory |
| **WhatsApp** | whatsapp-web.js | 1.23 | Web client automation |
| **Browser** | Puppeteer | 22+ | Chrome automation |
| **IA** | OpenCode SDK | 1.4.3 | Big Pickle model |
| **RealTime** | WebSocket (ws) | 8.18 | Live updates |
| **Auth** | OpenCode User | - | OAuth2-style |
| **QR** | qrcode | 1.5 | QR generation |
| **CORS** | cors | 2.8 | Cross-origin |
| **Env** | dotenv | 16.4 | .env management |

---

## 🔑 Características Principales

### 1. **Autenticación Segura**
- Login con usuario/contraseña
- Token Bearer con 24h expiry
- Validación en cada request
- Limpieza automática de tokens expirados

### 2. **Gestión de WhatsApp**
- Conexión con QR scan
- Detección automática de cambios de estado
- Captura de mensajes entrantes
- Soporte para imágenes en base64
- Sesiones persistentes (Puppeteer cache)

### 3. **Integración OpenCode AI**
- Soporte para prompts personalizados por usuario
- Sesiones independientes por teléfono
- **Auto-recovery**: Detecta sesiones expiradas
- Reintentos automáticos en caso de error
- Soporte para multiples tipos de respuesta

### 4. **Control de Contactos**
- Whitelist global (permitir específico)
- Blacklist específica (denegar específico)
- Wildcard bloqueador como default
- Custom prompts por contacto
- Enable/disable per contact

### 5. **Panel Administrativo**
- Login seguro
- Ver estado de conexión
- Administrar contactos
- Buscar en WhatsApp
- Ver histórico de mensajes
- Configurar sistema

### 6. **Base de Datos**
- Sesiones OpenCode por usuario
- Histórico completo de conversaciones
- Configuración global
- Whitelist/blacklist persistente

---

## 📈 Mejoras Recientes (Latest Commit)

### Problema
Las sesiones de OpenCode expiraban permanentemente después de un tiempo, causando errores de `ConnectionRefused` que hacían que el bot no pudiera responder.

### Solución Implementada
1. **Detección automática** de errores `ConnectionRefused`
2. **Limpieza de sessionId** obsoleto en BD
3. **Creación automática** de nueva sesión en OpenCode
4. **Reintento transparente** del mensaje
5. **Logging detallado** del proceso

### Beneficios
✅ **Recuperación automática** - Sin intervención manual  
✅ **Experiencia transparente** - Usuario no ve errores  
✅ **Resilencia** - Sistema sobrevive fallos temporales  
✅ **Logging útil** - Rastreo de lo que sucede  

---

## 🚀 Cómo Comenzar

### 1. Obtener Credenciales
```bash
# Necesitas:
# - OpenCode API Key (de https://opencode.ai)
# - Usuario y contraseña para admin panel
```

### 2. Setup Inicial
```bash
# Clonar
git clone https://github.com/joneldiablo/prototype-agent-whastapp.git

# Instalar
bun install

# Configurar
cp .env.example .env
# Editar .env con credenciales

# Iniciar
bun start
```

### 3. Acceder
```
API:       http://localhost:3000/api
WebSocket: ws://localhost:3001
Admin:     http://localhost:3000 (login con credenciales)
```

---

## 📚 Documentos de Referencia

| Documento | Propósito | Público |
|-----------|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diseño técnico completo | ✅ |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Guía para desarrolladores | ✅ |
| [API_REFERENCE.md](API_REFERENCE.md) | Endpoints detallados | ✅ |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Resolución de problemas | ✅ |
| [README.md](README.md) | Descripción general | ✅ |
| [DOCKER.md](DOCKER.md) | Deployment | ✅ |

---

## 🔗 Enlaces Útiles

- **Repositorio**: https://github.com/joneldiablo/prototype-agent-whastapp
- **OpenCode Documentation**: https://opencode.ai/docs
- **Bun Documentation**: https://bun.sh/docs
- **whatsapp-web.js Docs**: https://docs.wwebjs.dev
- **Express Documentation**: https://expressjs.com

---

## ✨ Próximas Mejoras Sugeridas

- [ ] Soporte para múltiples instancias OpenCode
- [ ] Caché de respuestas similares
- [ ] Dashboard con analytics
- [ ] Rate limiting por usuario
- [ ] Integración con otras plataformas (Telegram)
- [ ] Sistema de plugins
- [ ] Webhooks personalizados
- [ ] TLS/SSL certificates

---

## 📝 Información del Proyecto

| Metadato | Valor |
|----------|-------|
| **Nombre** | Prototype Agent WhatsApp |
| **Versión** | 1.0.3 |
| **Autor** | joneldiablo |
| **Licencia** | ISC |
| **Rama Principal** | main |
| **Rama Desarrollo** | dev |
| **Runtime** | Bun 1.0+ |
| **Estado** | Production Ready |
| **Última Actualización** | 2026-04-18 |

---

## 🎓 Conclusión

**Prototype Agent WhatsApp** es un sistema bien estructurado y documentado que automatiza respuestas en WhatsApp usando IA. El código es maintainable, escalable y está listo para producción.

### Fortalezas
✅ Arquitectura modular y clara  
✅ Código con tipos TypeScript  
✅ Autenticación y seguridad  
✅ Recuperación automática de fallos  
✅ Documentación completa  
✅ Tests unitarios  
✅ Containerizado  

### Puntos de Mejora
⚠️ Rate limiting en endpoints  
⚠️ Caché más agresivo  
⚠️ Métricas de performance  
⚠️ Integración con más plataformas  

---

**Documentación Completa Disponible** en los archivos `.md` dentro del proyecto.

Para preguntas específicas, consulta el documento relevante o usa la sección de Troubleshooting.

**¡Sistema listo para usar!** 🚀
