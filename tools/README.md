# Tools Directory

## Overview
The `tools/` directory contains development utilities, scripts, and generators that support the KELEDON development workflow.

## Core Tools

### Development Utilities
- **dev-setup.sh**: Environment setup and dependency installation
- **test-runner.sh**: Test execution orchestration
- **code-generator.js**: Code generation utilities for contracts and interfaces
- **schema-validator.js**: Contract schema validation and testing

### Build & Deployment Tools
- **docker-builder.js**: Docker image build automation
- **cloud-run-deployer.js**: Cloud Run deployment scripts
- **k8s-deployer.js**: Kubernetes deployment utilities
- **terraform-generator.js**: Infrastructure-as-code generation

### Testing Tools
- **test-fixture-generator.js**: Test data fixture creation
- **mock-generator.js**: Chrome API mocking utilities
- **jsdom-test-runner.js**: JSDOM-based extension testing framework
- **integration-test-suite.js**: Cross-component integration tests

### Documentation Tools
- **arch-diagram-generator.js**: Architecture diagram generation
- **api-doc-generator.js**: OpenAPI documentation generation
- **readme-generator.js**: Automated README file generation
- **changelog-generator.js**: Release changelog generation

## Folder Structure
```
tools/
├── dev/                  # Development utilities
│   ├── setup/            # Environment setup scripts
│   └── helpers/          # Utility functions
├── build/                # Build automation
│   ├── docker/           # Docker-related utilities
│   └── ci/               # CI/CD utilities
├── test/                 # Testing utilities
│   ├── fixtures/         # Test data generators
│   ├── mocks/            # Mocking utilities
│   └── runners/          # Test execution runners
├── docs/                 # Documentation utilities
│   ├── generators/       # Auto-documentation tools
│   └── validators/       # Documentation validation
└── scripts/              # Standalone utility scripts
```

## Usage Examples

### Development Setup
```bash
# Install development dependencies
./tools/dev/setup/install-dependencies.sh

# Generate code from contracts
node tools/build/code-generator.js --contract contracts/v1/brain/event.schema.json
```

### Testing Utilities
```bash
# Generate test fixtures
node tools/test/fixtures/generator.js --type=rpa-step --count=10

# Run integration tests
node tools/test/runners/integration-runner.js --components=agent,cloud
```

### Documentation Generation
```bash
# Generate architecture diagrams
node tools/docs/generators/arch-diagram-generator.js --output docs/diagrams/

# Validate documentation completeness
node tools/docs/validators/readme-validator.js --directory .
```

## Development Guidelines

### Tool Creation Standards
1. **Modular Design**: Each tool should be a single responsibility module
2. **Type Safety**: TypeScript with strict mode enabled
3. **Error Handling**: Comprehensive error handling with structured errors
4. **Logging**: Consistent logging with log levels (debug, info, warn, error)
5. **Configuration**: Environment variables and config files for customization

### Integration Patterns
- **CLI Interface**: Tools should have consistent CLI interface
- **JSON Input/Output**: Standardized JSON format for tool communication
- **Exit Codes**: Standard exit codes for success (0), failure (1), and warnings (2)
- **Help System**: Built-in help with `--help` flag

## Current Status
✅ **Complete**: Core development utilities implemented
✅ **Working**: Test fixture generation and mocking utilities
✅ **Integrated**: Tools used in CI/CD pipeline and development workflow

## Future Enhancements
- **AI-assisted tools**: Code generation with LLM integration
- **Performance monitoring**: Tool execution time tracking
- **Dependency analysis**: Automatic dependency mapping
- **Cross-platform support**: Windows, macOS, and Linux compatibility

## Related Documentation
- [Development Guide](docs/runbooks/tool-development-guide.md)
- [CI/CD Integration](docs/runbooks/ci-cd-tools-integration.md)
- [Testing Framework](docs/architecture/testing-framework.md)

This tools directory provides the foundation for automated development, testing, and deployment workflows across the KELEDON ecosystem.