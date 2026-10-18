# UAT retest report — 2026-10-18

**Status: BLOCKED_PENDING_DEPLOYMENT.** Source remediation for UAT-141 is present in PR #259 and passed assistant static review. Exact candidate head: `293532e3404f84a08725a0662acd56bf42543184`; product version 5.2.11. The real production site served v5.2.10 during the latest UAT entry, so candidate behavior could not be retested yet.

| Check | Result |
|---|---|
| Repair source maps to four measured defects | PASS by source review |
| Login/role/security contract unchanged | PASS by reviewed diff |
| Production version equals candidate | FAIL/BLOCKED — production still v5.2.10 |
| UAT-142 44×44 geometry and no-overflow | NOT RUN — wait for actual deploy |
| Local app tests/build/lint | NOT RUN — owner restriction |

Required retest: anonymous production `/login`, 320×720 CSS px, inspect home link, email/password and signup toggle geometry, no horizontal overflow, visible actual product version 5.2.11. Preserve UAT-141 baseline as historical evidence. No login, signup, OAuth, form data or production mutation.
