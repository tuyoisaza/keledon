/**
 * Evidence Collector - Collects and reports execution evidence to Cloud
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Evidence {
  type: 'screenshot' | 'log' | 'metric' | 'error';
  timestamp: string;
  data: unknown;
  sessionId?: string;
  executionId?: string;
}

export interface ExecutionEvidence {
  execution_id: string;
  session_id: string;
  device_id: string;
  timestamp: string;
  screenshots: string[];
  logs: string[];
  metrics: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    execution_time_ms: number;
  };
}

export class EvidenceCollector {
  private evidenceDir: string;
  private currentSessionId: string | null = null;
  private currentExecutionId: string | null = null;
  private buffer: Evidence[] = [];

  constructor(dataDir: string) {
    this.evidenceDir = path.join(dataDir, 'evidence');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
    }
  }

  setSession(sessionId: string, executionId?: string): void {
    this.currentSessionId = sessionId;
    this.currentExecutionId = executionId || null;
  }

  clearSession(): void {
    this.currentSessionId = null;
    this.currentExecutionId = null;
  }

  addScreenshot(screenshotData: string): void {
    const evidence: Evidence = {
      type: 'screenshot',
      timestamp: new Date().toISOString(),
      data: screenshotData,
      sessionId: this.currentSessionId || undefined,
      executionId: this.currentExecutionId || undefined
    };

    this.buffer.push(evidence);
    this.saveEvidence(evidence);
  }

  addLog(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
    const evidence: Evidence = {
      type: 'log',
      timestamp: new Date().toISOString(),
      data: { level, message, ...meta },
      sessionId: this.currentSessionId || undefined,
      executionId: this.currentExecutionId || undefined
    };

    this.buffer.push(evidence);
    this.saveEvidence(evidence);
  }

  addMetric(name: string, value: number, unit?: string): void {
    const evidence: Evidence = {
      type: 'metric',
      timestamp: new Date().toISOString(),
      data: { name, value, unit },
      sessionId: this.currentSessionId || undefined,
      executionId: this.currentExecutionId || undefined
    };

    this.buffer.push(evidence);
  }

  addError(error: Error | string, context?: unknown): void {
    const evidence: Evidence = {
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context
      },
      sessionId: this.currentSessionId || undefined,
      executionId: this.currentExecutionId || undefined
    };

    this.buffer.push(evidence);
    this.saveEvidence(evidence);
  }

  private saveEvidence(evidence: Evidence): void {
    const filename = `${evidence.type}-${Date.now()}.json`;
    const filepath = path.join(this.evidenceDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(evidence, null, 2));
  }

  getEvidence(sessionId?: string): Evidence[] {
    if (sessionId) {
      return this.buffer.filter(e => e.sessionId === sessionId);
    }
    return [...this.buffer];
  }

  async uploadEvidence(deviceId: string, cloudUrl: string, authToken: string): Promise<void> {
    const files = fs.readdirSync(this.evidenceDir);
    const evidenceFiles = files.filter(f => f.endsWith('.json'));

    for (const file of evidenceFiles) {
      const filepath = path.join(this.evidenceDir, file);
      const evidence = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

      try {
        await fetch(`${cloudUrl}/api/evidence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            device_id: deviceId,
            ...evidence
          })
        });

        fs.unlinkSync(filepath);
      } catch (error) {
        console.error(`Failed to upload evidence ${file}:`, error);
      }
    }
  }

  getEvidenceSummary(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const evidence of this.buffer) {
      byType[evidence.type] = (byType[evidence.type] || 0) + 1;
    }

    return {
      total: this.buffer.length,
      byType
    };
  }

  clear(): void {
    this.buffer = [];
  }
}