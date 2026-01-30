# KELEDON Vector Store Development Setup

This directory contains the complete setup for local KELEDON Vector Store development with Qdrant.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Start Qdrant with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f qdrant

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Option 2: Using Setup Scripts

#### Unix/Linux/macOS
```bash
# Make script executable
chmod +x scripts/setup-qdrant.sh

# Start Qdrant
./scripts/setup-qdrant.sh start

# Check status
./scripts/setup-qdrant.sh status

# View logs
./scripts/setup-qdrant.sh logs

# Stop Qdrant
./scripts/setup-qdrant.sh stop
```

#### Windows
```cmd
# Start Qdrant
scripts\setup-qdrant.bat start

# Check status
scripts\setup-qdrant.bat status

# View logs
scripts\setup-qdrant.bat logs

# Stop Qdrant
scripts\setup-qdrant.bat stop
```

## Environment Configuration

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

## Development Workflow

1. **Start Qdrant** using one of the methods above
2. **Configure environment** in your frontend application
3. **Use Vector Store Configuration** in the SuperAdmin panel:
   - Navigate to SuperAdmin → Vector Store
   - Click "Configuration" button
   - Test connections and save settings
4. **Add documents** through the Vector Store management interface

## Features Implemented

### ✅ Phase 1: Data Model & Auto-Tagging
- Enhanced PolicyDocument interface with organization fields
- Auto-tagging with company/brand/team context
- Role-based permissions (SuperAdmin + Admin only)

### ✅ Phase 2: Configuration Management
- VectorStoreConfig component with environment switching
- Connection testing for Qdrant and OpenAI
- Encrypted localStorage for development
- Environment variable locking for production

### ✅ Phase 3: Docker Integration
- Cross-platform setup scripts (Unix/Windows)
- Docker Compose development environment
- Health checks and container management

### 📋 Phase 4: Backup & Restore (Next)
- Local backup system
- Cloud backup support
- Organization-scoped backups

## File Structure

```
C:\KELEDON\
├── landing/src/
│   ├── components/superadmin/
│   │   ├── VectorStoreTab.tsx          # Main management interface
│   │   └── VectorStoreConfig.tsx       # Configuration component
│   └── lib/
│       └── vector-store.ts              # API client with Qdrant integration
├── scripts/
│   ├── setup-qdrant.sh                 # Unix setup script
│   └── setup-qdrant.bat                # Windows setup script
├── docker-compose.dev.yml              # Docker Compose configuration
├── .env.local.template                 # Development environment template
├── .env.production.template            # Production environment template
└── README.md                           # This file
```

## API Endpoints

Once Qdrant is running locally, you can access:

- **Web UI:** http://localhost:6333/dashboard
- **Health Check:** http://localhost:6333/health
- **Collections:** http://localhost:6333/collections

## Troubleshooting

### Common Issues

1. **Port 6333 already in use:**
   ```bash
   # Find and stop existing container
   docker ps | grep qdrant
   docker stop <container-id>
   
   # Or use different port
   ./scripts/setup-qdrant.sh start -p 7333
   ```

2. **Curl not available on Windows:**
   ```cmd
   # Use PowerShell instead
   (Invoke-WebRequest -Uri 'http://localhost:6333/health').StatusCode
   ```

3. **Permission denied on Unix:**
   ```bash
   chmod +x scripts/setup-qdrant.sh
   ```

4. **Docker daemon not running:**
   - Start Docker Desktop (Windows/macOS)
   - Start Docker service (Linux): `sudo systemctl start docker`

### Health Check

```bash
# Check if Qdrant is healthy
./scripts/setup-qdrant.sh health

# Alternative with curl
curl http://localhost:6333/health

# Alternative with PowerShell
(Invoke-WebRequest -Uri 'http://localhost:6333/health').StatusCode
```

## Development Tips

1. **Use the Vector Store Config component** in the SuperAdmin panel to test connections
2. **Check browser console** for detailed API errors
3. **Use mock data for testing** by temporarily enabling mock methods in vector-store.ts
4. **Backups are stored locally** in `./vs-backups/` by default
5. **All operations require SuperAdmin or Admin role** permissions

## Production Deployment

For production deployment:

1. **Use production environment variables** from `.env.production.template`
2. **Configure remote Qdrant instance** at `https://keledon.tuyoisaza.com/qdrant`
3. **Set up cloud backup storage** via `VITE_BACKUP_CLOUD_PATH`
4. **Enable SSL/TLS** for all API endpoints
5. **Configure proper authentication** and RBAC

## Next Steps

The Vector Store management system is now ready for development use. The foundation includes:

- ✅ Real Qdrant integration (no more mock data)
- ✅ Organization-based auto-tagging
- ✅ Configuration management
- ✅ Docker setup for local development
- ✅ Role-based access control

Remaining items for full production readiness:
- 🔄 Backup/restore system implementation
- 🔄 Performance optimization
- 🔄 Comprehensive testing
- 🔄 Production deployment scripts