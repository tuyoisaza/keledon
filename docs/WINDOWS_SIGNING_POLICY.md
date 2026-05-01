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
See `.github/workflows/release.yml` for CI integration. The signing step runs via
`azure/trusted-signing-action@v0.3.20` and is gated on `AZURE_SIGNING_ENABLED=true`.

---

## Setup Checklist (one-time, manual steps)

### 1. Azure Resource Provisioning (Azure Portal)

```
Portal: portal.azure.com → search "Trusted Signing"
```

1. Create a **Trusted Signing Account**:
   - Resource group: `keledon-signing` (or existing RG)
   - Name: `keledon-signing` (becomes the endpoint subdomain)
   - Region: `East US` (Trusted Signing is region-specific)
   - SKU: `Basic` ($9.99/month)

2. Create a **Certificate Profile** inside the account:
   - Profile type: `Private Trust` (for internal/distribution) or `Public Trust` (for public)
   - Profile name: `keledon-browser`
   - For Public Trust: identity verification required (upload EV-style docs to Microsoft)

3. Create an **App Registration** (service principal for CI):
   - Azure Active Directory → App Registrations → New
   - Name: `keledon-ci-signer`
   - Note the **Tenant ID**, **Client ID**
   - Certificates & secrets → New client secret → copy the value immediately

4. Assign the signing role:
   - Navigate to the Trusted Signing Account → Access control (IAM)
   - Add role assignment → `Trusted Signing Certificate Profile Signer`
   - Assign to the `keledon-ci-signer` service principal

5. Get the **Endpoint URL**:
   - Trusted Signing Account → Overview → Endpoint URL
   - Format: `https://<account-name>.codesigning.azure.net/`

### 2. GitHub Secrets (repo Settings → Secrets and variables → Actions)

| Secret | Value |
|--------|-------|
| `AZURE_TENANT_ID` | Directory (tenant) ID from App Registration |
| `AZURE_CLIENT_ID` | Application (client) ID from App Registration |
| `AZURE_CLIENT_SECRET` | Client secret value (created in step 3 above) |
| `AZURE_SIGNING_ENDPOINT` | Endpoint URL from step 5 (e.g. `https://keledon-signing.codesigning.azure.net/`) |
| `AZURE_SIGNING_ACCOUNT` | Trusted Signing Account name (e.g. `keledon-signing`) |
| `AZURE_SIGNING_PROFILE` | Certificate Profile name (e.g. `keledon-browser`) |

### 3. GitHub Repository Variable (Settings → Variables → Actions)

| Variable | Value |
|----------|-------|
| `AZURE_SIGNING_ENABLED` | `true` |
| `REQUIRE_SIGNING` | `true` (optional — blocks release if signing fails) |

Once `AZURE_SIGNING_ENABLED=true` is set, every `v*` tag push will sign the NSIS
installer before verifying and uploading.

---

## Gating Rules
1. CI build MUST fail if binaries are unsigned (when `REQUIRE_SIGNING=true`)
2. Release artifacts MUST be signed before publish (enforced via gate order in release.yml)
3. Signing verification runs in CI with `Get-AuthenticodeSignature` output

## Last Updated
- 2026-05-01
