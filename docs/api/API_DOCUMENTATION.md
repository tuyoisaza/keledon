# KELEDON API Documentation

## Overview

KELEDON V1 provides REST APIs and WebSocket endpoints for browser agent communication and system management.

## Base URL
```
Production: https://api.yourdomain.com
Staging: https://staging-api.yourdomain.com
Development: http://localhost:3001
```

## Authentication

All API endpoints require authentication via JWT tokens in the Authorization header.

```http
Authorization: Bearer <jwt_token>
```

## Common Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "request_id": "uuid-v4"
}
```

Error Response Format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {}
  },
  "timestamp": "2026-02-03T12:00:00.000Z",
  "request_id": "uuid-v4"
}
```

## REST API Endpoints

### Health Check

### Get System Health
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "vector_db": "healthy"
    },
    "timestamp": "2026-02-03T12:00:00.000Z"
  }
}
```

### Session Management

### Create New Session
```http
POST /sessions
```

**Request Body:**
```json
{
  "name": "Session Name",
  "user_id": "user-uuid",
  "metadata": {
    "browser": "Chrome",
    "version": "120.0.0.0",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session-uuid",
    "name": "Session Name",
    "status": "active",
    "created_at": "2026-02-03T12:00:00.000Z",
    "expires_at": "2026-02-03T18:00:00.000Z"
  }
}
```

### Get Session Details
```http
GET /sessions/{session_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session-uuid",
    "name": "Session Name",
    "status": "active",
    "agent_id": "agent-uuid",
    "created_at": "2026-02-03T12:00:00.000Z",
    "last_activity": "2026-02-03T12:30:00.000Z",
    "event_count": 25,
    "events": [...],
    "metadata": {}
  }
}
```

### Update Session
```http
PUT /sessions/{session_id}
```

**Request Body:**
```json
{
  "status": "paused",
  "metadata": {
    "pause_reason": "User requested pause"
  }
}
```

### End Session
```http
POST /sessions/{session_id}/end
```

**Request Body:**
```json
{
  "reason": "User ended session"
  "save_data": true
}
}
```

### List User Sessions
```http
GET /sessions?user_id={user_id}&limit=10&offset=0
```

## Event Management

### Submit Event
```http
POST /events
```

**Request Body:**
```json
{
  "session_id": "session-uuid",
  "event_type": "text_input",
  "payload": {
    "text": "Hello KELEDON",
    "confidence": 0.95,
    "provider": "deepgram",
    "metadata": {
      "timestamp": "2026-02-03T12:00:00.000Z"
    }
  },
  "timestamp": "2026-02-03T12:00:00.000Z",
  "agent_id": "agent-uuid"
}
```

### Get Session Events
```http
GET /events?session_id={session_id}&limit=50&type=text_input
```

### Get Event Statistics
```http
GET /events/stats?session_id={session_id}&time_range=24h
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_events": 100,
    "event_types": {
      "text_input": 60,
      "ui_result": 30,
      "system": 10
    },
    "time_distribution": {
      "hourly": {...}
    }
  }
}
```

## Agent Management

### Register Agent
```http
POST /agents
```

**Request Body:**
```json
{
  "name": "Agent Name",
  "type": "browser",
  "capabilities": ["stt", "tts", "ui_automation"],
  "metadata": {
    "browser": "Chrome 120.0",
    "platform": "Windows 10"
  }
}
```

### Get Agent Status
```http
GET /agents/{agent_id}/status
```

### Update Agent Configuration
```http
PUT /agents/{agent_id}/config
```

## User Management

### User Registration
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "User Name",
  "metadata": {}
}
```

### User Login
```http
POST /auth/login
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "jwt_token": "jwt-token-string",
    "expires_at": "2026-02-10T12:00:00.000Z"
  }
}
```

### Get User Profile
```http
GET /users/{user_id}
Authorization: Bearer {jwt_token}
```

## Configuration

### Get System Configuration
```http
GET /config
Authorization: Bearer {admin_token}
```

### Update System Configuration
```http
PUT /config
Authorization: Bearer {admin_token}
```

## WebSocket API

### Connection Namespace
```
WebSocket: wss://api.yourdomain.com/agent
```

### Connection Flow
```javascript
const socket = io('wss://api.yourdomain.com/agent', {
  auth: {
    token: 'jwt-token'
  }
});

// Connection established
socket.on('connect', () => {
  console.log('Connected to KELEDON WebSocket');
});

// Receive commands from cloud
socket.on('command', (command) => {
  console.log('Received command:', command);
  
  switch (command.type) {
    case 'say':
      handleSpeakCommand(command.payload);
      break;
    case 'ui_steps':
      handleUIStepsCommand(command.payload);
      break;
    case 'mode':
      handleModeCommand(command.payload);
      break;
    case 'stop':
      handleStopCommand(command.payload);
      break;
  }
});

// Send events to cloud
function sendEvent(eventData) {
  socket.emit('event', {
    session_id: currentSessionId,
    event_type: eventData.type,
    payload: eventData.payload,
    timestamp: new Date().toISOString(),
    agent_id: agentId
  });
}
```

## Event Schema

### Text Input Event
```json
{
  "event_type": "text_input",
  "session_id": "session-uuid",
  "payload": {
    "text": "Transcribed speech",
    "confidence": 0.92,
    "provider": "deepgram",
    "language": "en-US",
    "words": [
      {
        "word": "hello",
        "start": 0.0,
        "end": 0.5,
        "confidence": 0.95
      }
    ],
    "metadata": {
      "audio_duration_ms": 1500,
      "model": "nova-2"
    }
  },
  "timestamp": "2026-02-03T12:00:00.000Z",
  "agent_id": "agent-uuid"
}
```

### UI Result Event
```json
{
  "event_type": "ui_result",
  "session_id": "session-uuid",
  "payload": {
    "step_id": "step-uuid",
    "action": "click",
    "selector": "#submit-button",
    "status": "success",
    "duration_ms": 250,
    "screenshot": "base64-image-data",
    "error": null
  },
  "timestamp": "2026-02-03T12:00:00.000Z",
  "agent_id": "agent-uuid"
}
```

## Command Schema

### Say Command
```json
{
  "command_id": "command-uuid",
  "session_id": "session-uuid",
  "type": "say",
  "payload": {
    "text": "Response message",
    "interruptible": true,
    "provider": "elevenlabs",
    "voice": "voice-id",
    "language": "en-US",
    "speed": 1.0,
    "metadata": {
      "response_to": "text_input_event_id"
    }
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

### UI Steps Command
```json
{
  "command_id": "command-uuid",
  "session_id": "session-uuid",
  "type": "ui_steps",
  "payload": {
    "flow_id": "flow-uuid",
    "steps": [
      {
        "step_id": "step-uuid-1",
        "action": "fill_field",
        "selector": "#input-field",
        "value": "auto-filled text",
        "post_condition": {
          "type": "equals",
          "selector": "#input-field",
          "expected": "auto-filled text"
        }
      },
      {
        "step_id": "step-uuid-2",
        "action": "click",
        "selector": "#submit-button",
        "post_condition": {
          "type": "exists",
          "selector": "#confirmation-message"
        }
      }
    ],
    "timeout_ms": 30000,
    "context": {
      "form_data": {
        "target_field": "input-field"
      }
    }
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|------------|
| AUTH_REQUIRED | Authentication required | 401 |
| AUTH_INVALID | Invalid authentication token | 401 |
| FORBIDDEN | Resource access forbidden | 403 |
| NOT_FOUND | Resource not found | 404 |
| VALIDATION_ERROR | Invalid input data | 400 |
| SESSION_EXPIRED | Session has expired | 401 |
| AGENT_OFFLINE | Agent not connected | 503 |
| RATE_LIMITED | Too many requests | 429 |
| INTERNAL_ERROR | Internal server error | 500 |

## Rate Limiting

API endpoints implement rate limiting to prevent abuse:

- **General API**: 100 requests per minute per IP
- **Session Events**: 10 events per second per session
- **WebSocket Connections**: 5 concurrent connections per agent
- **Authentication**: 5 login attempts per minute per IP

## Monitoring Endpoints

### Application Metrics
```http
GET /metrics
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "active_sessions": 150,
    "total_events_today": 12500,
    "error_rate": 0.02,
    "average_response_time_ms": 150,
    "active_agents": 45,
    "system_health": "optimal"
  }
}
```

### System Health Check
```http
GET /health/detailed
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "status": "healthy",
      "connections": 8,
      "query_time_ms": 25
    },
    "cache": {
      "status": "healthy",
      "memory_usage": "45%",
      "connections": 25
    },
    "vector_db": {
      "status": "healthy",
      "collection_size": 10000,
      "index_health": "optimal"
    },
    "websocket_gateway": {
      "status": "healthy",
      "connections": 150,
      "message_queue": 0
    }
  }
}
```

## SDK and Integration

### JavaScript SDK
```javascript
import { KeledonSDK } from '@keledon/sdk';

const sdk = new KeledonSDK({
  apiUrl: 'https://api.yourdomain.com',
  apiKey: 'your-api-key',
  version: '1.0.0'
});

// Create session
const session = await sdk.sessions.create({
  name: 'Integration Test Session',
  metadata: { integration: true }
});

// Connect WebSocket
const socket = await sdk.connectAgent(session.session_id);
```

### Python SDK
```python
from keledon_sdk import KeledonClient

client = KeledonClient(
    api_url='https://api.yourdomain.com',
    api_key='your-api-key'
)

# Create session
session = client.sessions.create(
    name='Python Integration Test',
    metadata={'integration': True}
)

# Connect agent
socket = client.connect_agent(session.session_id)
```

## Testing

### API Testing with Postman
Import the OpenAPI specification:
```bash
curl https://api.yourdomain.com/docs/openapi.json -o keledon-api.json
```

Use the OpenAPI specification with Postman or Swagger UI:
```bash
python -m http.server 8000 &
open http://localhost:8000/docs
```

## Webhooks

### Event Webhooks
Configure webhooks to receive real-time notifications:

```http
POST /webhooks/events
```

**Webhook Payload:**
```json
{
  "event_type": "session_created",
  "data": {
    "session_id": "session-uuid",
    "timestamp": "2026-02-03T12:00:00.000Z"
  },
  "signature": "sha256-signature"
}
```

### Webhook Authentication
Webhooks include HMAC-SHA256 signature verification:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhook_secret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

For additional API documentation and integration support, visit:
- **Developer Portal**: https://developers.yourdomain.com
- **API Reference**: https://api.yourdomain.com/docs
- **SDK Documentation**: https://docs.yourdomain.com/sdk