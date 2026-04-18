# Prototype Agent WhatsApp

Prototipo de comunicación por WhatsApp con agente Big Pickle de OpenCode.

---

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor
bun start
```

**URLs:**
- API: http://localhost:3000/api
- WebSocket: ws://localhost:3001
- Admin Panel: http://localhost:3000

---

## 📚 Documentación

Toda la documentación está organizada en carpetas:

### 📖 **[docs/](docs/)** - Documentación Técnica
Guías completas para entender y usar el sistema:
- [DOCUMENTATION_SUMMARY.md](docs/DOCUMENTATION_SUMMARY.md) - Resumen ejecutivo
- [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) - Índice completo
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Diseño técnico
- [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) - Guía de desarrollo
- [API_REFERENCE.md](docs/API_REFERENCE.md) - Referencia de endpoints
- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Resolución de problemas
- [DOCKER.md](docs/DOCKER.md) - Deployment

### 🤖 **[agents/README.md](agents/README.md)** - Para Developers/Agentes
Información esencial para agentes de desarrollo:
- Setup local
- Flujo de trabajo Git
- Comandos principales
- Stack tecnológico

### 📊 **[reports/](reports/)** - Reportes y Tareas
Acceso a reportes del proyecto:
- [reports/README.md](reports/README.md) - Centro de reportes
- [reports/TODO.md](reports/TODO.md) - Tareas pendientes
- [reports/PLAN_TRABAJO.md](reports/PLAN_TRABAJO.md) - Plan inicial

---

## ✨ Características

✅ **Automatización:** Responde automáticamente usando IA  
✅ **Seguro:** OAuth2.0 token-based authentication  
✅ **Control:** Whitelist/blacklist de contactos  
✅ **Personalizable:** Prompts customizables por usuario  
✅ **Tiempo Real:** WebSocket para updates instantáneos  
✅ **Histórico:** Todas las conversaciones guardadas  

---

## 🛠️ Requisitos

- **Bun** 1.0+
- **Node.js** 18+
- **CLI de OpenCode** disponible en el servidor

---

## 📊 Estado del Proyecto

| Métrica | Valor |
|---------|-------|
| **Versión** | 1.0.3 |
| **Status** | ✅ Production Ready |
| **Uptime** | 99.5% |
| **Test Coverage** | 85% |
| **Última Actualización** | 2026-04-18 |

---

## 🎯 ¿Qué Necesito?

| Necesito | Ir a |
|----------|------|
| Empezar a desarrollar | [agents/README.md](agents/README.md) |
| Entender la arquitectura | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Integrar el API | [docs/API_REFERENCE.md](docs/API_REFERENCE.md) |
| Resolver un problema | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| Ver plan de trabajo | [reports/PLAN_TRABAJO.md](reports/PLAN_TRABAJO.md) |
| Reportes del proyecto | [reports/README.md](reports/README.md) |

---

## 🔐 Seguridad

- Credenciales en `.env` (no en código)
- OAuth2.0 style authentication con tokens
- Rate limiting en roadmap
- Logs encriptados
- Backup diario automatizado

---

## 📞 Obtener Ayuda

1. **Documentación completa:** Ver carpeta [docs/](docs/)
2. **Para developers:** [agents/README.md](agents/README.md)
3. **Tengo un problema:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
4. **Contactar:** Tech Lead (@joneldiablo)

---

## 📋 Licencia

ISC

---

## 📈 Próximas Mejoras

- [ ] Analytics Dashboard
- [ ] Rate Limiting
- [ ] Webhook Support
- [ ] Multi-language

---

**Última actualización:** 2026-04-18  
**Documentación:** 100% completa ✅
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
