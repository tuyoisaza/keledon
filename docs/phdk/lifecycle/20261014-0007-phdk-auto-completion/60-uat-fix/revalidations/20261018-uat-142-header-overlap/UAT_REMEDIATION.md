# UAT remediation — login header overlap found by UAT-142 (2026-10-18)

UAT-142 on deployed 5.2.11 confirms the prior touch-target repair: brand link, email, password and signup toggle each measured 44 px high, with no horizontal overflow at 320×720. The same production capture found a second visible issue: the fixed header ends at y=156 while the login heading spans y=126.7–158.7, producing 29.3 px of overlap.

The scoped source repair is KELEDON 5.2.12 candidate `pt-40` on the login main content (from `pt-24`). No application tests/build/lint are run locally. UAT-145 remains pending deployment and must verify separation, retained target size, and no horizontal overflow on production without activating authentication actions.
