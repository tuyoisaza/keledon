class PipelineClickAudit {
// STEP B: Global Click Audit Implementation
  // ==============================
  
  setupGlobalClickAudit() {
    // Track click handlers to detect silent clicks
    this.clickHandlers = new Map();
    this.auditAllClicks();
    
    this.log('info', 'Global click audit system activated');
  }

  auditAllClicks() {
    // Global click listener that runs before any other handlers
    document.addEventListener('click', (event) => {
      const target = event.target;
      const elementId = target.id || '';
      const elementClass = target.className || '';
      const elementTag = target.tagName.toLowerCase();
      const dataAction = target.getAttribute('data-action') || '';
      
      // Create unique identifier for this element
      const elementKey = `${elementTag}${elementId ? '#' + elementId : ''}${elementClass ? '.' + elementClass.split(' ').join('.') : ''}`;
      
      // Log the click attempt
      const clickInfo = {
        element: elementKey,
        id: elementId,
        class: elementClass,
        tag: elementTag,
        dataAction,
        timestamp: new Date().toISOString(),
        x: event.clientX,
        y: event.clientY
      };
      
      // Check if this element has a registered click handler
      const hasHandler = this.clickHandlers.has(elementKey) || 
                        target.onclick || 
                        target.addEventListener ||
                        dataAction;
      
      // Log click attempt
      this.log('info', `CLICK-ATTEMPT: ${elementKey} | data-action: "${dataAction}" | handler: ${hasHandler ? 'yes' : 'NO'}`);
      
      // Set up a timeout to check if a handler actually executed
      setTimeout(() => {
        // If we reach here and no handler logged execution, it's a silent click
        if (!this.lastClickHandlerExecuted) {
          this.log('warning', `SILENT-CLICK-DETECTED: ${elementKey} - No handler executed within 100ms`);
          this.log('warning', `  Element details: ID="${elementId}", CLASS="${elementClass}", data-action="${dataAction}"`);
          
          // Try to determine why it might be silent
          if (!hasHandler) {
            this.log('warning', `  Reason: No click handler found on element`);
          } else if (target.disabled) {
            this.log('warning', `  Reason: Element is disabled`);
          } else if (window.getComputedStyle(target).pointerEvents === 'none') {
            this.log('warning', `  Reason: Element has pointer-events: none`);
          } else if (window.getComputedStyle(target).display === 'none') {
            this.log('warning', `  Reason: Element is hidden (display: none)`);
          } else if (window.getComputedStyle(target).visibility === 'hidden') {
            this.log('warning', `  Reason: Element is hidden (visibility: hidden)`);
          }
        }
        
        // Reset the flag
        this.lastClickHandlerExecuted = false;
      }, 100);
      
    }, true); // Use capture phase to catch clicks before other handlers
    
    // Override addEventListener to track click handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'click') {
        const elementKey = window.pipelineManager.getElementKey(this);
        window.pipelineManager.clickHandlers.set(elementKey, listener);
        
        // Wrap the listener to log execution
        const wrappedListener = function(event) {
          window.pipelineManager.lastClickHandlerExecuted = true;
          window.pipelineManager.log('info', `CLICK-HANDLER-EXECUTED: ${elementKey}`);
          return listener.call(this, event);
        };
        
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Track onclick property assignments
    let lastOnclickValue = null;
    Object.defineProperty(HTMLElement.prototype, 'onclick', {
      set: function(value) {
        lastOnclickValue = value;
        const elementKey = window.pipelineManager.getElementKey(this);
        
        if (value && typeof value === 'function') {
          window.pipelineManager.clickHandlers.set(elementKey, value);
          
          // Wrap the onclick handler
          this._onclick = function(event) {
            window.pipelineManager.lastClickHandlerExecuted = true;
            window.pipelineManager.log('info', `CLICK-ONCLICK-EXECUTED: ${elementKey}`);
            return value.call(this, event);
          };
        } else {
          this._onclick = null;
          window.pipelineManager.clickHandlers.delete(elementKey);
        }
      },
      get: function() {
        return this._onclick;
      }
    });
  }

  getElementKey(element) {
    if (!element) return 'unknown';
    
    const tag = element.tagName.toLowerCase();
    const id = element.id ? '#' + element.id : '';
    const classes = element.className ? '.' + element.className.split(' ').join('.') : '';
    
    return `${tag}${id}${classes}`;
  }

  // Method to manually register click handlers for audit
  registerClickHandler(element, handlerName) {
    const elementKey = this.getElementKey(element);
    this.clickHandlers.set(elementKey, handlerName);
    this.log('info', `CLICK-HANDLER-REGISTERED: ${elementKey} -> ${handlerName}`);
  }

  // Method to test click audit system
  testClickAudit() {
    this.log('info', 'Testing click audit system...');
    
    // Create a test button
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Click Audit';
    testBtn.id = 'test-click-audit-btn';
    testBtn.style.position = 'fixed';
    testBtn.style.top = '10px';
    testBtn.style.left = '10px';
    testBtn.style.zIndex = '9999';
    testBtn.style.background = '#ff6b6b';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.padding = '5px 10px';
    testBtn.style.borderRadius = '3px';
    testBtn.style.cursor = 'pointer';
    
    // Add a proper click handler
    testBtn.addEventListener('click', () => {
      this.log('success', 'Test click handler executed successfully');
      document.body.removeChild(testBtn);
    });
    
    document.body.appendChild(testBtn);
    
    this.log('info', 'Test button created - click it to verify audit system');
  }

  // ==============================
  
}
registerPipelineMethods(PipelineClickAudit);

