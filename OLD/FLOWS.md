# KELEDON FLOWS & ACTION BLOCKS V1

## 1. The "Flow" Concept
A **Flow** is a JSON-serializable sequence of atomic **Action Blocks**.
The Agent receives a Flow (or looks it up by ID) and executes it sequentially using the `auto-dev-keledon` principles: **Deterministic**, **Atomic**, **Failable**.

## 2. JSON Structure
```json
{
  "id": "salesforce_case_creation_v1",
  "name": "Create Case in Salesforce",
  "steps": [
    {
      "id": "step_1",
      "action": "wait_for",
      "selector": "#new-case-btn",
      "timeout_ms": 5000
    },
    {
      "id": "step_2",
      "action": "click",
      "selector": "#new-case-btn"
    },
    {
      "id": "step_3",
      "action": "fill",
      "selector": "input[name='subject']",
      "value": "{{incident_summary}}" // Variable injected by Cloud
    }
  ]
}
```

## 3. Action Blocks Catalog

| Action | Params | Description | Validation |
| :--- | :--- | :--- | :--- |
| **CLICK** | `selector` | Clicks an element. | Element must be visible and clickable. |
| **FILL** | `selector`, `value` | Types text into an input. | Value matches input state post-typing. |
| **READ** | `selector`, `attribute` | Reads text or attribute. | Element must exist. Returns data. |
| **WAIT** | `selector`, `timeout` | Waits for element presence/absence. | Timeout triggers FAILURE. |
| **NAVIGATE**| `url` | Goes to a URL. | Page load event fires. |
| **SELECT** | `selector`, `option` | Selects from a dropdown. | Option must exist. |
| **ASSERT** | `selector`, `text` | Verifies text content. | Text must match (exact or regex). |

## 4. Execution Rules
1.  **Linearity**: No loops or conditionals in the Agent. Logic lives in Cloud.
2.  **Context**: The Browser Agent executes in the context of the *currently active tab* unless specified otherwise.
3.  **Variables**: All variables (`{{value}}`) must be resolved by the Cloud *before* sending the payload or passed in the `params` object of `EXECUTE_FLOW`.
