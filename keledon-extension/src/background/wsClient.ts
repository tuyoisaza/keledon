import type { AgentEvent, CloudCommand } from "./protocol";

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onCommand: (cmd: CloudCommand) => void;

  constructor(url: string, onCommand: (cmd: CloudCommand) => void) {
    this.url = url;
    this.onCommand = onCommand;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      // ok
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as CloudCommand;
        this.onCommand(msg);
      } catch {
        // ignore malformed
      }
    };
    this.ws.onclose = () => {
      // basic reconnect
      setTimeout(() => this.connect(), 1000);
    };
  }

  send(event: AgentEvent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(event));
  }
}
