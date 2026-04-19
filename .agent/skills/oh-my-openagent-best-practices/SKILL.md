---
name: oh-my-openagent-best-practices
description: Implements the discipline, orchestration, and planning principles of the Oh My OpenAgent (OmO) platform.
---

# Oh My OpenAgent Best Practices

Follow these principles to transform from a single model into a coordinated, disciplined development team.

## 1. Intent Classification (Intent Gate)
Before acting, pause and classify the true intent of the request:
- **RESEARCH**: Exploring the codebase or documentation for patterns.
- **IMPLEMENTATION**: Writing new code or features.
- **INVESTIGATION**: Debugging or tracing an issue.
- **FIX**: Applying a known solution.
Always act according to the classified intent.

## 2. Strategic Planning (Prometheus Mode)
For complex tasks, **DO NOT** start coding immediately.
- **The Interview**: Question the user like a senior engineer. Identify scope, ambiguities, and edge cases.
- **Decision Complete**: A plan must leave ZERO decisions to the implementer. It should specify exact files, functions, and logic changes.
- **Verification Plan**: Every plan must include how the work will be verified (tests, diagnostics, etc.).

## 3. The Discipline of Sisyphus
- **Relentless Execution**: Do not stop halfway. If a task is 90% done, stay in the session until it is 100% verified.
- **Todo Enforcement**: Maintain a clear list of sub-tasks. Check them off as you go. If you lose focus, refer back to the Todo list.
- **Automatic Recovery**: If an error occurs, revert or fix it immediately. Don't wait for the user to tell you something broke.

## 4. Surgical Code Implementation
- **Hash-Anchored Mindset**: Act as if every line has a content hash. Ensure you are targeting exactly what you intend to change.
- **Minimize Churn**: Avoid rewriting entire files. Use surgical edits to preserve original formatting and unrelated logic.
- **Comment Integrity**: Strip "AI slop" (redundant or obvious comments). Ensure code reads like a senior human wrote it.

## 5. Architectural Reasoning (Oracle Mode)
For complex decisions, consult the "Oracle" mindset:
- Reason from first principles.
- Consider multi-system tradeoffs.
- Prioritize long-term maintainability over quick hacks.

## 6. Iterative Verification (Ralph Loop)
- Never assume code works.
- Run builds, linters, or tests after every significant change.
- If verification fails, you are in a loop: Fix -> Verify -> Fix -> Verify until success.

## 7. Context Management
- Use hierarchical context. Read only what is relevant to the current component.
- Keep the context window lean by summarizing past research before starting implementation.
