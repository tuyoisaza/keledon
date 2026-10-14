# RBAC test setup — retired

The legacy setup described PepsiCo/Stellantis sample tenants and named email accounts, then instructed operators to run SQL scripts that inserted those records and assigned privileged roles. Those scripts now fail closed and must not be used against any database.

Use the current API/Cloud isolated regression suites with synthetic in-memory fixtures to validate role and tenant boundaries. New accounts start as `user`; an existing current-DB superadmin assigns elevated roles and company scope through the authenticated management API. Do not seed customer data, passwords, or elevated roles through SQL fixtures.
