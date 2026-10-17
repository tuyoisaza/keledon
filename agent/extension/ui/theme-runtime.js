(function initializeKeledonThemeRuntime() {
  const tokenKeys = ['background', 'foreground', 'primary', 'primaryForeground', 'accent', 'accentForeground', 'muted', 'mutedForeground', 'border', 'ring', 'popover', 'card', 'cardForeground', 'sidebar', 'sidebarForeground', 'sidebarActive'];
  const themes = ['light', 'dark', 'corporate'];

  async function loadPersistedTheme() {
    try {
      const status = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (value) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(value);
        });
      });
      if (!status?.cloudUrl) return false;
      const endpoint = new URL('/api/theme', status.cloudUrl);
      if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) return false;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      let response;
      try {
        response = await fetch(endpoint, { credentials: 'omit', signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) return false;
      const configuration = await response.json();
      if (typeof configuration?.corporateEnabled !== 'boolean' || !themes.every((theme) => tokenKeys.every((key) => /^#[0-9a-f]{6}$/i.test(configuration.presets?.[theme]?.[key] || '')))) return false;
      const style = document.getElementById('keledon-theme-runtime') || document.createElement('style');
      style.id = 'keledon-theme-runtime';
      style.textContent = themes.map((theme) => `:root[data-keledon-theme="${theme}"]{${tokenKeys.map((key) => `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${configuration.presets[theme][key]}`).join(';')}}`).join('\n');
      if (!style.isConnected) document.head.append(style);
      return true;
    } catch {
      // Shared preset defaults remain active when Cloud is unreachable or invalid.
      return false;
    }
  }

  globalThis.KeledonAgentTheme = { loadPersistedTheme };
  globalThis.KeledonAgentTheme.ready = loadPersistedTheme();
})();
