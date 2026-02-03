#!/bin/bash

# KELEDON Service Orchestration Script
# Manages the complete KELEDON runtime pipeline

set -e

echo "🎯 KELEDON Service Orchestration"

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
load_env() {
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        echo "Warning: .env file not found. Using defaults."
    fi
}

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

# Service status checking
check_service_status() {
    local service_name=$1
    local check_command=$2
    local health_url=$3
    
    log_info "Checking $service_name status..."
    
    if eval "$check_command" &>/dev/null; then
        log_success "$service_name is running"
        return 0
    else
        log_warning "$service_name is not responding"
        return 1
    fi
}

# Start all services
start_services() {
    log_info "Starting KELEDON services orchestration..."
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Determine which compose file to use
    local compose_file="docker-compose.${NODE_ENV:-development}.yml"
    if [ "$NODE_ENV" = "development" ] && [ -f "docker-compose.dev.v2.yml" ]; then
        compose_file="docker-compose.dev.v2.yml"
    fi
    
    # Start services
    log_info "Starting services with $compose_file"
    docker-compose -f "$compose_file" up -d
    
    # Wait for services to be ready
    wait_for_services "$compose_file"
}

# Wait for services to be healthy
wait_for_services() {
    local compose_file=$1
    local services=("qdrant" "redis" "postgres" "keledon-app")
    local max_wait=300
    local wait_time=0
    
    log_info "Waiting for services to be healthy..."
    
    while [ $wait_time -lt $max_wait ]; do
        local all_healthy=true
        
        for service in "${services[@]}"; do
            local container=$(docker-compose -f "$compose_file" ps -q "$service")
            local health=$(docker ps --filter "name=$container" --format "{{.Status}}")
            
            case "$health" in
                "healthy")
                    log_success "$service is healthy"
                    ;;
                "up"|"running")
                    log_warning "$service is up but health check pending"
                    all_healthy=false
                    ;;
                *)
                    log_error "$service is not running"
                    all_healthy=false
                    ;;
            esac
        done
        
        if [ "$all_healthy" = true ]; then
            log_success "All services are healthy"
            return 0
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    log_warning "Services did not all become healthy within timeout"
    return 1
}

# Stop all services
stop_services() {
    log_info "Stopping KELEDON services..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.${NODE_ENV:-development}.yml"
    if [ "$NODE_ENV" = "development" ] && [ -f "docker-compose.dev.v2.yml" ]; then
        compose_file="docker-compose.dev.v2.yml"
    fi
    
    docker-compose -f "$compose_file" down
    
    log_success "Services stopped"
}

# Restart services
restart_services() {
    log_info "Restarting KELEDON services..."
    
    stop_services
    sleep 5
    start_services
}

# Show service status
show_status() {
    log_info "KELEDON Service Status:"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.${NODE_ENV:-development}.yml"
    if [ "$NODE_ENV" = "development" ] && [ -f "docker-compose.dev.v2.yml" ]; then
        compose_file="docker-compose.dev.v2.yml"
    fi
    
    # Show container status
    docker-compose -f "$compose_file" ps
    
    echo ""
    log_info "Service URLs:"
    
    local port=8080
    if [ "$NODE_ENV" = "development" ]; then
        port=8080
    fi
    
    echo "  KELEDON App: http://localhost:$port"
    echo "  Qdrant API: http://localhost:6333"
    echo "  Redis: localhost:6379"
    echo "  PostgreSQL: localhost:5432"
    
    # Show logs location
    echo ""
    log_info "Logs are available with: docker-compose -f $compose_file logs -f"
}

# Show logs
show_logs() {
    local service=${1:-""}
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.${NODE_ENV:-development}.yml"
    if [ "$NODE_ENV" = "development" ] && [ -f "docker-compose.dev.v2.yml" ]; then
        compose_file="docker-compose.dev.v2.yml"
    fi
    
    if [ -n "$service" ]; then
        log_info "Showing logs for service: $service"
        docker-compose -f "$compose_file" logs -f "$service"
    else
        log_info "Showing logs for all services"
        docker-compose -f "$compose_file" logs -f
    fi
}

# Health check all services
health_check() {
    log_info "Running comprehensive health check..."
    
    local overall_status=0
    
    # Check Qdrant
    if curl -f http://localhost:6333/health &>/dev/null; then
        log_success "Qdrant: Healthy"
    else
        log_error "Qdrant: Unhealthy"
        overall_status=1
    fi
    
    # Check Redis
    if docker exec keledon-${NODE_ENV:-dev}-redis redis-cli ping &>/dev/null; then
        log_success "Redis: Healthy"
    else
        log_error "Redis: Unhealthy"
        overall_status=1
    fi
    
    # Check PostgreSQL
    local pg_container="keledon-${NODE_ENV:-dev}-postgres"
    if docker exec "$pg_container" pg_isready -U keledon -d keledon_${NODE_ENV:-dev} &>/dev/null; then
        log_success "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Unhealthy"
        overall_status=1
    fi
    
    # Check KELEDON App
    local app_port=8080
    if curl -f http://localhost:$app_port/health &>/dev/null; then
        log_success "KELEDON App: Healthy"
    else
        log_error "KELEDON App: Unhealthy"
        overall_status=1
    fi
    
    if [ $overall_status -eq 0 ]; then
        log_success "All services are healthy"
    else
        log_error "Some services are unhealthy"
    fi
    
    return $overall_status
}

# Scale services
scale_services() {
    local service=$1
    local replicas=$2
    
    log_info "Scaling $service to $replicas replicas..."
    
    cd "$PROJECT_ROOT"
    
    local compose_file="docker-compose.${NODE_ENV:-development}.yml"
    if [ "$NODE_ENV" = "development" ] && [ -f "docker-compose.dev.v2.yml" ]; then
        compose_file="docker-compose.dev.v2.yml"
    fi
    
    docker-compose -f "$compose_file" up -d --scale "$service=$replicas"
    
    log_success "Service $service scaled to $replicas replicas"
}

# Backup services
backup_services() {
    local backup_dir="${PROJECT_ROOT}/backups/$(date +%Y%m%d_%H%M%S)"
    log_info "Creating backup: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    # Backup database
    log_info "Backing up PostgreSQL database..."
    docker exec keledon-${NODE_ENV:-dev}-postgres pg_dump -U keledon keledon_${NODE_ENV:-dev} > "$backup_dir/postgres_backup.sql"
    
    # Backup Qdrant data
    log_info "Backing up Qdrant data..."
    docker cp keledon-${NODE_ENV:-dev}-qdrant:/qdrant/storage "$backup_dir/qdrant_storage"
    
    # Backup configuration
    log_info "Backing up configuration..."
    cp "$ENV_FILE" "$backup_dir/.env" 2>/dev/null || true
    cp "docker-compose.${NODE_ENV:-development}.yml" "$backup_dir/" 2>/dev/null || true
    
    log_success "Backup completed: $backup_dir"
}

# Show help
show_help() {
    echo "KELEDON Service Orchestration Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start           Start all services"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  status          Show service status"
    echo "  logs [service] Show logs (all or specific service)"
    echo "  health          Run health checks"
    echo "  scale service n  Scale service to n replicas"
    echo "  backup          Create backup of data and config"
    echo "  help            Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs keledon-app"
    echo "  $0 scale keledon-app 3"
    echo ""
    echo "Environment variables:"
    echo "  NODE_ENV          Environment (development|production)"
    echo "  POSTGRES_PASSWORD  PostgreSQL password"
    echo "  DEEPGRAM_API_KEY  Deepgram API key"
}

# Main function
main() {
    load_env
    
    local command=${1:-"help"}
    
    case "$command" in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "health")
            health_check
            ;;
        "scale")
            if [ -z "$2" ] || [ -z "$3" ]; then
                log_error "Scale command requires service and replica count"
                exit 1
            fi
            scale_services "$2" "$3"
            ;;
        "backup")
            backup_services
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_info "Orchestration interrupted. Stopping services..."; stop_services; exit 1' INT TERM

# Run main function
main "$@"