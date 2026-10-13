const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative, deps = {}, globals = {}) {
 const source = fs.readFileSync(path.join(__dirname, relative), 'utf8');
 const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true } }).outputText;
 const box = { exports: {}, Buffer, AbortSignal, process: { env: {} }, ...globals, require: name => { if (deps[name]) return deps[name]; throw new Error(name); } };
 vm.runInNewContext(output, box); return box.exports;
}
(async () => {
 const requestBodies = [];
 const planner = load('../src/goal-planner.ts', {}, { fetch: async (_url, options) => { requestBodies.push(JSON.parse(options.body)); return new Response(JSON.stringify({ success: true, steps: [{ type: 'fill', selector: '#password', value: '${password}' }] })); } });
 const result = await planner.planGoalActionsWithAI('Sign in', '', 'page', 'https://invalid.example', 'synthetic', { password: 'synthetic-secret' });
 assert.equal(result.steps[0].value, 'synthetic-secret');
 assert.equal(requestBodies[0].inputKeys[0], 'password');
 assert.equal(JSON.stringify(requestBodies).includes('synthetic-secret'), false);
 const failed = load('../src/goal-planner.ts', {}, { fetch: async () => { throw new Error('offline'); } });
 await assert.rejects(failed.planGoalActionsWithAI('Open google.com', '', '', 'https://invalid.example', 'synthetic'), /offline/);
 const invalid = load('../src/goal-planner.ts', {}, { fetch: async () => new Response(JSON.stringify({ steps: [{ type: 'execute_script', value: 'unsafe' }] })) });
 await assert.rejects(invalid.planGoalActionsWithAI('Do goal', '', '', 'https://invalid.example', 'synthetic'), /invalid action/);

 const decorator = () => target => target;
 const auth = load('../../services/api/src/gateways/runtime-identity.ts', {
  '@nestjs/common': { Injectable: decorator, UnauthorizedException: Error },
  'crypto': require('node:crypto'),
  '../prisma/prisma.service': { PrismaService: class {} },
  '../auth-local/auth-local.service': { LocalAuthService: class {} },
 });
 const stored = { id: 'd', userId: 'u', keledonId: 'k', user: { id: 'u', companyId: 'c', teamId: 't' } };
 const keledon = { isActive: true, userId: 'u', team: { id: 't', name: 'Team', brand: { id: 'b', name: 'Brand', companyId: 'c', company: { name: 'Company Co' } } } };
 const db = { device: { findUnique: async () => ({authToken:'valid'}), findFirst: async query => query.where.authToken === 'valid' ? stored : null }, keledon: { findUnique: async () => keledon }, session: { findUnique: async () => ({ userId: 'u', teamId: 't' }) } };
 const identity = await auth.resolveRuntimeIdentity(db, 'valid', 'd');
 assert.equal(identity.companyId, 'c');
 assert.equal(await auth.resolveRuntimeIdentity(db, 'forged', 'd'), null);
 assert.equal(await auth.resolveRuntimeIdentity(db, 'valid', 'other-device'), null);
 stored.user.companyId = 'foreign'; assert.equal(await auth.resolveRuntimeIdentity(db, 'valid', 'd'), null); stored.user.companyId = 'c';
 assert.equal(await auth.ownsRuntimeSession(db, identity, 's'), true);
 db.device.findUnique=async()=>({authToken:null});assert.equal(await auth.ownsRuntimeSession(db,identity,'s'),false,'revoked stored token must invalidate existing socket identity');
 db.device.findUnique=async()=>({authToken:'valid'});
 db.session.findUnique = async () => ({ userId: 'other', teamId: 't' });
 assert.equal(await auth.ownsRuntimeSession(db, identity, 'foreign-session'), false);
 const guard = new auth.RuntimeDeviceGuard(db);
 const request = { headers: { authorization: 'Bearer valid' }, params: { deviceId: 'other' } };
 await assert.rejects(guard.canActivate({ switchToHttp: () => ({ getRequest: () => request }) }), /scope mismatch/);
 const common = { Injectable: decorator, Inject: decorator, Logger: class { log() {} warn() {} debug() {} error() {} } };
 const wsDecorators = { WebSocketGateway: decorator, WebSocketServer: decorator, SubscribeMessage: decorator, ConnectedSocket: decorator, MessageBody: decorator };
 const voice = load('../../services/api/src/voice/voice.gateway.ts', {
  '@nestjs/common': common, '@nestjs/websockets': wsDecorators,
  '../prisma/prisma.service': { PrismaService: class {} }, '../gateways/runtime-identity': auth,
  '../tts/tts.service': { TTSService: class {} }, '../llm/llm.service': { LLMService: class {} },
  '../version': { getApiVersion: () => 'test' },
  './providers/provider-config.resolver': { ProviderConfigResolver: class {} },
  './providers/voice-provider.registry': { VoiceProviderRegistry: class {} },
  './providers/configured-stt': { transcribeConfiguredAudio: async (config, wav) => { assert.equal(config.speachesApiUrl,'https://invalid.example'); assert.equal(wav.toString(),'synthetic-wav'); return {text:'synthetic transcript',isFinal:true,confidence:0.9}; } },
  './providers/stt/speaches-stt.adapter': { SpeachesSttAdapter: class { async initialize(config) { assert.equal(config.baseUrl, 'https://invalid.example'); } async transcribe(wav) { assert.equal(wav.toString(),'synthetic-wav'); return { text: 'synthetic transcript', isFinal: true, confidence: 0.9 }; } } },
  './webrtc/webrtc.service': { WebRtcService: class {} },
  './voice.types': { voiceCorsOrigins: [] }, './voice-helpers': { buildCallGreeting: () => 'Hello', buildConversationalSpokenReply: value => value },
 });
 db.session.findUnique = async ({where}) => where.id === 'own' ? { userId: 'u', teamId: 't' } : { userId: 'other', teamId: 't' };
 const gateway = new voice.VoiceGateway(undefined, undefined, undefined, undefined, undefined, db);
 gateway.server = { emit() { throw new Error('Namespace-wide disclosure'); } };
 const emitted = [];
 const client = { id: 'client', handshake: { auth: { token: 'valid', device_id: 'd', context: '{bad json' } }, data: {},
  emit: (event, data) => emitted.push({event,data}), join() {}, leave() {}, disconnect() { this.disconnected = true; } };
 await gateway.handleConnection(client);
 assert.equal(client.data.session.context.companyId, 'c');
 assert.equal(client.disconnected, undefined);
 assert.equal((await gateway.handleCallStart(client, { session_id: 'foreign', context: { teamId: 'foreign' } })).error, 'Invalid call session');
 await gateway.handleCallStart(client, { session_id: 'own', context: { teamId: 'foreign', companyName: 'forged' } });
 assert.equal(client.data.session.context.teamId, 't'); assert.equal(client.data.session.context.companyName, 'Company Co');
 assert.equal(gateway.handleGetSessions({id:'other'}).sessions.length,0);
 let audioHandler;
 const mediaGateway = new voice.VoiceGateway(undefined, undefined, { resolveTeamConfig: async () => ({ sttProvider: 'speaches', speachesApiUrl: 'https://invalid.example' }) }, undefined, {
  createPeer: async (_id, _sdp, track) => { track({track:{kind:'audio'}},[]); return {sdp:'answer'}; },
  attachAudioReceiver: (_id,_receiver,onAudio) => { audioHandler = onAudio; },
 }, db);
 mediaGateway.activeSessions.set(client.id, client.data.session);
 let transcript; mediaGateway.handleTranscript = async (_client, data) => { transcript = data; };
 await mediaGateway.handleWebRTCOffer(client, { sdp: { sdp: 'synthetic' } });
 await audioHandler(Buffer.from('synthetic-wav'));
 assert.equal(transcript.text, 'synthetic transcript'); assert.equal(transcript.is_final,true);
 db.device.findUnique=async()=>({authToken:null});
 assert.equal((await gateway.handleTranscript(client,{text:'revoked attempt',is_final:true})).error,'No active voice session');assert.equal(client.disconnected,true);
 db.device.findUnique=async()=>({authToken:'valid'});
 await gateway.handleDisconnect(client);
 assert.equal(emitted.some(item => item.event === 'voice:disconnected'),true);
 const { PcmUtteranceBuffer } = load('../../services/api/src/voice/webrtc/pcm-utterance-buffer.ts');
 const wavs = []; const pcm = new PcmUtteranceBuffer(wav => wavs.push(wav));
 pcm.push(new Int16Array(800).fill(1000), 8000, 1);
 for (let i=0;i<6;i++) pcm.push(new Int16Array(800), 8000, 1);
 assert.equal(wavs.length, 1); assert.equal(wavs[0].toString('ascii',0,4),'RIFF');
 assert.equal(wavs[0].readUInt32LE(24),8000); assert.equal(wavs[0].readUInt32LE(40),11200);
 pcm.push(new Int16Array(800),8000,1); assert.equal(wavs.length,1);
 const runtime = load('../src/runtime-state.ts', {electron:{}});
 Object.assign(runtime.runtimeStatus,{authToken:'synthetic-secret',sessionId:'s',teamId:'t',teamName:'Company Co',keledonId:'k',pendingPairingCode:'secret-code',vendors:[{password:'secret'}]});
 runtime.clearRuntimeSessionState();
 assert.equal(runtime.runtimeStatus.authToken,null); assert.equal(runtime.runtimeStatus.teamId,null); assert.equal(runtime.runtimeStatus.keledonId,null); assert.equal(runtime.runtimeStatus.pendingPairingCode,null); assert.equal(runtime.runtimeStatus.vendors.length,0);
 const vendorState=load('../src/ipc-vendor-state.ts',{'./media/event-logger.js':{eventLogger:{info(){}}}});
 vendorState.vendorLoginState.vendorId='v'; vendorState.vendorLoginState.isLoggingIn=true;vendorState.bootstrappedVendorIds.add('v');vendorState.setBootstrappedTeamId('t');
 vendorState.clearVendorSessionState(); assert.equal(vendorState.vendorLoginState.vendorId,null);assert.equal(vendorState.bootstrappedVendorIds.size,0);assert.equal(vendorState.bootstrappedTeamId,null);
 console.log('PASS runtime contracts: cloud-only plans/secret placeholders, stored identity/session boundaries, bounded PCM WAV');
})().catch(error => { console.error(error); process.exitCode = 1; });

