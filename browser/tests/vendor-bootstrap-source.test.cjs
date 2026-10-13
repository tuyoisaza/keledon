const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/ipc-vendor-state.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const box={exports:{},require:()=>({eventLogger:{info(){}}})};vm.runInNewContext(output,box);
const existing=[{id:'v',username:'encrypted-user',password:'encrypted-pass',apiKey:'encrypted-key'}];
for(const fetched of [{id:'v',username:'***',password:'***',apiKey:'***'},{id:'v',name:'Configured CRM',hasPassword:true,hasApiKey:true}]){
 const merged=box.exports.mergeRuntimeVendorCredentials([fetched],existing)[0];assert.equal(merged.password,'encrypted-pass');assert.equal(merged.apiKey,'encrypted-key');assert.equal(merged.username,'encrypted-user');
}
assert.equal(box.exports.mergeRuntimeVendorCredentials([{id:'foreign'}],existing)[0].password,undefined,'credentials cannot merge across vendor identities');
const login=fs.readFileSync(path.join(__dirname,'../src/ipc-vendor-login.ts'),'utf8');
assert.match(login,/mergeRuntimeVendorCredentials\(data,\s*runtimeStatus\.vendors\)/);
assert.doesNotMatch(login,/with username.*\$\{username\}.*password.*\$\{password\}/,'Never place credentials in goal text sent to Cloud');
console.log('PASS vendor bootstrap preserves omitted/masked local secrets only for matching explicit vendor');
