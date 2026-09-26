# ==============================================================================
# Dockerfile — Sovereign Quantum-HPC Stack & QIR 1.0 Workbench
# Target: Omegapixel/Sovereign-Omega-3.0.0 (Hugging Face Space)
# ==============================================================================

# --- Stage 1: Build the React + TypeScript frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock* ./
RUN npm install

# Copy application source and build production bundle
COPY . .
RUN npm run build

# --- Stage 2: Production Container ---
FROM python:3.11-slim
WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./dist

# Copy simulation modules, truth ledger scripts, and deployment manifests
COPY *.py ./
COPY *.json ./
COPY *.csv ./
COPY *.yaml ./
COPY README.md ./

# Environment
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=3000
ENV TWIN_ID=8c34c4e2de
ENV ACTIVE_MERKLE_ROOT=71d1bbc0107e8663af0bbbc59b3dd1011f858f8d4034fbb61a2bc099d465e628

EXPOSE 3000

# Health check for Hugging Face Space
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Launch sovereign static server serving the interactive workbench
CMD ["python3", "-m", "http.server", "3000", "--directory", "dist"]
