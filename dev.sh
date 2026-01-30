#!/bin/bash

# KELEDON Vector Store Development Scripts
# Cross-platform development workflow management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Check if we're in the right directory
check_project_root() {
    if [ ! -f "package.json" ] && [ ! -d "landing" ] && [ ! -d "cloud" ]; then
        print_status $RED "Error: Please run this script from the KELEDON project root"
        exit 1
    fi
}

# Install dependencies
install_deps() {
    print_status $BLUE "Installing dependencies..."
    
    if [ -d "landing" ]; then
        print_status $BLUE "Installing frontend dependencies..."
        cd landing
        npm install
        cd ..
    fi
    
    if [ -d "cloud" ]; then
        print_status $BLUE "Installing backend dependencies..."
        cd cloud
        npm install
        cd ..
    fi
    
    print_status $GREEN "Dependencies installed successfully!"
}

# Setup Vector Store environment
setup_vector_store() {
    print_status $BLUE "Setting up Vector Store environment..."
    
    # Create environment files from templates
    if [ -f ".env.local.template" ] && [ ! -f ".env.local" ]; then
        cp .env.local.template .env.local
        print_status $GREEN "Created .env.local from template"
    fi
    
    if [ -f ".env.production.template" ] && [ ! -f ".env.production" ]; then
        cp .env.production.template .env.production
        print_status $GREEN "Created .env.production from template"
    fi
    
    # Create backup directory
    mkdir -p vs-backups
    
    # Setup Qdrant
    if [ -f "landing/scripts/setup-qdrant.js" ]; then
        cd landing
        node scripts/setup-qdrant.js status || (
            print_status $BLUE "Starting Qdrant container..."
            node scripts/setup-qdrant.js start
        )
        cd ..
    fi
    
    print_status $GREEN "Vector Store environment setup complete!"
}

# Start development servers
dev() {
    print_status $BLUE "Starting KELEDON development environment..."
    
    # Check if Qdrant is running
    if [ -f "landing/scripts/setup-qdrant.js" ]; then
        cd landing
        node scripts/setup-qdrant.js health || (
            print_status $YELLOW "Qdrant is not running, starting it..."
            node scripts/setup-qdrant.js start
            sleep 5
        )
        cd ..
    fi
    
    # Start frontend and backend concurrently
    if [ -d "landing" ] && [ -d "cloud" ]; then
        print_status $BLUE "Starting frontend and backend concurrently..."
        concurrently "cd cloud && npm run start:dev" "cd landing && npm run dev" --names "backend,frontend"
    elif [ -d "landing" ]; then
        print_status $BLUE "Starting frontend only..."
        cd landing
        npm run dev
    elif [ -d "cloud" ]; then
        print_status $BLUE "Starting backend only..."
        cd cloud
        npm run start:dev
    fi
}

# Build project
build() {
    print_status $BLUE "Building KELEDON project..."
    
    if [ -d "landing" ]; then
        print_status $BLUE "Building frontend..."
        cd landing
        npm run build
        cd ..
        print_status $GREEN "Frontend build complete!"
    fi
    
    if [ -d "cloud" ]; then
        print_status $BLUE "Building backend..."
        cd cloud
        npm run build
        cd ..
        print_status $GREEN "Backend build complete!"
    fi
    
    print_status $GREEN "Project build complete!"
}

# Run tests
test() {
    print_status $BLUE "Running tests..."
    
    if [ -d "landing" ]; then
        print_status $BLUE "Running frontend tests..."
        cd landing
        npm test 2>/dev/null || print_status $YELLOW "No frontend tests found"
        cd ..
    fi
    
    if [ -d "cloud" ]; then
        print_status $BLUE "Running backend tests..."
        cd cloud
        npm test
        cd ..
    fi
    
    print_status $GREEN "Tests complete!"
}

# Lint code
lint() {
    print_status $BLUE "Linting code..."
    
    if [ -d "landing" ]; then
        print_status $BLUE "Linting frontend..."
        cd landing
        npm run lint
        cd ..
    fi
    
    if [ -d "cloud" ]; then
        print_status $BLUE "Linting backend..."
        cd cloud
        npm run lint
        cd ..
    fi
    
    print_status $GREEN "Linting complete!"
}

# Clean build artifacts
clean() {
    print_status $BLUE "Cleaning build artifacts..."
    
    if [ -d "landing" ]; then
        cd landing
        rm -rf dist node_modules/.cache
        cd ..
    fi
    
    if [ -d "cloud" ]; then
        cd cloud
        rm -rf dist
        cd ..
    fi
    
    print_status $GREEN "Clean complete!"
}

# Vector Store specific commands
qdrant() {
    local command=$1
    
    if [ -f "landing/scripts/setup-qdrant.js" ]; then
        cd landing
        node scripts/setup-qdrant.js $command
        cd ..
    else
        print_status $RED "Qdrant setup script not found"
        exit 1
    fi
}

# Show help
help() {
    echo "KELEDON Development Scripts"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install          Install all dependencies"
    echo "  setup            Setup Vector Store environment"
    echo "  dev              Start development servers"
    echo "  build            Build production bundles"
    echo "  test             Run all tests"
    echo "  lint             Lint all code"
    echo "  clean            Clean build artifacts"
    echo "  qdrant [cmd]    Manage Qdrant container (start|stop|status|health|logs)"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install       # Install dependencies"
    echo "  $0 setup         # Setup Vector Store"
    echo "  $0 dev           # Start development"
    echo "  $0 build         # Build for production"
    echo "  $0 qdrant start  # Start Qdrant only"
}

# Main script logic
main() {
    local command=${1:-"help"}
    
    check_project_root
    
    case $command in
        install)
            install_deps
            ;;
        setup)
            setup_vector_store
            ;;
        dev)
            dev
            ;;
        build)
            build
            ;;
        test)
            test
            ;;
        lint)
            lint
            ;;
        clean)
            clean
            ;;
        qdrant)
            qdrant ${2:-"status"}
            ;;
        help|--help|-h)
            help
            ;;
        *)
            print_status $RED "Unknown command: $command"
            help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"