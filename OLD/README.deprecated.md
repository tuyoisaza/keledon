# KELDON - Voice AI Agent

> A real-time voice AI assistant that can understand, respond, and automate tasks.

## ✨ Features

- 🎤 **Voice-to-Voice**: Speak naturally, get spoken responses
- 🧠 **GPT-4 Brain**: Powered by OpenAI's latest models
- 🔊 **ElevenLabs TTS**: Natural-sounding voice synthesis
- 🎧 **Deepgram STT**: Real-time speech recognition
- 🔧 **RPA Tools**: Automate browser actions (click, type, navigate)
- 🧩 **Chrome Extension**: Side panel UI, works on any tab

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │◄──────────────────►│                 │
│   Agent (React) │                    │   Cloud (Nest)  │
│   Chrome Ext    │                    │                 │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │                              ┌───────┴───────┐
         │                              │               │
    ┌────▼────┐                    ┌────▼────┐    ┌────▼────┐
    │ Browser │                    │   STT   │    │   LLM   │
    │ Mic/    │                    │Deepgram │    │ OpenAI  │
    │ Speaker │                    └─────────┘    └────┬────┘
    └─────────┘                                        │
                                                  ┌────▼────┐
                                                  │   TTS   │
                                                  │ElevenLabs│
                                                  └─────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Chrome (for extension)

### 1. Clone & Install

```bash
git clone https://github.com/yourname/keldon.git
cd keldon

# Install Cloud dependencies
cd cloud && npm install

# Install Agent dependencies
cd ../agent && npm install
```

### 2. Configure API Keys

Open the app in Chrome and go to **Admin Settings** (⚙️):
- **Deepgram**: Get key from [deepgram.com](https://deepgram.com)
- **OpenAI**: Get key from [platform.openai.com](https://platform.openai.com)
- **ElevenLabs**: Get key from [elevenlabs.io](https://elevenlabs.io)

### 3. Run

```bash
# Terminal 1: Start Cloud
cd cloud && npm run start:dev

# Terminal 2: Start Agent Dev Server
cd agent && npm run dev
```

### 4. Load Extension (Optional)

1. Build: `cd agent && npm run build`
2. Chrome → `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → Select `agent/dist`

## 📁 Project Structure

```
keldon/
├── agent/                 # React Chrome Extension
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── context/       # React Contexts
│   │   ├── hooks/         # Custom Hooks
│   │   └── App.tsx
│   └── public/
│       ├── manifest.json  # Chrome Extension Manifest
│       └── service-worker.js
│
├── cloud/                 # NestJS Backend
│   ├── src/
│   │   ├── providers/     # STT, TTS, LLM Providers
│   │   ├── interfaces/    # TypeScript Interfaces
│   │   ├── app.gateway.ts # WebSocket Handler
│   │   └── conversation.orchestrator.ts
│   └── test/
│       └── e2e-websocket.test.ts
│
└── README.md
```

## 🔧 Configuration

### System Prompt

Customize KELDON's personality in Admin Settings:

```
You are KELDON, a helpful voice AI assistant. 
You specialize in helping users automate tasks.
```

## 🧪 Testing

```bash
# Unit tests
cd cloud && npm test

# E2E WebSocket test
npx ts-node test/e2e-websocket.test.ts
```

## 📜 License

MIT
