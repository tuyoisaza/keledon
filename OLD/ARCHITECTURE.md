# KELEDON ARCHITECTURE V1

## 1. Core Principle
**"The Cloud Decides, The Agent Executes."**

There is a strict separation of concerns. The Agent never makes business decisions, never improvises, and never queries the RAG directly. It is a dumb execution terminal. The Cloud contains all state, logic, policy, and intelligence.

## 2. High-Level Components

### 2.1 Keledón Cloud (The Brain)
*   **Role**: Orchestration, Decision, Audit.
*   **Responsibilities**:
    *   **State Machine**: Manages the conversation state and flow logic.
    *   **STT/TTS**: Handles all audio processing (Deepgram/ElevenLabs).
    *   **LLM + RAG**: Generates responses and determines the next *Intent*.
    *   **RAG (Qdrant)**: strictly for *Policy* and *Knowledge Retrieval*, NOT for code execution or flow generation.
    *   **Flow Selection**: Selects which deterministic flow ID the agent should execute.

### 2.2 Keledón Browser Agent (The Hands)
*   **Role**: Deterministic Execution, I/O.
*   **Type**: Chrome Extension (Manifest V3).
*   **Responsibilities**:
    *   **Audio I/O**: Captures microphone and tab audio; plays TTS audio.
    *   **DOM Automation**: Executes linear, versioned **Flows**.
    *   **Safety**: Stops execution if a selector fails or the page state deviates.
    *   **No Logic**: Does not "think". It receives a JSON payload `[{"action": "click", "selector": "#btn"}]` and executes it blindly.

## 3. Communication Contract
*   **Protocol**: WebSocket (Socket.io).
*   **Direction**:
    *   Agent -> Cloud: Audio chunks, DOM events, Flow results (success/failure).
    *   Cloud -> Agent: TTS Audio, `EXECUTE_FLOW` commands, `STOP` commands.
*   **Versioning**: All payloads must adhere to `CONTRACTS.md`.

## 4. Operational Invariants (SOP)
1.  **Immutability**: Once a Flow is recorded and verified, it is immutable version `vX`. Changes require a new recording `vX+1`.
2.  **Explicit Failure**: If the Agent cannot find a selector, it must fail loudly and report back to Cloud. It must NOT try to "heal" or guess.
3.  **Human-in-the-Loop**: The Cloud may escalate to a human operator (if configured) upon failure, but the Agent simply awaits instructions.
