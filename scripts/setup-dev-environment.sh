#!/bin/bash

# KELEDON Development Environment Setup Script
# Sets up complete development environment

set -e

echo "🛠️  Starting KELEDON Development Environment Setup"

# Configuration
export NODE_ENV=development
export COMPOSE_PROJECT_NAME=keledon-dev

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking development prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    log_info "Node.js version: $node_version"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "Development prerequisites check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up development environment..."
    
    # Create necessary directories
    mkdir -p logs/nginx logs/app data/qdrant data/redis data/postgres
    
    # Set permissions
    chmod 755 logs data
    chmod +x scripts/*.sh
    
    # Create environment file
    cat > .env.dev << EOF
# KELEDON Development Environment
NODE_ENV=development
PORT=3001
DEBUG=keledon:*

# Database Configuration
POSTGRES_DB=keledon_dev
POSTGRES_USER=keledon
POSTGRES_PASSWORD=keledon_dev_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Qdrant Configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Application Configuration
SINGLE_CONTAINER=true
CORS_ORIGIN=http://localhost:5173
WEBSOCKET_PORT=3001

# STT Configuration
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY:-}
STT_PROVIDER=${STT_PROVIDER:-local}

# TTS Configuration
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-}
TTS_PROVIDER=${TTS_PROVIDER:-local}
EOF
    
    log_success "Development environment configured"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    if [ -f "package.json" ]; then
        log_info "Installing root dependencies..."
        npm ci
    fi
    
    # Install agent dependencies
    if [ -d "agent" ] && [ -f "agent/package.json" ]; then
        log_info "Installing agent dependencies..."
        cd agent
        npm ci
        cd ..
    fi
    
    # Install cloud dependencies
    if [ -d "cloud" ] && [ -f "cloud/package.json" ]; then
        log_info "Installing cloud dependencies..."
        cd cloud
        npm ci
        cd ..
    fi
    
    # Install landing dependencies
    if [ -d "landing" ] && [ -f "landing/package.json" ]; then
        log_info "Installing landing dependencies..."
        cd landing
        npm ci
        cd ..
    fi
    
    log_success "Dependencies installed"
}

# Build services
build_services() {
    log_info "Building services..."
    
    # Build cloud services
    if [ -d "cloud" ]; then
        log_info "Building cloud services..."
        cd cloud
        npm run build
        cd ..
    fi
    
    # Build landing (React app)
    if [ -d "landing" ]; then
        log_info "Building landing..."
        cd landing
        npm run build
        cd ..
    fi
    
    log_success "Services built"
}

# Start development services
start_dev_services() {
    log_info "Starting development services..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.dev.v2.yml down --volumes --remove-orphans || true
    
    # Start development services
    docker-compose -f docker-compose.dev.v2.yml up -d
    
    # Start observability stack
    if [ -f "docker-compose.observability.yml" ]; then
        log_info "Starting observability stack..."
        docker-compose -f docker-compose.observability.yml up -d
    fi
    
    log_success "Development services started"
}

# Wait for development services
wait_for_dev_services() {
    log_info "Waiting for development services to be ready..."
    
    local services=("qdrant" "redis" "postgres")
    local max_wait=180
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        local all_ready=true
        
        for service in "${services[@]}"; do
            local container=$(docker-compose -f docker-compose.dev.v2.yml ps -q $service)
            if docker ps --filter "name=$container" --filter "health=healthy" --format "{{.Names}}" | grep -q .; then
                log_success "Service $service is ready"
            else
                all_ready=false
                log_warning "Service $service is not ready yet"
            fi
        done
        
        if [ "$all_ready" = true ]; then
            log_success "All development services are ready"
            return 0
        fi
        
        sleep 3
        wait_time=$((wait_time + 3))
    done
    
    log_warning "Services did not become ready within timeout, but continuing..."
    return 0
}

# Setup database
setup_database() {
    log_info "Setting up development database..."
    
    # Wait for PostgreSQL to be ready
    local max_wait=60
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if docker exec keledon-postgres-dev pg_isready -U keledon -d keledon_dev &>/dev/null; then
            log_success "PostgreSQL is ready"
            break
        fi
        
        sleep 2
        wait_time=$((wait_time + 2))
    done
    
    # Run database migrations
    log_info "Running database migrations..."
    docker exec keledon-postgres-dev psql -U keledon -d keledon_dev -f /docker-entrypoint-initdb.d/001_baseline_schema.sql || true
    docker exec keledon-postgres-dev psql -U keledon -d keledon_dev -f /docker-entrypoint-initdb.d/002_rbac_fixed.sql || true
    
    log_success "Database setup completed"
}

# Show development status
show_dev_status() {
    log_info "Development Environment Status:"
    echo ""
    docker-compose -f docker-compose.dev.v2.yml ps
    echo ""
    log_info "Development URLs:"
    echo "  KELEDON App: http://localhost:8080"
    echo "  Landing Dev: http://localhost:5173"
    echo "  Qdrant API: http://localhost:6333"
    echo "  Redis: localhost:6379"
    echo "  PostgreSQL: localhost:5432"
    echo ""
    log_info "Development Commands:"
    echo "  View logs: docker-compose -f docker-compose.dev.v2.yml logs -f"
    echo "  Stop services: docker-compose -f docker-compose.dev.v2.yml down"
    echo "  Restart services: docker-compose -f docker-compose.dev.v2.yml restart"
    echo ""
    log_info "Use '. .env.dev' to load environment variables"
}

# Main setup function
main() {
    log_info "Starting KELEDON development environment setup at $(date)"
    
    # Execute setup steps
    check_prerequisites
    setup_environment
    install_dependencies
    build_services
    start_dev_services
    wait_for_dev_services
    setup_database
    show_dev_status
    
    log_success "🛠️  KELEDON development environment is ready!"
    echo ""
    log_info "Next steps:"
    echo "  1. Load environment: source .env.dev"
    echo "  2. Start development: npm run dev:full"
    echo "  3. Open browser: http://localhost:8080"
    echo "  4. Run tests: npm test"
}

# Handle script interruption
trap 'log_info "Setup interrupted. Cleaning up..."; docker-compose -f docker-compose.dev.v2.yml down; exit 1' INT TERM

# Run main function
main "$@"