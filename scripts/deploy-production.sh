#!/bin/bash

# KELEDON Production Deployment Script
# Deploys complete KELEDON stack to production

set -e

echo "🚀 Starting KELEDON Production Deployment"

# Configuration
export NODE_ENV=production
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}
export COMPOSE_PROJECT_NAME=keledon-prod

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
    log_info "Checking prerequisites..."
    
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
    
    # Check if we can write to current directory
    if [ ! -w "." ]; then
        log_error "No write permissions in current directory"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Cleanup existing containers
cleanup() {
    log_info "Cleaning up existing containers..."
    
    # Stop and remove existing containers
    docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans || true
    
    # Remove unused images
    docker image prune -f || true
    
    log_success "Cleanup completed"
}

# Build and deploy services
deploy_services() {
    log_info "Building and deploying KELEDON services..."
    
    # Build images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start services
    log_info "Starting production services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    log_success "Services deployed"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    local services=("qdrant" "redis" "postgres" "keledon-app")
    local max_wait=300
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        local all_healthy=true
        
        for service in "${services[@]}"; do
            local health=$(docker-compose -f docker-compose.prod.yml ps -q $service | grep -c "Up")
            if [ "$health" -eq 0 ]; then
                all_healthy=false
                log_warning "Service $service is not up yet"
            else
                # Check if service has health check
                local container=$(docker-compose -f docker-compose.prod.yml ps -q $service)
                if docker ps --filter "name=$container" --filter "health=healthy" --format "{{.Names}}" | grep -q .; then
                    log_success "Service $service is healthy"
                else
                    log_warning "Service $service is up but health check pending"
                fi
            fi
        done
        
        if [ "$all_healthy" = true ]; then
            log_success "All services are healthy"
            return 0
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    log_error "Services did not become healthy within timeout"
    return 1
}

# Run health checks
run_health_checks() {
    log_info "Running comprehensive health checks..."
    
    # Check backend API
    if curl -f http://localhost:8080/health &>/dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Check Qdrant
    if curl -f http://localhost:6333/health &>/dev/null; then
        log_success "Qdrant health check passed"
    else
        log_error "Qdrant health check failed"
        return 1
    fi
    
    # Check Redis
    if docker exec keledon-redis-prod redis-cli ping &>/dev/null; then
        log_success "Redis health check passed"
    else
        log_error "Redis health check failed"
        return 1
    fi
    
    # Check PostgreSQL
    if docker exec keledon-postgres-prod pg_isready -U keledon -d keledon_prod &>/dev/null; then
        log_success "PostgreSQL health check passed"
    else
        log_error "PostgreSQL health check failed"
        return 1
    fi
    
    log_success "All health checks passed"
    return 0
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo ""
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    log_info "Service URLs:"
    echo "  KELEDON App: http://localhost:8080"
    echo "  Qdrant API: http://localhost:6333"
    echo "  Redis: localhost:6379"
    echo "  PostgreSQL: localhost:5432"
    echo ""
    log_info "Use 'docker-compose -f docker-compose.prod.yml logs <service>' to view logs"
}

# Setup log rotation
setup_logs() {
    log_info "Setting up log rotation..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs/nginx logs/app
    
    # Create logrotate configuration
    cat > logs/logrotate.conf << EOF
logs/app/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}

logs/nginx/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    log_success "Log rotation configured"
}

# Main deployment function
main() {
    log_info "Starting KELEDON production deployment at $(date)"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_warning "Running as non-root user. Some operations might require sudo."
    fi
    
    # Execute deployment steps
    check_prerequisites
    setup_logs
    cleanup
    deploy_services
    
    # Wait for services and run health checks
    if wait_for_services; then
        if run_health_checks; then
            show_status
            log_success "🎉 KELEDON deployment completed successfully!"
            echo ""
            log_info "Next steps:"
            echo "  1. Test the deployment at http://localhost:8080"
            echo "  2. Run integration tests: node test/integration/quick-test.js"
            echo "  3. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
        else
            log_error "Health checks failed"
            exit 1
        fi
    else
        log_error "Services failed to start properly"
        exit 1
    fi
}

# Handle script interruption
trap 'log_info "Deployment interrupted. Cleaning up..."; docker-compose -f docker-compose.prod.yml down; exit 1' INT TERM

# Run main function
main "$@"