const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/goal-planner.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let calls=0,request;
const box={exports:{},AbortSignal,fetch:async(_url,options)=>{calls++;request=JSON.parse(options.body);return new Response(JSON.stringify({success:true,steps:[
 {type:'navigate',url:'https://configured.invalid/login'},
 {type:'fill',selector:'#login',value:'${username}',description:'sensitive username ignored'},
 {type:'fill',selector:'#password',value:'${password}',description:'sensitive password ignored'},
 {type:'click',selector:'#sign-in'}]}));}};
vm.runInNewContext(compiled,box);
(async()=>{
 const result=await box.exports.planGoalActionsWithAI('Authenticate using synthetic-private-password','https://configured.invalid','', 'https://cloud.invalid','synthetic-token',{username:'synthetic-user',password:'synthetic-private-password'},'trace-1');
 assert.equal(calls,1);assert.equal(result.source,'ai');assert.equal(result.steps.length,4);assert.equal(result.steps[1].value,'synthetic-user');assert.equal(result.steps[2].value,'synthetic-private-password');
 assert.equal(JSON.stringify(request).includes('synthetic-private-password'),false);assert.equal(request.requestId,'trace-1');assert.equal(result.steps.some(step=>step.description.includes('synthetic-private-password')),false);
 box.fetch=async()=>{throw new Error('offline')};
 await assert.rejects(box.exports.planGoalActionsWithAI('search arbitrary goal','','','https://cloud.invalid','synthetic'),/offline/);
 console.log('PASS Cloud-approved planner steps/local placeholders, explicit trace and no heuristic fallback');
})().catch(error=>{console.error(error);process.exitCode=1});
