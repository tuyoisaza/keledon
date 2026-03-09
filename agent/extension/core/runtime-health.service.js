// ==============================
// KELEDON Runtime Health Service
// Evaluates system health for UI LED indicators
// ==============================

class RuntimeHealthService {
  constructor() {
    this.state = {
      sw: 'red',
      ws: 'red',
      stt: 'red',
      tts: 'red',
      rtc: 'red',
      agent: 'red'
    };
    
    this.listeners = [];
    this.initialized = false;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.state));
  }

  async evaluate() {
    const newState = {
      sw: await this._evaluateServiceWorker(),
      ws: await this._evaluateWebSocket(),
      stt: this._evaluateSTT(),
      tts: this._evaluateTTS(),
      rtc: this._evaluateWebRTC(),
      agent: this._evaluateAgent()
    };

    const changed = JSON.stringify(newState) !== JSON.stringify(this.state);
    this.state = newState;
    
    if (changed || !this.initialized) {
      this.initialized = true;
      this.notify();
    }

    return this.state;
  }

  async _evaluateServiceWorker() {
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
          if (response && response.type === 'PONG') {
            resolve('green');
          } else {
            resolve('red');
          }
        });
        
        setTimeout(() => resolve('red'), 3000);
      });
    } catch {
      return 'red';
    }
  }

  async _evaluateWebSocket() {
    return new Promise((resolve) => {
      const backendUrl = this._getBackendUrl();
      const wsUrl = backendUrl.replace('http', 'ws') + '/agent';
      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          ws.close();
        }
      };

      ws.onopen = () => {
        resolve('green');
        cleanup();
      };

      ws.onerror = () => {
        resolve('red');
        cleanup();
      };

      ws.onclose = () => {
        if (!resolved) {
          resolved = true;
          resolve('red');
        }
      };

      setTimeout(() => {
        if (!resolved) {
          resolve('yellow');
          cleanup();
        }
      }, 5000);
    });
  }

  _evaluateSTT() {
    const provider = window.keledonConfig?.sttProvider || localStorage.getItem('sttProvider');
    
    if (!provider) return 'yellow';
    if (provider === 'webspeech-stt') return 'green';
    if (provider.includes('mock') || provider.includes('demo')) return 'red';
    
    return 'green';
  }

  _evaluateTTS() {
    const provider = window.keledonConfig?.ttsProvider || localStorage.getItem('ttsProvider');
    
    if (!provider) return 'yellow';
    if (provider === 'webspeech-tts') return 'green';
    if (provider.includes('mock') || provider.includes('demo')) return 'red';
    
    return 'green';
  }

  _evaluateWebRTC() {
    if (window.keledonTabAudioStream && window.keledonTabAudioStream.active) {
      return 'green';
    }
    
    if (window.keledonAudioContext) {
      return 'yellow';
    }

    return 'red';
  }

  _evaluateAgent() {
    const isActive = localStorage.getItem('agentActive');
    
    if (isActive === 'false') return 'red';
    if (isActive === 'true') return 'green';
    
    return 'yellow';
  }

  _getBackendUrl() {
    const backendInput = document.getElementById('backendUrl');
    if (backendInput && backendInput.value) {
      return backendInput.value;
    }
    return 'http://localhost:3001';
  }

  getState() {
    return { ...this.state };
  }
}

const runtimeHealth = new RuntimeHealthService();

if (typeof window !== 'undefined') {
  window.runtimeHealth = runtimeHealth;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RuntimeHealthService, runtimeHealth };
}
