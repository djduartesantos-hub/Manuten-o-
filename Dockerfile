# ============================================
# Multi-stage Dockerfile for Render Deployment
# CMMS Enterprise - Full Stack Application
# ============================================

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

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
FROM node:18-alpine AS backend-builder

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
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built backend from builder
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/drizzle.config.mjs ./

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/dist ./public

# Create necessary directories
RUN mkdir -p logs

# Set environment to production
ENV NODE_ENV=production

# Expose port (Render will set PORT env variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server.js"]
