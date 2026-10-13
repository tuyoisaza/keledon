# SEO audit — current source candidate

Run: `20261012-keledon-four-fronts` · Revalidated: 2026-10-13 · PHDK 2.50.8 · Candidate 5.1.0, branch SHA `82121189cdf8423f2e7f2cc4bd32c48949e63eb9`. This is source review plus local production-SPA UAT; no external crawler, Search Console, live deployment, provider, paid model, or database was used. The canonical host is taken from source and has not been verified live.

Scope is the public `/` page. Login and authenticated application routes are excluded from search discovery. The site is a React SPA: the server HTML contains a short description and noscript note, while most public content is client-rendered. There are no locale-specific public URLs or hreflang declarations.

Findings and status:
- SEO-F01 — SOURCE FIXED. Nginx exact `/` emits `X-Robots-Tag: index, follow`. Other SPA fallbacks emit `noindex, nofollow`. `robots.txt` lets crawlers request private UI shells so they can see those headers; `/api/` remains disallowed. This is discoverability guidance, not authorization. Live deployed headers remain unverified.
- SEO-F02 — CLOSED IN SOURCE. Product copy qualifies capabilities as client-configured and requires compatibility validation; examples are not represented as proven integrations or regulated outcomes.
- SEO-F03 — CLOSED IN SOURCE. CTA links resolve to `/login` and `#architecture`; footer placeholder legal/social links are removed. No unsupported sales destination is claimed.
- SEO-F04 — OPEN / UNMEASURED. Important content depends on client rendering. No crawler render or indexation check was run; no SSR/SSG readiness is claimed.

`services/web` typecheck, lint, production build, and local production-SPA UAT pass. UAT is synthetic and does not establish live indexation. LCP/INP/CLS, mobile interaction, HTTPS/status/redirects, external indexing, Search Console, backlinks, rankings, rich results, and traffic are not measured. Initial audit snapshots remain in the lifecycle folder as historical evidence.

Stage outcome: source remediation passes for F01–F03. Deployment/runtime SEO remains unverified; F04 and external measurements remain open.
