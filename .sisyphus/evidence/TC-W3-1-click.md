# TC-W3-1: RPA Template - Click Action

## Test Case Summary
| Field | Value |
|-------|-------|
| Test ID | TC-W3-1 |
| Wave | 3 |
| Objective | Verify click action executes on target element |

## Prerequisites
- Mock vendor portal page loaded
- Target element: `#vendor-status-btn` exists

## Test Steps

### Step 1: Execute Click via RPAStepExecutor
```javascript
const step = {
  action: 'click',
  selector: '#vendor-status-btn',
  timeout: 5000
};

const executor = new RPAStepExecutor(sessionManager);
await executor.execute(step);
```

### Step 2: Verify Element Clicked
```javascript
// Element should have been clicked (verify via mock or test hook)
const clicked = await page.evaluate(() => {
  const btn = document.getElementById('vendor-status-btn');
  return btn && btn.dataset.clicked === 'true';
});
assert(clicked === true);
```

## Expected Results
| Check | Pass Condition |
|-------|---------------|
| Step accepted | `executor.status === 'executing'` |
| Element found | Selector resolves to DOM element |
| Click executed | Element received click event |
| Post-validate | Element state changed as expected |

## Evidence Artifacts
- RPA execution log: `TC-W3-1-rpa-log.json`

## Error Scenarios
| Scenario | Expected Behavior |
|----------|-----------------|
| Element not found | Rollback triggered, error reported |
| Timeout | Retry up to 3 attempts |
| Unexpected error | Stop execution, capture stack |