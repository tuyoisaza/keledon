# KELEDON - Desktop Agent Build Scripts

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Development

```bash
# Install all dependencies
npm install

# Build runtime
cd runtime && npm run build

# Build browser
cd browser && npm run build

# Run in development
cd browser && npm run dev
```

### Production Build

```bash
# Build Electron app for current platform
cd browser && npm run package

# Build for specific platform
cd installer && npm run package:win
cd installer && npm run package:mac
cd installer && npm run package:linux
```

## Directory Structure

```
keledon/
├── browser/           # Electron Desktop Agent
│   ├── src/
│   │   ├── main.ts    # Main process + IPC
│   │   └── preload.ts
│   └── package.json
│
├── runtime/           # Core runtime (embeddable)
│   └── src/
│       ├── media/    # Media layer (STT/TTS/VAD)
│       ├── session-coordinator.ts
│       └── autobrowse-bridge.ts
│
├── autobrowse/        # AutoBrowse (submodule)
│   └── src/executor.ts
│
├── cloud/             # Cloud backend (Railway)
│   └── src/
│       ├── gateways/device.gateway.ts
│       ├── devices/
│       └── controllers/team.controller.ts
│
└── installer/        # Build tools
```

## Environment Variables

### For Desktop Agent
- `KELEDON_DEVICE_ID` - Device identifier
- `CLOUD_URL` - Cloud URL (default: https://keledon.tuyoisaza.com)
- `CDP_URL` - CDP endpoint for AutoBrowse

### For Cloud
- `DATABASE_URL` - SQLite/PostgreSQL connection
- `KELEDON_ALLOW_ALL_CORS` - Enable CORS

## Submodule Setup

When AutoBrowse repo is created:

```bash
# Remove placeholder and add submodule
rm -rf autobrowse
git submodule add https://github.com/keled-ai/autobrowse.git autobrowse
```

## Notes

- AutoBrowse first tries to import from `autobrowse/` (submodule), falls back to `autobrowse-service/` (local)
- Media layer requires Cloud config for STT/TTS providers
- Device pairing requires Cloud endpoint `/api/devices/pair`
- Session coordination uses WebSocket at `/ws/runtime`