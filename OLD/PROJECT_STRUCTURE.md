# Project File Structure (2026-01-22)

```
Keldon/
├─ .agent/                     # Agent configuration & workflows
│   └─ workflows/…            # Markdown workflow definitions
├─ .gitignore                 # Git ignore patterns
├─ ARCHITECTURE.md            # System architecture overview
├─ CONTRACTS.md               # Service contracts & SLAs
├─ FEATURES.md                # Feature list and status
├─ FLOWS.md                   # User flow diagrams
├─ README.md                  # Project overview and setup guide
├─ STAGE_1_DEVELOPMENT_LIST.md# Development checklist for stage 1
├─ Briefs V0/                 # Early design briefs (3 items)
├─ Briefs V1/                 # Current brief version (6 items)
├─ agent/                     # Core agent implementation
│   └─ skills/                # Skill definitions (e.g., auto‑dev‑keledon)
├─ cloud/                     # Backend services (NestJS, Supabase)
│   ├─ migrations/            # SQL migration scripts
│   └─ src/…                  # Backend modules (KnowledgeModule, etc.)
├─ dev-restart.bat            # Script to kill zombie processes & restart services
├─ investigate/               # Experimental sandbox code (7 items)
├─ keledon-extension/         # Chrome extension source for RPA recording
├─ landing/                   # Front‑end React application
│   ├─ src/
│   │   ├─ context/
│   │   │   └─ AuthContext.tsx   # Supabase auth, role handling, impersonation
│   │   ├─ components/           # Re‑usable UI components (Sidebar, SuperAdminPage, etc.)
│   │   ├─ pages/                # Route pages (Login, Knowledge, Admin, etc.)
│   │   └─ styles/               # Global CSS, design tokens, dark‑mode theming
│   ├─ public/                 # Static assets (icons, images)
│   └─ vite.config.ts          # Vite build configuration
├─ node_modules/              # npm dependencies
├─ package.json                # Project metadata & scripts
├─ package-lock.json           # Exact npm package versions
└─ scripts/                    # Utility scripts (seed‑and‑test.js, simulate‑extension.js)
```

*Generated on 2026‑01‑22.*
