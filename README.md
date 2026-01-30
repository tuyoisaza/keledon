# KELEDON

A comprehensive full-stack platform combining browser automation, AI-powered workflows, and real-time communication capabilities.

## 🚀 Overview

KELEDON is a multi-component system consisting of:

- **Browser Agent** - Chrome extension for browser automation and RPA
- **Cloud Backend** - NestJS-based API server with WebSocket support
- **Landing Page** - React-based frontend with modern UI
- **Smart Contracts** - Blockchain integration components
- **Deployment Infrastructure** - Docker-based containerization

## 📁 Project Structure

```
KELEDON/
├── agent/                  # Chrome extension (Manifest V3)
│   ├── extension/         # Extension source code
│   └── tests/            # Agent tests
├── cloud/                # NestJS backend API
│   ├── src/             # Backend source
│   └── data/            # Configuration files
├── landing/              # React frontend
│   ├── src/             # Frontend source
│   └── public/          # Static assets
├── contracts/           # Smart contracts & schemas
├── infra/               # Infrastructure configuration
├── scripts/             # Deployment and utility scripts
└── docs/               # Documentation
```

## 🛠️ Tech Stack

### Frontend (Landing)
- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Socket.IO Client** for real-time communication

### Backend (Cloud)
- **NestJS** with TypeScript
- **Express** framework
- **WebSocket** support via Socket.IO
- **Docker** containerization

### Browser Extension (Agent)
- **Manifest V3** Chrome extension
- **JavaScript ES Modules**
- **WebSocket client** for backend communication
- **Chrome APIs** for browser automation

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Docker (for deployment)
- Google Cloud CLI (for cloud deployment)

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd KELEDON
npm install
cd agent && npm install
cd ../cloud && npm install
cd ../landing && npm install
```

2. **Start development servers:**
```bash
# Backend
cd cloud && npm run start:dev

# Frontend
cd landing && npm run dev

# Chrome Extension (Load directly in Chrome)
# Navigate to chrome://extensions/ and load the agent/extension folder
```

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle top right)
3. Click "Load unpacked"
4. Select the `agent/extension/` folder
5. Extension should load without errors

## 🐳 Deployment

### Single Container Deployment

The project supports single-container deployment with Docker:

```bash
# Build and deploy to Google Cloud Run
./deploy-single-container.sh
```

### Manual Docker Build

```bash
docker build -t keledon:latest .
docker run -p 8080:8080 keledon:latest
```

## 📚 API Documentation

### Core Endpoints

- **Health Check:** `GET /health`
- **WebSocket:** `/socket.io/`
- **Audio Streaming:** `/listen/`
- **API Routes:** `/api/*`

### WebSocket Events

Real-time communication between extension and backend:

- **Connection:** Establishes persistent connection
- **Audio streaming:** Real-time audio data transmission
- **Command execution:** RPA workflow triggers
- **Status updates:** Live feedback and progress

## 🔧 Configuration

### Environment Variables

Key configuration options:
- `SINGLE_CONTAINER`: Single container mode (production)
- `NODE_ENV`: Environment (development/production)
- Backend port: 3001 (internal), 8080 (external)

### Chrome Extension Permissions

The extension requires:
- `storage` - Local data storage
- `activeTab` - Current tab access
- `scripting` - Content script injection
- `background` - Service worker
- `sidePanel` - UI panel access

## 🧪 Testing

### Run Tests
```bash
# Agent tests
cd agent && npm test

# Backend tests
cd cloud && npm test
```

### Coverage Reports
```bash
cd agent && npm run test:coverage
```

## 📝 Development Scripts

Utility scripts for development and deployment:
- `deploy-simple.bat` - Simple deployment
- `deploy.ps1` - PowerShell deployment
- `dev-run.bat` - Development environment
- `test-deployment.sh` - Deployment testing

## 🔍 Architecture

The system uses a modern microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chrome Ext    │    │   React UI      │    │   Mobile App    │
│   (Agent)       │    │   (Landing)     │    │   (Future)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      NestJS Backend       │
                    │      (Cloud)              │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    Database & Storage    │
                    │    (Redis, PostgreSQL)   │
                    └───────────────────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## 🔗 Links

- **Chrome Extension Documentation:** See `CHROME_EXTENSION_FINAL.md`
- **Deployment Guide:** See `DEPLOYMENT.md`
- **API Contracts:** See `contracts/` directory
- **Infrastructure:** See `infra/` directory

## 🆘 Troubleshooting

### Common Issues

1. **Extension won't load:**
   - Check `CHROME_EXTENSION_FINAL.md` for troubleshooting steps
   - Verify manifest.json syntax
   - Ensure all files are in correct locations

2. **Backend connection issues:**
   - Check WebSocket configuration
   - Verify port accessibility
   - Check firewall settings

3. **Deployment failures:**
   - Review `DEPLOYMENT.md`
   - Check Docker build logs
   - Verify Google Cloud configuration

### Getting Help

- Check the `docs/` directory for detailed documentation
- Review existing issues and pull requests
- Create new issues with detailed error reports

---

**KELEDON** - Empowering intelligent browser automation and AI-driven workflows. 🚀