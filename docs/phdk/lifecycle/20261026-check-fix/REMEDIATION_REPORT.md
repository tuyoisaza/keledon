## Final closure patch — 5.9.1
Source review found Kokoro could ignore locale while honoring voice/speed. Both synthesis paths now derive known es/en voices from explicit locale; Kokoro/Speaches require an explicit voice ID for other locales. Legacy settings remain unchanged when no new configuration exists. This is part of gap008, not new scope. Runtime language/region/provider quality remains UNVERIFIED.

# Eleven-gap remediation — 5.9.0 / 2026-10-26
PHDK2.68.0 AUTO FORCE. Exact owner mandate: implement CHK001..011 and publish/deploy without local tests; leave012..014 separate.

Status: SOURCE IMPLEMENTED; publication/deployment receipt records actual remote result separately. UAT NOT RUN. No local application tests, build, lint, typecheck, Docker/server, synthetic provisioning, browser journey or provider speech/model request was performed. Syntax parsers are static only.

| Gap | Implementation | Source | Limits / review |
|---|---|---|---|
| CHK-20261026-001 | Positive surface policy | `interface-control/interface-policy.ts; interface-control.service.ts; surface-dom.js; native-uia.ps1` | No policy: no fill/activate. Configured classification remains client responsibility; negative runtime cases deferred. |
| CHK-20261026-002 | Audit before command publication | `interface-control.service.ts issue/next/authorizeDevice` | Reserved publishing slot cannot be claimed; success rechecks generation, state, policy. |
| CHK-20261026-003 | Bounded armed automatic cycle | `interface-automation.ts; InterfaceControlPanel; meet-brain-link.js; BrainMeetPanel` | Foreground only; 120s,12 acts,4 model steps; Meet acoustic candidate requires UI confirmation. No universal Windows/ACD detection claim. |
| CHK-20261026-004 | Normal account lifecycle | `account-lifecycle.controller.ts; account-lifecycle.policy.ts; role-preview-operator.policy.ts; AccountLifecycle.tsx` | Active state, token watermark, device invalidation, current DB tenant roles and audit; fixtures/self rejected. |
| CHK-20261026-005 | Deterministic ephemeral purge | `interface-control.service.ts erase/timer/onModuleDestroy` | Timer wipes observations/refs/plans/commands without new traffic; no external scheduler. |
| CHK-20261026-006 | Compact diagnostics | `web/landing version-actions.css; browser renderer-controls.css` | 28px actions,14px icons,4px gap,12px version; visual/runtime not verified. |
| CHK-20261026-007 | Interface i18n | `InterfaceControlPanel.tsx; locales en/es/pt` | Static dictionary parity/keys, new account/voice controls localized. |
| CHK-20261026-008 | Effective voice configuration | `tts/voice-settings*.ts; tts.service.ts; VoiceSettingsPanel` | Company profile+team config to provider voice/speed/locale/style. Expressive only ElevenLabs; unsupported options reject. No provider requests during implementation. |
| CHK-20261026-009 | Current governance | `TASK/STATUS; intent/PRD/features; traceability; CRUD/admin/AI registries` | Authoritative current prefixes with historical evidence retained; acceptance and external exclusions explicit. |
| CHK-20261026-010 | External overlay theme governance | `surface-link.js; phdk-theme.config.json` | Named vars and narrow external-shadow exception; visual evidence unverified. |
| CHK-20261026-011 | Active module size | `ai-input-schema.ts; ai-usage.ts; crud-managed-interface.service.ts` | Active AI admin and CRUD facade below600 lines; no behavior acceptance inferred. |

## Deliberately open
-012: Windows installer publication/build remains separate; current public artifact5.0.52 is not source5.9.0. No build/driver installation executed.
-013: production backup/restore contract/evidence still unknown; no provider changes.
-014: tenant risk tier/isolation decision still open; no new database/KMS/principal/infrastructure.
Original CMT-001..004 product acceptance remains separate. Require fresh explicit `PHDK uat` for remote voice/interruption/second interaction, policy/audit/cancel/revocation/TTL and real client UI behavior. Do not mark the entire agent accepted from this delivery.

## Deployment and compatibility
Existing Railway main-source deployment builds API/Web. Existing startup migration path applies additive users.isActive/authAfter and teams.ttsVoiceProfileId/ttsVoiceSettings. No destructive schema changes. Selected provider/keys remain unchanged. Persisted custom AI prompt/schema revisions are not overwritten; incompatible revisions fail closed and need explicit normal admin revision. Ephemeral sessions do not survive restart and require explicit re-arm; leases never silently extend.
