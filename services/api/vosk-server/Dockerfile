FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir vosk websockets

COPY server.py ./

ENV VOSK_PORT=9090
ENV VOSK_WS_PORT=9091
ENV VOSK_MODEL_PATH=/app/models/vosk-model-small-en-us-0.15
ENV VOSK_SAMPLE_RATE=16000

EXPOSE 9090 9091

CMD ["python", "server.py"]
