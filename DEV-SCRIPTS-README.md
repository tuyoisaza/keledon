# KELEDON Development Setup Scripts

This directory contains comprehensive development scripts for managing the KELEDON Vector Store system across different platforms and environments.

## Quick Start

### Prerequisites

1. **Node.js** (v18+): [Download](https://nodejs.org/)
2. **Docker** & Docker Compose: [Download](https://www.docker.com/get-docker/)
3. **Git**: [Download](https://git-scm.com/)

### One-Command Setup

```bash
# Unix/Linux/macOS
./dev.sh install

# Windows
dev.bat install
```

This will:
- Install all dependencies (frontend + backend)
- Create environment files from templates
- Set up Qdrant container
- Create backup directories

### Start Development

```bash
# Unix/Linux/macOS
./dev.sh dev

# Windows
dev.bat dev
```

This starts:
- Qdrant (vector database)
- Frontend (React/Vite)
- Backend (NestJS)

## Available Commands

### Project Management

| Command | Description |
|---------|-------------|
| `install` | Install all dependencies and setup environment |
| `setup` | Setup Vector Store environment (env files, Qdrant) |
| `dev` | Start all development servers concurrently |
| `build` | Build production bundles for frontend + backend |
| `test` | Run all test suites |
| `lint` | Lint all code |
| `clean` | Clean build artifacts |
| `help` | Show available commands |

### Vector Store Management

| Command | Description |
|---------|-------------|
| `qdrant start` | Start Qdrant container |
| `qdrant stop` | Stop Qdrant container |
| `qdrant status` | Check container status |
| `qdrant health` | Check Qdrant API health |
| `qdrant logs` | View container logs |
| `qdrant cleanup` | Remove container and data |

## Root Package.json Scripts

For npm-based workflow, use the root `package.json`:

```bash
# Install everything
npm run install

# Start development (Qdrant + Frontend + Backend)
npm run dev

# Individual services
npm run dev:qdrant      # Start Qdrant only
npm run dev:frontend     # Start React frontend
npm run dev:backend      # Start NestJS backend

# Build for production
npm run build

# Testing and linting
npm run test
npm run lint

# Vector Store specific
npm run dev:vector-store  # Setup + start dev
npm run build:vector-store # Build + package
```

## Environment Configuration

### Development Setup

1. **Copy environment template:**
   ```bash
   cp .env.local.template .env.local
   ```

2. **Edit `.env.local`:**
   ```env
   # Required: OpenAI API key for embeddings
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # Local Qdrant configuration
   VITE_QDRANT_URL=http://localhost:6333
   VITE_QDRANT_API_KEY=
   
   # Backup configuration
   VITE_BACKUP_LOCAL_PATH=./vs-backups
   ```

3. **Get OpenAI API Key:**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create new API key
   - Add to `.env.local`

## Platform-Specific Instructions

### Unix/Linux/macOS

```bash
# Make script executable (first time only)
chmod +x dev.sh

# Install dependencies
./dev.sh install

# Start development
./dev.sh dev

# Individual commands
./dev.sh qdrant start
./dev.sh build
./dev.sh test
```

### Windows (CMD)

```cmd
# Install dependencies
dev.bat install

# Start development
dev.bat dev

# Individual commands
dev.bat qdrant start
dev.bat build
dev.bat test
```

### Windows (PowerShell)

```powershell
# Install dependencies
.\dev.bat install

# Start development
.\dev.bat dev
```

## Docker Management

### Using Scripts

```bash
# Start Qdrant
./dev.sh qdrant start

# Check status
./dev.sh qdrant status

# View logs
./dev.sh qdrant logs

# Health check
./dev.sh qdrant health

# Stop Qdrant
./dev.sh qdrant stop

# Complete cleanup
./dev.sh qdrant cleanup
```

### Using Docker Directly

```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f qdrant

# Stop services
docker-compose -f docker-compose.dev.yml down

# Restart services
docker-compose -f docker-compose.dev.yml restart
```

## Development Workflow

### 1. First-Time Setup

```bash
# Clone and setup
git clone https://github.com/tuyoisaza/keledon.git
cd keledon

# Install and setup everything
./dev.sh install

# Configure environment
# Edit .env.local with your OpenAI API key
```

### 2. Daily Development

```bash
# Start all services
./dev.sh dev

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3001
# - Qdrant: http://localhost:6333
# - Qdrant Dashboard: http://localhost:6333/dashboard
```

### 3. Building for Production

```bash
# Build everything
./dev.sh build

# Or using npm
npm run build

# Output:
# - landing/dist/  (frontend build)
# - cloud/dist/   (backend build)
```

### 4. Testing

```bash
# Run all tests
./dev.sh test

# Run specific tests
cd landing && npm test    # Frontend tests
cd cloud && npm test     # Backend tests

# Linting
./dev.sh lint
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Find what's using the port
   lsof -i :6333  # Unix
   netstat -ano | findstr :6333  # Windows
   
   # Stop existing container
   ./dev.sh qdrant stop
   ```

2. **Docker not running:**
   - Start Docker Desktop
   - Or start Docker service: `sudo systemctl start docker`

3. **Node.js version:**
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 8+
   ```

4. **Permission issues (Unix):**
   ```bash
   chmod +x dev.sh
   chmod +x scripts/setup-qdrant.sh
   ```

5. **Environment variables not found:**
   ```bash
   # Check if .env.local exists
   ls -la .env.local
   
   # Verify OpenAI API key is set
   grep VITE_OPENAI_API_KEY .env.local
   ```

### Health Checks

```bash
# Check all services
./dev.sh qdrant health

# Manual checks
curl http://localhost:6333/health              # Qdrant
curl http://localhost:3001/health               # Backend
curl http://localhost:5173                     # Frontend
```

## Project Structure

```
keledon/
├── dev.sh                     # Unix development script
├── dev.bat                    # Windows development script
├── package.json               # Root package.json with scripts
├── docker-compose.dev.yml     # Docker Compose configuration
├── .env.local.template        # Development environment template
├── .env.production.template   # Production environment template
├── landing/                  # React frontend
│   ├── package.json          # Frontend scripts + dependencies
│   ├── scripts/             # Frontend helper scripts
│   │   ├── setup-qdrant.js  # Cross-platform Qdrant manager
│   │   ├── setup-qdrant.sh  # Unix Qdrant script
│   │   └── setup-qdrant.bat # Windows Qdrant script
│   └── src/                 # Frontend source code
├── cloud/                    # NestJS backend
│   ├── package.json          # Backend scripts + dependencies
│   ├── scripts/             # Backend helper scripts
│   │   └── prepare-env.js   # Environment setup
│   └── src/                 # Backend source code
└── vs-backups/              # Local backup directory
```

## Advanced Usage

### Custom Environment

```bash
# Create custom environment file
cp .env.local.template .env.custom

# Use custom environment
export NODE_ENV=custom
./dev.sh dev
```

### Development with Hot Reload

The development setup includes hot reload for:
- **Frontend:** Vite dev server (instant reload)
- **Backend:** NestJS watch mode (automatic restart)
- **Qdrant:** Docker volume mounting (persistent data)

### Production Deployment

```bash
# Build for production
npm run build:vector-store

# Deploy using your preferred method:
# - Docker containers
# - Cloud services
# - Static hosting (frontend) + Node.js (backend)
```

## Support

For issues with the Vector Store system:
1. Check this troubleshooting section
2. Review logs: `./dev.sh qdrant logs`
3. Verify environment configuration
4. Check GitHub issues: https://github.com/tuyoisaza/keledon/issues

## Contributing

1. Fork the repository
2. Create feature branch
3. Use development scripts for testing
4. Submit pull request

The development scripts ensure consistent environment setup across all platforms and make it easy to get started with the KELEDON Vector Store system.