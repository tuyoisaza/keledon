# Documentation System

## Overview
The `docs/` directory contains comprehensive documentation for the KELEDON project, organized into architecture, diagrams, and runbooks sections.

## Directory Structure
```
docs/
├── architecture/        # System architecture and component documentation
│   ├── README.md        # Architecture overview
│   ├── tab-discovery.md # Tab discovery system documentation
│   ├── tab-messaging.md # Tab messaging system documentation
│   └── ...              # Other architecture documents
├── diagrams/            # System diagrams and visual representations
│   ├── README.md        # Diagram overview
│   └── ...              # SVG/PNG diagram files
├── runbooks/            # Operational guides and procedures
│   ├── README.md        # Runbook overview
│   └── ...              # Step-by-step operational guides
└── README.md            # This file (documentation system overview)
```

## Documentation Standards

### Architecture Documentation
- **Format**: Markdown with clear section headers
- **Content**: Overview, key components, integration points, usage examples
- **Standards**: Follow Briefs V1 architecture guidelines
- **Cross-referencing**: Link to related components and contracts

### Diagram Documentation
- **Formats**: SVG for vector graphics, PNG for raster images
- **Tools**: Mermaid.js for code-generated diagrams, draw.io for complex systems
- **Naming**: Descriptive names with versioning (e.g., `agent-architecture-v2.svg`)
- **Integration**: Embedded in architecture documentation where relevant

### Runbook Documentation
- **Structure**: Problem → Solution → Steps → Verification
- **Audience**: Developers, operations staff, and system administrators
- **Format**: Step-by-step instructions with screenshots where appropriate
- **Versioning**: Include date and version in header

## Current Documentation Status

| Category | Status | Count |
|----------|--------|-------|
| Architecture | ✅ Complete | 4+ documents |
| Diagrams | ⚠️ In Progress | 2+ diagrams planned |
| Runbooks | ⚠️ In Progress | 3+ guides planned |
| API Reference | ❌ Pending | To be generated |

## Documentation Generation Process

1. **Auto-generation**: Use Codex CLI for initial documentation drafts
2. **Manual refinement**: Review and enhance with technical details
3. **Validation**: Cross-check against actual implementation
4. **Integration**: Link to source code and related documentation
5. **Version control**: Track changes with git and document updates

## Contribution Guidelines

### For New Documentation
1. Create new file in appropriate subdirectory
2. Follow existing formatting and structure patterns
3. Include architecture diagrams where helpful
4. Cross-reference related components and contracts
5. Add to appropriate index files

### For Updates
1. Update version information in header
2. Document changes in changelog section
3. Verify accuracy against current implementation
4. Update cross-references as needed

## Tools and Resources
- **Markdown**: Primary documentation format
- **Mermaid.js**: Diagram generation in markdown
- **VS Code**: Recommended editor with markdown preview
- **Git**: Version control for documentation changes
- **Codex CLI**: AI-assisted documentation generation

## Next Steps
- [ ] Complete diagram library for all major components
- [ ] Create comprehensive runbooks for deployment and troubleshooting
- [ ] Generate API reference documentation
- [ ] Implement automated documentation validation

This documentation system ensures that KELEDON remains maintainable, understandable, and extensible as the project grows.