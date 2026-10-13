# UX/UI remediation report — KELEDON 5.1.12

`UX-001` P1 is fixed in `ca34792`. The light and corporate palette selectors now assign the already-defined semantic colors to descendant controls in both Web and Landing CSS. Exact descendant token and rendered-button-color assertions prevent regression; a post-fix Edge run reports no visible login-text contrast failures in light, corporate or dark themes.

Screenshots: `../50-uat/uat-login-corporate-before-v5112.png` (before), `../50-uat/uat-login-corporate.png` (after), and corresponding light/dark captures. This does not certify other routes or replace manual screen-reader/real zoom acceptance.
