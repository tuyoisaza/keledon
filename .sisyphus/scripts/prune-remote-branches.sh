#!/usr/bin/env bash
# KELEDON Remote Branch Pruner
# Review this list carefully before running.
# Run with: bash .sisyphus/scripts/prune-remote-branches.sh
# Dry-run: DRY_RUN=1 bash .sisyphus/scripts/prune-remote-branches.sh

set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"

STALE_BRANCHES=(
  "feat/c07-decision-evidence-tracing"
  "feat/c06-cloud-otel-orchestration"
  "feat/c11-extension-exec-evidence-wiring"
  "feat/c12-proof-automation-real-extension"
  "feat/c13-proof-regression-lock"
  "feat/c14-otel-superadmin-dashboard"
  "feat/c15-otel-superadmin-dashboard-impl"
  "feat/c16-superadmin-rbac-lock"
  "feat/c19-local-supabase-cli-bootstrap"
  "feat/c21-prod-config-lock"
  "phase3/webrtc-audio-injection"
  "phase3/voice-roundtrip-stt-tts"
  "phase3/decision-engine-minimal"
  "phase3/observability-monitoring"
  "phase3/side-panel-intelligence"
  "phase3/agent-orchestration"
  "phase3/voice-analytics-processing"
  "phase3/ui-automation-runtime"
  "phase3/decision-engine-routing"
  "phase3/mvp-determinism-phase3-lock"
  "phase4/full-stack-real-integration"
  "infra/floor-restore-001"
  "infra/cloud-boot-stability"
  "infra/phase2-db-hardening-db-ready"
  "infra/phase2-enforcement-v5-1770312042"
  "infra/floor-build-isolation-final-1770312042"
  "agent/sidepanel-rewire"
  "agent/vector-rewire"
  "agent/supabase-rewire"
  "agent/agent-connection-rewire"
  "agent/websocket-connection"
  "agent/stt-text-input-wiring"
  "agent/rpa-step-executor-wiring"
  "agent/tts-responses-cloud-agent-speaks"
  "agent/session-persistence"
  "agent/command-response-flow"
  "agent/integration-testing"
  "agent/deployment-orchestration"
  "agent/production-testing"
  "agent/deployment-documentation"
  "agent/final-cleanup-canonical-state"
  "agent/text-input-flow"
  "agent/ui-automation-pipeline"
  "cloud/brain-decision-commands"
  "feature/step6-webrtc-integration"
  "housekeeping/trim-safe"
  "local-run/refix"
  "pm/keledon-cleanup"
  "railway/prisma-ready"
  "issue/agent-cloud-connection"
  "legacy/pre-canon"
  "workable"
  "MAIN02042026"
  "bk/canon-master-20260308-2105"
  "backup/2026-03-04-pre-railway"
)

echo "=== KELEDON Remote Branch Pruner ==="
echo "Branches to delete: ${#STALE_BRANCHES[@]}"
if [ "$DRY_RUN" = "1" ]; then
  echo "DRY_RUN=1 — no changes will be made"
fi
echo ""

for branch in "${STALE_BRANCHES[@]}"; do
  if git ls-remote --exit-code origin "$branch" > /dev/null 2>&1; then
    if [ "$DRY_RUN" = "1" ]; then
      echo "  [dry] would delete: origin/$branch"
    else
      echo "  deleting: origin/$branch"
      git push origin --delete "$branch"
    fi
  else
    echo "  [skip] not on remote: $branch"
  fi
done

echo ""
echo "=== Done ==="
