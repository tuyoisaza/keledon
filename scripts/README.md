# Scripts Directory

## Overview
The `scripts/` directory contains development utilities, automation tools, and deployment helpers for the KELEDON project.

## Key Scripts

### Development Utilities
- `test-deploy`: Test deployment script for local verification
- `check-deployment.bat`: Deployment validation and health checks
- `DEPLOYMENT_GUIDE.md`: Comprehensive deployment instructions
- `test-deployment.sh`: Shell-based deployment testing

### Build and Testing
- `dev-setup.sh`: Development environment setup and configuration
- `test-runner.sh`: Test execution orchestration
- `generate-fixtures.js`: Data fixture generation for testing
- `schema-validator.js`: Contract schema validation utilities

### Automation Tools
- `monitor-workflow.js`: Workflow monitoring and alerting
- `performance-analyzer.js`: Performance benchmarking and optimization
- `dependency-audit.js`: Security and dependency analysis
- `code-quality-check.js`: Code quality and linting automation

## Directory Structure
```
scripts/
├── test-deploy             # Test deployment automation
├── check-deployment.bat    # Deployment validation
├── DEPLOYMENT_GUIDE.md     # Deployment documentation
├── test-deployment.sh      # Shell deployment testing
├── dev-setup.sh            # Dev environment setup
├── test-runner.sh          # Test orchestration
├── generate-fixtures.js    # Data fixture generation
├── schema-validator.js     # Contract validation
├── monitor-workflow.js     # Workflow monitoring
├── performance-analyzer.js # Performance analysis
├── dependency-audit.js     # Security audit
├── code-quality-check.js   # Code quality automation
└── README.md               # This file
```

## Usage Guide

### Development Setup
```bash
# Run development setup
./dev-setup.sh

# Validate contract schemas
node schema-validator.js

# Generate test fixtures
node generate-fixtures.js
```

### Testing Automation
```bash
# Run comprehensive test suite
./test-runner.sh

# Test deployment locally
./test-deploy

# Check deployment health
./check-deployment.bat
```

### Performance Analysis
```bash
# Run performance benchmarks
node performance-analyzer.js

# Audit dependencies for security issues
node dependency-audit.js

# Check code quality metrics
node code-quality-check.js
```

## Integration Points
- **CI/CD**: Scripts integrated with GitHub Actions workflows
- **Docker**: Used in multi-stage Docker builds
- **Cloud Run**: Deployment scripts for Google Cloud Run
- **Testing**: Integrated with Jest and Cypress test suites

## Standard Conventions
- **Shell scripts**: Use `#!/bin/bash` shebang and POSIX-compliant syntax
- **Node.js scripts**: Use ES6 modules and TypeScript where possible
- **Documentation**: All scripts include usage examples in comments
- **Error handling**: Comprehensive error checking and exit codes
- **Logging**: Structured logging with timestamp and level information

## Maintenance Guidelines
- **Version control**: All scripts should be version-controlled
- **Testing**: Each script should have corresponding test cases
- **Documentation**: Update README when adding new scripts
- **Dependencies**: Minimize external dependencies to avoid conflicts
- **Security**: Avoid hard-coded secrets; use environment variables

## Related Documentation
- [Deployment Guide](docs/runbooks/deployment-guide.md)
- [Development Standards](docs/architecture/development-standards.md)
- [Testing Strategy](docs/runbooks/testing-strategy.md)

This scripts directory serves as the central hub for development automation, testing, and deployment operations across the KELEDON ecosystem.