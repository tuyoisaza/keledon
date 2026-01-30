import type { CloudCommand, FlowStep, AgentEvent } from "../../background/protocol";
import { click, fill, resolveSelector } from "./actions";

async function waitVisible(selector: any, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = resolveSelector(selector);
    if (el && (el as HTMLElement).offsetParent !== null) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("timeout_wait_visible");
}

async function assertText(selector: any, equals: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = resolveSelector(selector);
    const text = (el as HTMLElement | null)?.innerText?.trim() ?? "";
    if (text === equals) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("assert_text_failed");
}

export async function runFlow(
  cmd: Extract<CloudCommand, { type: "run_flow" }>,
  emit: (e: AgentEvent) => void,
  platform: string | null
) {
  const { flow_run_id, steps } = cmd;

  try {
    for (const step of steps) {
      await runStep(step, flow_run_id, emit);
    }
    emit({ type: "flow_run_complete", flow_run_id, status: "success" });
    return true;
  } catch (err: any) {
    emit({ type: "flow_run_complete", flow_run_id, status: "failed", error: String(err?.message || err) });
    return false;
  }
}

async function runStep(step: FlowStep, flow_run_id: string, emit: (e: AgentEvent) => void) {
  const timeout = step.timeout_ms ?? 8000;

  try {
    if (step.action === "click") {
      await click(step.selector);
    } else if (step.action === "fill") {
      await fill(step.selector, step.value);
    } else if (step.action === "wait_visible") {
      await waitVisible(step.selector, timeout);
    } else if (step.action === "assert_text") {
      await assertText(step.selector, step.equals, timeout);
    } else if (step.action === "read_text") {
      const el = resolveSelector(step.selector);
      const text = (el as HTMLElement | null)?.innerText?.trim() ?? "";
      emit({
        type: "flow_step_result",
        flow_run_id,
        step_id: step.id,
        status: "success",
        evidence: { read: { [step.save_as]: text } }
      });
      return;
    }

    // expectation (post-condition)
    if ((step as any).expect?.kind === "visible") {
      await waitVisible((step as any).expect.selector, timeout);
    }
    if ((step as any).expect?.kind === "text_equals") {
      await assertText((step as any).expect.selector, (step as any).expect.equals, timeout);
    }

    emit({ type: "flow_step_result", flow_run_id, step_id: step.id, status: "success" });
  } catch (err: any) {
    emit({
      type: "flow_step_result",
      flow_run_id,
      step_id: step.id,
      status: "failed",
      error: String(err?.message || err)
    });
    throw err;
  }
}
