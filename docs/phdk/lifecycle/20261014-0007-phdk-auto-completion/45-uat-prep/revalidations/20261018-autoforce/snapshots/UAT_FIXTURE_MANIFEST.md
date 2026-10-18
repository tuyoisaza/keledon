# UAT Fixture Manifest — KELEDON

## Production authorization scope — 2026-10-17 / candidate 5.2.7

- Source: `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; PHDK 2.53.1; documentation main entering this record `7c9ad9accd74a11c6049949fa9f0d52927e6a34c`.
- Owner-approved planned scope from `PIA-CMT-003C`: two temporary isolated synthetic tenants, one ordinary non-privileged user and device per tenant, one no-PII flow. Intended prefix: `phdk-auto-uat-20261017`; cleanup immediately after acceptance, with 24 hours as a proposed hard maximum.
- Status: **AUTHORIZED SCOPE / NOT PROVISIONED**. No production records, users, devices, flows or secrets were created. A first-party audited production provision/cleanup path and authenticated admin session are unavailable/unverified.
- Excluded: superadmin/admin/coordinator fixtures, role elevation, invitations/email, real customer data, customer/provider calls, CRM credentials, private destinations and cloud metadata. Egress-positive UAT also requires a separately controlled synthetic DNS/CRM sandbox.
- The historical local fixture list below describes development-only seeder design and does not authorize production provisioning. The seeder remains restricted to loopback `keledon_phdk_uat` in development/test.

## Current candidate 5.2.1 revalidation (2026-10-17)

- Candidate revision: `ef6fe6dbf7eca04708c7200615e7538812751f7e`; PHDK 2.53.1.
- Fixture status remains NOT PROVISIONED. No synthetic account, tenant, interface assignment, credential, or database row was created.
- Production homepage reports v5.1.85, so it does not host this candidate. The production DB and real accounts remain excluded from the fixture manifest.
- Required next target: isolated loopback PostgreSQL `keledon_phdk_uat` with normal migrations and the guarded seeder; run cleanup verification afterward.

**Provisioning status:** seeder implemented but not executed. Target must be an isolated loopback PostgreSQL database named `keledon_phdk_uat`; no external database or live customer data is permitted. After applying API migrations, run `npm run uat:prep` with `KELEDON_UAT_PREP_CONFIRM=true`, `KELEDON_DEPLOYMENT_ENV=development`, `NODE_ENV=development`, and a loopback `DATABASE_URL`. Run `npm run uat:prep:cleanup` to remove only records that still match the PHDK-owned marker values. Append-only security audit events are retained. The script prints fixture IDs only; generated passwords/tokens remain in memory.

| Fixture | Stable ID / email | Tenant | Intended role | Status |
|---|---|---|---|---|
| Company Co | `phdk-uat-companyco` | Company Co | Tenant | BLOCKED: seed not executed |
| Other Co | `phdk-uat-otherco` | Other Co | Tenant | BLOCKED: seed not executed |
| Platform administrator | `phdk-uat-superadmin` / `uat-superadmin@companyco.example.invalid` | Platform | `superadmin` | BLOCKED: seed not executed |
| Tenant administrator | `phdk-uat-admin` / `uat-admin@companyco.example.invalid` | Company Co | `admin` | BLOCKED: seed not executed |
| Coordinator | `phdk-uat-coordinator` / `uat-coordinator@companyco.example.invalid` | Company Co | `coordinator` | BLOCKED: seed not executed |
| Agent | `phdk-uat-agent` / `uat-agent@companyco.example.invalid` | Company Co | `agent` | BLOCKED: seed not executed |
| Ordinary user | `phdk-uat-user` / `uat-user@companyco.example.invalid` | Company Co | `user` | BLOCKED: seed not executed |
| Foreign-tenant user | `phdk-uat-other-user` / `uat-user@otherco.example.invalid` | Other Co | `user` | BLOCKED: seed not executed |

No passwords, bearer tokens, password hashes, client secrets or browser state are stored here. The seed command and safe rollback/cleanup remain pending implementation and execution. Never adopt or mutate a matching row unless it carries the explicit PHDK UAT ownership marker.
