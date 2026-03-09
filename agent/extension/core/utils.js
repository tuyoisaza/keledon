// ==============================
// KELEDON Extension Utilities
// Best practices: validation, error handling, debounce
// ==============================

const KELEDON_UTILS = {
  // Input validation
  sanitizeString(str, maxLength = 10000) {
    if (typeof str !== 'string') return '';
    return str.slice(0, maxLength).replace(/[<>]/g, '');
  },

  isValidUrl(url) {
    if (typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },

  isValidSessionId(sessionId) {
    if (typeof sessionId !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
  },

  isValidDecisionId(decisionId) {
    if (typeof decisionId !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decisionId);
  },

  // Object validation
  isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },

  hasRequiredKeys(obj, keys) {
    if (!this.isObject(obj)) return false;
    return keys.every(key => key in obj && obj[key] !== undefined);
  },

  // Error handling wrapper
  async safeAsync(promise, errorMessage = 'Operation failed') {
    try {
      const result = await promise;
      return { success: true, data: result };
    } catch (error) {
      console.error(`[KELEDON-ERROR] ${errorMessage}:`, error);
      return { success: false, error: error.message || errorMessage };
    }
  },

  wrapErrorHandler(fn, errorMessage = 'Function failed') {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        console.error(`[KELEDON-ERROR] ${errorMessage}:`, error);
        return null;
      }
    };
  },

  // Debounce utility
  debounce(fn, delay = 300) {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  // Throttle utility
  throttle(fn, limit = 300) {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memory-safe logging
  createLogger(prefix = 'KELEDON') {
    const MAX_LOGS = 100;
    const logs = [];
    
    return {
      log(level, message) {
        const entry = {
          timestamp: new Date().toISOString(),
          level,
          message: this._sanitize(message)
        };
        logs.push(entry);
        if (logs.length > MAX_LOGS) logs.shift();
        
        const logFn = level === 'error' ? console.error : 
                      level === 'warning' ? console.warn : console.log;
        logFn(`[${prefix}] ${level.toUpperCase()}: ${entry.message}`);
      },
      
      _sanitize(msg) {
        if (typeof msg !== 'string') return String(msg);
        return msg.replace(/[<>'"]/g, '');
      },
      
      getLogs() {
        return [...logs];
      },
      
      clear() {
        logs.length = 0;
      }
    };
  },

  // Storage with quota handling
  async safeStorageSet(key, value, maxSize = 100000) {
    const serialized = JSON.stringify(value);
    if (serialized.length > maxSize) {
      console.warn(`[KELEDON] Storage value for ${key} exceeds ${maxSize} bytes`);
      return { success: false, error: 'Value too large' };
    }
    
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  },

  // Generate correlation ID for tracing
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
};

// Export for use in other files
if (typeof window !== 'undefined') {
  window.KELEDON_UTILS = KELEDON_UTILS;
}
