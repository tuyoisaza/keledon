/* Production-only, user-triggered export of a fixed synthetic Spanish sample.
 * Existing session auth stays between KELEDON page and its allowlisted API.
 * No token/key/log extraction, provider settings writes or Meet credential bridge.
 */
(() => {
  'use strict';
  if (location.origin !== 'https://keledon.tuyoisaza.com' || location.pathname !== '/brain' || window.top !== window) return;
  const sampleText = 'Hola. Esta es la tercera interacción. Estoy hablando en español. La interacción anterior ya terminó. Por favor, confirma si me escuchas con claridad. Uno. Dos. Tres.';
  function teamSelection() {
    const matches = [...document.querySelectorAll('label')].filter(label =>
      label.querySelector('span')?.textContent.trim() === 'Team' && label.querySelector('select'));
    if (matches.length !== 1) return null;
    const select = matches[0].querySelector('select');
    return select.value && !select.disabled
      ? { id: select.value, label: select.selectedOptions[0]?.textContent || '' }
      : null;
  }
  function mount() {
    const host = document.createElement('aside');
    const root = host.attachShadow({ mode: 'open' });
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647';
    const style = document.createElement('style');
    style.textContent = ':host{font:14px system-ui;color:#fff}section{background:#17202a;border:2px solid #fff;border-radius:8px;padding:14px;max-width:360px}button{min-height:40px}p{white-space:pre-wrap}';
    const panel = document.createElement('section');
    panel.setAttribute('aria-label', 'KELEDON muestra TTS española');
    const title = document.createElement('strong');
    title.textContent = 'KELEDON · TTS de producción v0.2.1';
    const explanation = document.createElement('p');
    explanation.textContent = 'Genera una muestra ficticia en español con el TTS del equipo seleccionado en Brain. Descarga el audio; no lo reproduce localmente. No cambia proveedores.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Generar y descargar muestra española';
    const output = document.createElement('p');
    output.setAttribute('role', 'status');
    output.textContent = 'Selecciona TuyoMX en Brain antes de generar.';
    panel.append(title, explanation, button, output);
    root.append(style, panel);
    button.onclick = async () => {
      const selected = teamSelection();
      if (!selected) { output.textContent = 'Selecciona un equipo válido en Brain.'; return; }
      button.disabled = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const cancel = () => controller.abort();
      window.addEventListener('pagehide', cancel, { once: true });
      let stage = 'TTS';
      try {
        output.textContent = `Generando con el equipo ${selected.label}.`;
        // Use the existing authenticated web /tts/ proxy from services/web/nginx.conf.
        // No cross-origin credential forwarding, new upstream or provider bypass.
        const token = sessionStorage.getItem('auth_token');
        if (!token) { output.textContent = 'Inicia sesión directamente en KELEDON.'; return; }
        stage = 'TTS';
        const response = await fetch('/tts/speak', {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: sampleText, teamId: selected.id }),
        });
        if (!response.ok) { output.textContent = `TTS_HTTP_${response.status}`; return; }
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('audio/')) { output.textContent = 'TTS_AUDIO_TYPE_REFUSED'; return; }
        const blob = await response.blob();
        if (blob.size < 44 || blob.size > 8 * 1024 * 1024) { output.textContent = 'TTS_AUDIO_SIZE_REFUSED'; return; }
        if (teamSelection()?.id !== selected.id) { output.textContent = 'TEAM_CHANGED_AUDIO_DISCARDED'; return; }
        stage = 'DOWNLOAD';
        const url = URL.createObjectURL(blob);
        const download = document.createElement('a');
        download.href = url;
        download.download = contentType.includes('wav') ? 'keledon-prueba-es.wav' : 'keledon-prueba-es.mp3';
        panel.append(download);
        download.click();
        download.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        output.textContent = `Audio generado: ${blob.size} bytes. Descarga iniciada. Selecciónalo en el panel Meet. La escucha remota sigue pendiente.`;
      } catch {
        output.textContent = controller.signal.aborted ? 'TTS_TIMEOUT_OR_CANCELLED' : `${stage}_FAILED`;
      } finally {
        clearTimeout(timeout);
        window.removeEventListener('pagehide', cancel);
        button.disabled = false;
      }
    };
    document.body.append(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
