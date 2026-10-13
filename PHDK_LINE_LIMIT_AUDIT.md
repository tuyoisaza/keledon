# PHDK physical line limit audit

Date: 2026-10-13. Candidate: 5.1.0. Rule: all tracked application source files remain below 600 physical lines, including blank lines. Inventory extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.mjs`, `.cjs`, `.vue`; generated, dependency and Git directories are excluded.

The prior audit counted only tracked files at that snapshot and missed one current Cloud source file at 612 lines. The flow-normalization types/helper now live in `cloud/src/services/decision-engine.flow-types.ts`, reducing `decision-engine.methods.ts` below the limit without changing its call contract. Fresh post-edit inventory: **0 source files at or above 600 lines**. Check remains partial for other findings even though the line-limit criterion passes.
