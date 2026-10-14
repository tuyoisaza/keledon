const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const appVersion = require('../package.json').version;
const { chromium } = require(path.resolve(__dirname,'../../api/node_modules/playwright'));
const root = path.resolve(__dirname,'../../..');
const dist = path.resolve(__dirname,'../dist');
const evidence = path.join(root,'docs/phdk/evidence');
async function getCandidateFingerprint(){
 const baseCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const sourceRoots=['browser','cloud','services/api','services/web','landing'];
 const trackedDiff=execFileSync('git',['diff','--binary','HEAD','--',...sourceRoots],{cwd:root,maxBuffer:64*1024*1024});
 const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(file=>sourceRoots.some(sourceRoot=>file.startsWith(sourceRoot+'/'))).sort();
 const hash=crypto.createHash('sha256').update(trackedDiff);
 for(const relativePath of untracked){hash.update(relativePath);hash.update(await fs.readFile(path.join(root,relativePath)));}
 return {baseCommit,sourceFingerprint:'sha256:'+hash.digest('hex'),dirtyUntrackedSourceFiles:untracked.length,sourceRoots};
}
const company={id:'company-co',name:'Company Co',industry:'Synthetic UAT',countries:[{countryCode:'MX'}]};
const otherCompany={id:'other-company',name:'Other Co',industry:'Synthetic UAT',countries:[{countryCode:'MX'}]};
const brand={id:'brand-co',name:'Company Co Brand',companyId:company.id,company};
const brand2={id:'brand-co-2',name:'Company Co Brand 2',companyId:company.id,company};
const otherBrand={id:'brand-other',name:'Other Co Brand',companyId:otherCompany.id,company:otherCompany};
const team={id:'team-co',name:'Company Co Service',brandId:brand.id,brand,country:'MX'};
const team2={id:'team-co-2',name:'Company Co Service 2',brandId:brand2.id,brand:brand2,country:'MX'};
const otherTeam={id:'team-other',name:'Other Co Service',brandId:otherBrand.id,brand:otherBrand,country:'MX'};
const person={id:'companyco-001',name:'Company Co Test User',email:'companyco.001@company-co.invalid',role:'user',companyId:company.id,teamId:team.id,brandId:brand.id,team,created_at:'2020-01-02T12:00:00Z',last_session:'2024-05-06T12:34:56Z'};
const device={id:'device-co-001',name:'Company Co Desktop',status:'paired',platform:'Windows',lastSeen:null,version:appVersion};
let deviceList=[device];
let writes=[];
let userWrites=[];
let dashboardSessions=[];
let devicesShouldFail=false;
let voiceProfiles=[];
let voiceProfileWrites=[];
let voiceListShouldFail=false;
let voiceCreateStatus=200;
let voiceUpdateStatus=200;
let voiceDeleteStatus=200;
let voiceUpdateWrites=[];
let keledonRows=[];
let keledonWrites=[];
let keledonCreateStatus=200;
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
    else if(p==='/api/tech-status')body=role==='superadmin'?{detailsAvailable:true,server:{status:'online',uptime:456,nodeVersion:'node-fixture',memoryUsage:{used:10,total:20,percentage:50}},techStack:[{name:'NestJS',version:'11',category:'backend'}],dependencies:[{name:'fixture-package',hasUpdate:true}]}:{detailsAvailable:false,server:{status:'online'},techStack:[],dependencies:[]};
    else if(p==='/api/provider-catalog'||p==='/api/rpa-providers')body=[];
    else if(p==='/api/cloud-config')body={ws_url:origin};
    else if(p.endsWith('/config/status'))body={openaiKeySet:true};
    else if(/^\/api\/teams\/[^/]+\/config$/.test(p)){
      if(route.request().method()==='PUT')writes.push(route.request().postDataJSON());
      body=config;
    }
    else if(p==='/api/teams'||p==='/api/crud/teams')body=[team,team2,otherTeam];
    else if(p==='/api/crud/sessions')body=dashboardSessions;
    else if(p==='/api/devices'&&devicesShouldFail)return route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic device failure"}'});
    else if(p==='/api/devices')body=deviceList;
    else if(p==='/api/crud/companies')body=[company,otherCompany];
    else if(p==='/api/crud/brands')body=[brand,brand2,otherBrand];
    else if(p==='/api/crud/keledons'){
      if(route.request().method()==='POST'){
        const payload=route.request().postDataJSON();keledonWrites.push(payload);
        if(keledonCreateStatus!==200)return route.fulfill({status:keledonCreateStatus,contentType:'application/json',body:'{"message":"synthetic KELEDON create denied"}'});
        const record={id:'keledon-co-001',...payload,isActive:true};keledonRows.push(record);body=record;
      } else body=keledonRows;
    }
    else if(p==='/api/crud/users'){
      if(route.request().method()!=='GET')userWrites.push({method:route.request().method(),path:p,body:route.request().postDataJSON()});
      body=[person];
    }
    else if(/^\/api\/crud\/users\/[^/]+$/.test(p)){
      const payload=route.request().method()==='PUT'?route.request().postDataJSON():{};
      if(route.request().method()==='PUT')userWrites.push({method:'PUT',path:p,body:payload});
      body={...person,...payload};
    }
    else if(p==='/api/tenant/voice-profiles'){
      if(route.request().method()==='GET'&&voiceListShouldFail)return route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic voice list failure"}'});
      if(route.request().method()==='POST'){
        const payload=route.request().postDataJSON();voiceProfileWrites.push(payload);
        if(voiceCreateStatus!==200)return route.fulfill({status:voiceCreateStatus,contentType:'application/json',body:'{"message":"synthetic voice create denied"}'});
        const profile={id:'voice-co-001',...payload};voiceProfiles.push(profile);body=profile;
      } else body=voiceProfiles;
    }
    else if(/^\/api\/tenant\/voice-profiles\/[^/]+$/.test(p)){
      const id=p.split('/').at(-1);
      if(route.request().method()==='GET'){
        const profile=voiceProfiles.find(item=>item.id===id);
        return route.fulfill({status:profile?200:404,contentType:'application/json',body:JSON.stringify(profile||{message:'not found'})});
      }
      if(route.request().method()==='PUT'){
        const payload=route.request().postDataJSON();voiceUpdateWrites.push({id,payload});
        if(voiceUpdateStatus!==200)return route.fulfill({status:voiceUpdateStatus,contentType:'application/json',body:'{"message":"synthetic voice update denied"}'});
        const index=voiceProfiles.findIndex(profile=>profile.id===id);
        if(index<0)return route.fulfill({status:404,contentType:'application/json',body:'{"message":"not found"}'});
        voiceProfiles[index]={...voiceProfiles[index],...payload};
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(voiceProfiles[index])});
      }
      if(voiceDeleteStatus!==204)return route.fulfill({status:voiceDeleteStatus,contentType:'application/json',body:'{"message":"synthetic voice delete denied"}'});
      voiceProfiles=voiceProfiles.filter(profile=>profile.id!==id);return route.fulfill({status:204,body:''});
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
    if(!localStorage.getItem('keledon-locale'))localStorage.setItem('keledon-locale','es');
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
   if(role==='superadmin'){const trigger=page.getByRole('button',{name:'Agregar empresa',exact:true});await trigger.click();const form=page.getByRole('dialog');await form.waitFor();assert.equal(await form.getByLabel('Nombre de la empresa').count(),1);await page.keyboard.press('Escape');await form.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);}
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
  for(const role of ['admin','superadmin']){
   const statusPage=await pageFor(role);await statusPage.page.goto(origin+'/management/status');
   await statusPage.page.getByText('Cloud Server',{exact:true}).waitFor();
   await statusPage.page.getByText('online',{exact:true}).waitFor();
   if(role==='admin'){
    assert.equal(await statusPage.page.getByText('Tech Stack',{exact:true}).count(),0);
    assert.equal(await statusPage.page.getByText('Dependencies',{exact:true}).count(),0);
    assert.equal(await statusPage.page.getByText('node-fixture',{exact:true}).count(),0);
    assert.equal(await statusPage.page.getByText('Memory Usage',{exact:true}).count(),0);
   } else {
    await statusPage.page.getByText('node-fixture',{exact:true}).waitFor();
    await statusPage.page.getByText('Memory Usage',{exact:true}).waitFor();
   }
   await statusPage.context.close();
  }
  checks.push('UAT admin status page renders safe server availability only; superadmin retains detailed diagnostics (synthetic API fixture)');
  for(const [route,placeholder] of [['brands','Buscar marcas...'],['teams','Buscar equipos...']]){
   const localizedPage=await pageFor('admin');await localizedPage.page.goto(origin+'/management/'+route);
   await localizedPage.page.getByPlaceholder(placeholder).waitFor();await localizedPage.context.close();
  }
  const vendorPage=await pageFor('admin');await vendorPage.page.goto(origin+'/management/vendors');
  await vendorPage.page.getByPlaceholder('Buscar proveedores...').waitFor();
  await vendorPage.page.getByRole('heading',{name:/proveedores/i}).waitFor();await vendorPage.context.close();
  const userAdmin=await pageFor('admin');await userAdmin.page.goto(origin+'/management/users');
  await userAdmin.page.getByPlaceholder('Buscar usuarios...').waitFor();
  const addUser=userAdmin.page.getByRole('button',{name:'Agregar usuario',exact:true});await addUser.waitFor();await addUser.click();
  const userDialog=userAdmin.page.getByRole('dialog');
  const userForm=userDialog.locator('form');
  assert.equal(await userForm.locator('select').count(),2,'admin has brand/team choices only; role/company remain server-derived');
  assert.equal(await userForm.getByText('Company Co',{exact:true}).count(),1);
  const companyGroup=userForm.getByRole('group',{name:'Empresa'});
  assert.equal(await companyGroup.getByText('Company Co',{exact:true}).count(),1);
  await userForm.locator('select').nth(0).selectOption(brand.id);await userForm.locator('select').nth(1).selectOption(team.id);
  await userForm.locator('input[type="text"]').fill('Synthetic Company Co User');
  await userForm.locator('input[type="email"]').fill('synthetic.user@company-co.invalid');
  await userForm.getByRole('button',{name:'Guardar',exact:true}).click();
  await userAdmin.page.waitForFunction(()=>document.querySelector('form')===null);
  assert.deepEqual(userWrites.at(-1),{method:'POST',path:'/api/crud/users',body:{name:'Synthetic Company Co User',email:'synthetic.user@company-co.invalid',teamId:team.id}});
  await userAdmin.page.getByTitle('Editar').first().click();
  const editForm=userAdmin.page.locator('form');await editForm.waitFor();
  await editForm.locator('select').nth(0).selectOption(brand2.id);
  const teamSelect=editForm.locator('select').nth(1);
  assert.equal(await teamSelect.locator('option[value="team-other"]').count(),0);
  await teamSelect.selectOption(team2.id);
  await editForm.getByRole('button',{name:'Guardar',exact:true}).click();
  await userAdmin.page.waitForFunction(()=>document.querySelector('form')===null);
  assert.deepEqual(userWrites.at(-1),{method:'PUT',path:'/api/crud/users/'+person.id,body:{name:person.name,email:person.email,teamId:team2.id}});
  await userAdmin.page.screenshot({path:path.join(evidence,'uat-admin-users-team-scope.png')});
  await userAdmin.context.close();
  const userSuper=await pageFor('superadmin');await userSuper.page.goto(origin+'/management/users');
  await userSuper.page.getByRole('button',{name:'Agregar usuario',exact:true}).click();
  const superDialog=userSuper.page.getByRole('dialog');await superDialog.waitFor();
  assert.equal(await superDialog.getByLabel('Empresa').count(),1);
  assert.equal(await superDialog.getByLabel('Rol').count(),1);
  assert.equal(await superDialog.getByLabel('Empresa').locator('option[value="other-company"]').count(),1);
  await superDialog.getByRole('button',{name:'Cancelar',exact:true}).click();await superDialog.waitFor({state:'hidden'});
  await userSuper.context.close();
  checks.push('UAT-004 company/brand/team/user/vendor administration Spanish copy and manager user restrictions: localized routes/search and modal controls; no role/company payload fields; foreign team absent PASS (synthetic UI; API guard tested separately)');
  const dashboard=await pageFor('user');await dashboard.page.goto(origin+'/dashboard');
  await dashboard.page.getByRole('heading',{name:'Hola, Company',exact:true}).waitFor();
  await dashboard.page.getByText('Esta es tu actividad de hoy',{exact:true}).waitFor();
  await dashboard.page.getByText('Estadísticas de hoy',{exact:true}).waitFor();
  await dashboard.page.getByRole('heading',{name:'Actividad reciente en vivo',exact:true}).waitFor();
  await dashboard.page.getByText('No hay sesiones hoy',{exact:true}).waitFor();
  assert.equal(await dashboard.page.getByRole('table').locator('caption').innerText(),'Sesiones recientes');
  assert.equal(await dashboard.page.getByRole('columnheader',{name:'Usuario',exact:true}).getAttribute('scope'),'col');
  dashboardSessions=[{id:'session-co-001',status:'completed',metadata:JSON.stringify({duration:125}),user:person,team}];
  await dashboard.page.reload();
  await dashboard.page.getByRole('cell',{name:'Completada',exact:true}).waitFor();
  assert.equal(await dashboard.page.getByRole('cell',{name:'Company Co Test User',exact:true}).count(),1);
  await dashboard.page.evaluate(()=>localStorage.setItem('keledon-locale','en'));
  await dashboard.page.reload();
  await dashboard.page.getByRole('heading',{name:'Hello, Company',exact:true}).waitFor();
  await dashboard.page.getByText("Today's Stats",{exact:true}).waitFor();
  await dashboard.page.evaluate(()=>localStorage.setItem('keledon-locale','pt'));
  await dashboard.page.reload();
  await dashboard.page.getByRole('heading',{name:'Olá, Company',exact:true}).waitFor();
  await dashboard.page.getByText('Estatísticas de hoje',{exact:true}).waitFor();
  await dashboard.context.close();
  dashboardSessions=[];
  checks.push('UAT-T-005-DASHBOARD Spanish empty/session states, English and Portuguese greeting/stats, and accessible table caption/column headers PASS (synthetic API)');
  dashboardSessions=[
    {id:'11111111-1111-4111-8111-111111111111',status:'active',metadata:JSON.stringify({duration:15}),user:person,team},
    {id:'22222222-2222-4222-8222-222222222222',status:'completed',metadata:JSON.stringify({duration:125}),user:person,team},
  ];
  const sessionViews=await pageFor('superadmin');await sessionViews.page.goto(origin+'/sessions/live');
  await sessionViews.page.getByRole('heading',{name:'Sesiones en vivo',exact:true}).waitFor();
  await sessionViews.page.getByRole('combobox',{name:'Filtrar por empresa'}).waitFor();
  await sessionViews.page.getByRole('combobox',{name:'Filtrar por usuario'}).waitFor();
  await sessionViews.page.getByRole('button',{name:'Actualizar',exact:true}).waitFor();
  await sessionViews.page.getByRole('heading',{name:'Vista previa del monitor de llamadas',exact:true}).waitFor();
  assert.equal(await sessionViews.page.getByRole('table').locator('caption').innerText(),'Sesiones activas');
  await sessionViews.page.getByRole('cell',{name:'Activa',exact:true}).waitFor();
  assert.equal(await sessionViews.page.getByRole('columnheader',{name:'ID DE SESIÓN',exact:true}).getAttribute('scope'),'col');
  await sessionViews.page.goto(origin+'/sessions/history');
  await sessionViews.page.getByRole('heading',{name:'Historial de sesiones',exact:true}).waitFor();
  assert.equal(await sessionViews.page.getByRole('table').locator('caption').innerText(),'Historial de sesiones');
  await sessionViews.page.getByRole('cell',{name:'Completada',exact:true}).waitFor();
  await sessionViews.page.getByRole('link',{name:'Ver detalles',exact:true}).click();
  await sessionViews.page.getByRole('heading',{name:'Detalles de la sesión',exact:true}).waitFor();
  assert.equal(await sessionViews.page.getByText('ID de sesión: 22222222-2222-4222-8222-222222222222',{exact:true}).count(),1);
  assert.equal(await sessionViews.page.getByRole('region',{name:'La grabación y la transcripción de la sesión aparecerán aquí.'}).count(),1);
  assert.equal(await sessionViews.page.getByRole('link',{name:'Volver a las sesiones',exact:true}).getAttribute('href'),'/sessions');
  await sessionViews.context.close();
  dashboardSessions=[];
  checks.push('UAT-T-005-SESSIONS Spanish live/history/detail and call-monitor copy, filters, statuses, captions, scoped headers and detail navigation PASS (synthetic API)');
  const profileDevices=await pageFor('user');
  await profileDevices.page.goto(origin+'/profile');
  await profileDevices.page.getByRole('heading',{name:'Mi perfil',exact:true}).waitFor();
  await profileDevices.page.getByText('Usuario',{exact:true}).waitFor();
  await profileDevices.page.getByText('2 de enero de 2020',{exact:true}).waitFor();
  await profileDevices.page.evaluate(()=>localStorage.setItem('keledon-locale','en'));
  await profileDevices.page.reload();
  await profileDevices.page.getByRole('heading',{name:'My profile',exact:true}).waitFor();
  await profileDevices.page.getByText('January 2, 2020',{exact:true}).waitFor();
  await profileDevices.page.evaluate(()=>localStorage.setItem('keledon-locale','pt'));
  await profileDevices.page.reload();
  await profileDevices.page.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();
  await profileDevices.page.getByText('2 de janeiro de 2020',{exact:true}).waitFor();
  await profileDevices.page.evaluate(()=>localStorage.setItem('keledon-locale','es'));
  await profileDevices.page.reload();
  await profileDevices.page.goto(origin+'/devices');
  await profileDevices.page.getByRole('heading',{name:'Dispositivos',exact:true}).waitFor();
  await profileDevices.page.getByText('Vinculado',{exact:true}).waitFor();
  await profileDevices.page.getByText('Última conexión: Nunca',{exact:true}).waitFor();
  assert.equal(await profileDevices.page.getByRole('link',{name:'Abrir el lanzador de Keledon',exact:true}).getAttribute('href'),'/launch-keledon');
  deviceList=[];
  await profileDevices.page.reload();
  await profileDevices.page.getByText('No se encontraron dispositivos. Abre el lanzador de Keledon para conectar tu primer dispositivo.',{exact:true}).waitFor();
  deviceList=[device];
  await profileDevices.page.reload();
  devicesShouldFail=true;
  await profileDevices.page.reload();
  await profileDevices.page.getByRole('alert').getByText('No se pudieron cargar los dispositivos. Inténtalo más tarde.',{exact:true}).waitFor();
  devicesShouldFail=false;
  await profileDevices.page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await profileDevices.page.getByText('Vinculado',{exact:true}).waitFor();
  await profileDevices.page.getByRole('link',{name:'Abrir el lanzador de Keledon',exact:true}).click();
  await profileDevices.page.getByRole('heading',{name:'Lanzar Keledon',exact:true}).waitFor();
  await profileDevices.page.getByText('No hay Keledons disponibles',{exact:true}).waitFor();
  await profileDevices.context.close();
  checks.push('UAT-T-007-PROFILE-DEVICES en/es/pt profile role/date formatting, Spanish device status/empty state, navigation to localized Keledon launcher and retry after visible API failure PASS (mocked API)');
  voiceProfiles=[];voiceProfileWrites=[];voiceUpdateWrites=[];voiceListShouldFail=false;voiceCreateStatus=200;voiceUpdateStatus=200;voiceDeleteStatus=200;
  const voiceAdmin=await pageFor('admin');voiceListShouldFail=true;await voiceAdmin.page.goto(origin+'/management/voice-profiles');
  await voiceAdmin.page.getByRole('alert').getByText('No se pudieron cargar los perfiles de voz. Inténtalo de nuevo.',{exact:true}).waitFor();
  voiceListShouldFail=false;await voiceAdmin.page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await voiceAdmin.page.getByText('No hay perfiles de voz configurados',{exact:true}).waitFor();
  await voiceAdmin.page.getByRole('button',{name:'Agregar el primer perfil de voz',exact:true}).click();
  const voiceDialog=voiceAdmin.page.getByRole('dialog');await voiceDialog.waitFor();
  assert.equal(await voiceDialog.getByLabel('Nombre').count(),1);
  await voiceDialog.getByLabel('Nombre').fill('Company Co synthetic voice');
  await voiceDialog.getByLabel('Proveedor').selectOption('openai');
  await voiceDialog.getByLabel('Idioma').selectOption('es');
  voiceCreateStatus=403;await voiceDialog.getByRole('button',{name:'Crear perfil',exact:true}).click();
  await voiceDialog.getByRole('alert').getByText('No se pudo crear el perfil de voz.',{exact:true}).waitFor();
  assert.equal(voiceProfiles.length,0);
  assert.deepEqual(voiceProfileWrites.at(-1),{name:'Company Co synthetic voice',providerId:'openai',language:'es',isEnabled:true,isDefault:false});
  voiceCreateStatus=200;await voiceDialog.getByRole('button',{name:'Crear perfil',exact:true}).click();
  await voiceAdmin.page.getByText('Company Co synthetic voice',{exact:true}).waitFor();
  assert.equal(await voiceAdmin.page.getByRole('button',{name:'Eliminar perfil de voz: Company Co synthetic voice'}).count(),1);
  await voiceAdmin.page.getByRole('button',{name:'Ver perfil de voz: Company Co synthetic voice'}).click();
  const detailDialog=voiceAdmin.page.getByRole('dialog');await detailDialog.waitFor();
  await detailDialog.getByText('Company Co synthetic voice',{exact:true}).waitFor();
  assert.equal(await detailDialog.getByText('openai',{exact:true}).count(),1);
  await detailDialog.getByRole('button',{name:'Editar',exact:true}).click();
  const editDialog=voiceAdmin.page.getByRole('dialog');await editDialog.waitFor();
  await editDialog.getByLabel('Nombre').fill('Company Co edited voice');
  voiceUpdateStatus=403;await editDialog.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await editDialog.getByRole('alert').getByText('No se pudo actualizar el perfil de voz. Inténtalo de nuevo.',{exact:true}).waitFor();
  assert.equal(voiceProfiles[0].name,'Company Co synthetic voice');
  voiceUpdateStatus=200;await editDialog.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await voiceAdmin.page.getByText('Company Co edited voice',{exact:true}).waitFor();
  assert.deepEqual(voiceUpdateWrites.at(-1),{id:'voice-co-001',payload:{name:'Company Co edited voice',providerId:'openai',language:'es',isEnabled:true,isDefault:false}});
  assert.equal(Object.hasOwn(voiceUpdateWrites.at(-1).payload,'companyId'),false);
  assert.equal(Object.hasOwn(voiceUpdateWrites.at(-1).payload,'apiKey'),false);
  await voiceAdmin.page.getByRole('button',{name:'Eliminar perfil de voz: Company Co edited voice'}).click();
  const voiceDeleteDialog=voiceAdmin.page.getByRole('dialog');await voiceDeleteDialog.waitFor();
  voiceDeleteStatus=403;await voiceDeleteDialog.getByRole('button',{name:'Eliminar',exact:true}).click();
  await voiceDeleteDialog.getByRole('alert').getByText('No se pudo eliminar el perfil de voz.',{exact:true}).waitFor();
  assert.equal(voiceProfiles.length,1);
  voiceDeleteStatus=204;await voiceDeleteDialog.getByRole('button',{name:'Eliminar',exact:true}).click();
  await voiceAdmin.page.getByText('No hay perfiles de voz configurados',{exact:true}).waitFor();
  await voiceAdmin.context.close();
  checks.push('UAT-T-008 Voice Profiles: tenant-independent request, localized list/detail/edit fields, retry and accessible dialogs; mocked HTTP 403 create/update/delete do not announce success; create/update payloads omit caller tenant and credentials; valid camelCase CRUD contract PASS (synthetic UI/API)');
  keledonRows=[];keledonWrites=[];keledonCreateStatus=200;
  const keledonAdmin=await pageFor('admin');await keledonAdmin.page.goto(origin+'/management/keledons');
  await keledonAdmin.page.getByRole('heading',{name:'KELEDONS',exact:true}).waitFor();
  await keledonAdmin.page.getByRole('button',{name:'Agregar KELEDON',exact:true}).click();
  const keledonDialog=keledonAdmin.page.getByRole('dialog');await keledonDialog.waitFor();
  for(const name of ['Nombre','Empresa','Marca','Equipo'])assert.equal(await keledonDialog.getByLabel(name).count(),1);
  await keledonDialog.getByLabel('Nombre').fill('Company Co synthetic KELEDON');
  await keledonDialog.getByLabel('Empresa').selectOption(company.id);
  await keledonDialog.getByLabel('Marca').selectOption(brand.id);
  await keledonDialog.getByLabel('Equipo').selectOption(team.id);
  await keledonDialog.getByRole('button',{name:'Guardar',exact:true}).click();
  await keledonAdmin.page.getByText('Company Co synthetic KELEDON',{exact:true}).waitFor();
  assert.deepEqual(keledonWrites.at(-1),{name:'Company Co synthetic KELEDON',email:'',role:'agent',autonomyLevel:5,teamId:team.id,brandId:brand.id});
  assert.equal(Object.hasOwn(keledonWrites.at(-1),'companyId'),false);
  assert.equal(Array.isArray(keledonWrites.at(-1).uiInterfaces),false);
  await keledonAdmin.page.getByRole('button',{name:'Eliminar KELEDON: Company Co synthetic KELEDON'}).click();
  const keledonDeleteDialog=keledonAdmin.page.getByRole('dialog');await keledonDeleteDialog.waitFor();
  assert.equal(await keledonDeleteDialog.getByText('Esta acción no se puede deshacer.',{exact:false}).count(),1);
  await keledonDeleteDialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  await keledonDeleteDialog.waitFor({state:'hidden'});
  await keledonAdmin.context.close();
  checks.push('UAT-T-009 KELEDON admin create flow: localized labeled fields, scoped company/brand/team selectors, native accessible form and delete-confirmation dialog; payload contains no caller companyId and uses server input shape PASS (synthetic UI/API)');
  const provider=await pageFor('admin');await provider.page.goto(origin+'/management/providers');
  await provider.page.getByRole('heading',{name:'Administración — Proveedores'}).waitFor();
  const key=provider.page.getByPlaceholder('sk-… (introduce tu clave de API de OpenAI)');await key.waitFor();assert.equal(await key.inputValue(),'');
  await key.fill('SYNTHETIC-UAT-REPLACEMENT');const section=key.locator('xpath=ancestor::section');await section.getByRole('button',{name:'Guardar',exact:true}).click();
  await provider.page.waitForFunction(()=>document.querySelector('input[placeholder^="sk-"]')?.value==='');
  assert.equal(writes.at(-1).openaiApiKey,'SYNTHETIC-UAT-REPLACEMENT');
  await section.getByRole('button',{name:'Guardar',exact:true}).click();await provider.page.waitForTimeout(100);
  assert.ok(!Object.hasOwn(writes.at(-1),'openaiApiKey'));
  await provider.context.close();
  checks.push('UAT-004 provider settings Spanish localization and write-only key: translated screen renders; no response prefill; replacement clears after success; untouched blank omitted PASS');
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
  const candidate=await getCandidateFingerprint();
  await fs.writeFile(path.join(evidence,'uat-local-web.json'),JSON.stringify({version:appVersion,date:new Date().toISOString(),candidateRevision:candidate.baseCommit,candidateSourceFingerprint:candidate.sourceFingerprint,dirtyUntrackedSourceFiles:candidate.dirtyUntrackedSourceFiles,sourceRoots:candidate.sourceRoots,targetEnvironment:'local built production SPA with isolated Company Co fixtures and intercepted API; external network blocked',origin,provenance:'UI behavior only; not real server/DB, role authorization, production authentication, or deployed acceptance',checks,themeTokens,loginContrastSample:contrastByTheme,apiEvidence:'services/api/src/health/health.service.spec.ts, roles.guard.spec.ts, and api-correlation.spec.ts',realVendorAudioCRM:'NOT_EXECUTED: client-specific integrations excluded by owner; provider-independent code reviewed'},null,2));
  console.log('PASS local web journeys:',checks.join('\n'));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
