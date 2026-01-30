import { WSClient } from "./wsClient";
import type { CloudCommand, AgentEvent } from "./protocol";

const AGENT_VERSION = "0.1.0";
const CAPABILITIES = ["dom_flows_v1"];

let ws: WSClient | null = null;

function getCloudWsUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["cloud_ws_url"], (res) => {
      resolve(res.cloud_ws_url || "ws://localhost:3000/agent");
    });
  });
}

async function ensureWS() {
  if (ws) return ws;
  const url = await getCloudWsUrl();
  ws = new WSClient(url, (cmd) => handleCloudCommand(cmd));
  ws.connect();
  ws.send({ type: "agent_hello", agent_version: AGENT_VERSION, capabilities: CAPABILITIES });
  return ws;
}

async function handleCloudCommand(cmd: CloudCommand) {
  if (cmd.type === "ping") return;

  if (cmd.type === "run_flow") {
    // send to active tab(s) that match host permissions
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { type: "run_flow", payload: cmd });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  // from content scripts -> forward to cloud
  if (msg?.type === "agent_event") {
    ensureWS().then((client) => client.send(msg.payload as AgentEvent));
  }
});
