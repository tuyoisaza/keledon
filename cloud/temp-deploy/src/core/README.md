# KELEDON Core Architecture

This directory implements the core architectural components of the KELEDON Autonomous Orchestrator.

## Components

### 1. Action Model (`interfaces/action.interface.ts`)
Defines the `KeledonAction` structure, which serves as the central contract for all system operations. The core logic should produce these actions declaratively.

### 2. Policy Engine (`policy/policy.engine.ts`)
Determines if an action is allowed based on the user's `Autonomy Level` and the action's `Risk`.
- **Level 1 (Observer)**: READ only.
- **Level 2**: Low risk execution.
- **Level 3**: Reversible writes.
- **Level 4/5**: Critical actions with QA/Audit.

### 3. Audit Service (`audit/audit.service.ts`)
Logs every policy decision and execution attempt. Ensure all critical operations pass through this service.

### 4. Execution Orchestrator (`execution/execution.orchestrator.ts`)
The bridge between the Core and the specific executors.
- Receives a `KeledonAction`.
- Checks Policy.
- Logs to Audit.
- Routes to the appropriate Executor (UI via Tool/Workflow, API, Voice).

## Usage Guide (Next Steps)

To fully migrate KELEDON to this architecture:

1.  **Update `ConversationOrchestrator`**:
    - Modify the LLM Prompt to output JSON matching `KeledonAction`.
    - Instead of executing logic directly, instantiate `KeledonAction`.
    - Call `executionOrchestrator.execute(action, context)`.
    
2.  **Context Loading**:
    - Ensure `AutonomyContext` (level, accountId) is loaded from the database at the start of the session.

3.  **Expand Policy Rules**:
    - Add more granular rules in `PolicyEngine` as needed.
