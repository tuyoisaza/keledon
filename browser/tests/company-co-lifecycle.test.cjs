const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/phdk/fixtures/company-co-runtime.json'), 'utf8').replace(/^\uFEFF/,''));
function load(file, dependencies) {
 const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
 const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const box={exports:{},URL,require:name=>{if(dependencies[name])return dependencies[name];throw new Error(name);}};
 vm.runInNewContext(output,box);return box.exports;
}
function harness(failFlow) {
 const handlers=new Map(), evidence=[], media=[];
 const noop=()=>{}; const logger={info:noop,warn:noop,error:noop};
 const rpa={setMainWindow:noop, executeRpaFlow:async flow=>{
   const safe=flow.steps.every(step=>step.action!=='navigate'||Object.values(fixture.surfaces).includes(step.url));
   const failed=!safe||flow.flow_id===failFlow;
   const result={flow_id:flow.flow_id,status:failed?'failed':'completed',steps:flow.steps.map((step,i)=>({step_id:String(i),action:step.action,success:!failed})),total_duration_ms:1};
   evidence.push(result);return result;
 }};
 const vendorPolicy={getAllowedVendorOrigins:vendor=>{try{return [...new Set([...(Array.isArray(vendor.allowedOrigins)?vendor.allowedOrigins:[]),new URL(vendor.baseUrl||vendor.url).origin])]}catch{return []}}};
 const call=load('../src/call-handler.ts',{'electron-log':logger,electron:{},'./rpa-executor.js':rpa,'./media/media-layer.js':{mediaLayer:{startCall:async()=>media.push('start'),stopCall:async()=>media.push('stop')}},'./runtime-state.js':{runtimeStatus:{vendors:Object.values(fixture.surfaces).map(baseUrl=>({baseUrl}))}},'./security-policy.js':vendorPolicy,'./media/transcript-monitor.js':{}});
 const poll=load('../src/cloud-command-polling.ts',{'electron-log':logger,electron:{},'./cmdlog.js':{truncate:()=>'',log:noop},'./runtime-state.js':{runtimeStatus:{vendors:Object.values(fixture.surfaces).map(baseUrl=>({baseUrl}))}},'./security-policy.js':vendorPolicy,'./call-handler.js':call,'./rpa-executor.js':rpa,'./goal-planner.js':{},'./command-poller.js':{registerCommandHandler:(name,handler)=>handlers.set(name,handler),startPolling:noop}});
 poll.setupCommandPolling(null);return {handlers,evidence,media,call};
}
(async()=>{
 assert.equal(fixture.productionDefault,false);
 const happy=harness();
 for(const command of fixture.commands){const result=await happy.handlers.get(command.command)(command);assert.equal(result.status,'success',command.id);}
 assert.equal(happy.call.getState(),'standby');assert.deepEqual(happy.media,['start','stop']);
 assert.deepEqual(happy.evidence.map(item=>item.flow_id),['company-co-answer','company-co-crm-finalize','company-co-hangup']);
 const failed=harness('company-co-crm-finalize');
 for(const command of fixture.commands){const result=await failed.handlers.get(command.command)(command);if(result.status==='failed')break;}
 assert.equal((await failed.handlers.get('call_close')(fixture.commands.at(-1))).status,'failed');
 assert.equal(failed.call.isCallActive(),true);assert.equal(failed.evidence.some(item=>item.flow_id==='company-co-hangup'),false);assert.deepEqual(failed.media,['start']);
 const inactive=harness();const finalize=fixture.commands.find(command=>command.id==='finalize');
 assert.equal((await inactive.handlers.get('rpa_flow')(finalize)).status,'failed');assert.equal(inactive.evidence.length,0);
 const foreign=harness();await foreign.handlers.get('call_start')(fixture.commands[0]);
 const unsafe={...finalize,payload:{steps:[{action:'navigate',url:'https://foreign.invalid'}]}};
 assert.equal((await foreign.handlers.get('rpa_flow')(unsafe)).status,'failed');
 console.log('PASS SYNTHETIC Company Co command lifecycle: approved answer/CRM/hangup/standby; finalization failure, no-call and wrong-surface boundaries');
})().catch(error=>{console.error(error);process.exitCode=1;});
