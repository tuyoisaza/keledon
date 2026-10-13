const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const appVersion = require('../package.json').version;
const { chromium } = require(path.resolve(__dirname,'../../api/node_modules/playwright'));
const root = path.resolve(__dirname,'../../..');
const dist = path.resolve(__dirname,'../dist');
const evidence = path.join(root,'docs/phdk/evidence');
const company={id:'company-co',name:'Company Co',industry:'Synthetic UAT',countries:[{countryCode:'MX'}]};
const otherCompany={id:'other-company',name:'Other Co',industry:'Synthetic UAT',countries:[{countryCode:'MX'}]};
const brand={id:'brand-co',name:'Company Co Brand',companyId:company.id,company};
const brand2={id:'brand-co-2',name:'Company Co Brand 2',companyId:company.id,company};
const otherBrand={id:'brand-other',name:'Other Co Brand',companyId:otherCompany.id,company:otherCompany};
const team={id:'team-co',name:'Company Co Service',brandId:brand.id,brand,country:'MX'};
const team2={id:'team-co-2',name:'Company Co Service 2',brandId:brand2.id,brand:brand2,country:'MX'};
const otherTeam={id:'team-other',name:'Other Co Service',brandId:otherBrand.id,brand:otherBrand,country:'MX'};
const person={id:'companyco-001',name:'Company Co Test User',email:'companyco.001@company-co.invalid',role:'user',companyId:company.id,teamId:team.id,brandId:brand.id,team};
let writes=[];
let userWrites=[];
let deepReads=0;
let probeCalls=[];
const safeEndpoints=[
 {id:'health.basic',method:'GET',path:'/health',purpose:'Return API liveness without dependency probes.',authRequired:false,requiredRoles:[],probeMode:'safe_read',expectedStatuses:[200],sanitizedRequestExample:null,sanitizedSuccessExample:{status:'ok'},sanitizedErrorExamples:[]},
 {id:'crm.execute',method:'POST',path:'/crm/execute',purpose:'A client-configured CRM action.',authRequired:true,requiredRoles:['admin'],probeMode:'manual_only',expectedStatuses:[200],sanitizedRequestExample:{action:'[redacted]'},sanitizedSuccessExample:{status:'redacted'},sanitizedErrorExamples:[]},
];
const config={sttProvider:'vosk',ttsProvider:'speaches',llmProvider:'openai',speachesApiUrl:'http://localhost/fixture-stt',ttsVoiceId:'fixture-voice',openaiApiKey:'',openaiApiKeySet:true,deepgramConfig:{apiKey:'',hasApiKey:true},ttsApiKey:'',ttsApiKeySet:true,googleAiApiKey:'',googleAiApiKeySet:false};
async function inspectTextContrast(page){return page.evaluate(()=>{
 const parse=value=>{const match=value.match(/rgba?\(([^)]+)\)/);if(!match)return null;const parts=match[1].split(',').map(part=>Number.parseFloat(part));return parts.length>=3?{rgb:parts.slice(0,3),alpha:parts.length>3?parts[3]:1}:null;};
 const luminance=color=>{const rgb=color.map(value=>value/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 const contrast=(first,second)=>{const values=[luminance(first),luminance(second)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
 const failures=[];
 for(const el of document.querySelectorAll('body *')){
  const text=[...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join(' ').replace(/\s+/g,' ').trim();
  if(!text||text.length<2)continue;
  const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
  if(!rect.width||!rect.height||style.visibility==='hidden'||style.display==='none'||Number.parseFloat(style.opacity)===0)continue;
  let fg=parse(style.color);if(!fg)continue;
  let bg=[255,255,255];
  for(let parent=el;parent;parent=parent.parentElement){const background=parse(getComputedStyle(parent).backgroundColor);if(background&&background.alpha>0){bg=background.rgb.map((value,index)=>value*background.alpha+bg[index]*(1-background.alpha));if(background.alpha>=.999)break;}}
  const size=Number.parseFloat(style.fontSize),weight=Number.parseInt(style.fontWeight,10)||400,large=size>=24||(size>=18.66&&weight>=600),ratio=contrast(fg.rgb,bg);
  if(ratio<(large?3:4.5))failures.push({text:text.slice(0,72),tag:el.tagName,className:typeof el.className==='string'?el.className:'',ratio:Number(ratio.toFixed(2)),fontPx:size,weight,foreground:fg.rgb.map(Math.round),background:bg.map(Math.round),computedBackground:style.backgroundColor,opacity:style.opacity,ancestorOpacity:getComputedStyle(el.parentElement).opacity});
 }
 return failures.slice(0,40);
});}
test('local production web UAT with explicitly mocked Company Co API (not real backend acceptance)',{timeout:120000},async()=>{
 await fs.mkdir(evidence,{recursive:true});
 const server=http.createServer(async(req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   let candidate=path.resolve(dist,'.'+pathname);
   if(!candidate.startsWith(dist+path.sep)&&candidate!==dist){res.writeHead(403);res.end();return;}
   try{if(pathname==='/'||!path.extname(pathname))candidate=path.join(dist,'index.html');const data=await fs.readFile(candidate);res.setHeader('Content-Type',candidate.endsWith('.js')?'text/javascript':candidate.endsWith('.css')?'text/css':candidate.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);}
   catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 const checks=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.KELEDON_UAT_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--no-proxy-server']});
  async function pageFor(role,viewport={width:1280,height:900}){
   const context=await browser.newContext({viewport,locale:'es-MX'});
   const page=await context.newPage();
   await page.routeWebSocket('**/*',socket=>socket.close());
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(!url.pathname.startsWith('/api/'))return route.continue();
    let body={};
    const p=url.pathname;
    if(p==='/api/auth/me')body={success:true,user:{...person,role:role||'guest'}};
    else if(p==='/api/cloud-config')body={ws_url:origin};
    else if(p.endsWith('/config/status'))body={openaiKeySet:true};
    else if(/^\/api\/teams\/[^/]+\/config$/.test(p)){
      if(route.request().method()==='PUT')writes.push(route.request().postDataJSON());
      body=config;
    }
    else if(p==='/api/teams'||p==='/api/crud/teams')body=[team,team2,otherTeam];
    else if(p==='/api/crud/companies')body=[company,otherCompany];
    else if(p==='/api/crud/brands')body=[brand,brand2,otherBrand];
    else if(p==='/api/crud/users'){
      if(route.request().method()!=='GET')userWrites.push({method:route.request().method(),path:p,body:route.request().postDataJSON()});
      body=[person];
    }
    else if(/^\/api\/crud\/users\/[^/]+$/.test(p)){
      const payload=route.request().method()==='PUT'?route.request().postDataJSON():{};
      if(route.request().method()==='PUT')userWrites.push({method:'PUT',path:p,body:payload});
      body={...person,...payload};
    }
    else if(p.startsWith('/api/crud/vendors/'))body=[{id:'vendor-co',name:'Company Co CRM',type:'crm',teamId:team.id,isActive:true}];
    else body=[];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   });
   await page.route(/\/health\/deep\/?$/,async route=>{
    deepReads++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'healthy',version:appVersion,gitSha:'uat-fixture',buildTimestamp:'2026-10-13T00:00:00.000Z',endpointDiagnostics:safeEndpoints,database:{status:'healthy',migrations:'present'},meteredProviders:{probeCallsMade:0,tenantProviderCredentials:'not_enumerated'},latestSafeProbes:[]})});
   });
   await page.route(/\/health\/deep\/probes\/[^/]+$/,async route=>{
    const id=new URL(route.request().url()).pathname.split('/').at(-1);
    probeCalls.push({id,method:route.request().method(),body:route.request().postData()});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id,status:'pass',method:'GET',path:'/health',httpStatus:200,latencyMs:2,correlationId:'diag_'+'a'.repeat(32)})});
   });
   await page.addInitScript(({role})=>{
    localStorage.setItem('keledon-locale','es');
    if(role)sessionStorage.setItem('auth_token','SYNTHETIC-UAT-TOKEN-NOT-A-CREDENTIAL');
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(window.__denyCopy)throw Error('fixture denial');window.__copied=value;}}});
   },{role});
   return {page,context};
  }
  const anonymous=await pageFor(null);
  const page=anonymous.page;
  await page.goto(origin+'/login');await page.locator('[data-testid="version-actions"]').waitFor();
  const row=page.locator('[data-testid="version-actions"]');assert.equal(await row.count(),1);
  assert.equal((await row.innerText()).trim(),`v${appVersion}`);
  const dims=await row.evaluate(el=>({gap:getComputedStyle(el).gap,font:getComputedStyle(el.querySelector('span')).fontSize,buttons:[...el.querySelectorAll('button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,icon:b.querySelector('svg').getBoundingClientRect().width})),x:el.getBoundingClientRect().x}));
  assert.equal(dims.gap,'4px');assert.equal(dims.font,'12px');for(const b of dims.buttons){assert.equal(b.w,28);assert.equal(b.h,28);assert.equal(b.icon,14);}assert.ok(dims.x<30);
  await row.locator('[data-action="copy"]').click();
  await row.locator('[data-action="copy"] .keledon-action-success').waitFor();
  assert.match(await page.evaluate(()=>window.__copied),new RegExp(`Version:\\s*v${appVersion}`));
  await page.waitForFunction(()=>!document.querySelector('[data-action="copy"]').disabled);
  assert.equal(await row.locator('.keledon-action-success').count(),0);
  await page.evaluate(()=>window.__denyCopy=true);await row.locator('[data-action="copy"]').click();assert.equal(await row.locator('[data-action="copy"] .keledon-action-success').count(),0);
  await page.evaluate(async()=>{localStorage.setItem('foreign-state','keep');localStorage.setItem('keledon-owned','remove');sessionStorage.setItem('foreign-session','keep');await caches.open('foreign-cache');await caches.open('keledon-owned');});
  await row.locator('[data-action="clear"]').click();await row.locator('[data-action="clear"] .keledon-action-success').waitFor();
  const reset=await page.evaluate(async()=>({own:localStorage.getItem('keledon-owned'),foreign:localStorage.getItem('foreign-state'),session:sessionStorage.getItem('foreign-session'),caches:await caches.keys()}));
  assert.equal(reset.own,null);assert.equal(reset.foreign,'keep');assert.equal(reset.session,'keep');assert.ok(reset.caches.includes('foreign-cache'));assert.ok(!reset.caches.includes('keledon-owned'));
  await page.waitForFunction(()=>!document.querySelector('[data-action="clear"]').disabled);
  const contrastByTheme={},themeTokens={};
  const expectedPrimary={light:'#0f766e',corporate:'#194185',dark:'#14b8a5'};
  for (const theme of ['light','corporate','dark']) { await page.getByRole('combobox',{name:'Tema de color',exact:true}).selectOption(theme); await page.waitForFunction(value=>document.documentElement.dataset.keledonTheme===value,theme); await page.waitForTimeout(250); await page.mouse.move(0,0); assert.equal(await page.evaluate(()=>localStorage.getItem('keledon-theme')),theme); themeTokens[theme]=await page.evaluate(()=>{const root=getComputedStyle(document.documentElement),button=getComputedStyle(document.querySelector('button[type="submit"]'));return {theme:document.documentElement.dataset.keledonTheme,primary:root.getPropertyValue('--color-primary').trim(),primaryForeground:root.getPropertyValue('--color-primary-foreground').trim(),buttonPrimary:button.getPropertyValue('--color-primary').trim(),buttonForeground:button.getPropertyValue('--color-primary-foreground').trim(),buttonBg:button.backgroundColor,buttonFg:button.color};}); assert.equal(themeTokens[theme].buttonPrimary,expectedPrimary[theme],`${theme} primary token applies to descendant controls`); assert.equal(themeTokens[theme].buttonBg,theme==='light'?'rgb(15, 118, 110)':theme==='corporate'?'rgb(25, 65, 133)':'rgb(20, 184, 165)',`${theme} button renders its configured primary color`); contrastByTheme[theme]=await inspectTextContrast(page); await page.screenshot({path:path.join(evidence,'uat-login-'+theme+'.png')}); assert.deepEqual(contrastByTheme[theme],[],`${theme} login text contrast failures: ${JSON.stringify(contrastByTheme[theme])}`); }
  checks.push('UAT-THEME dark/light/corporate tokens reach descendant controls, persistence PASS; automated login text contrast sample has no failures (not a full-app accessibility certification)');
  await page.screenshot({path:path.join(evidence,'uat-login-desktop.png')});
  await page.setViewportSize({width:390,height:844});assert.equal(await row.isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(evidence,'uat-login-mobile.png')});
  for (const [name,width] of [['200-percent',640],['400-percent',320]]) {
   await page.setViewportSize({width,height:900});
   assert.equal(await row.isVisible(),true,`${name} zoom keeps diagnostics visible`);
   const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
   assert.ok(layout.document<=layout.viewport && layout.body<=layout.viewport,`${name} zoom horizontal overflow: ${JSON.stringify(layout)}`);
   await page.screenshot({path:path.join(evidence,`uat-login-${name}.png`)});
  }
  await page.setViewportSize({width:1280,height:900});
  await page.goto(origin+'/');await page.locator('[data-testid="version-actions"]').waitFor();assert.equal(await page.locator('[data-testid="version-actions"]').count(),1);
  checks.push('UAT-002 anonymous home/login, compact sizes, awaited copy/check/revert, failure no false check, owned reset/foreign preservation, 390px layout and 200/400% zoom reflow PASS (viewport simulation)');
  await anonymous.context.close();
  for(const role of ['superadmin','admin','coordinator']){
   const {page,context}=await pageFor(role);await page.goto(origin+'/management/companies');
   const detail=page.getByRole('button',{name:'Ver detalle: Company Co',exact:true});await detail.waitFor();
   if(role==='superadmin'){const trigger=page.getByRole('button',{name:'Add Company',exact:true});await trigger.click();const form=page.getByRole('dialog');await form.waitFor();assert.equal(await form.getByLabel('Company Name').count(),1);await page.keyboard.press('Escape');await form.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);}
   await detail.click();const dialog=page.getByRole('dialog');await dialog.waitFor();assert.ok((await dialog.innerText()).includes('Synthetic UAT'));
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true);
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await detail.evaluate(el=>el===document.activeElement),true);
   if(role!=='superadmin')assert.equal(await page.locator('tbody tr').first().locator('button').last().isDisabled(),true);
   await page.getByRole('button',{name:'Contraer navegación',exact:true}).click();assert.equal(await page.locator('[data-testid="version-actions"]').count(),1);assert.equal(await page.locator('[data-testid="version-actions"]').isVisible(),true);
   for (const [name,width] of [['200-percent',640],['400-percent',320]]) {
    await page.setViewportSize({width,height:900});
    const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    assert.ok(layout.document<=layout.viewport && layout.body<=layout.viewport,`${role} ${name} zoom horizontal overflow: ${JSON.stringify(layout)}`);
   }
   await page.setViewportSize({width:1280,height:900});
   await page.screenshot({path:path.join(evidence,'uat-'+role+'-company-details.png')});
   await context.close();
   checks.push('UAT-004 '+role+' frontend fixture details/keyboard/focus/collapsed diagnostic/privileged controls PASS; backend auth not claimed by mocked API');
  }
  const userAdmin=await pageFor('admin');await userAdmin.page.goto(origin+'/management/users');
  const addUser=userAdmin.page.getByRole('button',{name:'Add User',exact:true});await addUser.waitFor();await addUser.click();
  const userDialog=userAdmin.page.getByRole('dialog');
  const userForm=userDialog.locator('form');
  assert.equal(await userForm.locator('select').count(),2,'admin has brand/team choices only; role/company remain server-derived');
  assert.equal(await userForm.getByText('Company Co',{exact:true}).count(),1);
  const companyGroup=userForm.getByRole('group',{name:'Company'});
  assert.equal(await companyGroup.getByText('Company Co',{exact:true}).count(),1);
  await userForm.locator('select').nth(0).selectOption(brand.id);await userForm.locator('select').nth(1).selectOption(team.id);
  await userForm.locator('input[type="text"]').fill('Synthetic Company Co User');
  await userForm.locator('input[type="email"]').fill('synthetic.user@company-co.invalid');
  await userForm.getByRole('button',{name:'Save',exact:true}).click();
  await userAdmin.page.waitForFunction(()=>document.querySelector('form')===null);
  assert.deepEqual(userWrites.at(-1),{method:'POST',path:'/api/crud/users',body:{name:'Synthetic Company Co User',email:'synthetic.user@company-co.invalid',teamId:team.id}});
  await userAdmin.page.getByTitle('Edit').first().click();
  const editForm=userAdmin.page.locator('form');await editForm.waitFor();
  await editForm.locator('select').nth(0).selectOption(brand2.id);
  const teamSelect=editForm.locator('select').nth(1);
  assert.equal(await teamSelect.locator('option[value="team-other"]').count(),0);
  await teamSelect.selectOption(team2.id);
  await editForm.getByRole('button',{name:'Save',exact:true}).click();
  await userAdmin.page.waitForFunction(()=>document.querySelector('form')===null);
  assert.deepEqual(userWrites.at(-1),{method:'PUT',path:'/api/crud/users/'+person.id,body:{name:person.name,email:person.email,teamId:team2.id}});
  await userAdmin.page.screenshot({path:path.join(evidence,'uat-admin-users-team-scope.png')});
  await userAdmin.context.close();
  const userSuper=await pageFor('superadmin');await userSuper.page.goto(origin+'/management/users');
  await userSuper.page.getByRole('button',{name:'Add User',exact:true}).click();
  const superDialog=userSuper.page.getByRole('dialog');await superDialog.waitFor();
  assert.equal(await superDialog.getByLabel('Company').count(),1);
  assert.equal(await superDialog.getByLabel('Role').count(),1);
  assert.equal(await superDialog.getByLabel('Company').locator('option[value="other-company"]').count(),1);
  await superDialog.getByRole('button',{name:'Cancel',exact:true}).click();await superDialog.waitFor({state:'hidden'});
  await userSuper.context.close();
  checks.push('UAT-004 admin user create and same-company team reassignment: no role/company controls or payload fields; foreign company team absent PASS (synthetic UI; API guard tested separately)');
  const provider=await pageFor('admin');await provider.page.goto(origin+'/management/providers');
  const key=provider.page.getByPlaceholder('sk-… (enter your OpenAI API key)');await key.waitFor();assert.equal(await key.inputValue(),'');
  await key.fill('SYNTHETIC-UAT-REPLACEMENT');const section=key.locator('xpath=ancestor::section');await section.getByRole('button',{name:'Save',exact:true}).click();
  await provider.page.waitForFunction(()=>document.querySelector('input[placeholder^="sk-"]')?.value==='');
  assert.equal(writes.at(-1).openaiApiKey,'SYNTHETIC-UAT-REPLACEMENT');
  await section.getByRole('button',{name:'Save',exact:true}).click();await provider.page.waitForTimeout(100);
  assert.ok(!Object.hasOwn(writes.at(-1),'openaiApiKey'));
  await provider.context.close();
  checks.push('UAT-004 provider write-only key: no response prefill; replacement cleared after success; untouched blank omitted PASS');
  const guest=await pageFor('guest');await guest.page.goto(origin+'/management/companies');await guest.page.waitForURL(origin+'/');const guestVersionActions=guest.page.locator('[data-testid="version-actions"]');await guestVersionActions.waitFor();assert.equal(await guestVersionActions.count(),1);await guest.context.close();
  checks.push('UAT-004 authenticated guest blocked from management without redirect loop PASS (frontend fixture)');
  const diagnostic=await pageFor('admin');
  await diagnostic.page.goto(origin+'/management/debug');
  const debugToggle=diagnostic.page.getByRole('checkbox');
  const debugToggleControl=diagnostic.page.locator('label').filter({has:debugToggle});
  assert.equal(await debugToggle.isChecked(),false);
  assert.equal(deepReads,0);
  await debugToggleControl.click();
  assert.equal(await debugToggle.isChecked(),true);
  assert.equal(await diagnostic.page.locator('aside[aria-label="Panel de diagnóstico"]').count(),0);
  const basicEndpoint=diagnostic.page.locator('article').filter({hasText:'GET /health'}).first();
  await basicEndpoint.waitFor();
  assert.equal(deepReads,1);
  assert.equal(probeCalls.length,0);
  const manualEndpoint=diagnostic.page.locator('article').filter({hasText:'POST /crm/execute'}).first();
  assert.equal(await manualEndpoint.getByRole('button').count(),0);
  await basicEndpoint.getByRole('button').click();
  await basicEndpoint.locator('[aria-live="polite"]').waitFor();
  await diagnostic.page.waitForFunction(()=>document.querySelector('article[aria-label]')!==null || document.body.innerText.includes('diag_'));
  assert.equal(probeCalls.length,1);
  assert.deepEqual(probeCalls[0],{id:'health.basic',method:'POST',body:'{}'});
  assert.ok((await basicEndpoint.innerText()).includes('diag_'));
  await diagnostic.page.screenshot({path:path.join(evidence,'uat-admin-endpoint-diagnostics.png')});
  await debugToggleControl.click();
  assert.equal(await debugToggle.isChecked(),false);
  await basicEndpoint.waitFor({state:'hidden'});
  assert.equal(deepReads,1);
  await diagnostic.context.close();
  checks.push(`UAT-002 ${appVersion} protected diagnostics UI: debug-off makes no read, toggle-on reads once, only clicked safe probe POSTs, manual-only CRM route has no test button, toggle-off clears results PASS (mocked API; actual server authorization is covered by isolated API tests)`);
  await fs.writeFile(path.join(evidence,'uat-local-web.json'),JSON.stringify({version:appVersion,date:new Date().toISOString(),candidateRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),targetEnvironment:'local built production SPA with isolated Company Co fixtures and intercepted API; external network blocked',origin,provenance:'UI behavior only; not real server/DB, role authorization, production authentication, or deployed acceptance',checks,themeTokens,loginContrastSample:contrastByTheme,apiEvidence:'services/api/src/health/health.service.spec.ts, roles.guard.spec.ts, and api-correlation.spec.ts',realVendorAudioCRM:'NOT_EXECUTED: client-specific integrations excluded by owner; provider-independent code reviewed'},null,2));
  console.log('PASS local web journeys:',checks.join('\n'));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
