const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/rpa-executor.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const noop=()=>{};let scripts=0,matched=false;
const box={exports:{},URL,require:name=>{
 if(name==='electron-log')return {info:noop,warn:noop,error:noop};
 if(name==='electron')return {};
 if(name==='./rpa-provider')return {findElement:async()=>({found:true,method:'synthetic'}),getAccessibilityTree:noop,setRpaProviderConfig:noop};
 throw new Error(name);
}};
vm.runInNewContext(compiled,box);const rpa=box.exports;
rpa.setMainWindow({getBrowserViews:()=>[{webContents:{executeJavaScript:async()=>{scripts++;return matched;}}}]});
(async()=>{
 const flow={steps:[{action:'assert',selector:'#customer-id',value:'expected-customer'},{action:'click',selector:'#save-record'}]};
 let result=await rpa.executeRpaFlow(flow);
 assert.equal(result.status,'failed');assert.equal(result.steps.length,1);assert.equal(scripts,1,'failed assertion must stop before save');
 matched=true;scripts=0;result=await rpa.executeRpaFlow(flow);assert.equal(result.status,'completed');assert.equal(result.steps.length,2);
 matched=false;result=await rpa.executeRpaFlow({steps:[{action:'submit'}]});assert.equal(result.status,'failed');
 result=await rpa.executeRpaFlow({steps:[{action:'navigate',url:'file:///sensitive'},{action:'click',selector:'#save'}]});assert.equal(result.status,'failed');assert.equal(result.steps.length,1);
 const before=scripts; result=await rpa.executeRpaFlow({allowed_origins:['https://configured.invalid'],steps:[{action:'navigate',url:'https://foreign.invalid'}]});assert.equal(result.status,'failed');assert.equal(scripts,before);
 result=await rpa.executeRpaFlow({is_cancelled:()=>true,steps:[{action:'click',selector:'#save'}]});assert.equal(result.status,'failed');assert.equal(result.steps[0].error,'Flow cancelled after runtime disconnect');
 console.log('PASS production RPA safety: customer assertion gates writes, fail-fast flow, failed submit and non-HTTP navigation');
})().catch(error=>{console.error(error);process.exitCode=1;});
