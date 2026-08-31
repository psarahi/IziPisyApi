FROM node:22.23.1-slim AS build

# Dependencias del sistema necesarias solo para compilar modulos nativos
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de produccion
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar codigo fuente
COPY . .


FROM node:22.23.1-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# PM2 en runtime
RUN npm install -g pm2

# Copiar app ya construida desde build
COPY --from=build /app /app

EXPOSE 3010

# Usa PM2 para iniciar la app
CMD ["pm2-runtime", "start", "npm", "--", "start"]