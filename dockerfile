# ==================================
# Stage 1: Build Frontend
# ==================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copiar package files
COPY client/package*.json ./

# Instalar dependencias
RUN npm ci --prefer-offline --no-audit

# Copiar código fuente
COPY client/ ./

# Build frontend
RUN npm run build

# ==================================
# Stage 2: Setup Backend
# ==================================
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero (para aprovechar cache de Docker)
COPY server/requirements.txt ./server/

# Instalar dependencias Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r server/requirements.txt

# Copiar el resto del código del backend
COPY server/ ./server/

# Copiar la carpeta database (para init.sql si usas inicialización automática)
COPY database/ ./database/

# Copiar frontend compilado
COPY --from=frontend-builder /app/client/dist ./client/dist

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD cd server && uvicorn app.main:app --host 0.0.0.0 --port $PORT
