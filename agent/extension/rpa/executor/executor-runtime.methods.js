export class ExecutorRuntimeMethods {
  async takeScreenshot() {
    try {
      // Create offscreen canvas for screenshot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get viewport dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the current page
      ctx.drawImage(window.document.body, 0, 0, width, height);
      
      // Convert to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.warn('Failed to take screenshot:', error);
      return null;
    }
  }

  /**
   * Validate URL
   */
  isValidUrl(url) {
    if (typeof url !== 'string' || !url.trim()) return false;
    const value = url.trim();
    if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
      return true;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in RPA executor event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Get execution status
   */
  getExecutionStatus() {
    return {
      isExecuting: this.isExecuting,
      currentFlow: this.currentFlow,
      currentStep: this.currentStep,
      context: this.executionContext,
      resultHistory: [...this.resultHistory]
    };
  }

  /**
   * Stop current execution
   */
  stopExecution(reason = 'manual_stop') {
    if (!this.isExecuting) return;

    this.emit('execution:stopping', { reason });
    
    // The actual stop will happen in the execution loop
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isExecuting = false;
    this.currentFlow = null;
    this.currentStep = null;
    this.executionContext = {};
    // Don't clear resultHistory - it's useful for debugging
  }
}
