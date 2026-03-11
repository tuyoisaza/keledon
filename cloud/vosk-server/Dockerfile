FROM node:18-alpine

# Install build dependencies for VOSK
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc-dev \
    wget \
    unzip

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Copy VOSK models
COPY ../models ./models

# Set environment
ENV PORT=9090
ENV VOSK_MODEL_PATH=/app/models/vosk-model-small-en-us-0.15
ENV VOSK_SAMPLE_RATE=16000

# Expose ports
EXPOSE 9090 9091

# Start server
CMD ["node", "server.js"]
