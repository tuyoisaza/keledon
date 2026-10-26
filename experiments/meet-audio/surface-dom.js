/* Shared isolated-world DOM executor. No HTTP, credentials, model code, selectors or screenshots. */
(() => {
  'use strict';
  if (globalThis.keledonSurfaceEngine) return;
  let scope, revision = '', observedUrl = '', refs = new Map();
  const blocked = /password|passwd|contraseña|senha|token|secret|api.?key|credit.?card|tarjeta|cvv|otp|one.?time/i;
  const writes = /\b(save|submit|send|delete|remove|purchase|pay|transfer|publish|approve|authorize|guardar|enviar|eliminar|borrar|comprar|pagar|transferir|publicar|aprobar|autorizar|salvar|excluir)\b/i;
  const searchControl = e => /\b(search|find|lookup|buscar|busqueda|búsqueda|pesquisar|procurar)\b/i.test([e.type, e.getAttribute('role'), label(e)].join(' '));
  const visible = e => e instanceof e.ownerDocument.defaultView.HTMLElement && !!e.getClientRects().length && e.ownerDocument.defaultView.getComputedStyle(e).visibility !== 'hidden';
  const label = e => (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const sensitive = e => blocked.test([e.type, e.name, e.id, e.autocomplete, label(e)].join(' ')) || ['password','file','hidden'].includes(e.type);
  const role = e => e.getAttribute('role') || ({ A: 'link', BUTTON: 'button', INPUT: 'textbox', TEXTAREA: 'textbox', SELECT: 'combobox' }[e.tagName]) || e.tagName.toLowerCase();
  const fingerprint = e => JSON.stringify([e.tagName, role(e), label(e), e.disabled, e.readOnly, e.type, 'value' in e ? String(e.value).slice(0, 500) : '', e.getAttribute('href')]);
  function current() {
    if (!scope || Date.now() >= scope.expires || location.origin !== scope.origin) throw new Error('SURFACE_SCOPE_EXPIRED');
  }
  function open(grant) {
    if (!grant || grant.origin !== location.origin || !Number.isFinite(grant.expires) || grant.expires <= Date.now() || grant.expires > Date.now() + 125000) throw new Error('SURFACE_SCOPE_DENIED');
    scope = { origin: grant.origin, expires: grant.expires, allowInteraction: grant.allowInteraction === true };
    revision = ''; refs.clear(); return observe();
  }
  function actions(e) {
    const result = ['read'];
    if (typeof e.focus === 'function' && !e.disabled) result.push('focus');
    if (e.scrollHeight > e.clientHeight + 10) result.push('scroll');
    if (!scope.allowInteraction || e.disabled || sensitive(e)) return result;
    if (searchControl(e) && !e.readOnly && ((e.tagName === 'INPUT' && ['text','search'].includes(e.type)) || e.tagName === 'TEXTAREA')) result.push('fill');
    if (!writes.test(label(e)) && !e.closest('[contenteditable=true]')) {
      if (e.tagName === 'A' && !e.hasAttribute('download')) {
        try { const url = new URL(e.href); if (url.origin === scope.origin && !url.username && !url.password && ['https:','http:'].includes(url.protocol)) result.push('activate'); } catch { /* no script URLs */ }
      } else if (searchControl(e) && ((e.tagName === 'BUTTON' && e.type !== 'submit') || role(e) === 'button')) result.push('activate');
    }
    return result.slice(0, 5);
  }
  function observe() {
    current(); refs = new Map(); revision = crypto.randomUUID(); observedUrl = location.href;
    const elements = [], texts = [], visited = new Set(); let scanned = 0;
    function visit(root) {
      if (!root || visited.has(root) || scanned >= 1500 || elements.length >= 120) return;
      visited.add(root);
      for (const e of root.querySelectorAll('*')) {
        if (++scanned > 1500 || elements.length >= 120) break;
        if (!visible(e) || sensitive(e) || e.closest('[data-keledon-control]')) continue;
        const relevant = e.matches('a,button,input,textarea,select,[role],h1,h2,h3,p,label,td,dt,dd,[tabindex]');
        if (relevant) {
          const name = label(e), ref = `e${elements.length + 1}`;
          if (name || ['INPUT','TEXTAREA','SELECT'].includes(e.tagName)) {
            const value = ['INPUT','TEXTAREA','SELECT'].includes(e.tagName) ? String(e.value || '').slice(0, 500) : undefined;
            refs.set(ref, { element: e, fingerprint: fingerprint(e) });
            elements.push({ ref, role: role(e), name, ...(value !== undefined ? { value } : {}), actions: actions(e) });
            if (name && texts.join('\n').length < 3500) texts.push(name);
          }
        }
        if (e.shadowRoot) visit(e.shadowRoot);
        if (e.tagName === 'IFRAME') try { if (e.contentWindow.location.origin === scope.origin) visit(e.contentDocument); } catch { /* cross-origin frames need their own authorization/executor */ }
      }
    }
    visit(document);
    return { revision, text: texts.join('\n').slice(0, 4000), elements, capabilities: ['dom', 'open-shadow', 'same-origin-frames', 'ephemeral-refs', 'post-observation'] };
  }
  async function act(input) {
    current();
    const entry = refs.get(input?.action?.ref), a = input?.action;
    if (input?.revision !== revision || observedUrl !== location.href || !entry?.element.isConnected || fingerprint(entry.element) !== entry.fingerprint || !actions(entry.element).includes(a?.type)) throw new Error('STALE_OBSERVATION');
    const e = entry.element;
    if (!['read','navigate','search'].includes(a.effect) || (['fill','activate'].includes(a.type) && !scope.allowInteraction)) throw new Error('ACTION_POLICY_DENIED');
    if (a.type === 'focus') e.focus({ preventScroll: true });
    else if (a.type === 'fill') {
      if (typeof a.value !== 'string' || a.value.length > 500 || sensitive(e)) throw new Error('ACTION_POLICY_DENIED');
      const owner = e.ownerDocument.defaultView;
      const proto = e.tagName === 'TEXTAREA' ? owner.HTMLTextAreaElement.prototype : owner.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, a.value);
      e.dispatchEvent(new owner.Event('input', { bubbles: true })); e.dispatchEvent(new owner.Event('change', { bubbles: true }));
    } else if (a.type === 'activate') e.click();
    else if (a.type === 'scroll') e.scrollBy({ top: Math.max(100, e.clientHeight * 0.7), behavior: 'instant' });
    else if (a.type !== 'read') throw new Error('UNSUPPORTED_ACTION');
    revision = ''; refs.clear();
    await new Promise(resolve => setTimeout(resolve, 350));
    const observation = observe();
    return { code: 'OBSERVED_AFTER_ACTION', observation, verified: false };
  }
  function close() { scope = undefined; revision = ''; refs.clear(); }
  globalThis.keledonSurfaceEngine = Object.freeze({ open, observe, act, close });
})();
