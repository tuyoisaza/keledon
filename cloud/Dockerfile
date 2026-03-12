# Stage 1: Build
FROM node:18-alpine AS builder

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
FROM node:18-alpine

WORKDIR /app/cloud

COPY --from=builder /app/cloud/node_modules ./node_modules
COPY --from=builder /app/cloud/dist ./dist
COPY --from=builder /app/cloud/package.json ./package.json
COPY --from=builder /app/cloud/package-lock.json ./package-lock.json
COPY --from=builder /app/cloud/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main"]
