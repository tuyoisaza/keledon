name: ia-development-standards
description: |
  Development standards for all software projects - enforces real data only (no mocks/demos),
  established tech stack (Next.js + TypeScript + Tailwind + Prisma ORM + Auth.js), 
  SQLite to Postgres migration via config only, multilingual support (EN/ES/PT),
  admin panel with Google OAuth and RBAC, debug mode with DB flag, proper URL routing,
  file/function limits, versioned commits (vMAJOR.MINOR.PATCH), auto-deploy from hosting.
  Apply to ALL development tasks without exception.

triggers:
  - "*"  # Always active

instructions: |
  # Reglas Maestras de Desarrollo con IA

  This skill applies to EVERY development task performed for the user. No exceptions.

  ---

  ## 1. VERDAD OPERATIVA
  - NO fake data, simulated metrics, decorative dashboards, placeholders, or random numbers
  - Every feature must be real and functional from day one
  - Empty states must be honest: show "No data yet" not fake sample data
  - If data doesn't exist, show empty state with clear call-to-action

  ---

  ## 2. TECH STACK ESTABLECIDO ANTES
  Before coding, define:
  - Framework: Next.js App Router
  - Language: TypeScript (strict mode)
  - Styling: Tailwind CSS + shadcn/ui
  - ORM: Prisma
  - Auth: Auth.js / NextAuth with Google provider
  - Hosting: Railway (auto-deploy on push to main)
  - Database: SQLite (dev) → PostgreSQL (prod) via config only

  ---

  ## 3. ORM OBLIGATORIO
  - Use Prisma for ALL database operations
  - NEVER write raw SQL unless absolutely necessary
  - SQLite to PostgreSQL migration = change DATABASE_URL only
  - NO code changes required for database provider switch
  - Schema changes via `prisma db push --accept-data-loss`

  ---

  ## 4. I18N DESDE EL INICIO
  - Support: ES (default), EN, PT minimum
  - Store texts in locale dictionaries: `/locales/es.json`, `/locales/en.json`, `/locales/pt.json`
  - NEVER use AI/OpenAI to translate UI strings
  - Detect locale: user preference → default → EN fallback
  - All user-facing text must use translation keys, never hardcoded strings

  ---

  ## 5. MULTILINGÜE SIEMPRE
  - Language switch without page reload using React context
  - Future languages: add new locale file, no component changes
  - Use `useTranslation()` hook from next-intl or similar
  - Locale-aware: dates, numbers, currencies

  ---

  ## 6. ADMIN SIEMPRE
  Every app needs admin section with:
  - User management (list, create, edit, deactivate)
  - Role management: super_admin, admin, team_leader, member
  - System status dashboard
  - Debug controls
  - Audit trail (who did what, when)
  - Feature flags visibility and control
  - Google OAuth integration for admin access

  ---

  ## 7. GOOGLE LOGIN
  - Auth.js / NextAuth with Google as default provider
  - Roles persisted in database, NOT in JWT only
  - Session must fetch role from DB on each request
  - Google OAuth configured via environment variables

  ---

  ## 8. RBAC SERVER-SIDE
  - Validate permissions in API routes, NOT just UI
  - Every admin mutation must check user role
  - Use middleware for protected routes
  - Return 403 Forbidden for unauthorized actions

  ---

  ## 9. DEBUG MODE
  - When activated by super_admin: write flag to DB with timestamp and user
  - ALL functions check this flag and become verbose when active
  - Enrich logs with correlation IDs (request tracing)
  - Debug mode auto-expires (configurable, default 4 hours)
  - Activation/deactivation logged in audit trail

  ---

  ## 10. OBSERVABILIDAD
  - Structured logging: JSON format with level, timestamp, context
  - Error capture: Sentry or equivalent
  - Request IDs for tracing across services
  - Feature-specific logging modules
  - Log levels: error, warn, info, debug

  ---

  ## 11. COPY DEBUG REPORT
  One-click copy of technical report containing:
  - Project name
  - Version (vMAJOR.MINOR.PATCH)
  - Git SHA (short)
  - Build timestamp UTC
  - User info (ID, email, role)
  - Current locale
  - Route/page
  - Recent errors (sanitized)
  - Logs (sanitized, no secrets)
  - Format: Plain text + JSON copy

  ---

  ## 12. VERSIONADO
  - Semantic versioning: vMAJOR.MINOR.PATCH
  - Git SHA (7 chars) injected at build time
  - Build timestamp UTC
  - Displayed in: login page, main app, admin panel
  - Each commit starts with version number: `v0.1.0: description`

  ---

  ## 13. ROUTING REAL
  - Each major feature = its own route
  - Examples: /admin/users, /admin/roles, /settings/profile, /flows, /knowledge
  - NO hash fragments (#/admin)
  - NO hiding features in modals without URL
  - Use Next.js App Router conventions

  ---

  ## 14. LÍMITES
  - Files: max 600 lines (target 300)
  - Functions: single responsibility, clear names
  - Comments: explain WHY, not WHAT
  - Include version in file header comments

  ---

  ## 15. ESTRUCTURA ORDENADA
  Each feature in its own module:
  ```
  features/
    users/
      routes.ts      # API routes
      page.tsx      # UI
      service.ts    # Business logic
      repository.ts  # Data access
      schema.ts     # Validation
      permissions.ts # RBAC rules
      test.ts       # Tests
      logger.ts     # Feature logging
  ```

  ---

  ## 16. IA COMO SUBSISTEMA
  If AI is used:
  - Prompts versioned in repo (/prompts/v1/)
  - Output validation before use
  - AI observability: model, latency, cost, errors
  - Safety: NO irreversible decisions without confirmation
  - Log all AI interactions

  ---

  ## 17. GIT FLOW
  - Branch: `feature/<nombre>` for development
  - Test locally before merge
  - Merge to `main` to trigger auto-deploy
  - NO `railway up` or similar CLI deploys
  - Railway/Render/Vercel auto-deploys on push

  ---

  ## 18. COMMITS CON VERSIÓN
  Every commit message starts with version:
  ```
  v0.1.0: add user management
  v0.1.1: fix role validation bug
  v0.2.0: add flow execution system
  ```

  ---

  ## 19. FEATURE FLAGS
  - Visible in admin panel
  - Scope: global, tenant, user
  - Fields: name, enabled, scope, created_at, expires_at
  - Used for gradual rollouts and kill switches

  ---

  ## 20. DECISION LAYER
  For decision support systems, register:
  - What decision was made
  - Who made it
  - Context and hypothesis
  - Signals/evidence used
  - Result and outcome
  - Audit trail for compliance

  ---

  ## 21. SEGURIDAD
  - NEVER log secrets, API keys, passwords
  - PII minimized in logs
  - Stack traces sanitized in reports
  - Environment variables for all secrets
  - No secrets in code

  ---

  ## 22. NO MOCKUPS NI DEMOS
  - All code must be real and functional
  - Connected to real data or honest empty states
  - No "coming soon" or "demo mode"
  - Every button works, every form submits

  ---

  ## 23. CHECKLIST PRE-PROJECT
  Before starting ANY project, confirm:
  - [ ] Project name
  - [ ] Logo/brand assets
  - [ ] Primary objective
  - [ ] Default locale
  - [ ] Supported locales (ES/EN/PT minimum)
  - [ ] ORM choice (Prisma)
  - [ ] Auth provider (Google OAuth)
  - [ ] Role matrix defined
  - [ ] Hosting platform (Railway)
  - [ ] Versioning scheme (vMAJOR.MINOR.PATCH)
  - [ ] Debug policy
  - [ ] Audit rules
  - [ ] AI scope (if used)
  - [ ] Initial routes
  - [ ] Critical decisions to support

  ---

  ## ENFORCEMENT

  When working on any task:
  1. Read this skill first
  2. Check if any checklist items are missing - ASK if unclear
  3. Follow tech stack exactly
  4. Use Prisma for all DB operations
  5. Implement i18n from first component
  6. Add admin section if missing
  7. Use versioned commits
  8. Test locally before reporting completion
  9. Push to main for auto-deploy

  VIOLATIONS OF THESE RULES REQUIRE IMMEDIATE FIX.
