/* Injected only after the extension action's activeTab gesture, in an isolated world. */
(() => {
  'use strict';
  if (globalThis.keledonSurfaceLink) return; globalThis.keledonSurfaceLink = true;
  const origin = 'https://keledon.tuyoisaza.com', protocol = 'keledon-surface-v1';
  let session = '', generation = 0, expires = 0, requested = false;
  const host = document.createElement('aside'); host.dataset.keledonControl = 'true'; host.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647';
  const box = document.createElement('section'); box.style.cssText = 'font:14px system-ui;background:#17202a;color:white;padding:12px;border:2px solid white;border-radius:8px;max-width:320px';
  const title = document.createElement('strong'); title.textContent = 'KELEDON · control de interfaz · 0.5.0';
  const output = document.createElement('p'); output.setAttribute('role', 'status'); output.textContent = 'Superficie sin autorizar. Abre esta ventana desde Brain.';
  const send = data => { if (window.opener && !window.opener.closed) window.opener.postMessage({ protocol, session, ...data }, origin); };
  const connect = document.createElement('button'); connect.textContent = 'Conectar esta interfaz con Brain'; connect.style.minHeight = '44px';
  connect.onclick = () => { if (!window.opener) { output.textContent = 'Abre la superficie autorizada desde Brain'; return; } requested = true; send({ type: 'ready' }); output.textContent = 'Esperando autorización del equipo en Brain'; };
  const stop = document.createElement('button'); stop.textContent = 'Detener control'; stop.style.minHeight = '44px';
  stop.onclick = () => { generation++; globalThis.keledonSurfaceEngine.close(); send({ type: 'closed' }); session = ''; output.textContent = 'Control detenido'; };
  box.append(title, output, connect, stop); host.attachShadow({ mode: 'open' }).append(box); document.body.append(host);
  window.addEventListener('message', event => {
    const d = event.data;
    if (!requested || event.source !== window.opener || event.origin !== origin || d?.protocol !== protocol) return;
    if (d.type === 'offer' && typeof d.session === 'string' && /^[a-f0-9-]{36}$/.test(d.session) && d.origin === location.origin && Number.isSafeInteger(d.generation)) {
      try { session = d.session; generation = d.generation; expires = d.expires; globalThis.keledonSurfaceEngine.open(d); output.textContent = 'Interfaz autorizada; controla desde Brain. Datos ficticios únicamente.'; send({ type: 'connected', generation }); } catch { output.textContent = 'Autorización inválida o caducada'; }
      return;
    }
    if (!session || d.session !== session) return;
    if (d.type === 'stop') { generation++; session = ''; globalThis.keledonSurfaceEngine.close(); output.textContent = 'Control liberado'; return; }
    if (d.type === 'cancel' && Number.isSafeInteger(d.generation) && d.generation > generation) { generation = d.generation; globalThis.keledonSurfaceEngine.close(); output.textContent = 'Acciones canceladas; vuelve a conectar para observar'; return; }
    if (d.type !== 'command' || d.generation !== generation || Date.now() >= expires || typeof d.commandId !== 'string' || !/^ui_[a-f0-9-]{36}$/.test(d.commandId)) return;
    const own = generation;
    void (async () => {
      try {
        const result = d.operation === 'observe' ? { code: 'OBSERVED', observation: globalThis.keledonSurfaceEngine.observe(), verified: false }
          : d.operation === 'act' ? await globalThis.keledonSurfaceEngine.act(d)
          : { code: 'UNSUPPORTED_OPERATION' };
        if (generation === own && session) send({ type: 'result', generation, commandId: d.commandId, result });
      } catch (error) { if (generation === own && session) send({ type: 'result', generation, commandId: d.commandId, result: { code: /^[A-Z_]{1,48}$/.test(error.message) ? error.message : 'EXECUTOR_UNAVAILABLE' } }); }
    })();
  });
  window.addEventListener('pagehide', () => { globalThis.keledonSurfaceEngine.close(); send({ type: 'closed' }); session = ''; });
})();
