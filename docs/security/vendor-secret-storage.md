# Vendor credential storage

Vendor usernames, passwords, and API keys are encrypted at rest by the API and
Cloud CRUD services using AES-256-GCM. Each value has a random nonce and an
authenticated, versioned envelope. Device pairing uses a separate purpose key
and envelope. Normal vendor CRUD responses mask usernames and expose only
whether a password or API key exists.

Every production API and Cloud deployment must set the same
`KELEDON_VENDOR_KEY` to a high-entropy secret. Losing or changing this key makes
stored vendor credentials and newly paired credentials unreadable. The key is
never returned by API responses. Non-production retains the legacy development
key for local compatibility only.

Existing rows may still contain plaintext or legacy CBC values. From
`services/api`, the command builds the API crypto module, then runs a dry run;
review its row count before considering `--apply`:

```powershell
$env:KELEDON_VENDOR_KEY = '<configured key from the deployment secret store>'
npm run migrate:vendor-secrets
```

The migration never displays values. It writes nothing unless passed `--apply`:

```powershell
npm run migrate:vendor-secrets -- --apply
```

Run this with an operator-selected database connection after taking the
customer-approved backup and coordinating the same key across API and Cloud.
The script uses compare-and-update predicates to avoid overwriting a vendor row
that changed during the migration. A concurrent change is reported and can be
reviewed by rerunning the dry run. This repository change does not run the
migration against any database.

Legacy CBC is accepted only to preserve existing data and already paired
devices during rollout. New at-rest values and pairing payloads use authenticated
AES-GCM envelopes.
