FROM oven/bun:latest

# Instalar dependencias requeridas para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    apt-transport-https \
    ca-certificates \
    curl \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    libappindicator1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgconf-2-4 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxinerama1 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    x11-utils \
    libu2f-udev \
    libvpx7 \
    libwoff1 \
    libopus0 \
    libwebp6 \
    libwebpdemux2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de proyecto
COPY package.json package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY backend/tsconfig.json backend/tsconfig.json
COPY frontend/tsconfig.json frontend/tsconfig.json
COPY scripts scripts
COPY backend backend
COPY frontend frontend

# Instalar dependencias con bun
RUN bun install

# Instalar Chromium para Puppeteer
RUN bun x puppeteer browsers install chrome

# Crear directorio para sesiones de WhatsApp
RUN mkdir -p data/whatsapp-sessions data/.wwebjs_cache

# Crear symlink para mover el cache de Puppeteer a data
RUN ln -sf data/.wwebjs_cache .wwebjs_cache

# Exponer puerto
EXPOSE 4000

# Variables de entorno por defecto
ENV PORT=4000
ENV WATCH=false
ENV OPENCODE_USER_PASSWORD=""
ENV OPENCODE_API_KEY=""

# Comando de inicio
CMD ["bun", "run", "scripts/start.js"]
