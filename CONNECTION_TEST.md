# KELEDON Agent-Cloud Connection Test

## Overview
This test demonstrates the **real Agent-Cloud connection** with session management using KELEDON contracts.

## Prerequisites
- Node.js 18+
- npm

## Quick Start

### 1. Start Cloud Server
```bash
cd cloud
npm install --production
npm run build
npm start
```

Server will start on `http://localhost:3001`

### 2. Run Agent Test
```bash
cd agent
npm install
npx ts-node src/test/ConnectionTest.ts
```

## Expected Behavior

### Cloud Server Output:
```
KELEDON Cloud Server Started
HTTP Server: http://localhost:3001
WebSocket: ws://localhost:3001
Ready for agent connections...
[Cloud] New socket connection: xxx
[Cloud] Received message: brain_event
[Cloud] Session created: xxx for agent: test-agent-xxx
```

### Agent Test Output:
```
KELEDON Agent-Cloud Connection Test
Agent ID: test-agent-xxx
Cloud URL: http://localhost:3001

Testing connection and session creation...
[Agent:test-agent-xxx] Connecting to cloud at http://localhost:3001
[Agent:test-agent-xxx] Socket connected, creating session...
[Agent:test-agent-xxx] Session created: xxx
✓ Connected with session: xxx

Testing message exchange...
✓ Sent brain event and command
✓ Received 2 messages

Testing session persistence...
✓ Session persisted: xxx
✓ Heartbeat working: xxx

TEST PASSED: Real session management working
```

## Observable Evidence

1. **Real WebSocket Connection**: Messages exchanged between agent and cloud
2. **Session Creation**: Unique session IDs generated and tracked
3. **Message Validation**: All messages validated using KELEDON contracts
4. **Heartbeat Mechanism**: Automatic keep-alive between agent and cloud
5. **Session Statistics**: Track active sessions and message counts

## API Endpoints

- `GET http://localhost:3001/health` - Server health and stats
- `GET http://localhost:3001/sessions` - List active sessions

## Success Criteria

- ✅ Cloud server starts without errors
- ✅ Agent connects successfully
- ✅ Session is created and persisted
- ✅ Messages flow both directions
- ✅ Heartbeat mechanism works
- ✅ Session statistics are accurate

This demonstrates **real runtime behavior** advancing KELEDON V1 truth by implementing the Core Agent↔Cloud Connection.