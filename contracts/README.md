# Contracts Directory

## Overview
The `contracts/` directory contains all canonical interface definitions and schema validation systems for communication between KELEDON components.

## Directory Structure
```
contracts/
├── v1/                   # Version 1 contracts (current)
│   ├── brain/            # Agent ↔ Cloud communication
│   │   ├── event.schema.json     # Agent→Cloud ingress events
│   │   └── command.schema.json   # Cloud→Agent commands
│   ├── audio/            # STT/TTS interfaces
│   │   ├── text_input.schema.json  # STT output format
│   │   └── speak.schema.json       # TTS input format
│   ├── rpa/              # RPA automation interfaces
│   │   ├── step.schema.json        # UI step definitions
│   │   └── result.schema.json      # UI execution results
│   ├── ws/               # WebSocket communication
│   │   └── realtime.schema.json    # WS event envelope
│   └── openapi/          # Admin REST APIs
│       └── admin.openapi.yaml      # OpenAPI specification
├── types.ts              # Generated TypeScript types
└── validation.ts         # Runtime validation utilities
```

## Key Components

### Contract Schemas (v1)
All communication between components must adhere to these canonical schemas:
- **Event Schema**: Defines agent→cloud ingress payload structure
- **Command Schema**: Defines cloud→agent command payload structure  
- **Audio Schemas**: Standardized STT/TTS payload formats
- **RPA Schemas**: UI step and result definitions for deterministic automation
- **WebSocket Schema**: Real-time event envelope structure
- **OpenAPI Specification**: Complete admin API documentation

### Validation System
- **Runtime validation**: All payloads validated against schemas at runtime
- **AJV integration**: Fast JSON schema validation
- **TypeScript generation**: Automatic type generation from schemas
- **Error handling**: Comprehensive error messages for invalid payloads

## Usage Guidelines

### For Developers
1. **Always validate payloads** against contracts before sending
2. **Never implement without contract first** - define schema before implementation
3. **Version contracts** when making breaking changes (v1 → v2)
4. **Use generated types** for type safety in TypeScript code

### Integration Patterns
- **Agent → Cloud**: Send events through WebSocket gateway, validated against `event.schema.json`
- **Cloud → Agent**: Send commands through WebSocket, validated against `command.schema.json`
- **STT/TTS**: Use adapter pattern with contracts as interface specification
- **RPA Execution**: Steps defined by `step.schema.json`, results validated by `result.schema.json`

## Current Status
✅ **Complete**: All v1 contracts implemented and validated
✅ **Working**: Runtime validation system operational
✅ **Integrated**: Contracts used throughout agent, cloud, and landing components

## Future Enhancements
- **v2 contracts**: Add versioning support for backward compatibility
- **Contract evolution**: Migration tools for schema version upgrades
- **Validation metrics**: Performance monitoring for validation overhead
- **Automated testing**: Contract-based test generation

## Related Documentation
- [Architecture Documentation](docs/architecture/contracts.md)
- [Development Rules](docs/runbooks/contract-first-development.md)
- [Validation Guide](docs/runbooks/schema-validation-guide.md)