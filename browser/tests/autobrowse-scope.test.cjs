const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const output=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/autobrowse-bridge.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const noop=()=>{};const runtimeStatus={cloudUrl:'https://cloud.invalid',authToken:'synthetic',vendors:[{id:'v',baseUrl:'https://configured.invalid'}]};
let calls=0,currentUrl='https://configured.invalid/call',actions=[];
const deps={
 'electron-log':{info:noop,warn:noop,error:noop},electron:{ipcRenderer:{send:noop}},
 './runtime-state':{runtimeStatus},'./goal-planner':{planGoalActionsWithAI:async()=>({steps:calls++===0?[{type:'submit',description:'submit password'},{type:'click',selector:'#next',description:'next'}]:[],source:'ai'})},
 './security-policy.js':{getAllowedVendorOrigins:vendor=>{try{return [...new Set([...(Array.isArray(vendor.allowedOrigins)?vendor.allowedOrigins:[]),new URL(vendor.baseUrl||vendor.url).origin])]}catch{return []}}},
 './autobrowse-actions':{executeAction:async(_view,action)=>{actions.push(action);return {id:'step',type:action.type,description:action.description,success:action.type!=='click',duration:1,error:action.type==='click'?'synthetic failure':undefined}}},
 './autobrowse-cdp':{connectCDP:async()=>null,getCdpPort:()=>0},'./autobrowse-planner':{},
};
const box={exports:{},URL,setTimeout:fn=>{fn();return 1},require:name=>{if(deps[name])return deps[name];throw new Error(name)}};
vm.runInNewContext(output,box);const bridge=box.exports;
const view={webContents:{getURL:()=>currentUrl,getTitle:()=>'',executeJavaScript:async()=> '{}',capturePage:async()=>({toDataURL:()=> 'synthetic-evidence'}),loadURL:async()=>{throw new Error('Browser must not invent post-login navigation')}}};
bridge.setTabs([{id:'v',view,url:currentUrl}],'v');
(async()=>{
 await bridge.initializeAutoBrowse({});
 const failed=await bridge.executeGoal({execution_id:'failed',goal:'approved configured goal'});
 assert.equal(failed.status,'failed');assert.equal(failed.steps[1].success,false);assert.equal(actions.length,2);assert.equal(calls,1,'failed action cannot replan or become success');
 await assert.rejects(bridge.executeGoal({goal:'approved goal',inputs:{password:'synthetic-secret'}}),/Explicit configured vendor/);
 currentUrl='https://foreign.invalid';
 await assert.rejects(bridge.executeSteps([{action:'fill',selector:'#password',value:'synthetic-secret'}]),/outside configured/);
 assert.equal(actions.length,2,'foreign origin cannot receive credentials');
 runtimeStatus.vendors=[];
 await assert.rejects(bridge.executeSteps([{action:'navigate',url:'https://configured.invalid'}]),/outside configured/);
 console.log('PASS production AutoBrowse: configured origin scope, explicit credential vendor, failure preserved/no invented recovery or replans');
})().catch(error=>{console.error(error);process.exitCode=1});
