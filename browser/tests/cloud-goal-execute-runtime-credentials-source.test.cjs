const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
const secret='synthetic-vendor-encryption-key';
process.env.KELEDON_VENDOR_KEY=secret;
const makePairingEnvelope=value=>{
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',crypto.scryptSync(secret,'keledon:vendor:pairing:v1',32),iv);
 const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return `keledon:vendor:pairing:v2:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`;
};
const loadTypeScript=(relativePath,requires)=>{
 const source=fs.readFileSync(path.join(__dirname,'../src',relativePath),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const box={exports:{},URL,Buffer,process,require:requires};vm.runInNewContext(output,box);return box.exports;
};
const vendorCrypto=loadTypeScript('vendor-secret-crypto.ts',name=>name==='node:crypto'?crypto:(()=>{throw new Error(name)})());
const oldIv=crypto.randomBytes(16),oldCipher=crypto.createCipheriv('aes-256-cbc',crypto.scryptSync('keledon-vendor-secret-key-32!','salt',32),oldIv);
const legacyPairingValue=`${oldIv.toString('hex')}:${Buffer.concat([oldCipher.update('legacy-browser-password','utf8'),oldCipher.final()]).toString('hex')}`;
assert.equal(vendorCrypto.decryptPairedVendorSecret(legacyPairingValue),'legacy-browser-password');
const runtimeStatus={deviceId:'synthetic-device',vendors:[{id:'v',baseUrl:'https://configured.invalid',username:makePairingEnvelope('synthetic-user'),password:makePairingEnvelope('synthetic-password'),isActive:true}]};
const source=fs.readFileSync(path.join(__dirname,'../src/cloud-helpers.ts'),'utf8');
const cloud=fs.readFileSync(path.join(__dirname,'../src/cloud-connection.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const box={exports:{},URL,Buffer,process,require:name=>{
 if(name==='electron-log')return {info(){},warn(){}};
 if(name==='node:crypto')return crypto;
 if(name==='./vendor-secret-crypto.js')return vendorCrypto;
 if(name==='./runtime-state.js')return {runtimeStatus};
 if(name==='./cmdlog.js')return {log(){},truncate:value=>value};
 throw new Error(name);
}};
vm.runInNewContext(output,box);const helper=box.exports;
const enriched=helper.enrichGoalExecuteDataFromRuntimeVendor({vendor_id:'v',goal:'configured goal'});
assert.equal(enriched.inputs.vendor_id,'v');assert.equal(enriched.inputs.password,'synthetic-password');assert.equal(enriched.inputs.email,'synthetic-user');assert.equal(enriched.inputs.login,'synthetic-user');
assert.equal(helper.enrichGoalExecuteDataFromRuntimeVendor({goal:'unrelated'}).inputs,undefined);
assert.equal(helper.buildWsCtx('https://cloud.invalid','synthetic-secret').includes('synthetic-secret'),false);
assert.doesNotMatch(cloud,/findMatchingVendorFromGoal\(/,'Cloud must identify vendors explicitly; never attach credentials from inferred goal text');
assert.match(cloud,/enrichCloudGoalInputsFromRuntimeVendor\(goalData,\s*goalData\.inputs\)/);
assert.equal(vendorCrypto.decryptPairedVendorSecret(runtimeStatus.vendors[0].username),'synthetic-user');
console.log('PASS authenticated pairing-secret decryption, explicit runtime-vendor enrichment and token-safe metadata; no inferred credential attachment');
