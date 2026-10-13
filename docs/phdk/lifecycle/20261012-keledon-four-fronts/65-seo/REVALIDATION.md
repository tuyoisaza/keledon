# SEO source revalidation checkpoint

Revalidated 2026-10-13. Nginx source now marks only `/` indexable and sends `noindex, nofollow` for other SPA routes; robots permits crawling those shells while keeping `/api/` disallowed. The CTA links resolve to `/login` and `#architecture`. Source findings F01–F03 are closed. Local production-SPA UAT passed 10/10. No live deployment, HTTP header, crawler, Search Console, or indexation test was run; the public page remains client-rendered. SEO is source-remediated, not a live-site pass.
