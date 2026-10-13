const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const output=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/goal-planner.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let sent;
const box={exports:{},AbortSignal,fetch:async(url,options)=>{sent={url,body:JSON.parse(options.body)};return new Response(JSON.stringify({success:true,steps:[]}))}};
vm.runInNewContext(output,box);
(async()=>{
 const result=await box.exports.planGoalActionsWithAI('Configured vendor goal','https://custom-vendor.invalid','','https://custom-cloud.invalid','synthetic-token',{},'synthetic-command-123');
 assert.equal(sent.url,'https://custom-cloud.invalid/api/planner/decompose');assert.equal(sent.body.requestId,'synthetic-command-123');assert.equal(sent.body.url,'https://custom-vendor.invalid');assert.equal(result.source,'ai');assert.equal(result.steps.length,0);
 console.log('PASS planner trace respects custom client URLs, command correlation and Cloud no-op plan');
})().catch(error=>{console.error(error);process.exitCode=1});
