# Multi-stage Dockerfile for KELEDON Single Container Deployment
# Combines frontend (React) and backend (NestJS) in one container

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/landing

# Copy package files
COPY landing/package*.json ./
RUN npm ci

# Copy frontend source
COPY landing/ ./

# Build frontend (outputs to dist/)
# Use empty API_URL for relative URLs (same origin)
RUN VITE_API_URL=/ npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/cloud

# Copy package files
COPY cloud/package*.json ./
COPY cloud/tsconfig*.json ./
COPY cloud/nest-cli.json ./
RUN npm ci

# Copy backend source and config files
COPY cloud/src ./src
COPY cloud/tsconfig*.json ./
COPY cloud/nest-cli.json ./

# Build backend (outputs to dist/)
RUN npm run build

# ============================================
# Stage 3: Runtime Container
# ============================================
FROM node:20-alpine

# Install nginx and wget (for health checks)
RUN apk add --no-cache nginx wget

WORKDIR /app

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/landing/dist /usr/share/nginx/html

# Copy built backend from Stage 2
COPY --from=backend-builder /app/cloud/dist ./backend/dist
COPY --from=backend-builder /app/cloud/node_modules ./backend/node_modules
COPY --from=backend-builder /app/cloud/package*.json ./backend/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create nginx directories and set permissions
RUN mkdir -p /var/log/nginx /var/cache/nginx /var/run/nginx && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /var/run/nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start both services
CMD ["/app/start.sh"]
