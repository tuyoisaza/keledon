# KELEDON FEATURES V1

Following the "UI Disciplined" principle: Every element is **Functional**, **Explicit Stub**, or **Removed**.

## 1. Agent (Chrome Extension)
| Feature | State | Description |
| :--- | :--- | :--- |
| **Connection Status** | `FUNCTIONAL` | Shows Connected/Disconnected/Error. |
| **Audio Capture (Mic)** | `FUNCTIONAL` | Captures user microphone audio. |
| **Audio Capture (Tab)** | `FUNCTIONAL` | Captures tab audio (Web Audio API). |
| **Task Execution** | `STUB` | Receives and executes flow commands. (Currently limited) |
| **Side Panel UI** | `FUNCTIONAL` | Main interaction point for the agent. |
| **Debug Mode** | `FUNCTIONAL` | Toggle for verbose logging. |

## 2. Cloud (Backend)
| Feature | State | Description |
| :--- | :--- | :--- |
| **WebSocket Gateway** | `FUNCTIONAL` | Handles connections and binary audio streams. |
| **Orchestrator** | `FUNCTIONAL` | Manages conversation state (STT->LLM->TTS). |
| **Deepgram STT** | `FUNCTIONAL` | Real-time transcription. |
| **OpenAI LLM** | `FUNCTIONAL` | GPT-4o integration. |
| **ElevenLabs TTS** | `FUNCTIONAL` | Streaming synthesis. |
| **RAG (Qdrant)** | `STUB` | Knowledge base ingestion and querying. |
| **Flow Repository** | `STUB` | Storage and retrieval of versioned Flows. |

## 3. Landing / Admin (Frontend)
| Feature | State | Description |
| :--- | :--- | :--- |
| **Authentication** | `FUNCTIONAL` | Google OAuth / Supabase Auth. |
| **Dashboard** | `STUB` | High-level metrics (Sessions, Calls). |
| **Flow Editor** | `REMOVED` | (For V1, flows are code-defined or recorded, no visual editor yet). |
| **Session Logs** | `STUB` | List of past calls with audio/transcript. |
| **Settings** | `FUNCTIONAL` | API Key management. |
