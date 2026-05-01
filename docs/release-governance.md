# KELEDON Release Governance

**Owner:** Engineering
**Effective:** 2026-04-19
**Appended to:** KELEDON_V3 Canon

---

## Release Cadence

| Type | Trigger | Version bump |
|------|---------|-------------|
| Patch | Bug fix, hotfix | `0.0.X` |
| Minor | New feature, integration | `0.X.0` |
| Major | Breaking architecture change | `X.0.0` |

All three packages (`browser/`, `cloud/`, `landing/`) must be bumped together and must always be in sync.

---

## Release Checklist

### Pre-release
1. All planned tasks in `.sisyphus/boulder.json` for the milestone are `done`
2. Version bumped in `browser/package.json`, `cloud/package.json`, `landing/package.json`
3. `landing/src/pages/LaunchKeledonPage.tsx` download URL updated to new version
4. E2E runbook scenarios pass (see `.sisyphus/docs/e2e-testing-runbook.md`)
5. No `VIOLATION` from regression guards
6. PR merged to `main`

### Release
1. Tag `main` with `git tag vX.Y.Z && git push origin vX.Y.Z`
2. GitHub Actions `release.yml` triggers automatically:
   - Builds NSIS installer on `windows-latest`
   - Checks signing (gates if `REQUIRE_SIGNING=true`)
   - Publishes `KELEDON.Browser.Setup.X.Y.Z.exe` to GitHub Release
   - Triggers Railway cloud deploy
   - Updates landing page download URL via PR

### Post-release
1. Verify landing page at `https://keledon.tuyoisaza.com` shows new version
2. Smoke-test install on a clean Windows machine
3. Update `boulder.json` `session_state.last_completed`

---

## Branch Lifecycle

Governed by `.sisyphus/docs/branch-governance.md`.
Remote stale branch cleanup: run `.sisyphus/scripts/prune-remote-branches.sh` monthly.

---

## Secrets Required

| Secret | Purpose | Where to set |
|--------|---------|-------------|
| `GITHUB_TOKEN` | Auto-provided by Actions | GitHub Actions |
| `RAILWAY_DEPLOY_HOOK` | Triggers Railway cloud deploy | GitHub Repo Secrets |
| `AZURE_TENANT_ID` | Code signing (future) | GitHub Repo Secrets |
| `AZURE_CLIENT_ID` | Code signing (future) | GitHub Repo Secrets |
| `AZURE_CLIENT_SECRET` | Code signing (future) | GitHub Repo Secrets |
| `AZURE_ENDPOINT_URL` | Code signing (future) | GitHub Repo Secrets |
| `AZURE_CODE_SIGNING_NAME` | Code signing (future) | GitHub Repo Secrets |
| `AZURE_CERT_PROFILE_NAME` | Code signing (future) | GitHub Repo Secrets |

### Repository Variables

| Variable | Value | Effect |
|----------|-------|--------|
| `REQUIRE_SIGNING` | `true` / `false` | Gates unsigned builds in CI |

---

## Cross-references

- Architecture spec: `docs/specs/v3_KELEDON_CANON.md`
- Branch policy: `.sisyphus/docs/branch-governance.md`
- Signing policy: `.sisyphus/docs/windows-signing-policy.md`
- E2E runbook: `.sisyphus/docs/e2e-testing-runbook.md`
- Task queue: `.sisyphus/boulder.json`
