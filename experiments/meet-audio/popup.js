'use strict';
document.getElementById('activate').onclick = async () => {
  const output = document.getElementById('status');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) { output.textContent = 'Solo páginas HTTP(S) autorizadas. No páginas internas del navegador.'; return; }
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['surface-dom.js', 'surface-link.js'], world: 'ISOLATED' });
    output.textContent = 'Panel disponible. Conecta con Brain desde la página.';
  } catch { output.textContent = 'El navegador no permite activar esta superficie. No se ha concedido acceso adicional.'; }
};
