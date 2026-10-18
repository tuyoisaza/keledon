# Source integration review — 5.2.15 interface catalog

## Outcome

The source change adds the missing superadmin catalog surface recorded by ADM-CAT while preserving the approved multi-tenant boundary. It does not grant catalog writes to tenant roles, transfer ownership during edits, return credential values or contact a configured system. Review is **PASS for source integration, NOT YET production accepted**. Product release/deployment and authenticated UAT remain outstanding.

## Authorization and ownership

- `/admin/interfaces` is a separately protected `superadmin` route. The link is visible only to the platform admin in `/admin/settings`.
- The API's existing `CrudAccessGuard` allows interface mutations only to superadmin. Admin/coordinator remain restricted to company-filtered reads and the existing same-company team assignment path.
- Create now requires a nonempty ID for an existing company; a new global/null-owned catalog record cannot be created. Edit does not accept `companyId`, and legacy null-owned records remain unassigned.
- The form warns before delete that team assignments are also removed. No deletion was performed during development.

## Input, destination and secret handling

- The API rejects unknown interface fields and invalid types/lengths, even when bypassing the Web form. `normalizeVendorBaseUrl` enforces canonical HTTP(S), no userinfo, query or fragment, and bounded URL length. It performs no DNS lookup or connection; private destination ownership/socket safety remains the separate CMT-003B contract.
- Credentials are optional. An edit starts with an empty secret field; blank means retain current value. Server storage uses the existing AES-GCM `KELEDON_VENDOR_KEY` encryption path. Tenant list/detail/team-assignment projections omit the private base URL and expose only `hasCredentials`; platform-superadmin catalog projections include the URL for maintenance.
- Audit payload redaction now covers credential-like names and URL/origin/hostname/host/CIDR/IP fields, so private destinations do not get copied into generic CRUD change JSON. The table displays the configured base URL only to platform superadmins.

## UX and localization

- The catalog has loading, empty, error and save/delete feedback states, accessible table caption/headers, named controls, 44px action targets and mobile overflow containment.
- Added ES/EN/PT catalog copy. No translation test, frontend build, API test, or application lint was run locally under the production-only owner restriction.

## Verification still required

- Static verification passed: all edited JSON catalogs/manifests parse; five package/lock pairs and Browser renderer match 5.2.15; Web locales have identical 1,082-key trees; PHDK coherence passes 66/66; `git diff --check` passes. Application tests, builds and lint were not run locally under the explicit owner restriction.
- Normal PR merge, Railway Web/API deployment and exact production version readback are not yet complete.
- Authenticated superadmin create/edit/delete, tenant-role write denial, persistence, audit redaction and write-only secret behavior require the approved synthetic production identities/session. Do not use a real credential or private CRM endpoint as test data.
- CMT-003B remains partial: format validation does not bind DNS to a socket or validate redirects at connection time. PHDK candidate 5.2.15 cannot claim those protections.
