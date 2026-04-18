# KELEDON Release Version Policy

## Semver Implementation
KELEDON uses Semantic Versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes to the canonical API or contract
- MINOR: New features backward-compatible
- PATCH: Bug fixes, no API changes

## Version Bump Rules
1. **PATCH bump**: Bug fixes, dependency updates, non-breaking changes
2. **MINOR bump**: New features, deprecated APIs removed after notice
3. **MAJOR bump**: Contract/API changes breaking backward compatibility

## Version Tags
Tags format: `vX.Y.Z` (e.g., `v0.1.8`)

## Release Assets Required
- **ZIP**: Complete build (for manual installation)
- **NSIS EXE**: Windows installer (auto-updater)

## Release Channels
- **Versioned**: `vX.Y.Z` - specific release with all assets
- **Latest**: `latest` alias pointing to most recent stable

## Changelog Requirements
Each release must include:
- Date (ISO 8601)
- Changes since last release
- Breaking changes (if any)
- Upgrade notes (if any)

## Last Updated
- 2026-04-17