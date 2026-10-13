# Management users — current-candidate UAT Fix retest

Date: 2026-10-13 America/Mexico_City  
Candidate: `74c849effa6ecb1c9e33790e2387a70c4afa4079`  
Environment: local Vite page with a temporary harness, in-memory synthetic Company Co fixtures, and a fetch stub for `/api/crud/*`. No backend, database, live account, email, provider, or customer data was contacted. Test identity used `manager@company-co.invalid`.

## Journeys and results

1. **Company Co admin creates a user.** Opened the rendered Add User form. The company is displayed as Company Co; role selector is absent; company is not a selectable input. Brand options contain Company Co only; the other-tenant brand/team do not appear. Selected Company Co brand/team and submitted the form to the in-memory stub.
2. **Payload scope.** Captured POST `/api/crud/users` body: `{"name":"Synthetic Manager Test","email":"synthetic.manager@company-co.invalid","teamId":"team-fixture-co"}`. It contains neither `role`, `companyId`, nor `brandId`.
3. **Superadmin positive control.** Replayed the form with a synthetic superadmin context. Company selection and the role selector were visible, including the existing role options. No request was submitted in this control.

Result: **PASS for current-candidate UI restriction and payload shape.** This does not establish real API persistence, backend authorization, or complete CRUD acceptance; those remain covered only to the extent recorded by the isolated Cloud regression suites and are still incomplete across the full matrix. The temporary harness and route were removed after the browser retest.
