# KELEDON Windows Code Signing Policy

## Decision: Azure Trusted Signing

**Recommendation**: Azure Trusted Signing (Azure Artifact Signing)

### Cost Comparison
| Option | Cost | Notes |
|--------|------|-------|
| Azure Trusted Signing | $9.99/month | Unlimited signing, FIPS 140-2 Level 3 HSM |
| OV Certificate | $200-500/year | Requires identity verification, key management |
| EV Certificate | $400-700/year | Required hardware token, higher SmartScreen trust |

### Why Azure Trusted Signing
1. **Cost-effective**: $9.99/month vs $400-700/year for EV
2. **Zero key management**: Keys stored in Azure HSM, auto-renewed daily
3. **Fast signing**: <2 seconds per file
4. **Simple workflow**: CLI-based, CI/CD integrable

### SmartScreen Consideration
- New certificates start at zero reputation (both Azure and traditional)
- Reputation builds within days of real user installs
- Microsoft has been phasing out EV SmartScreen distinction

### Implementation Pipeline
See `.github/workflows/release.yml` for CI gating.

## Gating Rules
1. CI build MUST fail if binaries are unsigned
2. Release artifacts MUST be signed before publish
3. Signing verification runs in CI with `--verbose` output

## Last Updated
- 2026-04-17