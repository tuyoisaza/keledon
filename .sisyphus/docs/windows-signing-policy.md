# KELEDON Windows Code Signing Policy

**Owner:** Engineering / Release
**Effective:** 2026-04-19
**Status:** DRAFT — implementation pending certificate procurement

---

## Decision: Azure Trusted Signing

**Selected:** Azure Trusted Signing (ATS)
**Rejected:** Traditional EV certificate

### Rationale

| Criterion | Azure Trusted Signing | EV Certificate |
|-----------|----------------------|----------------|
| Cost | ~$10/month (pay-per-use) | $300–700/year |
| Turnaround | Hours (cloud HSM) | Days–weeks (hardware token) |
| CI/CD integration | Native via Azure CLI | Complex (USB HSM on GitHub Actions) |
| SmartScreen reputation | Immediate (Microsoft-backed) | Builds over time |
| Key storage | Microsoft managed HSM | Physical USB token |

---

## Certificate Profile

- **Type:** Azure Trusted Signing (Standard / Public Trust)
- **Subject CN:** `KELEDON` (or legal entity name)
- **Azure Tenant:** configured via `AZURE_TENANT_ID` secret
- **Time-stamping:** RFC 3161 via `http://timestamp.acs.microsoft.com`

---

## CI Gating Rules

### Gate behavior

| Condition | `REQUIRE_SIGNING` var | Result |
|-----------|----------------------|--------|
| Signed + valid | any | Release proceeds |
| Unsigned | `false` (default) | Warning, proceeds |
| Unsigned | `true` | Build fails |

Set `REQUIRE_SIGNING=true` in GitHub Repository Variables once the certificate is active.

### Enabling signing in release.yml

Add to `build-browser` job env:
```yaml
env:
  AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
  AZURE_ENDPOINT_URL: ${{ secrets.AZURE_ENDPOINT_URL }}
  AZURE_CODE_SIGNING_NAME: ${{ secrets.AZURE_CODE_SIGNING_NAME }}
  AZURE_CERT_PROFILE_NAME: ${{ secrets.AZURE_CERT_PROFILE_NAME }}
```

And add to `electron-builder` config (`browser/package.json`):
```json
"win": {
  "signingHashAlgorithms": ["sha256"],
  "sign": "./scripts/sign.js"
}
```

### `browser/scripts/sign.js` (to be created)
```js
const { execSync } = require('child_process');
module.exports = async (config) => {
  // Azure Trusted Signing via azuresigntool
  execSync(
    `azuresigntool sign -kvu $AZURE_ENDPOINT_URL -kvi $AZURE_CLIENT_ID ` +
    `-kvs $AZURE_CLIENT_SECRET -kvt $AZURE_TENANT_ID ` +
    `-kvc $AZURE_CERT_PROFILE_NAME -tr http://timestamp.acs.microsoft.com ` +
    `-v "${config.path}"`,
    { stdio: 'inherit' }
  );
};
```

---

## Implementation Checklist

- [ ] Create Azure subscription / resource group for code signing
- [ ] Provision Azure Trusted Signing account + certificate profile
- [ ] Add secrets to GitHub repo: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_ENDPOINT_URL`, `AZURE_CODE_SIGNING_NAME`, `AZURE_CERT_PROFILE_NAME`
- [ ] Create `browser/scripts/sign.js`
- [ ] Install `azuresigntool` on CI runner (add to release.yml)
- [ ] Set `REQUIRE_SIGNING=true` in GitHub Repository Variables
- [ ] Test with a pre-release tag (`v0.x.y-rc1`)

---

## References

- [Azure Trusted Signing docs](https://learn.microsoft.com/en-us/azure/trusted-signing/)
- [AzureSignTool](https://github.com/vcsjones/AzureSignTool)
- [electron-builder code signing](https://www.electron.build/code-signing)
