// Log messages storage (defined early)
const logMessages = [];

function addLogMessage(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  logMessages.push(logEntry);

  const logsContent = document.getElementById('logs-content');
  if (logsContent) {
    const logElement = document.createElement('div');
    logElement.className = `log-entry ${level}`;
    logElement.textContent = logEntry;
    logsContent.appendChild(logElement);
    logsContent.scrollTop = logsContent.scrollHeight;

    if (logsContent.children.length > 100) {
      logsContent.removeChild(logsContent.firstChild);
    }
  }
}

// Override console.log to also write to log panel
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function (...args) {
  originalLog.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addLogMessage('info', msg);
};

console.warn = function (...args) {
  originalWarn.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addLogMessage('warning', msg);
};

console.error = function (...args) {
  originalError.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addLogMessage('error', msg);
};

// ==============================
// Log Panel Setup (inside DOMContentLoaded)
// ==============================

// Log panel toggle
const logToggleBtn = document.getElementById('logToggleBtn');
if (logToggleBtn) {
  logToggleBtn.addEventListener('click', () => {
    const logPanel = document.getElementById('logPanel');
    if (logPanel) {
      const isHidden = logPanel.style.display === 'none' || logPanel.style.display === '';
      logPanel.style.display = isHidden ? 'flex' : 'none';
      addLogMessage('info', `Log panel ${isHidden ? 'opened' : 'closed'}`);
    }
  });
}

// Copy logs
const copyLogBtn = document.getElementById('copyLogBtn');
if (copyLogBtn) {
  copyLogBtn.addEventListener('click', () => {
    const logsText = logMessages.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      addLogMessage('info', 'Logs copied to clipboard');
    }).catch(err => {
      addLogMessage('error', 'Failed to copy logs: ' + err.message);
    });
  });
}

// Paste logs
const pasteLogBtn = document.getElementById('pasteLogBtn');
if (pasteLogBtn) {
  pasteLogBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      addLogMessage('info', '=== PASTED LOGS ===');
      text.split('\n').forEach(line => {
        addLogMessage('info', line);
      });
      addLogMessage('info', '=== END PASTED LOGS ===');
    } catch (err) {
      addLogMessage('error', 'Failed to paste logs: ' + err.message);
    }
  });
}

// Clear logs
const clearLogBtn = document.getElementById('clearLogBtn');
if (clearLogBtn) {
  clearLogBtn.addEventListener('click', () => {
    logMessages.length = 0;
    const logsContent = document.getElementById('logs-content');
    if (logsContent) {
      logsContent.innerHTML = '';
    }
    addLogMessage('info', 'Logs cleared');
  });
}

// Close log panel
const closeLogBtn = document.getElementById('closeLogBtn');
if (closeLogBtn) {
  closeLogBtn.addEventListener('click', () => {
    const logPanel = document.getElementById('logPanel');
    if (logPanel) {
      logPanel.style.display = 'none';
    }
  });
}

// ==============================

