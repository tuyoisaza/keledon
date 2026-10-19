/* Read-only MVP surface. Explicit opener binding; no credentials, arbitrary actions or network calls. */
(() => {
  'use strict';
  const brain = 'https://keledon.tuyoisaza.com', protocol = 'keledon-crm-read-v1';
  let requested = false, session = '', expires = 0, epoch = 0, operations = 0, output, allowedCases = [];
  const show = text => { if (output) output.textContent = text; };
  const send = data => { if (window.opener && !window.opener.closed) window.opener.postMessage({ protocol, session, ...data }, brain); };
  const visible = element => element instanceof HTMLElement && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  function field(name) {
    const candidates = [...document.querySelectorAll(`[data-field="${name}"] lightning-formatted-text, [data-field="${name}"] lightning-formatted-number, [data-target-selection-name="sfdc:RecordField.Case.${name}"] lightning-formatted-text, [data-target-selection-name="sfdc:RecordField.Case.${name}"] lightning-formatted-number, lightning-output-field[field-name="${name}"] lightning-formatted-text, lightning-output-field[field-name="${name}"] lightning-formatted-number`)]
      .filter(visible).map(e => (e.textContent || '').trim()).filter(Boolean);
    const values = [...new Set(candidates)]; return values.length === 1 ? values[0] : '';
  }
  async function search(d) {
    if (++operations > 6) { show('Límite de seis consultas; vuelve a autorizar desde Brain'); return; }
    const own = ++epoch, valid = () => own === epoch && Date.now() < expires && !window.opener?.closed;
    const result = (outcome, status) => {
      const subject = outcome === 'found' ? field('Subject') : '';
      if (valid()) send({ type: 'result', requestId: d.requestId, caseNumber: d.caseNumber, outcome, ...(status ? { status } : {}), ...(subject && subject.length <= 200 && !/[\r\n\x00-\x1f]/.test(subject) ? { subject } : {}) });
    };
    // A known list-search input is the sole fill/Enter capability. No generic text or model selectors.
    const listInputs = () => [...document.querySelectorAll('input[placeholder="Search this list..."], input[aria-label="Search this list..."], input[placeholder="Buscar en esta lista..."], input[aria-label="Buscar en esta lista..."]')].filter(visible);
    if (/^\/lightning\/r\/Case\/[a-zA-Z0-9]{15,18}\/view\/?$/.test(location.pathname)) {
      const number = field('CaseNumber'), status = field('Status');
      if (number === d.caseNumber && status && status.length <= 120 && !/[\r\n\x00-\x1f]/.test(status)) { result('found', status); show('Caso exacto observado; solo se envió su estado'); return; }
      const lists = [...document.querySelectorAll('a[href]')].filter(visible).filter(a => {
        const target = new URL(a.href, location.href);
        return target.origin === location.origin && /^\/lightning\/o\/Case\/list\/?$/.test(target.pathname) && !target.search && !target.hash;
      });
      if (lists.length !== 1) { result('needs_assistance'); show('Abre la lista de Casos para buscar el siguiente caso ficticio'); return; }
      lists[0].click();
      for (let i = 0; i < 12 && valid() && !listInputs().length; i++) await new Promise(resolve => setTimeout(resolve, 250));
      if (!valid()) return;
    }
    const inputs = listInputs();
    if (!/^\/lightning\/o\/Case\/list\/?$/.test(location.pathname) || inputs.length !== 1) { result('needs_assistance'); show('Abre la lista de Casos o el caso exacto; interfaz no reconocida'); return; }
    const input = inputs[0];
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) { result('needs_assistance'); return; }
    setter.call(input, d.caseNumber); input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    // Do not interpret old list contents as a confirmed negative. An unknown layout asks for help.
    for (let i = 0; i < 32 && valid(); i++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      if (!valid()) return;
      const matches = [...document.querySelectorAll('a[href]')].filter(a => visible(a) && (a.textContent || '').trim() === d.caseNumber).filter(a => {
        const target = new URL(a.href, location.href);
        return target.origin === location.origin && /^\/lightning\/r\/Case\/[a-zA-Z0-9]{15,18}\/view\/?$/.test(target.pathname) && !target.search && !target.hash;
      });
      if (matches.length > 1) { result('needs_assistance'); return; }
      if (matches.length === 1) {
        matches[0].click();
        for (let j = 0; j < 24 && valid(); j++) {
          await new Promise(resolve => setTimeout(resolve, 250));
          if (!valid()) return;
          const number = field('CaseNumber'), status = field('Status');
          if (/^\/lightning\/r\/Case\/[a-zA-Z0-9]{15,18}\/view\/?$/.test(location.pathname) && number === d.caseNumber && status && status.length <= 120 && !/[\r\n\x00-\x1f]/.test(status)) { result('found', status); show('Caso exacto observado; sin cambios de registros'); return; }
        }
        result('needs_assistance'); return;
      }
    }
    result('needs_assistance'); show('Sin coincidencia verificable; confirma la lista y el número');
  }
  window.addEventListener('message', event => {
    const d = event.data;
    if (!requested || event.source !== window.opener || event.origin !== brain || !d || d.protocol !== protocol) return;
    if (d.type === 'offer' && typeof d.session === 'string' && /^[a-f0-9-]{36}$/.test(d.session) && Array.isArray(d.cases) && d.cases.length >= 1 && d.cases.length <= 2 && d.cases.every(x => typeof x === 'string' && /^\d{1,12}$/.test(x))) {
      epoch++; session = d.session; allowedCases = d.cases.slice(); expires = Date.now() + 120000; operations = 0; show('Lectura autorizada para los casos ficticios declarados durante dos minutos'); return;
    }
    if (!session || d.session !== session) return;
    if (d.type === 'cancel' || d.type === 'stop') { epoch++; if (d.type === 'stop') { session = ''; expires = 0; } show('Operación cancelada; sin cambios de registros'); return; }
    if (d.type === 'search_case' && Date.now() < expires && typeof d.caseNumber === 'string' && allowedCases.includes(d.caseNumber) && typeof d.requestId === 'string' && /^[a-f0-9-]{36}$/.test(d.requestId)) void search(d).catch(() => show('Interfaz no reconocida; requiere ayuda'));
  });
  window.addEventListener('pagehide', () => { epoch++; session = ''; expires = 0; });
  function mount() {
    const host = document.createElement('aside'); host.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483646';
    const panel = document.createElement('section'); panel.setAttribute('aria-label', 'Salesforce lectura Brain'); panel.style.cssText = 'font:14px system-ui;background:#17202a;color:white;border:2px solid white;padding:12px;max-width:320px';
    const title = document.createElement('strong'); title.textContent = 'Brain · Salesforce solo lectura · v0.4.0';
    const connect = document.createElement('button'); connect.textContent = 'Conectar lectura con Brain'; connect.style.cssText = 'display:block;min-height:44px;margin-top:8px';
    connect.onclick = () => { if (!window.opener) { show('Abre Salesforce desde Brain y su destino autorizado'); return; } requested = true; send({ type: 'ready' }); show('Solicitando enlace al Brain que abrió esta ventana'); };
    const cancel = document.createElement('button'); cancel.textContent = 'Cancelar lectura'; cancel.onclick = () => { epoch++; session = ''; expires = 0; show('Lectura detenida'); };
    output = document.createElement('p'); output.setAttribute('role', 'status'); output.textContent = 'Sin lectura activa. Solo casos ficticios. Sin grabación ni credenciales en Brain.';
    panel.append(title, connect, cancel, output); host.attachShadow({ mode: 'open' }).append(panel); document.body.append(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
