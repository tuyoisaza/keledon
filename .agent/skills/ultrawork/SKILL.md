---
name: ultrawork
description: Full autonomous development mode for KELEDON. Reads boulder.json, claims the next task, executes, updates state, and repeats until done or blocked.
---

# ULTRAWORK — Autonomous Execution Mode

When this skill is invoked, you are in **full autonomous mode**.
You do not wait for instructions. You do not ask for permission. You work.

---

## Step 0 — Cold Start (Always First)

Read these files before touching anything else:

1. `.sisyphus/boulder.json` — the task queue and session state
2. Every file listed in `boulder.context.must_read`
3. The active plan file at `boulder.active_plan.file`

You now know everything. Begin.

---

## Step 1 — Scan

Read `tasks[]` in boulder.json.

Find the **first task** where `status = "unclaimed"`, ordered by `priority` ASC.

If no unclaimed tasks exist → check `backlog[]` → promote the next plan → update boulder.json → continue.

If everything is done → report COMPLETION to the user and stop.

---

## Step 2 — Claim

Before touching any file, announce:

```
CLAIM — claude-sonnet — <task_id> | <title>
```

Set the task's `status` to `"in_progress"` in boulder.json.

---

## Step 3 — Plan (Hard Gate)

Read every file listed in the task's `files[]`.
Understand exactly what exists and what must change.

Do NOT write code yet.

State your plan in one paragraph: what you will change, in which file, and why.
This is your commit to the plan. After this, you execute exactly what you said.

---

## Step 4 — Execute

Make the changes. Follow the task's `what` field exactly.
Respect every entry in the task's `guardrails[]` and `boulder.context.global_guardrails`.

Rules:
- Surgical edits only. Do not refactor surrounding code.
- Do not add features not listed in `what`.
- Fail loudly. Never simulate success.

---

## Step 5 — Verify

Run the task's `acceptance` criteria.
If there is a `proof_command` in boulder.context, run it.

If verification fails → fix it. Stay in the loop: Fix → Verify → Fix → Verify.
Do not proceed to Step 6 until acceptance is met.

---

## Step 6 — Commit

```
git add <only the files you changed>
git commit -m "<task_id>: <title>"
```

---

## Step 7 — Update boulder.json

Set the task's `status` to `"done"`.
Write `session_state.last_completed` = `"<task_id>: <title>"`.
Write `session_state.next_action` = next unclaimed task title (or "all done").

---

## Step 8 — Loop

Return to Step 1. Claim the next unclaimed task.

Do not stop between tasks unless:
- You hit a `blocking_issue` you cannot resolve alone
- The user interrupts
- All tasks are done

If blocked: set `session_state.blocking_issue` = what stopped you. Set task `status` = `"blocked"`. Report to user and stop.

---

## Forbidden Behaviors

- Asking "should I proceed?" between tasks
- Stopping at 90% done
- Declaring completion without verifying acceptance
- Modifying `docs/specs/` without a governance Issue
- Adding decision logic to `browser/` (Cloud decides, Browser executes)
- Simulating success when something fails
