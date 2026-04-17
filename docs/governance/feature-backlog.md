# KELEDON Cloud + Browser Feature Backlog

## Purpose
This document maps the current implementation state of each module against the KELEDON_V3 vision, identifying gaps and next actions.

## Cloud Modules

### 1. Health
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Health endpoint | ✅ Implemented | Enrich with service-level details | Add SLOs |
| Health controller | ✅ Implemented | — | — |
| Dashboard gateway | ✅ Implemented | — | — |

### 2. Prisma / Persistence
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Prisma schema | ✅ Implemented | Add migration tests | CI test |
| Session model | ✅ Implemented | — | — |
| Event model | ✅ Implemented | — | — |

### 3. Escalation
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Escalation model | ✅ Implemented | — | — |
| Escalation service | ✅ Implemented | — | — |
| Escalation controller | ✅ Implemented | — | Stats endpoint |
| Device gateway wiring | ✅ Implemented | — | — |

### 4. Session Persistence
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Session service | ✅ Implemented | — | — |
| Listening session service | ⚠️ Partial | Gateway integration | Wire to main |

### 5. Decision Engine
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Decision engine service | ✅ Implemented | Add more rules | Expand rule set |
| LLM fallback | ⚠️ Partial | Configurable | Environment config |

### 6. LLM Integration
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| LLM service | ⚠️ Partial | Full provider abstraction | Add Anthropic, etc. |
| OpenAI service | ✅ Implemented | — | — |
| Prompt templates | ⚠️ Partial | Versioning | Add template manager |

### 7. Gateways
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Device gateway | ✅ Implemented | — | — |
| Agent gateway | ✅ Implemented | — | — |
| Dashboard gateway | ✅ Implemented | — | — |

### 8. Telemetry
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| OTEL bootstrap | ⚠️ Partial | Full wire | Connect all services |
| Trace model | ✅ Implemented | — | — |
| Decision evidence | ⚠️ Partial | Add to all decisions | Expand |

### 9. Notifications
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Real-time alerting | ⚠️ Partial | Wire to escalation | Full integration |
| Integration health | ⚠️ Partial | Wire to landing | Full integration |

## Browser Modules

### 1. Build / Packaging
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| ZIP artifact | ✅ Implemented | — | — |
| NSIS installer | ✅ Implemented | Code signing | Add signing |
| Portable EXE | ✅ Implemented | — | — |

### 2. Installer Types
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| NSIS | ✅ Implemented | Signing | Add signing |
| Portable | ✅ Implemented | — | — |

### 3. Signing
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Code signing plan | ❌ Missing | Define and implement | Create plan |

### 4. Landing Integration
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Download link | ✅ Implemented | target=_blank | Verify |
| Health hooks | ✅ Implemented | — | — |

### 5. Telemetry
| Item | State | Gap | Next Action |
|------|-------|-----|-------------|
| Event logger | ✅ Implemented | — | — |
| Transcript monitor | ✅ Implemented | — | — |

## Legend
- ✅ Implemented — Fully working
- ⚠️ Partial — Working but needs extension
- ❌ Missing — Not started

---
**End of Feature Backlog**