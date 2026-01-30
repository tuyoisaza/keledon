#!/bin/bash

# Qdrant Setup Script for Unix/Linux/macOS
# This script sets up a local Qdrant instance using Docker for KELEDON development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CONTAINER_NAME="keledon-qdrant"
PORT="6333"
DATA_DIR="./qdrant-data"
IMAGE="qdrant/qdrant:latest"

# Help function
print_help() {
    echo "KELEDON Qdrant Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start       Start Qdrant container"
    echo "  stop        Stop Qdrant container"
    echo "  restart     Restart Qdrant container"
    echo "  status      Show container status"
    echo "  logs        Show container logs"
    echo "  health      Check Qdrant health"
    echo "  cleanup     Remove container and data"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  -n, --name      Container name (default: $CONTAINER_NAME)"
    echo "  -p, --port      Port to expose (default: $PORT)"
    echo "  -d, --data      Data directory (default: $DATA_DIR)"
    echo "  -i, --image     Docker image (default: $IMAGE)"
    echo ""
    echo "Examples:"
    echo "  $0 start                           # Start with defaults"
    echo "  $0 start -p 7333                   # Start on port 7333"
    echo "  $0 start -d /opt/qdrant-data       # Use custom data directory"
    echo "  $0 logs                            # View logs"
    echo "  $0 health                          # Check health"
}

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_status $RED "Docker is not installed or not in PATH"
        echo "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_status $RED "Docker daemon is not running"
        echo "Please start Docker daemon first"
        exit 1
    fi
}

# Create data directory if it doesn't exist
create_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        print_status $YELLOW "Creating data directory: $DATA_DIR"
        mkdir -p "$DATA_DIR"
        chmod 755 "$DATA_DIR"
    fi
}

# Start Qdrant container
start_qdrant() {
    print_status $BLUE "Starting Qdrant container..."
    
    # Check if container already exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        print_status $YELLOW "Container '$CONTAINER_NAME' already exists"
        
        # Check if it's running
        if docker ps --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
            print_status $GREEN "Container is already running"
            show_status
            return 0
        else
            print_status $BLUE "Starting existing container..."
            docker start "$CONTAINER_NAME"
        fi
    else
        print_status $BLUE "Creating new container..."
        docker run -d \
            --name "$CONTAINER_NAME" \
            -p "$PORT:6333" \
            -p "$PORT:6334" \
            -v "$(pwd)/$DATA_DIR:/qdrant/storage" \
            -e QDRANT__SERVICE__HTTP_PORT=6333 \
            -e QDRANT__SERVICE__GRPC_PORT=6334 \
            "$IMAGE"
    fi
    
    # Wait for container to be ready
    print_status $BLUE "Waiting for Qdrant to be ready..."
    sleep 5
    
    # Check health
    if health_check; then
        print_status $GREEN "Qdrant started successfully!"
        print_status $BLUE "Web UI: http://localhost:$PORT"
        print_status $BLUE "API Endpoint: http://localhost:$PORT"
        show_status
    else
        print_status $RED "Failed to start Qdrant or health check failed"
        print_status $YELLOW "Check logs with: $0 logs"
        exit 1
    fi
}

# Stop Qdrant container
stop_qdrant() {
    print_status $BLUE "Stopping Qdrant container..."
    
    if docker ps --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        docker stop "$CONTAINER_NAME"
        print_status $GREEN "Container stopped"
    else
        print_status $YELLOW "Container is not running"
    fi
}

# Restart Qdrant container
restart_qdrant() {
    stop_qdrant
    sleep 2
    start_qdrant
}

# Show container status
show_status() {
    if docker ps --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        print_status $GREEN "Container Status: Running"
        
        # Get container info
        local container_info=$(docker inspect "$CONTAINER_NAME" --format='{{.Status}}')
        local ports=$(docker port "$CONTAINER_NAME")
        
        echo "Container Info: $container_info"
        echo "Port Mappings: $ports"
        
        # Try to get version info
        if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
            print_status $GREEN "API Health: Healthy"
        else
            print_status $YELLOW "API Health: Unknown (may still be starting)"
        fi
    elif docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        print_status $YELLOW "Container Status: Stopped"
    else
        print_status $RED "Container Status: Not found"
    fi
}

# Show logs
show_logs() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        docker logs -f "$CONTAINER_NAME"
    else
        print_status $RED "Container '$CONTAINER_NAME' not found"
        exit 1
    fi
}

# Health check
health_check() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
            return 0
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Cleanup function
cleanup_qdrant() {
    print_status $YELLOW "Cleaning up Qdrant container and data..."
    
    # Stop and remove container
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME"
        print_status $GREEN "Container removed"
    fi
    
    # Ask about data directory
    read -p "Remove data directory '$DATA_DIR'? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$DATA_DIR" ]; then
            rm -rf "$DATA_DIR"
            print_status $GREEN "Data directory removed"
        fi
    fi
    
    print_status $GREEN "Cleanup completed"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--name)
                CONTAINER_NAME="$2"
                shift 2
                ;;
            -p|--port)
                PORT="$2"
                shift 2
                ;;
            -d|--data)
                DATA_DIR="$2"
                shift 2
                ;;
            -i|--image)
                IMAGE="$2"
                shift 2
                ;;
            -h|--help)
                print_help
                exit 0
                ;;
            *)
                print_status $RED "Unknown option: $1"
                print_help
                exit 1
                ;;
        esac
    done
}

# Main script logic
main() {
    # Parse command line arguments first
    parse_args "$@"
    
    # Remove parsed arguments from $@
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--name|-p|--port|-d|--data|-i|--image)
                shift 2
                ;;
            *)
                break
                ;;
        esac
    done
    
    # Get command
    local command=${1:-"help"}
    
    # Validate command
    case $command in
        start|stop|restart|status|logs|health|cleanup|help)
            ;;
        *)
            print_status $RED "Unknown command: $command"
            print_help
            exit 1
            ;;
    esac
    
    # Check Docker availability (except for help and cleanup)
    if [[ ! "$command" =~ ^(help|cleanup)$ ]]; then
        check_docker
    fi
    
    # Create data directory for start command
    if [[ "$command" == "start" ]]; then
        create_data_dir
    fi
    
    # Execute command
    case $command in
        start)
            start_qdrant
            ;;
        stop)
            stop_qdrant
            ;;
        restart)
            restart_qdrant
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        health)
            print_status $BLUE "Checking Qdrant health at http://localhost:$PORT"
            if health_check; then
                print_status $GREEN "Qdrant is healthy!"
                # Show version info
                local version=$(curl -s "http://localhost:$PORT/health" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "Unknown")
                echo "Version: $version"
            else
                print_status $RED "Qdrant health check failed!"
                exit 1
            fi
            ;;
        cleanup)
            cleanup_qdrant
            ;;
        help)
            print_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"