# ============================================
# Multi-stage Dockerfile for Render Deployment
# CMMS Enterprise - Full Stack Application
# ============================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies (including devDependencies for TypeScript/Vite build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build TypeScript to JavaScript
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built backend from builder
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/drizzle.config.mjs ./

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy SQL migrations for public bootstrap
COPY scripts/database/migrations ./scripts/database/migrations

# Copy docker startup helpers (wait for DB, run SQL migrations)
COPY scripts/docker ./scripts/docker

# Create necessary directories
RUN mkdir -p logs

# Set environment to production
ENV NODE_ENV=production

# Expose port (Render will set PORT env variable)
EXPOSE 3000

# Health check (respect platform-provided PORT)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port=process.env.PORT||3000;require('http').get('http://localhost:'+port+'/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the application (run migrations first)
# - Drizzle push creates the final schema on a fresh DB.
# - Legacy SQL migrations are OPTIONAL (for older databases) and can be enabled via RUN_SQL_MIGRATIONS=true.
CMD ["sh", "-c", "node scripts/docker/wait-for-db.mjs && node scripts/docker/preflight-db.mjs && node scripts/docker/run-drizzle-migrate.mjs && if [ \"${RUN_SQL_MIGRATIONS:-false}\" = \"true\" ]; then node scripts/docker/run-sql-migrations.mjs; fi && node dist/server.js"]
