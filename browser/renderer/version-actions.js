/* Framework-native implementation of the same compact diagnostic contract as the web shell. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KeledonVersionActions = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const texts = {
    en: { copy:'Copy complete diagnostics', clear:'Clear application cache', copied:'Diagnostics copied', failed:'Action failed; success was not confirmed', cleared:'KELEDON client state cleared' },
    es: { copy:'Copiar diagnóstico completo', clear:'Limpiar caché', copied:'Diagnóstico copiado', failed:'La acción falló; no se confirmó el éxito', cleared:'Estado local de KELEDON limpiado' },
    pt: { copy:'Copiar diagnóstico completo', clear:'Limpar cache', copied:'Diagnóstico copiado', failed:'A ação falhou; sucesso não confirmado', cleared:'Estado local do KELEDON limpo' },
  };
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>';
  const clipboard = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H5v18h14V4h-3"/></svg>';
  const trash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
  function safeReport(info, status, counts = {}) {
    const state = ['disconnected','connecting','connected'].includes(status.status) ? status.status : 'unknown';
    return {
      product:'KELEDON Browser client diagnostics',
      version:/^\d+\.\d+\.\d+$/.test(info.version) ? 'v'+info.version : 'unavailable',
      generatedAt:new Date().toISOString(),
      runtime:{state,connected:status.connected===true,vendorCount:Number.isSafeInteger(status.vendorCount)?status.vendorCount:null},
      events:{activity:Number.isSafeInteger(counts.activity)?counts.activity:0},
      privacy:'Raw logs, URLs, credentials, identities and device/session/team identifiers excluded.',
      limitations:'Local client metadata only; global browser caches and external vendor sessions are not included.',
    };
  }
  const owned = key => /^keledon[-_:]/i.test(key) || ['auth_token','user_email','user_name'].includes(key);
  async function clearOwnedState(win, api) {
    for (const store of [win.localStorage,win.sessionStorage]) {
      const names=Array.from({length:store.length},(_,i)=>store.key(i)).filter(key=>key&&owned(key));
      for(const key of names){store.removeItem(key);if(store.getItem(key)!==null)throw Error('Owned storage remains');}
    }
    if(win.caches){
      const names=(await win.caches.keys()).filter(name=>/^keledon[-_:]/i.test(name));
      for(const name of names)await win.caches.delete(name);
      const remaining=await win.caches.keys();if(names.some(name=>remaining.includes(name)))throw Error('Owned cache remains');
    }
    const disconnected=await api.runtime.disconnect();
    if(disconnected?.success!==true)throw Error('Runtime disconnect was not confirmed');
    const cleared=await api.cmdlog.clearLog();
    if(cleared?.cleared!==true)throw Error('Diagnostic log clear was not confirmed');
  }
  function mount(win) {
    const doc=win.document,api=win.keledon;
    const copy=doc.getElementById('diagnosticCopy'),clear=doc.getElementById('diagnosticClear'),status=doc.getElementById('diagnosticStatus');
    const t=texts[(win.navigator.language||'en').split('-')[0]]||texts.en;
    copy.innerHTML=clipboard;clear.innerHTML=trash;
    for(const [button,label] of [[copy,t.copy],[clear,t.clear]]){button.setAttribute('aria-label',label);button.title=label;}
    const timers=new Set();let disposed=false;
    function later(callback){const timer=win.setTimeout(()=>{timers.delete(timer);if(!disposed)callback();},1500);timers.add(timer);}
    function bind(button,icon,action,message){
      button.addEventListener('click',async()=>{
        if(button.disabled)return;button.disabled=true;
        try{await action();if(disposed)return;button.innerHTML=check;button.classList.add('diagnostic-success');status.textContent=message;
          later(()=>{button.innerHTML=icon;button.classList.remove('diagnostic-success');button.disabled=false;});
        }catch{if(!disposed){button.disabled=false;button.innerHTML=icon;status.textContent=t.failed;}}
      });
    }
    bind(copy,clipboard,async()=>{
      const report=safeReport(await api.device.getInfo(),await api.runtime.getStatus(),{activity:doc.querySelectorAll('.activity-entry').length});
      await win.navigator.clipboard.writeText(JSON.stringify(report,null,2));
    },t.copied);
    bind(clear,trash,()=>clearOwnedState(win,api),t.cleared);
    win.addEventListener('beforeunload',()=>{disposed=true;for(const timer of timers)win.clearTimeout(timer);},{once:true});
  }
  return {safeReport,clearOwnedState,mount};
});
