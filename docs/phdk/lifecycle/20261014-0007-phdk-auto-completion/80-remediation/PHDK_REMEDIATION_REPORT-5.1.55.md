# Remediation report — candidate 5.1.55

## Finding

After PR #148 delivered the 490-row capability matrix, the separate narrative model-to-surface table had been changed from three columns to the wider CRUD row shape. The matrix inventory test asserted model names but not this table's column contract, so the corruption escaped regression 33.

## Correction

Restored the narrative model table from the pre-matrix source shape and preserved source-backed updates for CompanyCountry, ManagedInterface, Flow/FlowStep runtime, SubAgent/SubAgentRun, Event, FeatureFlag and DebugMode. Regression 33 now requires its three-column header, exactly three cells per row, unique inventory names, and exact 35-model parity. The existing 490 unique capability tuples and selected authorization assertions remain checked.

## Verification and limits

Regression 33 passes: 35/35 schema models, 490 model-role-surface rows, 168 established resource rows, and 35 correctly shaped narrative rows. PHDK coherence passes 52/52; version roots align at 5.1.55. No product runtime behavior changed. Database persistence/migration, role-session UAT, and other project acceptance remain open; no DB, provider, customer data or deployment was used.
