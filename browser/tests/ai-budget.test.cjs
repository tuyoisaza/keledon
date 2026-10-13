const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(relative,deps={},globals={}) {
 const source=fs.readFileSync(path.join(__dirname,relative),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,experimentalDecorators:true,esModuleInterop:true}}).outputText;
 const box={exports:{},Buffer,AbortSignal,process:{env:{}},console:{log(){},warn(){},error(){}},...globals,require:name=>deps[name]||require(name)};
 vm.runInNewContext(output,box);return box.exports;
}
const decorator=()=>()=>{}; const logs=[];
const common={Injectable:decorator,Logger:class {log(value){logs.push(value)}warn(){}error(value){logs.push(value)}}};
(async()=>{
 let now=0; const env={};
 const {RuntimeAiBudget}=load('../../services/api/src/llm/runtime-ai-budget.ts',{}, {Date:class TestDate extends Date { static now(){return now;} },process:{env}});
 const budget=new RuntimeAiBudget();let count=0;
 for(let i=0;i<120;i++)await budget.run('actor',undefined,async()=>count++);
 await assert.rejects(budget.run('actor',undefined,async()=>count++),/budget exceeded/);assert.equal(count,120);
 now=3600000;await budget.run('actor',undefined,async()=>count++);assert.equal(count,121);
 env.KELEDON_AI_DISABLED='true';await assert.rejects(budget.run('new',undefined,async()=>count++),/disabled/);env.KELEDON_AI_DISABLED='false';
 let release; const first=budget.run('dedup','same',()=>new Promise(resolve=>{release=resolve}));const second=budget.run('dedup','same',async()=>{throw new Error('duplicate provider call')});release('same-result');assert.equal(await first,await second);
 let sdkOptions,providerRequest,providerCalls=0,sdkText='{"reply":"synthetic"}';
 const providerBudget=new RuntimeAiBudget();
 const {LLMService}=load('../../services/api/src/llm/llm.service.ts',{
  '../ai-admin/ai-admin.service':{AiAdminService:class{}},
  '@nestjs/common':common,'../prisma/prisma.service':{PrismaService:class{}},'./runtime-ai-budget':{runtimeAiBudget:providerBudget},
  openai: { OpenAI: class {
    constructor(options) {
      sdkOptions=options;
      this.chat={completions:{create:async request=>{
        providerCalls++;providerRequest=request;
        return {choices:[{message:{content:sdkText},finish_reason:'stop'}],usage:{prompt_tokens:4,completion_tokens:2,total_tokens:6}};
      }}};
    }
  } },
 },{process:{env:{}}});
 const db={team:{findUnique:async()=>({llmProvider:'openai',openaiApiKey:'synthetic-team-key'})}};
 const usage=[];const managed={prepare:async feature=>({id:feature,revision:3,personalityPrompt:'Managed personality',executionPrompt:'JSON reply only',outputSchemaJson:{type:'object'}}),validateOutput:(prepared,output)=>{if(prepared.id==='decision-engine'? !['say','stop','ask','ui_steps','mode'].includes(output.type) : typeof output.reply!=='string')throw new Error('schema');return output;},recordUsage:async input=>usage.push(input)};
 const llm=new LLMService(db,managed);llm.provider='none';llm.model='configured-model';
 await llm.generate({prompt:'synthetic-private-content',teamId:'team',actorId:'actor-2',maxTokens:99999});
 assert.equal(usage[0].prepared.revision,3);assert.equal(usage[0].inputTokens,4);assert.equal(usage[0].provider,'openai');assert.equal(providerRequest.messages[0].content.includes('Managed personality'),true);assert.equal(providerRequest.messages[0].content.includes('synthetic-private-content'),false);
 assert.equal(sdkOptions.apiKey,'synthetic-team-key');assert.equal(sdkOptions.timeout,30000);assert.equal(sdkOptions.maxRetries,0);assert.equal(providerRequest.max_tokens,2000);
 assert.equal(logs.some(log=>String(log).includes('synthetic-private-content')),false);
 db.team.findUnique=async()=>null;await assert.rejects(llm.generate({prompt:'x',teamId:'missing'}),/Managed AI execution failed/);assert.equal(providerCalls,1);
 await assert.rejects(llm.generate({prompt:'x'.repeat(20001)}),/input size/);
 db.team.findUnique=async()=>({llmProvider:'openai',openaiApiKey:'synthetic-team-key'});
 sdkText='unstructured plain text';await assert.rejects(llm.generate({prompt:'x',teamId:'team'}),/Managed AI execution failed/);assert.equal(usage.at(-1).errorCode,'AI_EXECUTION_OR_SCHEMA_FAILURE');assert.equal(usage.at(-1).provider,'openai');
 sdkText='{"type":"stop","reasoning":"synthetic managed stop"}';const decision=await llm.generateCommand('stop',[],'team');assert.equal(decision.type,'stop');assert.equal(usage.at(-1).feature,'decision-engine');
 const disabled=new LLMService(db,{...managed,prepare:async()=>{throw new Error('Disabled definition')}});const before=providerCalls;await assert.rejects(disabled.generate({prompt:'x',teamId:'team'}),/Disabled definition/);assert.equal(providerCalls,before);
 let fetches=0,fetchOptions;
 const ttsDb={team:{findUnique:async()=>({ttsProvider:'speaches',speachesApiUrl:'https://tenant.invalid',speachesApiKey:'synthetic-stt-key',ttsVoiceId:'configured-voice'})}};
 const {TTSService}=load('../../services/api/src/tts/tts.service.ts',{
  '@nestjs/common':common,'../mvp/mvp-store.service':{MvpStoreService:class{}},'../prisma/prisma.service':{PrismaService:class{}},'../version':{getApiVersion:()=> 'test'},
  '../llm/runtime-ai-budget':{runtimeAiBudget:new RuntimeAiBudget()},
  './tts-http-providers':load('../../services/api/src/tts/tts-http-providers.ts',{
   './tts-language':{detectLanguage:()=> 'en'},'./tts-utils':{estimateDuration:()=>1},
  },{fetch:async (url,options)=>{fetches++;fetchOptions=options;assert.equal(url,'https://tenant.invalid/v1/audio/speech');return new Response(Buffer.from('synthetic-audio'));}}),
  './tts-language':{detectLanguage:()=> 'en',getSpeachesVoice:()=> 'configured-voice',getSpeachesVoiceForLanguage:()=> 'configured-voice'},'./tts-utils':{estimateDuration:()=>1},
 },{fetch:async (url,options)=>{fetches++;fetchOptions=options;assert.equal(url,'https://tenant.invalid/v1/audio/speech');return new Response(Buffer.from('synthetic-audio'))}});
 const tts=new TTSService({getTTSConfig:()=>{throw new Error('Global config must not be read')}},ttsDb);
 const result=await tts.speakStreaming('synthetic text',()=>{}, {teamId:'team'});assert.ok(result.audioData.length);assert.equal(fetchOptions.signal instanceof AbortSignal,true);assert.equal(fetchOptions.headers.Authorization,'Bearer synthetic-stt-key');
 ttsDb.team.findUnique=async()=>null;await assert.rejects(tts.speak('text',{teamId:'missing'}),/Configured team/);assert.equal(fetches,1);
 ttsDb.team.findUnique=async()=>({ttsProvider:'elevenlabs',elevenlabsApiKey:'legacy-team-key'});assert.equal((await tts.resolveTTSConfig('team')).apiKey,'legacy-team-key');
 const {ProviderConfigResolver}=load('../../services/api/src/voice/providers/provider-config.resolver.ts',{'@nestjs/common':common,'../../prisma/prisma.service':{PrismaService:class{}}});
 await assert.rejects(new ProviderConfigResolver({team:{findUnique:async()=>null}}).resolveTeamConfig('missing'),/not found/);
 let sttOptions;
 const {transcribeConfiguredAudio}=load('../../services/api/src/voice/providers/configured-stt.ts',{
  './stt/speaches-stt.adapter':{SpeachesSttAdapter:class{}},'../../llm/runtime-ai-budget':{runtimeAiBudget:new RuntimeAiBudget()},
 },{URL,fetch:async(url,options)=>{assert.equal(url.origin,'https://api.deepgram.com');sttOptions=options;return new Response(JSON.stringify({results:{channels:[{alternatives:[{transcript:'synthetic',confidence:0.8}]}]}}));}});
 const stt=await transcribeConfiguredAudio({teamId:'team',sttProvider:'deepgram',sttApiKey:'synthetic-deepgram'},Buffer.from('wav'),'es-MX');
 assert.equal(stt.text,'synthetic');assert.equal(sttOptions.signal instanceof AbortSignal,true);assert.equal(sttOptions.headers.Authorization,'Token synthetic-deepgram');
 await assert.rejects(transcribeConfiguredAudio({teamId:'team',sttProvider:'webspeech'},Buffer.from('wav')),/browser-side/);
 await assert.rejects(transcribeConfiguredAudio({teamId:'team',sttProvider:'deepgram'},Buffer.from('wav')),/key required/);
 console.log('PASS AI/provider controls: hard budgets, reset/kill/dedup, team-only key, SDK timeout/no retries/output cap, no missing-tenant fallback, TTS endpoint/timeouts/legacy key mapping');
})().catch(error=>{console.error(error);process.exitCode=1});
