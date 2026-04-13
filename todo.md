# Plan de Trabajo - WhatsApp Agent

## Fase 1: Configuración Inicial (Completado)
- [x] Estructura de monorepo con Bun
- [x] Backend con Express + SQLite
- [x] Frontend admin básico
- [x] Rutas API con formato de respuesta estándar

## Fase 2: Integración WhatsApp
- [ ] Implementar webwhatsappjs para conexión real
- [ ] Manejar eventos de mensajes entrantes
- [ ] Enviar respuestas automáticas

## Fase 3: Integración OpenCode Big Pickle
- [ ] Conectar con API de OpenCode
- [ ] Enviar mensajes a Big Pickle con prompts
- [ ] Manejar respuestas y reenviar a WhatsApp

## Fase 4: Lógica de Whitelist/Blacklist
- [ ] Verificar si número está en whitelist
- [ ] Aplicar prompt personalizado por número
- [ ] Respetar blacklist para ignorar mensajes
- [ ] Habilitar/deshabilitar entradas

## Fase 5: Mejoras del Panel Admin
- [ ] Mejorar UI/UX del panel
- [ ] Agregar logs de conversación
- [ ] Métricas básicas

## Fase 6: Seguridad y Producción
- [ ] Validar y sanitizar entradas
- [ ] Rate limiting
- [ ] Configuración de producción
- [ ] Tests