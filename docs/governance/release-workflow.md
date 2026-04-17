# KELEDON Release Workflow

## Overview
This document describes the release automation for KELEDON Cloud and KELEDON Browser, ensuring consistent, auditable releases with versioned artifacts and a stable `latest` alias.

## Versioning Policy

### Semantic Versioning (SemVer)
- **Format**: `vMAJOR.MINOR.PATCH` (e.g., `v0.1.2`)
- **Increment**:
  - `MAJOR` — Breaking changes
  - `MINOR` — New features, backward-compatible
  - `PATCH` — Bug fixes, hotfixes

### Release Tags
- **Versioned tag**: `vX.Y.Z` — Immutable release artifact
- **Latest alias**: `latest` — Points to most recent stable release

## Artifacts Produced

### KELEDON Cloud
| Artifact | Location | Description |
|----------|----------|-------------|
| Docker image | Railway / container registry | Cloud backend |
| Prisma migrations | `cloud/prisma/migrations` | Database schema |

### KELEDON Browser
| Artifact | Location | Description |
|----------|----------|-------------|
| ZIP | GitHub Releases | Portable distribution (vX.Y.Z) |
| NSIS Installer | GitHub Releases | Windows installer EXE (vX.Y.Z) |
| Portable | GitHub Releases | Standalone EXE |

## Release Flow (GitHub Actions Skeleton)

```yaml
# .github/workflows/release.yml
name: Release KELEDON

on:
  push:
    tags:
      - 'v*'

jobs:
  release-browser:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd browser
          npm ci

      - name: Build browser
        run: npm run build

      - name: Package (ZIP)
        run: |
          cd browser
          npx electron-packager . "KELEDON Browser" --platform=win32 --arch=x64 \
            --out=./dist --overwrite
        shell: cmd

      - name: Create ZIP artifact
        run: |
          powershell -Command "Compress-Archive -Path 'dist/KELEDON Browser-win32-x64/*' -DestinationPath 'keledon-browser-${{ github.ref_name }}.zip'"
        shell: cmd

      - name: Build NSIS Installer
        run: |
          cd browser
          npx electron-builder --win nsis
        shell: cmd

      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            keledon-browser-*.zip
            dist/*Setup.exe
          tag_name: ${{ github.ref_name }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  update-landing:
    needs: release-browser
    runs-on: ubuntu-latest
    steps:
      - name: Update landing download link
        run: |
          # Update landing/src/pages/LaunchKeledonPage.tsx with new versioned URL
          # Target _blank for new tab
          echo "Landing link update would happen here"
```

## Landing Page Integration

### URL Pattern
- **Versioned**: `https://github.com/tuyoisaza/keledon/releases/download/v{VERSION}/keledon-browser-{VERSION}.zip`
- **Latest (alias)**: `https://github.com/tuyoisaza/keledon/releases/latest/download/keledon-browser-latest.zip`

### Link Attributes
- **Target**: `_blank` — Open in new tab
- **Rel**: `noopener noreferrer`

## Manual Release Steps (If CI Fails)

### 1. Bump Version
```bash
# Update versions in:
# - cloud/package.json
# - browser/package.json
# - landing/package.json

# Example:
cd cloud && npm version patch
cd browser && npm version patch
cd landing && npm version patch
```

### 2. Tag and Push
```bash
git tag v0.1.3
git push origin v0.1.3
```

### 3. Verify Artifacts
- Check GitHub Releases for ZIP and EXE
- Verify landing page link resolves correctly

## Rollback Procedure
1. **Revert version in `package.json` files**
2. **Delete GitHub Release** (if broken)
3. **Repoint `latest` to previous working release**
4. **Push corrected tag**

---
**End of Release Workflow**