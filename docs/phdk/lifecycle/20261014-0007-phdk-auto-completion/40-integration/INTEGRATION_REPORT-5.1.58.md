# Integration review — candidate 5.1.58

## Scope

The Cloud device path was weaker than the API counterpart in three places: a repeated machine registration returned an existing device across actor/tenant boundaries; actors without a company could register a pending device; and pairing did not recheck stored binding or atomically consume the still-valid proof. Its public controller also exposed exception text. This slice aligns those Cloud paths to the established API contract.

## Contract changes

- Registration retries succeed only when persisted user and company match the authenticated DB actor and tenant.
- The guard denies registration when the authenticated actor has no company.
- Pairing requires stored user, company and Keledon bindings.
- The update predicate requires the same device, `pending` status, matching code and unexpired deadline, preventing stale/concurrent proof reuse.
- Public pairing failures return a generic error.

## Validation

- Cloud regression 21 covers registration binding, missing tenant, pairing prerequisites and conditional single-use proof.
- Cloud regression 42 covers public error redaction.
- API regression 21 retains the established binding behavior; regression 33 maps UAT-047 to the Device API rows while retaining BLOCKED status.
- Full API/Cloud regressions, five builds, PHDK coherence, version alignment and diff check are recorded in the candidate check report.

UAT-047 is source-level only. No DB, physical device or live pairing was used. Persisted and native acceptance remain open; whole Auto is still PARTIALLY DELIVERED.
