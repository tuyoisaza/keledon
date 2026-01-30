# Keledon Launcher

Local helper service that can start Keledon cloud services from the UI.

## Start

```bash
npm install
npm run start
```

## Endpoints

- `GET /health`
- `GET /status`
- `POST /start-cloud`
- `POST /start-landing`
- `POST /start-all`

## Config

- `LAUNCHER_PORT` (default: 3100)
- `CLOUD_DIR` (default: `C:\Keldon\cloud`)
- `CLOUD_HOST` (default: `127.0.0.1`)
- `CLOUD_PORT` (default: `3001`)
- `LANDING_DIR` (default: `C:\Keldon\landing`)
- `AUTO_RESTART` (default: `true`)
