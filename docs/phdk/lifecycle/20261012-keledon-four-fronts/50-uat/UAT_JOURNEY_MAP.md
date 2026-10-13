# Journey map
Anonymous → home → login → diagnostics copy → safe reset → responsive/theme checks.
Admin → `/management/debug` (overlay absent on the dedicated route) → debug off/no read → explicit toggle/on/one deep read → explicit safe endpoint click → sanitized result/correlation → debug off/clear. All API responses are intercepted; no live diagnostic request is sent.
Superadmin/admin/coordinator → synthetic authorized company list → detail dialog → Tab/Escape/opener → collapsed navigation. Superadmin additionally opens create form. Admin → provider settings → blank key input → replacement save → cleared field → subsequent blank omission. Guest → attempted management → safe home redirect.
Runtime: authenticated configured client → answer → transcript → managed cloud decision → scoped browser execution/assertion → CRM result → successful close → standby. This path uses actual handlers and fake executor; live client platform selection is excluded. Failures branch to explicit error/cancellation, never a simulated successful close.

Diagnostics access: anonymous → `/api/crud/health` → 401; ordinary user → same route → 403; superadmin actor resolved from an isolated Prisma fixture → safe summary → hostname only, with no raw error strings or URL path/query. Exercised by isolated Nest HTTP wiring and service disclosure regressions; no live database is implied.
