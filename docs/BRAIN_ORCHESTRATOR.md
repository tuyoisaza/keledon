# Cloud Brain Orchestrator Documentation

## Overview

The Cloud Brain Orchestrator is the intelligent decision-making core of KELEDON. It processes user input, determines intent, applies safety policies, and orchestrates responses with appropriate actions (TTS, RPA, etc.).

---

## 🏗️ Architecture

### Core Components

1. **ConversationOrchestrator** - Main state machine coordinator
2. **IntentNormalizer** - Processes and classifies user intents
3. **PolicyEngine** - Enforces safety and business rules
4. **PromptManager** - Manages LLM prompt generation and templates

### State Machine Flow

```
User Input → Intent Normalizer → Policy Engine → Prompt Manager → LLM Service
     ↓                    ↓              ↓              ↓             ↓
  Listening ←→ Processing ←→ Responding ←→ Back to Listening
     ↓              ↓              ↓             ↓
  Event Handling  ←  Context Management  ←  Action Generation
```

---

## 🧠 Intent Processing

### Intent Categories

#### Automation Intents
- **automation_request** - User wants to automate a task
- **flow_execution** - User requests specific flow execution
- **click_action** - User wants element interaction
- **fill_action** - User wants form completion

#### Information Intents
- **product_information** - User asks about UI elements
- **troubleshooting** - User needs help with problems
- **how_to** - User asks for procedural guidance

#### General Intents
- **greeting** - Conversation starters
- **farewell** - Conversation enders
- **confirmation** - User confirms or denies
- **general_assistance** - General help requests

### Intent Detection Methods

1. **Pattern Matching** - Keyword and regex patterns
2. **LLM Classification** - GPT model for complex intent detection
3. **Context Analysis** - Conversation history and session context
4. **Confidence Scoring** - Multiple methods with confidence thresholds

---

## 🛡️ Policy & Safety

### Safety Filters

#### Content Safety
- **Harmful Content Detection** - Violence, self-harm, illegal activities
- **PII Protection** - Passwords, API keys, personal information
- **Injection Prevention** - Code injection, XSS attempts

#### Access Control
- **Domain Restrictions** - Limit operations to approved domains
- **Rate Limiting** - Prevent abuse and excessive automation
- **Trust Scoring** - Session-based trust evaluation

#### Safe Mode
- **Conservative Responses** - No automation in safe mode
- **Limited Intents** - Only safe interaction patterns allowed
- **Manual Confirmation** - Require user approval for sensitive actions

---

## 📝 Prompt Management

### Prompt Engineering

#### System Prompts
- **Base Instructions** - Core AI personality and capabilities
- **Context Injection** - Session information and history
- **Safety Instructions** - Safety mode and policy constraints
- **Dynamic Updates** - Runtime prompt modifications

#### Optimization
- **Length Management** - Context truncation and optimization
- **Token Limits** - LLM model token constraints
- **Temperature Control** - Response creativity vs determinism

### Template System
- **Few-Shot Examples** - Intent-specific examples
- **Variable Substitution** - Dynamic content insertion
- **Conditional Prompts** - Context-aware prompt variants

---

## 🔀 Response Generation

### Response Types

#### TTS Responses
```javascript
{
  type: 'say',
  text: 'Response text',
  interruptible: true,
  metadata: { intent: 'greeting', confidence: 0.9 }
}
```

#### RPA Responses
```javascript
{
  type: 'ui_steps',
  flowId: 'login_automation',
  steps: [
    { id: 'nav_login', action: 'navigate', url: '...' },
    { id: 'fill_user', action: 'fill', selector: '#username', value: '{{username}}' },
    { id: 'click_submit', action: 'click', selector: '#login-button' }
  ]
}
```

#### Mode Changes
```javascript
{
  type: 'mode',
  mode: 'safe',
  reason: 'Low confidence detected - switching to safe mode'
}
```

---

## 📊 State Management

### Conversation States

| State | Description | Entry Condition | Exit Conditions |
|-------|-------------|----------------|----------------|
| **idle** | Waiting for user input | User message received |
| **listening** | Processing audio input | Processing complete |
| **processing** | Generating response | Response generated |
| **responding** | Sending response to agent | Response sent |
| **error** | Error occurred | Manual recovery |

### Context Tracking
- **Session ID** - Unique conversation identifier
- **Turn Counting** - Number of exchanges in session
- **Duration Tracking** - Session and turn timing
- **History Management** - Conversation memory for context
- **Intent History** - Recent intents for pattern detection

---

## 🔧 Configuration

### Default Configuration
```javascript
{
  intents: {
    confidenceThreshold: 0.5,
    enableLLMClassification: true,
    fallbackIntent: 'general_assistance'
  },
  policies: {
    enableSafetyFilters: true,
    maxConfidenceThreshold: 0.95,
    safeMode: false
  },
  prompts: {
    maxContextLength: 4000,
    temperature: 0.7,
    maxTokens: 1000
  }
}
```

### Runtime Configuration
- **Safety Mode Toggle** - Dynamic safety level adjustment
- **Domain Whitelist** - Allowed automation targets
- **Rate Limit Adjustment** - Per-user rate controls
- **Prompt Customization** - System prompt modifications

---

## 🧪 Testing Strategies

### Unit Testing
```javascript
// Test intent classification
const normalizer = new IntentNormalizer();
const result = await normalizer.determineIntent("Automate login", context);
assert(result.name === 'automation_request');

// Test policy evaluation
const policyEngine = new PolicyEngine();
const evaluation = await policyEngine.evaluate(intent, userInput, context);
assert(evaluation.allowed === true);

// Test prompt generation
const promptManager = new PromptManager();
const systemPrompt = promptManager.buildSystemPrompt(context, constraints, intent);
assert(systemPrompt.includes('KELDON'));
```

### Integration Testing
```javascript
// Test full conversation flow
const orchestrator = createBrainOrchestrator();
await orchestrator.startSession('session-123');

const response = await orchestrator.processUserInput({
  text: 'Help me log in',
  confidence: 0.9
});

assert(response.actions.length > 0);
assert(response.actions[0].type === 'ui_steps');
```

### Performance Testing
- **Intent Recognition Speed** - < 100ms for common intents
- **Policy Evaluation** - < 50ms for safety checks
- **Prompt Generation** - < 200ms for system prompts
- **State Transitions** - All transitions < 10ms

---

## 🔍 Troubleshooting

### Common Issues

#### Intent Misclassification
**Problem**: Low confidence intent detection
```javascript
// Symptoms
{
  intent: { name: 'unknown', confidence: 0.2 },
  confidence: 0.2
}

// Solutions
- Increase training data for rare intents
- Adjust confidence thresholds
- Enable LLM classification for better accuracy
```

#### Policy Violations
**Problem**: Safe mode blocking legitimate automation
```javascript
// Symptoms
{
  evaluation: { allowed: false, reason: 'Intent not allowed in safe mode' },
  constraints: { safeMode: { blockedIntent: 'automation_request' } }
}

// Solutions
- Review safe mode intent whitelist
- Implement user confirmation prompts
- Add intent override capabilities for trusted users
```

#### Performance Issues
**Problem**: Slow response generation
```javascript
// Symptoms
{
  responseTime: 2000, // > 2 seconds
  bottlenecks: ['intent_classification', 'prompt_generation', 'llm_call']
}

// Solutions
- Enable intent classification caching
- Pre-render common system prompts
- Implement LLM response streaming
- Add timeout and fallback mechanisms
```

---

## 📈 Performance Metrics

### Key Metrics
- **Intent Recognition Accuracy** - Classification success rate
- **Policy Evaluation Time** - Safety check performance
- **Response Generation Latency** - End-to-end response time
- **State Transition Speed** - Time between state changes
- **Memory Usage** - Conversation context storage efficiency

### Monitoring
```javascript
// Performance monitoring example
orchestrator.on('intent:determined', (data) => {
  metrics.recordIntentLatency(data.processingTime);
  metrics.recordIntentAccuracy(data.confidence);
});

orchestrator.on('response:generated', (data) => {
  metrics.recordResponseLatency(data.generationTime);
  metrics.recordTokenUsage(data.tokens);
});
```

---

## 🔄 Usage Examples

### Basic Usage
```javascript
import { createBrainOrchestrator } from './brain/main.js';

const orchestrator = createBrainOrchestrator({
  intents: { confidenceThreshold: 0.7 },
  policies: { safeMode: true }
});

// Start session
await orchestrator.startSession('session-123');

// Process user input
const response = await orchestrator.processUserInput({
  text: 'Navigate to settings page',
  confidence: 0.95
});

// Generate TTS response
if (response.actions[0].type === 'say') {
  await ttsAdapter.speak(response.actions[0].text);
}
```

### Advanced Configuration
```javascript
const customConfig = {
  intents: {
    confidenceThreshold: 0.6,
    customPatterns: [
      {
        name: 'custom_automation',
        keywords: ['process', 'workflow', 'pipeline'],
        patterns: [/^(?:process|workflow|pipeline)\s+(.+)$/i]
      }
    ]
  },
  policies: {
    allowedDomains: ['trusted-website.com', 'internal-app.company.com'],
    rateLimiting: { maxActionsPerMinute: 10 }
  }
};

const orchestrator = createBrainOrchestrator(customConfig);
```

---

*This documentation is maintained as part of the KELEDON brain development process. All architectural decisions should be documented in separate ADRs.*