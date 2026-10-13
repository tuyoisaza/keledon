class PipelineBackend {
// STEP C: Backend Verification on Load
  // ==============================
  
  async initializeBackendConnectivity() {
    this.log('info', 'Initializing backend connectivity verification...');
    
    // Import the BackendConnectivityChecker from the main sidepanel
    // Since we're in a separate file, we'll create a simplified version
    this.backendUrl = (typeof window !== 'undefined' && window.AGENT_CONFIG?.BACKEND_URL) 
      || 'http://localhost:3001';
    this.backendConnected = false;
    this.serviceWorkerConnected = false;
    
    // Perform verification sequence on load
    await this.performBackendVerification();
  }

  async performBackendVerification() {
    this.log('info', '=== STARTING BACKEND VERIFICATION SEQUENCE ===');
    
    // Step 1: Check service worker connectivity
    await this.verifyServiceWorker();
    
    // Step 2: Check backend health
    await this.verifyBackendHealth();
    
    // Step 3: Perform roundtrip test
    await this.verifyBackendRoundtrip();
    
    // Step 4: Update UI based on results
    this.updateUIAfterVerification();
    
    this.log('info', '=== BACKEND VERIFICATION SEQUENCE COMPLETE ===');
  }

  async verifyServiceWorker() {
    this.log('info', 'Step 1: Verifying service worker connectivity...');
    
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Service worker timeout')), 5000);
        
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response) {
        this.serviceWorkerConnected = true;
        this.log('success', 'Service worker connectivity verified');
        this.log('info', `Service worker status: ${JSON.stringify(response)}`);
      } else {
        this.serviceWorkerConnected = false;
        this.log('error', 'Service worker not responding');
      }
      
    } catch (error) {
      this.serviceWorkerConnected = false;
      this.log('error', `Service worker verification failed: ${error.message}`);
    }
  }

  async verifyBackendHealth() {
    this.log('info', 'Step 2: Verifying backend health...');
    
    try {
      const healthUrl = `${this.backendUrl}/health`;
      this.log('info', `Checking backend health at: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.log('error', 'Backend health check timeout (5s)');
      }, 5000);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KELEDON-Pipeline/1.1.6'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        this.backendConnected = true;
        this.log('success', 'Backend health check successful');
        this.log('info', `Backend response: ${JSON.stringify(data)}`);
        
        // Validate response structure
        if (data && data.status === 'ok') {
          this.log('success', 'Backend status validation passed');
        } else {
          this.log('warning', 'Backend status validation failed - invalid response structure');
        }
      } else {
        this.backendConnected = false;
        this.log('error', `Backend health check failed: HTTP ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      this.backendConnected = false;
      this.log('error', `Backend health check error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        this.log('error', 'Backend health check timed out');
      } else if (error.name === 'TypeError') {
        this.log('error', 'Backend server likely not running or unreachable');
      }
    }
  }

  async verifyBackendRoundtrip() {
    this.log('info', 'Step 3: Verifying backend roundtrip...');
    
    if (!this.backendConnected) {
      this.log('warning', 'Skipping roundtrip test - backend not connected');
      return;
    }
    
    try {
      const nonce = this.generateUUID();
      const timestamp = new Date().toISOString();
      
      const requestPayload = {
        source: 'keledon-pipeline',
        timestamp: timestamp,
        nonce: nonce
      };
      
      const roundtripUrl = `${this.backendUrl}/agent/roundtrip-test`;
      this.log('info', `Sending roundtrip request to: ${roundtripUrl}`);
      this.log('info', `Request payload: ${JSON.stringify(requestPayload)}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.log('error', 'Backend roundtrip timeout (10s)');
      }, 10000);
      
      const startTime = Date.now();
      const response = await fetch(roundtripUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const responseData = await response.json();
        this.log('success', `Backend roundtrip successful in ${latency}ms`);
        this.log('info', `Roundtrip response: ${JSON.stringify(responseData)}`);
        
        // Validate response
        const validation = this.validateRoundtripResponse(responseData, nonce);
        if (validation.valid) {
          this.log('success', 'Roundtrip response validation passed');
        } else {
          this.log('error', `Roundtrip validation failed: ${validation.reason}`);
        }
      } else {
        this.log('error', `Backend roundtrip failed: HTTP ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      this.log('error', `Backend roundtrip error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        this.log('error', 'Backend roundtrip timed out');
      } else if (error.name === 'TypeError') {
        this.log('error', 'Backend roundtrip network error');
      }
    }
  }

  validateRoundtripResponse(response, expectedNonce) {
    if (typeof response !== 'object' || response === null) {
      return { valid: false, reason: 'Response is not an object' };
    }
    
    if (response.ok !== true) {
      return { valid: false, reason: `Missing or invalid 'ok' field (expected: true, got: ${response.ok})` };
    }
    
    if (!('echoNonce' in response)) {
      return { valid: false, reason: 'Missing required field: echoNonce' };
    }
    
    if (response.echoNonce !== expectedNonce) {
      return { valid: false, reason: `Nonce mismatch (sent: ${expectedNonce}, received: ${response.echoNonce})` };
    }
    
    if (!('receivedAt' in response)) {
      return { valid: false, reason: 'Missing required field: receivedAt' };
    }
    
    const receivedAt = new Date(response.receivedAt);
    if (isNaN(receivedAt.getTime())) {
      return { valid: false, reason: `Invalid receivedAt timestamp: ${response.receivedAt}` };
    }
    
    return { valid: true, reason: 'All validations passed' };
  }

  generateUUID() {
    return crypto.randomUUID();
  }

  updateUIAfterVerification() {
    this.log('info', 'Updating UI based on verification results...');
    
    // Update think and respond stages based on backend connectivity
    if (this.backendConnected && this.serviceWorkerConnected) {
      this.updateStage('think', 'active');
      this.updateStage('respond', 'active');
      this.log('success', 'Think and Respond stages enabled - backend verified');
    } else {
      this.updateStage('think', 'error');
      this.updateStage('respond', 'error');
      this.log('error', 'Think and Respond stages disabled - backend verification failed');
    }
    
    // Show retry button if backend failed
    if (!this.backendConnected) {
      this.addRetryBackendButton();
    }
    
    // Update truth state
    this.updateStageFromTruth();
  }

  addRetryBackendButton() {
    // Check if retry button already exists
    if (document.getElementById('retry-backend-btn')) {
      return;
    }
    
    const retryBtn = document.createElement('button');
    retryBtn.id = 'retry-backend-btn';
    retryBtn.className = 'debug-item';
    retryBtn.textContent = '🔄 Retry Backend Verification';
    retryBtn.style.background = 'var(--danger)';
    retryBtn.style.color = 'white';
    
    retryBtn.addEventListener('click', async () => {
      this.log('info', 'Manual backend retry requested by user');
      retryBtn.textContent = '🔄 Retrying...';
      retryBtn.disabled = true;
      
      await this.performBackendVerification();
      
      retryBtn.textContent = '🔄 Retry Backend Verification';
      retryBtn.disabled = false;
      
      // Remove button if successful
      if (this.backendConnected) {
        const debugMenu = document.getElementById('debug-menu');
        if (debugMenu && debugMenu.contains(retryBtn)) {
          debugMenu.removeChild(retryBtn);
        }
        this.log('success', 'Backend verification succeeded - retry button removed');
      }
    });
    
    // Add to debug menu
    const debugMenu = document.getElementById('debug-menu');
    const separator = document.createElement('div');
    separator.className = 'debug-separator';
    
    debugMenu.appendChild(separator);
    debugMenu.appendChild(retryBtn);
    
    this.log('info', 'Retry backend button added to debug menu');
  }

  // ==============================
  
}
registerPipelineMethods(PipelineBackend);

