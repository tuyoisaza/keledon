FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm install -g @nestjs/cli && npm run build

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start:prod"]
