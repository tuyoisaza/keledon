const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const lib = path.join(__dirname, '../src/lib');
function loadCore() {
  const code = esbuild.transformSync(fs.readFileSync(path.join(lib, 'diagnostics-core.ts'), 'utf8'), { loader:'ts',format:'cjs' }).code;
  const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,Date,WeakSet,Set,Number,Object,Array,Error});return module.exports;
}
function store(data={}) {
  const map=new Map(Object.entries(data));
  return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:key=>map.get(key)??null,removeItem:key=>map.delete(key)};
}
test('redaction excludes nested credentials, URLs, emails, bearer/JWT tokens and cyclic data',()=>{
  const core=loadCore(),fixture={password:'very-private',nested:{apiKey:'provider-secret',email:'test@example.org'},message:'Bearer abcdef password=secret sk-1234567890 https://internal.example/x?token=raw test@example.org',safe:200};fixture.self=fixture;
  const result=JSON.stringify(core.redactDiagnostic(fixture));
  for(const secret of ['very-private','provider-secret','test@example.org','abcdef','sk-1234567890','internal.example','token=raw'])assert.ok(!result.includes(secret),secret);
  assert.ok(result.includes('200'));assert.ok(result.includes('[circular]'));
});
test('event buffer keeps only safe metadata, respects bounds and returns defensive copies',()=>{
  const buffer=loadCore().createEventBuffer(3);
  for(let i=0;i<8;i++)buffer.add({kind:'network',level:'info',status:200+i,method:'POST',durationMs:i,message:'Private Person',token:'raw'});
  const events=buffer.read();assert.equal(events.length,3);assert.equal(events[0].status,205);
  assert.ok(!JSON.stringify(events).includes('Private'));assert.ok(!JSON.stringify(events).includes('raw'));
  events[0].status=999;assert.equal(buffer.read()[0].status,205);buffer.clear();assert.equal(buffer.read().length,0);
});
test('reset deletes owned state/cache only and truthfully reports existing local session',async()=>{
  const core=loadCore(),local=store({'keledon-locale':'es',foreign:'keep'}),session=store({auth_token:'credential',user_email:'hidden@example.org',foreign:'session-keep'});
  const names=new Set(['keledon-assets','foreign-cache']);let events=false,cookies=false;
  const result=await core.clearApplicationState({localStorage:local,sessionStorage:session,caches:{keys:async()=>[...names],delete:async key=>names.delete(key)},clearEvents:()=>events=true,clearCookies:()=>cookies=true});
  assert.equal(result.hadSession,true);assert.equal(local.getItem('foreign'),'keep');assert.equal(session.getItem('foreign'),'session-keep');
  assert.equal(session.getItem('auth_token'),null);assert.equal(names.has('foreign-cache'),true);assert.equal(names.has('keledon-assets'),false);assert.ok(events&&cookies);
});
test('reset propagates storage and cache failures; never confirms partial success',async()=>{
  const core=loadCore();
  await assert.rejects(core.clearApplicationState({localStorage:{...store({'keledon-bad':'x'}),length:1,removeItem(){throw Error('denied');}},sessionStorage:store()}),/denied/);
  await assert.rejects(core.clearApplicationState({localStorage:store(),sessionStorage:store(),caches:{keys:async()=>['keledon-assets'],delete:async()=>false}}),/cache/);
});
test('cookie reset preserves unrelated cookies and reports inaccessible owned cookies',()=>{
  const core=loadCore();const values=new Map([['keledon-ui','x'],['unrelated','keep']]);const doc={get cookie(){return [...values].map(([k,v])=>k+'='+v).join('; ');},set cookie(value){values.delete(value.split('=')[0]);}};
  core.clearApplicationCookies(doc,'/management/teams');assert.equal(values.get('unrelated'),'keep');assert.equal(values.has('keledon-ui'),false);
  const locked={get cookie(){return 'keledon-locked=x';},set cookie(_value){}};
  assert.throws(()=>core.clearApplicationCookies(locked,'/login'),/inaccessible/);
});
test('report capture never stores private messages or request URLs and handles clipboard failure honestly',async()=>{
  const result=esbuild.buildSync({entryPoints:[path.join(lib,'debug-report.ts')],bundle:true,write:false,format:'cjs',platform:'browser',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true','import.meta.hot':'undefined','__APP_VERSION__':'"5.0.54"'}});
  const listeners=new Map();let copied='',reject=false;const response={ok:true,status:200};
  const navigator={onLine:true,language:'es-MX',cookieEnabled:true,clipboard:{writeText:async value=>{if(reject)throw Error('denied');copied=value;}}};
  const window={innerWidth:1280,innerHeight:720,fetch:async()=>response,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
  const original=window.fetch,module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,window,navigator,performance:{now:()=>10},console,Date,WeakSet,Set,Number,Object,Array,Error});
  const api=module.exports;const wrapped=window.fetch;api.debugCapture.startCapture();assert.equal(window.fetch,wrapped);
  assert.equal(await window.fetch('https://private.example/secret?token=raw',{method:'POST',body:'provider-key'}),response);
  listeners.get('error')({message:'customer@example.org secret=private'});
  assert.equal(await api.copyDebugReport(),true);
  for(const forbidden of ['private.example','provider-key','customer@example.org','secret=private','token=raw'])assert.ok(!copied.includes(forbidden));
  assert.equal(JSON.parse(copied).events[0].kind,'network');reject=true;assert.equal(await api.copyDebugReport(),false);
  api.debugCapture.stopCapture();assert.equal(window.fetch,original);assert.equal(listeners.size,0);
});
test('web/legacy shared source remains identical across separate service build contexts',()=>{
  const root=path.resolve(__dirname,'../../..');
  for(const file of ['lib/diagnostics-core.ts','lib/debug-report.ts','components/common/VersionActions.tsx','components/common/version-actions.css'])
    assert.equal(fs.readFileSync(path.join(root,'services/web/src',file),'utf8'),fs.readFileSync(path.join(root,'landing/src',file),'utf8'),file);
});
test('native report allowlist excludes device/team/url/credential details and reset verifies IPC results',async()=>{
  const native=require(path.resolve(__dirname,'../../../browser/renderer/version-actions.js'));
  const report=JSON.stringify(native.safeReport({version:'5.0.54',deviceId:'private-device',logsDir:'private-path'},{status:'connected',connected:true,vendorCount:2,token:'raw',teamName:'Private',cloudUrl:'https://internal'},{}));
  for(const forbidden of ['private-device','private-path','raw','Private','https://internal'])assert.ok(!report.includes(forbidden));
  const win={localStorage:store({'keledon-config':'x',foreign:'safe'}),sessionStorage:store({auth_token:'x'})};
  await assert.rejects(native.clearOwnedState(win,{runtime:{disconnect:async()=>({success:false})}}),/disconnect/);
  await native.clearOwnedState(win,{runtime:{disconnect:async()=>({success:true})},cmdlog:{clearLog:async()=>({cleared:true})}});
  assert.equal(win.localStorage.getItem('foreign'),'safe');
});
