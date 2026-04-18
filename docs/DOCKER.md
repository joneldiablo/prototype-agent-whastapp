# WhatsApp Agent - Docker Setup

## Requisitos
- Docker
- Docker Compose

## Variables de Entorno

Configura estas variables en un archivo `.env` en la raíz del proyecto:

| Variable | Descripción | Valor por defecto | Ejemplo |
|----------|-------------|-------------------|---------|
| `PORT` | Puerto del servidor | `4000` | `4000` |
| `WATCH` | Modo watch con hot-reload (desarrollo) | `false` | `true` o `false` |
| `OPENCODE_USER_PASSWORD` | Credenciales OpenCode | - | `dbladmin:Qwerty1236!` |
| `OPENCODE_API_KEY` | API Key OpenCode | - | `sk-Z4FiO39wCQdaYcLodn2mPh4BifEOmdfQ8t92Npxpt3rk44vw8Xx5SGgBb0F1F7HG` |
| `CHROME_PATH` | Ruta personalizada a Chrome (opcional) | Auto (Puppeteer) | `/usr/bin/chromium-browser` |

## Uso

### 1. Configurar variables de entorno

Copia el archivo `.env.example` y configura tus variables:

```bash
cp .env.example .env
# Edita .env con tus credenciales de OpenCode
```

### 2. Construir la imagen Docker

```bash
docker-compose build
```

### 3. Ejecutar el contenedor

```bash
docker-compose up -d
```

El servidor estará disponible en `http://localhost:4000`

### 4. Ver logs

```bash
docker-compose logs -f whatsapp-agent
```

### 5. Detener el contenedor

```bash
docker-compose down
```

## Puertos expuestos

- **4000**: Servidor HTTP del WhatsApp Agent

## Volúmenes persistentes

- **whatsapp-sessions**: Almacena las sesiones de WhatsApp
- **data**: Almacena la base de datos SQLite

## Healthcheck

El contenedor incluye un healthcheck que verifica la disponibilidad del servidor cada 30 segundos.

```bash
# Ver estado del contenedor
docker-compose ps
```

## Desarrollo

Para desarrollo con hot-reload, descomenta estas líneas en `docker-compose.yml`:

```yaml
volumes:
  - .:/app
  - /app/node_modules
```

Y cambia la variable de entorno:

```bash
WATCH=true
```

## Solución de problemas

### El contenedor se reinicia constantemente

Revisa los logs:
```bash
docker-compose logs whatsapp-agent
```

### Puerto 4000 en uso

Cambia el puerto en el `.env`:
```bash
PORT=5000
```

### Permisos de volúmenes

Si tienes problemas de permisos con el volumen de sesiones:

```bash
docker exec whatsapp-agent chown -R $(id -u):$(id -g) data/whatsapp-sessions
```
