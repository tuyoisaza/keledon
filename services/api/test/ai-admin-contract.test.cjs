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
    aiPromptRevision: { create: async ({data}) => { revisions.push(data); return data; } },
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
