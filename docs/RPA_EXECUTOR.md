# RPA Executor Documentation

## Overview

The RPA (Robotic Process Automation) Executor is the core component that executes deterministic browser automation flows. It follows the "Cloud Decides, Agent Executes" principle by executing flows exactly as defined without any improvisation.

---

## 🏗️ Architecture

### Core Components

1. **RPAExecutor** - Main execution engine
2. **StepValidator** - Pre-execution validation and security
3. **PostConditionValidator** - Post-execution state verification

### Execution Flow

```
Flow Definition → Step Validation → Step Execution → Post-Condition Validation → Result Reporting
```

---

## 📋 Supported Actions

| Action | Description | Required Parameters | Optional Parameters |
|--------|-------------|---------------------|---------------------|
| **click** | Click an element | `selector` | `timeout_ms`, `condition`, `post_condition` |
| **fill** | Type text into input | `selector`, `value` | `timeout_ms`, `condition`, `post_condition` |
| **read** | Read text or attribute | `selector` | `attribute`, `timeout_ms`, `condition`, `post_condition` |
| **wait_for** | Wait for element | `selector` | `timeout_ms`, `condition`, `post_condition` |
| **navigate** | Go to URL | `url` | `timeout_ms`, `condition`, `post_condition` |
| **select** | Select dropdown option | `selector`, `option` | `timeout_ms`, `condition`, `post_condition` |
| **assert** | Verify text content | `selector`, `text` | `timeout_ms`, `condition`, `post_condition` |
| **hover** | Hover over element | `selector` | `timeout_ms`, `condition`, `post_condition` |

---

## 🔧 Configuration

### Default Configuration
```javascript
{
  defaultTimeout: 5000,        // Default step timeout (ms)
  retryAttempts: 3,            // Max retry attempts per step
  retryDelay: 1000,            // Delay between retries (ms)
  screenshotOnFailure: true,   // Take screenshot on failure
  strictMode: true,            // Strict post-condition validation
  validationDelay: 500,        // Wait time before post-conditions (ms)
  maxWaitTime: 10000          // Max wait for dynamic content (ms)
}
```

### Security Configuration
```javascript
{
  strictMode: true,           // Enable strict validation
  maxTimeout: 30000,          // Maximum allowed timeout (ms)
  maxRetries: 5,              // Maximum allowed retries
  allowedActions: [           // Whitelisted actions
    'click', 'fill', 'read', 'wait_for', 'navigate', 
    'select', 'assert', 'hover'
  ]
}
```

---

## 📖 Usage Examples

### Basic Flow Execution
```javascript
import { createRPAExecutor } from './rpa/executor/main.js';

const executor = createRPAExecutor();

const flow = {
  id: 'login_flow',
  name: 'User Login',
  steps: [
    {
      id: 'navigate_to_login',
      action: 'navigate',
      url: 'https://example.com/login'
    },
    {
      id: 'fill_username',
      action: 'fill',
      selector: '#username',
      value: '{{username}}'
    },
    {
      id: 'fill_password',
      action: 'fill',
      selector: '#password',
      value: '{{password}}'
    },
    {
      id: 'click_login',
      action: 'click',
      selector: '#login-button',
      post_condition: {
        element_visible: true,
        selector: '#dashboard'
      }
    }
  ]
};

const context = {
  username: 'user@example.com',
  password: 'securepassword123'
};

const result = await executor.executeFlow(flow, context);
```

### Advanced Flow with Conditions
```javascript
const advancedFlow = {
  id: 'complex_form',
  name: 'Complex Form Submission',
  steps: [
    {
      id: 'wait_for_form',
      action: 'wait_for',
      selector: '#form-container',
      timeout_ms: 10000,
      condition: {
        element_visible: true
      }
    },
    {
      id: 'fill_required_fields',
      action: 'fill',
      selector: '#name',
      value: '{{user_name}}',
      post_condition: {
        value_equals: '{{user_name}}'
      }
    },
    {
      id: 'select_option',
      action: 'select',
      selector: '#category',
      option: 'premium',
      post_condition: {
        value_equals: 'premium'
      }
    },
    {
      id: 'verify_submission',
      action: 'assert',
      selector: '#success-message',
      text: 'Form submitted successfully',
      post_condition: {
        element_visible: true,
        text_contains: 'successfully'
      }
    }
  ]
};
```

### Error Handling and Events
```javascript
executor.on('execution:started', (data) => {
  console.log('Flow execution started:', data.flowId);
});

executor.on('step:completed', (data) => {
  console.log('Step completed:', data.stepId);
});

executor.on('execution:failed', (data) => {
  console.error('Flow execution failed:', data);
});

executor.on('execution:completed', (data) => {
  console.log('Flow execution completed:', data.status);
});

try {
  const result = await executor.executeFlow(flow, context);
} catch (error) {
  console.error('Execution error:', error);
}
```

---

## 🔍 Validation

### Step Validation
The StepValidator ensures all steps are safe and valid before execution:

```javascript
import { StepValidator } from './rpa/executor/step-validator.js';

const validator = new StepValidator({ strictMode: true });

const validation = validator.validateStep(step);
if (!validation.valid) {
  console.error('Step validation failed:', validation.errors);
}
```

### Post-Condition Validation
The PostConditionValidator verifies DOM state after step execution:

```javascript
import { PostConditionValidator } from './rpa/executor/post-condition-validator.js';

const postValidator = new PostConditionValidator();

const result = await postValidator.validatePostConditions(step, executionResult);
if (!result.valid) {
  console.error('Post-conditions failed:', result.validations);
}
```

---

## 🛡️ Security Features

### Input Sanitization
- **Selector Sanitization**: Removes dangerous CSS patterns
- **URL Validation**: Blocks dangerous protocols (javascript:, data:)
- **Text Sanitization**: Removes script tags and event handlers
- **Template Variable Validation**: Prevents reserved variable names

### Execution Safety
- **Deterministic Execution**: No improvisation or dynamic code execution
- **Timeout Protection**: Maximum timeout limits prevent hanging
- **Retry Limits**: Configurable retry attempt limits
- **Strict Mode**: Enforces post-condition validation

### XSS Prevention
```javascript
// Dangerous selectors are blocked
const dangerousSelector = 'img[src="javascript:alert(1)"]';
// ❌ Will be rejected by validator

// Safe selectors are allowed
const safeSelector = '#login-button';
// ✅ Will be accepted by validator
```

---

## 📊 Result Format

### Step Result
```javascript
{
  stepId: 'fill_username',
  status: 'success',
  duration_ms: 1250,
  result: {
    action: 'fill',
    selector: '#username',
    value: 'user@example.com',
    tagName: 'INPUT'
  },
  timestamp: '2026-01-27T10:30:00.000Z'
}
```

### Flow Result
```javascript
{
  flowId: 'login_flow',
  status: 'success',
  steps: [/* step results */],
  duration_ms: 5430,
  context: {
    username: 'user@example.com',
    password: 'securepassword123',
    step_fill_username_result: { /* result data */ }
  }
}
```

### Error Result
```javascript
{
  stepId: 'click_login',
  status: 'failure',
  duration_ms: 3000,
  error: {
    code: 'element_not_found',
    message: 'Element not found within 5000ms: #login-button',
    step: { /* step definition */ },
    index: 3
  },
  timestamp: '2026-01-27T10:30:05.000Z'
}
```

---

## 🔄 Event System

### Execution Events
- `execution:started` - Flow execution begins
- `execution:completed` - Flow execution ends
- `execution:failed` - Flow execution fails
- `execution:stopped` - Flow execution stopped manually
- `execution:error` - Unexpected error during execution

### Step Events
- `step:started` - Step execution begins
- `step:completed` - Step execution completes
- `step:retry` - Step retry attempt
- `step:failed` - Step execution fails

### Validation Events
- `validation:started` - Validation begins
- `validation:completed` - Validation completes
- `validation:failed` - Validation fails

---

## 🧪 Testing

### Unit Testing
```javascript
// Test step validation
const validator = new StepValidator();
const result = validator.validateStep(validStep);
assert(result.valid, 'Step should be valid');

// Test post-condition validation
const postValidator = new PostConditionValidator();
const result = await postValidator.validateElementExists('#button', true);
assert(result.passed, 'Element should exist');
```

### Integration Testing
```javascript
// Test complete flow execution
const executor = createRPAExecutor();
const result = await executor.executeFlow(testFlow, testContext);
assert(result.status === 'success', 'Flow should execute successfully');
```

### E2E Testing
```javascript
// Test with real browser automation
const executor = createRPAExecutor({ screenshotOnFailure: true });
const result = await executor.executeFlow(realFlow, realContext);
assert(result.status === 'success', 'Real flow should execute successfully');
```

---

## 📈 Performance

### Optimization Features
- **Element Caching**: Cache element lookups within steps
- **Smart Waiting**: Dynamic waiting based on page load state
- **Batch Operations**: Group related DOM operations
- **Memory Management**: Cleanup resources after execution

### Performance Metrics
```javascript
const status = executor.getExecutionStatus();
console.log('Execution metrics:', {
  isExecuting: status.isExecuting,
  currentStep: status.currentStep?.id,
  resultHistory: status.resultHistory.length
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### Element Not Found
```javascript
// ❌ Problem: Element not found
{
  error: {
    code: 'element_not_found',
    message: 'Element not found within 5000ms: #button'
  }
}

// ✅ Solution: Increase timeout or check selector
{
  action: 'click',
  selector: '#submit-button',
  timeout_ms: 10000  // Increased timeout
}
```

#### Post-Condition Failed
```javascript
// ❌ Problem: Post-condition validation failed
{
  error: {
    code: 'post_condition_failed',
    message: 'Element not visible: #success-message'
  }
}

// ✅ Solution: Add wait or adjust condition
{
  action: 'click',
  selector: '#submit',
  post_condition: {
    element_visible: true,
    selector: '#success-message'
  }
}
```

#### Template Variable Not Found
```javascript
// ❌ Problem: Template variable not resolved
{
  error: {
    code: 'template_variable_not_found',
    message: 'Template variable not found: username'
  }
}

// ✅ Solution: Provide variable in context
const context = { username: 'user@example.com' };
```

### Debug Mode
```javascript
// Enable detailed logging
const executor = createRPAExecutor({
  screenshotOnFailure: true,
  strictMode: false  // Allow execution with warnings
});

executor.on('step:started', (data) => {
  console.log('Step started:', data.step);
});

executor.on('step:completed', (data) => {
  console.log('Step completed:', data.result);
});
```

---

## 📚 Best Practices

### 1. Use Specific Selectors
```javascript
// ❌ Too generic
selector: 'button'

// ✅ Specific and stable
selector: '#login-submit-button'
```

### 2. Add Post-Conditions
```javascript
// ❌ No verification
{
  action: 'click',
  selector: '#submit'
}

// ✅ Verify result
{
  action: 'click',
  selector: '#submit',
  post_condition: {
    element_visible: true,
    selector: '#success-message'
  }
}
```

### 3. Handle Dynamic Content
```javascript
// ❌ Fixed timeout
{
  action: 'wait_for',
  selector: '#dynamic-content',
  timeout_ms: 5000
}

// ✅ Wait with conditions
{
  action: 'wait_for',
  selector: '#dynamic-content',
  timeout_ms: 10000,
  post_condition: {
    element_visible: true
  }
}
```

### 4. Use Template Variables
```javascript
// ❌ Hardcoded values
{
  action: 'fill',
  selector: '#username',
  value: 'user@example.com'
}

// ✅ Dynamic values
{
  action: 'fill',
  selector: '#username',
  value: '{{username}}'
}
```

---

## 🔄 Migration Guide

### From Legacy Action Blocks
```javascript
// Legacy format
{
  type: 'click',
  target: '#button',
  timeout: 5000
}

// New format
{
  id: 'click_button',
  action: 'click',
  selector: '#button',
  timeout_ms: 5000
}
```

### From Simple Executor
```javascript
// Legacy executor
await simpleExecutor.executeStep('click', '#button');

// New executor
const step = {
  id: 'click_button',
  action: 'click',
  selector: '#button'
};
await executor.executeStep(step, 0);
```

---

*This documentation is maintained as part of the RPA system development. All changes should be documented with appropriate examples.*