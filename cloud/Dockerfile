# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install all dependencies including dev
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install production only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
