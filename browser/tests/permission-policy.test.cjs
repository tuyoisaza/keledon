const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

const source=fs.readFileSync(path.join(__dirname,'../src/permission-policy.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const compiledModule={exports:{}};
vm.runInNewContext(output,{module:compiledModule,exports:compiledModule.exports,URL,Set,Map});
const policy=compiledModule.exports;

test('only secure media requests with matching requesting and tab origins can prompt',()=>{
 const allowed=policy.getMediaPermissionContext('media',{requestingUrl:'https://calls.example/join',securityOrigin:'https://calls.example',mediaTypes:['audio','video']},'https://crm.example/contact');
 assert.deepEqual(JSON.parse(JSON.stringify(allowed)),{origin:'https://calls.example',requestingHost:'calls.example',tabUrl:'https://crm.example/contact',tabHost:'crm.example',mediaTypes:['audio','video']});
 assert.equal(policy.getMediaPermissionContext('notifications',{requestingUrl:'https://calls.example',mediaTypes:['audio']},'https://crm.example'),null);
 assert.equal(policy.getMediaPermissionContext('media',{requestingUrl:'http://calls.example',mediaTypes:['audio']},'https://crm.example'),null);
 assert.equal(policy.getMediaPermissionContext('media',{requestingUrl:'https://calls.example',securityOrigin:'https://other.example',mediaTypes:['audio']},'https://crm.example'),null);
 assert.equal(policy.getMediaPermissionContext('media',{requestingUrl:'https://calls.example',mediaTypes:['audio','unknown']},'https://crm.example'),null);
 assert.equal(policy.getMediaPermissionContext('media',{requestingUrl:'https://calls.example',mediaTypes:['audio']},'file:///app/index.html'),null);
});

test('native consent copy follows the configured Spanish or English language',()=>{
 const context={origin:'https://calls.example',requestingHost:'calls.example',tabUrl:'https://crm.example/contact',tabHost:'crm.example',mediaTypes:['audio','video']};
 assert.match(policy.getMediaPermissionPrompt(context,'es-MX').message,/micrófono y cámara/);
 assert.match(policy.getMediaPermissionPrompt(context,'en-US').message,/microphone and camera/);
});

test('session grants are origin- and media-specific and reject every other permission',()=>{
 const grants=new Map();
 const context=policy.getMediaPermissionContext('media',{requestingUrl:'https://calls.example/join',mediaTypes:['audio']},'https://crm.example')
 policy.rememberMediaPermission(grants,context);
 assert.equal(policy.hasMediaPermission(grants,'media','https://calls.example',{mediaTypes:['audio']}),true);
 assert.equal(policy.hasMediaPermission(grants,'media','https://calls.example',{mediaTypes:['video']}),false);
 assert.equal(policy.hasMediaPermission(grants,'media','https://calls.example',{mediaType:'audio'}),true);
 assert.equal(policy.hasMediaPermission(grants,'media','https://calls.example',{mediaType:'unknown'}),false);
 assert.equal(policy.hasMediaPermission(grants,'media','https://other.example',{mediaTypes:['audio']}),false);
 assert.equal(policy.hasMediaPermission(grants,'clipboard-read','https://calls.example',{mediaTypes:['audio']}),false);
 assert.equal(policy.hasMediaPermission(grants,'media','http://calls.example',{mediaTypes:['audio']}),false);
});

test('permission handler remembers an explicit consent only for the unchanged page',async()=>{
 let prompts=0;
 const handlers=policy.createPermissionHandlers(async()=>{prompts++;return true;});
 const webContents={url:'https://crm.example/contact',getURL(){return this.url;},isDestroyed(){return false;}};
 const details={requestingUrl:'https://calls.example/join',securityOrigin:'https://calls.example',mediaTypes:['audio']};
 let decision;
 handlers.request(webContents,'media',allowed=>{decision=allowed;},details);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(decision,true);
 assert.equal(handlers.check('media','https://calls.example',{mediaType:'audio'}),true);
 assert.equal(handlers.check('media','https://calls.example',{mediaType:'video'}),false);

 const navigated=policy.createPermissionHandlers(async()=>true);
 webContents.url='https://crm.example/contact';
 decision=undefined;
 navigated.request(webContents,'media',allowed=>{decision=allowed;},details);
 webContents.url='https://attacker.example';
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(decision,false);

 const denied=policy.createPermissionHandlers(async()=>{throw new Error('dialog unavailable');});
 decision=undefined;
 denied.request(webContents,'media',allowed=>{decision=allowed;},{...details,requestingUrl:'http://calls.example/join'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(decision,false);
 assert.equal(prompts,1);
});

test('main process prompts for media requests and skips updater checks outside packaged builds',()=>{
 const main=fs.readFileSync(path.join(__dirname,'../src/main.ts'),'utf8');
 assert.match(main,/setPermissionCheckHandler\(/);
 assert.match(main,/setPermissionRequestHandler\(/);
 assert.match(main,/showMessageBox\(/);
 assert.match(main,/createPermissionHandlers\(showMediaPermissionConsent\)/);
 assert.match(main,/handlers\.request\(webContents, permission, callback/);
 assert.match(main,/if \(app\.isPackaged\)[\s\S]*?checkForUpdatesAndNotify\(/);
 assert.doesNotMatch(main,/callback\(true\);\s*\}\);/);
});
