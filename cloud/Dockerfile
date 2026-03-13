# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Copy root-level contracts folder (needed for C13 sentinel)
COPY contracts/ ./contracts/

# Copy package files from cloud
COPY cloud/package.json ./cloud/
COPY cloud/package-lock.json ./cloud/
WORKDIR /app/cloud
RUN npm ci

# Copy source and generate prisma
COPY cloud/ ./
RUN npx prisma generate

# Build
RUN npm run build

# Stage 2: Runtime
FROM node:20-bookworm

WORKDIR /app/cloud

# Copy only necessary files - NOT node_modules from builder
COPY --from=builder /app/cloud/package.json ./
COPY --from=builder /app/cloud/package-lock.json ./
COPY --from=builder /app/cloud/prisma ./prisma
COPY --from=builder /app/cloud/dist ./dist
COPY --from=builder /app/cloud/start.sh ./

# Install fresh node_modules and regenerate Prisma for this platform
RUN npm ci && npx prisma generate

RUN chmod +x start.sh

EXPOSE 3000
CMD ["./start.sh"]
