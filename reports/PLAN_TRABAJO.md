# Plan de Trabajo - WhatsApp Agent

## Fase 1: Configuración Inicial (Completado)
- [x] Estructura de monorepo con Bun
- [x] Backend con Express + SQLite
- [x] Frontend admin básico
- [x] Rutas API con formato de respuesta estándar

## Fase 2: Integración WhatsApp (Completado)
- [x] Implementar whatsapp-web.js para conexión real
- [x] Manejar eventos de mensajes entrantes
- [x] Enviar respuestas automáticas (integrado con OpenCode)

## Fase 3: Integración OpenCode Big Pickle (Completado)
- [x] Conectar con API de OpenCode
- [x] Enviar mensajes a Big Pickle con prompts
- [x] Manejar respuestas y reenviar a WhatsApp

## Fase 4: Lógica de Whitelist/Blacklist (Completado)
- [x] Verificar si número está en whitelist
- [x] Aplicar prompt personalizado por número
- [x] Respetar blacklist para ignorar mensajes
- [x] Habilitar/deshabilitar entradas

## Fase 5: Mejoras del Panel Admin
- [ ] Mejorar UI/UX del panel
- [ ] Agregar logs de conversación
- [ ] Métricas básicas

## Fase 6: Seguridad y Producción
- [ ] Validar y sanitizar entradas
- [ ] Rate limiting
- [ ] Configuración de producción
- [ ] Tests