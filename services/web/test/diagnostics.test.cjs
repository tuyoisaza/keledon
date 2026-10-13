const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const lib = path.join(__dirname, '../src/lib');
function loadCore() {
  const code = esbuild.transformSync(fs.readFileSync(path.join(lib, 'diagnostics-core.ts'), 'utf8'), { loader:'ts',format:'cjs' }).code;
  const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,Date,URL,WeakSet,Set,Number,Object,Array,Error});return module.exports;
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
test('diagnostic paths and correlation ids retain safe route context only',()=>{
  const core=loadCore();
  assert.equal(core.sanitizeDiagnosticPath('/api/companies/Acme%20Health/users/9182?token=private'),'/api/companies/[redacted]/users/[redacted]');
  assert.equal(core.sanitizeCorrelationId('req-1234.abcd'),'req-1234.abcd');
  assert.equal(core.sanitizeCorrelationId('customer@example.org'),undefined);
  assert.equal(core.sanitizeCorrelationId('eyJhbGci.eyJzdWIi.signature'),undefined);
});
test('report capture never stores private messages or request URLs and handles clipboard failure honestly',async()=>{
  const result=esbuild.buildSync({entryPoints:[path.join(lib,'debug-report.ts')],bundle:true,write:false,format:'cjs',platform:'browser',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true','import.meta.env.MODE':'"test"','import.meta.env.VITE_API_URL':'"https://api.example.test/private?token=secret"','import.meta.hot':'undefined','__APP_VERSION__':'"5.1.0"','__GIT_SHA__':'"abcdef1234567890"','__BUILD_TIMESTAMP__':'"2026-10-13T00:00:00.000Z"'}});
  const listeners=new Map();let copied='',reject=false;const response={ok:false,status:401,headers:{get:key=>key.toLowerCase()==='x-correlation-id'?'req-1234.abcd':null}};
  const navigator={onLine:true,language:'es-MX',userAgent:'Mozilla/5.0 Chrome/128.0.0.0',cookieEnabled:true,clipboard:{writeText:async value=>{if(reject)throw Error('denied');copied=value;}}};
  const localStorage=store({'keldon-debug-mode':'true'}),sessionStorage=store();
  const window={innerWidth:1280,innerHeight:720,location:{pathname:'/management/users/91',origin:'http://localhost',hostname:'localhost'},localStorage:store(),sessionStorage:store(),fetch:async()=>response,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
  const original=window.fetch,module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,window,navigator,localStorage,sessionStorage,performance:{now:()=>10},console,Date,URL,Intl,WeakSet,Set,Number,Object,Array,Error});
  const api=module.exports;const wrapped=window.fetch;api.debugCapture.startCapture();assert.equal(window.fetch,wrapped);
  assert.equal(await window.fetch('https://private.example/api/users/91?token=raw',{method:'POST',body:'provider-key'}),response);
  listeners.get('error')({message:'customer@example.org secret=private'});
  assert.equal(await api.copyDebugReport({isAuthenticated:true,user:{id:'user-123',role:'admin'},pathname:'/management/users/91?email=hidden@example.org'}),true);
  for(const forbidden of ['private.example','provider-key','customer@example.org','secret=private','token=raw','hidden@example.org'])assert.ok(!copied.includes(forbidden));
  for(const required of ['=== PHDK Debug Diagnostics Report ===','Project: KELEDON','Version: v5.1.0','Git SHA: abcdef123456','Build: 2026-10-13T00:00:00.000Z','Route: /management/users/[redacted]','User ID: user-123','Role: admin','API: api.example.test','Recent failed API requests','status=401 correlation=req-1234.abcd','Last endpoint probe: Unavailable'])assert.ok(copied.includes(required),required);
  assert.equal(copied.includes('Bearer'),false);reject=false;copied='';assert.equal(await api.copyDebugReport(),true);assert.ok(copied.includes('User ID: Not authenticated'));assert.ok(!copied.includes('user-123'));reject=true;assert.equal(await api.copyDebugReport(),false);
  api.debugCapture.setEndpointDiagnostics([{id:'health.deep',method:'GET',path:'/health/deep',expectedStatuses:[200],sanitizedRequestExample:null,sanitizedSuccessExample:{status:'healthy',key:'private-secret',url:'https://private.example'},sanitizedErrorExamples:[{statusCode:403,message:'Forbidden'}]}]);
  api.debugCapture.setBackendSummary({status:'healthy',database:{status:'healthy',migrations:'present'},meteredProviders:{deepgram:'configured',openai:'not_configured',anthropic:'configured',secretProvider:'private'}});
  api.debugCapture.recordEvent({kind:'action',level:'info',endpoint:'/health/deep',method:'POST',status:200,durationMs:7,correlationId:'diag-1234',stage:'probe',outcome:'pass',diagnosticId:'health.deep',expectedStatus:200});
  reject=false;copied='';assert.equal(await api.copyDebugReport({isAuthenticated:true,user:{role:'admin'}}),true);
  assert.ok(copied.includes('id=health.deep method=POST path=/health/deep expected=200 actual=200 latencyMs=7 correlation=diag-1234'));
  assert.ok(copied.includes('request=null success={"status":"healthy","key":"[redacted]","url":"[redacted]"} errors=[{"statusCode":403,"message":"Forbidden"}]'),copied);
  assert.ok(copied.includes('database=healthy migrations=present'));
  assert.ok(copied.includes('deepgram=configured'));
  assert.ok(!copied.includes('private-secret'));assert.ok(!copied.includes('private.example'));assert.ok(!copied.includes('secretProvider'));
  copied='';assert.equal(await api.copyDebugReport({isAuthenticated:true,user:{id:'user-2',role:'user'}}),true);
  assert.ok(copied.includes('Safe backend diagnostics: Unavailable or protected'));
  assert.ok(copied.includes('Last endpoint probe: Unavailable (no authorized probe result)'));
  assert.ok(!copied.includes('deepgram=configured'));assert.ok(!copied.includes('diag-1234'));assert.ok(!copied.includes('PostgreSQL'));
  api.debugCapture.setDebugMode(false);copied='';assert.equal(await api.copyDebugReport({isAuthenticated:true,user:{role:'admin'}}),true);
  assert.ok(copied.includes('Safe backend diagnostics: Unavailable or protected'));
  assert.ok(!copied.includes('deepgram=configured'));assert.ok(!copied.includes('id=health.deep'));
  api.debugCapture.setDebugMode(true);
  api.debugCapture.stopCapture();assert.equal(window.fetch,original);assert.equal(listeners.size,0);
});
test('web/legacy shared source remains identical across separate service build contexts',()=>{
  const root=path.resolve(__dirname,'../../..');
  for(const file of ['lib/diagnostics-core.ts','lib/debug-report.ts','components/common/VersionActions.tsx','components/common/version-actions.css'])
    assert.equal(fs.readFileSync(path.join(root,'services/web/src',file),'utf8'),fs.readFileSync(path.join(root,'landing/src',file),'utf8'),file);
});
test('native report allowlist excludes device/team/url/credential details and reset verifies IPC results',async()=>{
  const native=require(path.resolve(__dirname,'../../../browser/renderer/version-actions.js'));
  const report=JSON.stringify(native.safeReport({version:'5.1.0',deviceId:'private-device',logsDir:'private-path'},{status:'connected',connected:true,vendorCount:2,token:'raw',teamName:'Private',cloudUrl:'https://internal'},{}));
  for(const forbidden of ['private-device','private-path','raw','Private','https://internal'])assert.ok(!report.includes(forbidden));
  const win={localStorage:store({'keledon-config':'x',foreign:'safe'}),sessionStorage:store({auth_token:'x'})};
  await assert.rejects(native.clearOwnedState(win,{runtime:{disconnect:async()=>({success:false})}}),/disconnect/);
  await native.clearOwnedState(win,{runtime:{disconnect:async()=>({success:true})},cmdlog:{clearLog:async()=>({cleared:true})}});
  assert.equal(win.localStorage.getItem('foreign'),'safe');
});
