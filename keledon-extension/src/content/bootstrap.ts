// src/content/bootstrap.ts
import { runFlow } from "./dom/flowRunner";
import { observeMutations } from "./dom/observe";

/**
 * --------- Types (local, minimal) ----------
 * We do NOT import Cloud logic here.
 * This file is execution-only.
 */

type AgentEvent =
  | {
      type: "page_context";
      url: string;
      platform: string | null;
    }
  | {
      type: "incoming_call_detected";
      platform: string;
      evidence?: any;
    }
  | {
      type: "flow_runtime_error";
      error: string;
    };

type RunFlowMessage = {
  type: "run_flow";
  payload: any; // validated in flowRunner
};

/**
 * --------- Utilities ----------
 */

function sendEvent(event: AgentEvent) {
  chrome.runtime.sendMessage({
    type: "agent_event",
    payload: event
  });
}

/**
 * --------- Platform Detection ----------
 * IMPORTANT:
 * - Deterministic
 * - No heuristics
 * - Based on hostname + known DOM anchors
 */

function detectPlatform(): string | null {
  const host = location.hostname;

  if (
    host.includes("genesyscloud") ||
    host.includes("mypurecloud")
  ) {
    return "genesys";
  }

  if (host.includes("salesforce")) {
    return "salesforce";
  }

  return null;
}

/**
 * --------- Incoming Call Detection (GENESYS - placeholder) ----------
 * This is intentionally simple and explicit.
 * It WILL be replaced later by a versioned PlatformProfile.
 */

function setupIncomingCallDetection(platform: string | null) {
  if (platform !== "genesys") return;

  observeMutations(() => {
    // NOTE:
    // This selector is a placeholder.
    // Replace with a STABLE selector (aria / data-test-id) once verified.
    const incomingBanner = document.querySelector(
      '[data-test-id="incoming-call"]'
    );

    if (incomingBanner) {
      sendEvent({
        type: "incoming_call_detected",
        platform: "genesys",
        evidence: {
          selector: '[data-test-id="incoming-call"]'
        }
      });
    }
  });
}

/**
 * --------- Message Listener ----------
 * Receives commands from:
 * - Popup Dev Panel
 * - Background Service Worker
 */

chrome.runtime.onMessage.addListener(
  async (message: RunFlowMessage, _sender, _sendResponse) => {
    try {
      if (message?.type !== "run_flow") return;

      const platform = detectPlatform();

      await runFlow(
        message.payload,
        (event) => sendEvent(event as AgentEvent),
        platform
      );
    } catch (err: any) {
      sendEvent({
        type: "flow_runtime_error",
        error: String(err?.message || err)
      });
    }
  }
);

/**
 * --------- Bootstrap ----------
 * Runs once when the content script loads.
 */

(function bootstrap() {
  const platform = detectPlatform();

  // 1. Report context to Cloud
  sendEvent({
    type: "page_context",
    url: location.href,
    platform
  });

  // 2. Setup platform-specific observers
  setupIncomingCallDetection(platform);
})();
