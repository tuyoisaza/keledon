const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, esModuleInterop: true,
  } }).outputText;
  module._compile(code, filename);
};
const { AiAdminService } = require('../src/ai-admin/ai-admin.service.ts');
const { LLMService } = require('../src/llm/llm.service.ts');
const { compileManagedSchema } = require('../src/ai-admin/ai-schema.ts');
function fixture() {
  const prompts = new Map(), revisions = [], usage = [];
  const db = {
    user: { findUnique: async ({where}) => where.id === 'owner' ? {id:'owner',role:'superadmin'} : {id:where.id,role:'admin'} },
    aiPromptDefinition: {
      upsert: async ({where, create}) => { if (!prompts.has(where.id)) { const {revisions: audit,...record}=create; prompts.set(where.id, structuredClone(record)); if(audit)revisions.push({promptId:where.id,...audit.create}); } return prompts.get(where.id); },
      findUnique: async ({where}) => prompts.has(where.id) ? structuredClone(prompts.get(where.id)) : null,
      findMany: async () => [...prompts.values()].map(record => structuredClone(record)),
      updateMany: async ({where,data}) => { const record=prompts.get(where.id); if(!record||record.revision!==where.revision)return {count:0}; Object.assign(record,data,{revision:record.revision+1}); return {count:1}; },
    },
    aiPromptRevision: {
      create: async ({data}) => { revisions.push(structuredClone(data)); return data; },
      findFirst: async ({where}) => structuredClone(revisions.find(row => row.promptId === where.promptId && row.toRevision === where.toRevision) ?? null),
    },
    aiCallUsage: { create: async ({data}) => { usage.push(data); return data; }, findMany: async ({take}) => usage.slice(-take) },
    $transaction: async fn => fn(db),
  };
  return {service:new AiAdminService(db),db,prompts,revisions,usage};
}
test('all admin routes use current DB role and reject lower actors before persistent bootstrap', async () => {
  const {service,prompts}=fixture();
  for(const action of [()=>service.listPrompts('admin'),()=>service.getPrompt('admin','brain-chat'),()=>service.updatePrompt('admin','brain-chat',{}),()=>service.consumption('admin')]) await assert.rejects(action,/access denied/);
  assert.equal(prompts.size,0);
  await assert.rejects(service.listPrompts(undefined),/access denied/);
});
test('managed bootstrap persists four real definitions without overriding later changes', async () => {
  const {service,prompts}=fixture();
  const listed=await service.listPrompts('owner'); assert.equal(listed.length,4);
  for(const row of listed) compileManagedSchema(row.outputSchemaJson);
  prompts.get('brain-chat').name='Owner configured';
  assert.equal((await service.prepare('brain-chat')).name,'Owner configured');
});
test('updates validate fields and schema, audit revisions and reject stale concurrent editors', async () => {
  const {service,revisions}=fixture();
  await service.listPrompts('owner');
  const updated=await service.updatePrompt('owner','brain-chat',{expectedRevision:1,name:'New name'});
  assert.equal(updated.revision,2); assert.equal(updated.updatedBy,'owner');
  assert.equal(revisions.at(-1).promptId,'brain-chat'); assert.equal(revisions.at(-1).fromRevision,1); assert.equal(revisions.at(-1).toRevision,2); assert.equal(revisions.at(-1).actorId,'owner');
  assert.equal(revisions.at(-1).changedFields[0].field,'name');
  assert.notEqual(revisions.at(-1).changedFields[0].beforeSha256,revisions.at(-1).changedFields[0].afterSha256);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{expectedRevision:1,name:'Overwrite'}),/reload/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{expectedRevision:2,providerSecret:'forbidden'}),/allowed fields/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{expectedRevision:2,outputSchemaJson:{type:'object',properties:{x:{$ref:'https://example.invalid/schema'}}}}),/Unsupported/);
  assert.equal((await service.prepare('brain-chat')).revision,2);
});
test('workflow metadata validates registered hops, rejects cycles, and rollback creates a new revision', async () => {
  const {service}=fixture(); await service.listPrompts('owner');
  const first = await service.updatePrompt('owner','brain-chat',{
    expectedRevision:1,
    purpose:'Answer user questions',
    inputSchemaJson:{type:'object',additionalProperties:false,required:['context'],properties:{context:{type:'string',maxLength:16000,source:'authenticated product request',sensitivity:'user-content'}}},
    outputDestination:'Brain response UI',
    nextHops:[{agentId:'browser-planner',inputMapping:{context:'$.reply'},condition:'User approved browser action',maxHops:2}],
  });
  assert.equal(first.revision,2); assert.equal(first.nextHops[0].agentId,'browser-planner');
  await assert.rejects(service.updatePrompt('owner','browser-planner',{
    expectedRevision:1,nextHops:[{agentId:'brain-chat'}],
  }),/acyclic/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{
    expectedRevision:2,nextHops:[{agentId:'unregistered-agent'}],
  }),/Invalid workflow graph edge/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{
    expectedRevision:2,inputSchemaJson:{type:'object',additionalProperties:true,properties:{context:{type:'string'}}},
  }),/Invalid workflow input schema/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{
    expectedRevision:2,nextHops:[{agentId:'browser-planner',inputMapping:{unknown:'$.reply'}}],
  }),/unknown target input/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{
    expectedRevision:2,nextHops:[{agentId:'browser-planner',inputMapping:{context:'$.missing'}}],
  }),/field type mismatch/);
  await service.updatePrompt('owner','brain-chat',{expectedRevision:2,purpose:'Updated answer purpose'});
  const restored=await service.rollbackPrompt('owner','brain-chat',2,3);
  assert.equal(restored.revision,4);
  assert.equal(restored.purpose,'Answer user questions');
  assert.equal(restored.nextHops[0].agentId,'browser-planner');
});
test('runtime AI inputs are validated against the active definition before provider use', async () => {
  const {service}=fixture();
  const prepared=await service.prepare('brain-chat');
  assert.deepEqual(service.validateInput(prepared,{context:'bounded request context'}),{context:'bounded request context'});
  assert.throws(()=>service.validateInput(prepared,{context:'safe',extra:'unmapped'}),/managed schema/);
  assert.throws(()=>service.validateInput(prepared,{}),/managed schema/);
  await service.updatePrompt('owner','brain-chat',{
    expectedRevision:1,
    inputSchemaJson:{type:'object',additionalProperties:false,required:['context'],properties:{context:{type:'string',maxLength:3,source:'authenticated product request',sensitivity:'user-content'}}},
  });
  const constrained=await service.prepare('brain-chat');
  assert.throws(()=>service.validateInput(constrained,{context:'longer'}),/field limit/);
  await assert.rejects(service.updatePrompt('owner','brain-chat',{
    expectedRevision:2,
    inputSchemaJson:{type:'object',additionalProperties:false,required:['context'],properties:{context:{type:'string',maxLength:20,source:'unapproved remote source',sensitivity:'internal'}}},
  }),/Invalid workflow input field/);
});
test('LLMService validates and sends the same bounded server-assembled input', async () => {
  const prepared={id:'brain-chat',revision:1,personalityPrompt:'safe',executionPrompt:'respond',inputSchemaJson:{},outputSchemaJson:{}};
  let validatedInput, providerRequest, usageWrites=0;
  const admin={
    prepare:async()=>prepared,
    validateInput:(_definition,input)=>{validatedInput=input;},
    validateOutput:(_definition,value)=>value,
    recordUsage:async()=>{usageWrites++;},
  };
  const llm=new LLMService({},admin);
  llm.generateUnchecked=async request=>{
    providerRequest=request;
    return {text:'{"reply":"safe response"}',provider:'fixture',requestedModel:'fixture',finishReason:'stop',usage:{promptTokens:1,completionTokens:1,totalTokens:2}};
  };
  const response=await llm.generate({prompt:'hello',context:['retrieved, untrusted text'],actorId:'runtime-input-test'});
  const serialized=JSON.stringify({userInput:'hello',untrustedContext:['retrieved, untrusted text']});
  assert.deepEqual(validatedInput,{context:serialized});
  assert.equal(providerRequest.prompt,serialized);
  assert.deepEqual(providerRequest.context,[]);
  assert.equal(response.text,'safe response');
  assert.equal(usageWrites,1);

  let providerCalled=false;
  admin.validateInput=()=>{throw new Error('input contract rejected');};
  llm.generateUnchecked=async()=>{providerCalled=true;throw new Error('provider must not run');};
  await assert.rejects(llm.generate({prompt:'reject me',actorId:'runtime-input-rejected'}),/input contract rejected/);
  assert.equal(providerCalled,false);
  await assert.rejects(llm.generate({prompt:'context fanout',context:Array.from({length:65},()=>''),actorId:'runtime-input-bounds'}),/Invalid AI input size/);
  await assert.rejects(llm.generate({prompt:'wrong context',context:['valid',{}],actorId:'runtime-input-type'}),/Invalid AI input size/);
  assert.equal(providerCalled,false);
});
test('structured outputs fail closed: no text coercion or action-field omission', async () => {
  const {service}=fixture(); const prepared=await service.prepare('brain-chat');
  assert.deepEqual(service.validateOutput(prepared,{reply:'safe reply'}),{reply:'safe reply'});
  assert.throws(()=>service.validateOutput(prepared,'plain model text'),/managed schema/);
  assert.throws(()=>service.validateOutput(prepared,{reply:42}),/managed schema/);
  const decision=await service.prepare('decision-engine');
  assert.throws(()=>service.validateOutput(decision,{type:'ui_steps'}),/managed schema/);
  assert.throws(()=>service.validateOutput(decision,{type:'say'}),/managed schema/);
  assert.deepEqual(service.validateOutput(decision,{type:'stop'}),{type:'stop'});
});
test('disabled workflows and unavailable persistence block before provider execution', async () => {
  const {service,prompts}=fixture(); await service.listPrompts('owner'); prompts.get('voice-reply').enabled=false;
  await assert.rejects(service.prepare('voice-reply'),/disabled/);
  const {service:offline,db}=fixture();db.aiPromptDefinition.upsert=async()=>{throw Error('missing table');};
  await assert.rejects(offline.prepare('brain-chat'),/migration/);
});
test('usage retains attribution and unknowns, never fabricates pricing or stores model payloads', async () => {
  const {service,usage}=fixture();const prepared=await service.prepare('browser-planner');
  await service.recordUsage({prepared,feature:'browser-planner',teamId:'company-co-team',provider:'openai',requestedModel:'configured-model',latencyMs:12});
  assert.equal(usage[0].promptRevision,1);assert.equal(usage[0].costUsd,null);assert.equal(usage[0].inputTokens,null);
  assert.equal('messages' in usage[0],false);assert.equal('output' in usage[0],false);
  const result=await service.consumption('owner');assert.equal(result.totals.calls,1);assert.equal(result.totals.costUsd,null);
  await assert.rejects(service.consumption('owner','201'),/between/);
  await assert.rejects(service.recordUsage({prepared,feature:'voice-reply',provider:'openai',requestedModel:'configured',latencyMs:1}),/mismatch/);
});
