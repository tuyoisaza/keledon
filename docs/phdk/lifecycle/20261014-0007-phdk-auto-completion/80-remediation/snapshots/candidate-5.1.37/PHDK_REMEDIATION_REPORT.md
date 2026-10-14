# PHDK remediation — candidate 5.1.37

| Finding | Remediation | Validation | Status |
|---|---|---|---|
| API/Cloud CRUD controller input and actor context used broad untyped boundaries | Added mirrored request actor contracts and derived each body from the corresponding service method signature | API build/35 regressions; Cloud build/14 regressions; API/Cloud targeted guard parity | RESOLVED |
| Cloud retained a general audit-log mutation route/proxy absent from API | Removed route/proxy; append remains in trusted audit domain service | Cloud HTTP regression expects 404; API/Cloud parity test confirms absence | RESOLVED |
| Cloud duplicate session-data provider and TTS stream chunk typing | Removed duplicate provider; normalize string/Uint8Array chunks and reject unsupported chunk types | Cloud build, full 14-suite regression, full typed ESLint | RESOLVED |
| DB/persistence/native/deployed acceptance | Requires disposable DB, identity and native/deployed evidence | Not available in this review | OPEN / EXTERNAL |

Scoped remediation is complete; overall PHDK Auto remains PARTIALLY DELIVERED.
