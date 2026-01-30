const textarea = document.getElementById("payload") as HTMLTextAreaElement;
const runBtn = document.getElementById("run") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLPreElement;

// Payload por defecto (ejemplo)
textarea.value = JSON.stringify(
  {
    type: "run_flow",
    flow_run_id: "dev-test-1",
    flow_id: "dummy_flow",
    version: "v1",
    variables: {},
    steps: [
      {
        id: "s1",
        action: "click",
        selector: { kind: "css", value: "button" },
        timeout_ms: 3000
      }
    ]
  },
  null,
  2
);

runBtn.onclick = async () => {
  status.textContent = "";

  let payload: any;
  try {
    payload = JSON.parse(textarea.value);
  } catch (e) {
    status.textContent = "❌ Invalid JSON";
    return;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  if (!tab?.id) {
    status.textContent = "❌ No active tab";
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    { type: "run_flow", payload },
    (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = "❌ " + chrome.runtime.lastError.message;
      } else {
        status.textContent = "✅ Flow sent";
      }
    }
  );
};
