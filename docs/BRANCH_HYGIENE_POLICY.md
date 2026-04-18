# KELEDON Branch Hygiene Policy

## Purpose
Establish guidelines for branch lifecycle management to reduce clutter and improve repository governance.

## Archive Criteria
A branch should be archived when ANY of the following is true:
- Branch has been merged to main (confirmed via GitHub merge commit)
- Branch has had no activity for 30+ days
- Branch represents completed work that is superseded by newer work

## Archive Naming Convention
Archived branches are prefixed with `archive/`:
- `archive/BRANCHNAME` - for branches from completed work

## Branch Categories

### Active Branches (never archive)
- `main` - primary release branch
- `phaseN/*` - active phase branches in progress
- `agent/*` - active agent work branches
- `feat/*` - feature branches actively being developed
- `bk/*` - work branches behind main

### Candidates for Periodic Review (quarterly)
- `backup/*` - old backup branches
- `infra/*` - infrastructure branches (review for completion)
- `housekeeping/*` - housekeeping branches (review for completion)

## Exceptions
To request an exception to archive:
1. Create an issue with tag `branch-exception`
2. Explain why the branch must remain active
3. Get approval from Prometheus (planner)

## Automation Script
See `.sisyphus/scripts/archive-branches.sh` for automated archiving.

## Last Updated
- 2026-04-17

## Archive History
| Date | Branches Archived | Action |
|------|----------------|--------|
| 2026-04-17 | MAIN-BK-20260206-0316, MAIN-BK-20260206-0317, MAIN-BK-20260209-0704, MAIN-BK-20260209-CANON, MAIN_PHASE2_BK_20260205 | Renamed to archive/* |