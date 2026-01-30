/**
 * Result Reporter
 * 
 * Provides contract-compliant result reporting for RPA execution
 * with detailed metrics, evidence collection, and audit trail.
 */

import { RPAResult, RPAStep } from '../../../contracts/v1';

export interface ExecutionMetrics {
  execution_time_ms: number;
  memory_usage_before?: number;
  memory_usage_after?: number;
  network_requests?: number;
  dom_changes?: number;
  scroll_events?: number;
}

export interface EvidenceCollector {
  screenshot?: string;
  html_snapshot?: string;
  element_properties?: any;
  page_state?: any;
  console_logs?: string[];
}

export class ResultReporter {
  private metrics: ExecutionMetrics = {} as ExecutionMetrics;
  private evidence: EvidenceCollector = {} as EvidenceCollector;

  constructor() {
    this.initializeMetrics();
  }

  formatResult(resultData: {
    step_id: string;
    status: 'success' | 'failure';
    evidence: string;
    rollback_performed: boolean;
    execution_time_ms: number;
    error_details?: any;
  }): RPAResult {
    
    // Collect execution metrics
    const metrics = this.collectMetrics();
    
    // Collect evidence
    const evidence = this.collectEvidence(resultData.step_id);
    
    // Create contract-compliant result
    const result: RPAResult = {
      step_id: resultData.step_id,
      status: resultData.status,
      evidence: resultData.evidence,
      rollback_performed: resultData.rollback_performed,
      execution_time_ms: resultData.execution_time_ms,
      metrics: {
        memory_usage_mb: metrics.memory_usage_after ? 
          Math.round(metrics.memory_usage_after / 1024 / 1024) : undefined,
        dom_elements: document.querySelectorAll('*').length,
        network_requests: metrics.network_requests,
        scroll_events: metrics.scroll_events
      },
      error_details: resultData.error_details,
      audit_trail: this.createAuditTrail(resultData),
      timestamp: new Date().toISOString()
    };

    return result;
  }

  private initializeMetrics(): void {
    // Capture initial state
    this.metrics.memory_usage_before = this.getMemoryUsage();
    this.metrics.network_requests = 0;
    this.metrics.dom_changes = 0;
    this.metrics.scroll_events = 0;

    // Set up monitoring
    this.setupMonitoring();
  }

  private collectMetrics(): ExecutionMetrics {
    return {
      execution_time_ms: 0, // Will be set by caller
      memory_usage_before: this.metrics.memory_usage_before,
      memory_usage_after: this.getMemoryUsage(),
      network_requests: this.metrics.network_requests,
      dom_changes: this.metrics.dom_changes,
      scroll_events: this.metrics.scroll_events
    };
  }

  private collectEvidence(stepId: string): EvidenceCollector {
    const evidence: EvidenceCollector = {};

    // Get element properties if element exists
    const element = document.querySelector(`[data-step-id="${stepId}"]`);
    if (element) {
      evidence.element_properties = this.getElementProperties(element);
    }

    // Capture page state
    evidence.page_state = {
      url: window.location.href,
      title: document.title,
      ready_state: document.readyState,
      scroll_position: {
        x: window.scrollX,
        y: window.scrollY
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    // Collect console logs (if available)
    if (console && console.log) {
      // Note: In a real implementation, you'd need to set up console logging capture
      evidence.console_logs = [];
    }

    return evidence;
  }

  private getElementProperties(element: Element): any {
    const props: any = {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100),
      visible: this.isElementVisible(element),
      bounding_rect: element.getBoundingClientRect(),
      attributes: {}
    };

    // Collect all attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      props.attributes[attr.name] = attr.value;
    }

    // Add input-specific properties
    if (element instanceof HTMLInputElement) {
      props.input_type = element.type;
      props.value = element.value;
      props.disabled = element.disabled;
      props.readonly = element.readOnly;
      props.required = element.required;
    }

    // Add select-specific properties
    if (element instanceof HTMLSelectElement) {
      props.value = element.value;
      props.multiple = element.multiple;
      props.disabled = element.disabled;
      props.options = Array.from(element.options).map(opt => ({
        value: opt.value,
        text: opt.text,
        selected: opt.selected
      }));
    }

    return props;
  }

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  private getMemoryUsage(): number {
    // Try to get memory usage from performance API
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private setupMonitoring(): void {
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      this.metrics.network_requests++;
      return originalFetch.apply(window, args);
    };

    // Monitor DOM changes
    const observer = new MutationObserver(() => {
      this.metrics.dom_changes++;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Monitor scroll events
    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.metrics.scroll_events++;
      }, 100);
    });
  }

  private createAuditTrail(resultData: any): any[] {
    const trail = [
      {
        timestamp: new Date().toISOString(),
        event: 'step_execution_started',
        details: {
          step_id: resultData.step_id,
          action: 'unknown' // Would be populated from step data
        }
      },
      {
        timestamp: new Date().toISOString(),
        event: 'step_execution_completed',
        details: {
          step_id: resultData.step_id,
          status: resultData.status,
          execution_time_ms: resultData.execution_time_ms,
          rollback_performed: resultData.rollback_performed
        }
      }
    ];

    if (resultData.status === 'failure' && resultData.error_details) {
      trail.push({
        timestamp: new Date().toISOString(),
        event: 'error_occurred',
        details: resultData.error_details
      });
    }

    return trail;
  }

  // Public method to generate summary report
  public generateSummaryReport(results: RPAResult[]): any {
    const totalSteps = results.length;
    const successfulSteps = results.filter(r => r.status === 'success').length;
    const failedSteps = results.filter(r => r.status === 'failure').length;
    const totalExecutionTime = results.reduce((sum, r) => sum + r.execution_time_ms, 0);
    const rollbackCount = results.filter(r => r.rollback_performed).length;

    return {
      summary: {
        total_steps: totalSteps,
        successful_steps: successfulSteps,
        failed_steps: failedSteps,
        success_rate: totalSteps > 0 ? (successfulSteps / totalSteps * 100).toFixed(2) + '%' : '0%',
        total_execution_time_ms: totalExecutionTime,
        average_execution_time_ms: totalSteps > 0 ? Math.round(totalExecutionTime / totalSteps) : 0,
        rollback_count: rollbackCount,
        rollback_rate: totalSteps > 0 ? (rollbackCount / totalSteps * 100).toFixed(2) + '%' : '0%'
      },
      performance_metrics: {
        total_memory_usage_mb: this.calculateTotalMemoryUsage(results),
        total_network_requests: this.calculateTotalNetworkRequests(results),
        total_dom_changes: this.calculateTotalDOMChanges(results)
      },
      error_analysis: this.analyzeErrors(results),
      timestamp: new Date().toISOString()
    };
  }

  private calculateTotalMemoryUsage(results: RPAResult[]): number {
    // Calculate average memory usage across all results
    const memoryUsages = results
      .map(r => r.metrics?.memory_usage_mb)
      .filter(m => m !== undefined) as number[];
    
    return memoryUsages.length > 0 ? 
      Math.round(memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length) : 0;
  }

  private calculateTotalNetworkRequests(results: RPAResult[]): number {
    return results.reduce((sum, r) => sum + (r.metrics?.network_requests || 0), 0);
  }

  private calculateTotalDOMChanges(results: RPAResult[]): number {
    return results.reduce((sum, r) => sum + (r.metrics?.dom_changes || 0), 0);
  }

  private analyzeErrors(results: RPAResult[]): any {
    const errors = results.filter(r => r.status === 'failure');
    const errorTypes = new Map<string, number>();

    errors.forEach(result => {
      const errorType = result.error_details?.type || 'UNKNOWN';
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });

    return {
      total_errors: errors.length,
      error_types: Object.fromEntries(errorTypes),
      most_common_error: this.getMostCommonError(errorTypes)
    };
  }

  private getMostCommonError(errorTypes: Map<string, number>): string {
    let maxCount = 0;
    let mostCommon = 'None';

    errorTypes.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = type;
      }
    });

    return mostCommon;
  }
}