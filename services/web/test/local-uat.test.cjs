const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname,'../../api/node_modules/playwright'));
const root = path.resolve(__dirname,'../../..');
const dist = path.resolve(__dirname,'../dist');
const evidence = path.join(root,'docs/phdk/evidence');
const company={id:'company-co',name:'Company Co',industry:'Synthetic UAT',countries:[{countryCode:'MX'}]};
const brand={id:'brand-co',name:'Company Co Brand',companyId:company.id,company};
const team={id:'team-co',name:'Company Co Service',brandId:brand.id,brand,country:'MX'};
const person={id:'companyco-001',name:'Company Co Test User',email:'companyco.001@tujuisasa.com',role:'user',companyId:company.id,teamId:team.id,team};
let writes=[];
const config={sttProvider:'vosk',ttsProvider:'speaches',llmProvider:'openai',speachesApiUrl:'http://localhost/fixture-stt',ttsVoiceId:'fixture-voice',openaiApiKey:'',openaiApiKeySet:true,deepgramConfig:{apiKey:'',hasApiKey:true},ttsApiKey:'',ttsApiKeySet:true,googleAiApiKey:'',googleAiApiKeySet:false};
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
    else if(p==='/api/teams'||p==='/api/crud/teams')body=[team];
    else if(p==='/api/crud/companies')body=[company];
    else if(p==='/api/crud/brands')body=[brand];
    else if(p==='/api/crud/users')body=[person];
    else if(p.startsWith('/api/crud/vendors/'))body=[{id:'vendor-co',name:'Company Co CRM',type:'crm',teamId:team.id,isActive:true}];
    else body=[];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
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
  assert.equal((await row.innerText()).trim(),'v5.0.54');
  const dims=await row.evaluate(el=>({gap:getComputedStyle(el).gap,font:getComputedStyle(el.querySelector('span')).fontSize,buttons:[...el.querySelectorAll('button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,icon:b.querySelector('svg').getBoundingClientRect().width})),x:el.getBoundingClientRect().x}));
  assert.equal(dims.gap,'4px');assert.equal(dims.font,'12px');for(const b of dims.buttons){assert.equal(b.w,28);assert.equal(b.h,28);assert.equal(b.icon,14);}assert.ok(dims.x<30);
  await row.locator('[data-action="copy"]').click();
  await row.locator('[data-action="copy"] .keledon-action-success').waitFor();
  assert.equal(JSON.parse(await page.evaluate(()=>window.__copied)).version,'v5.0.54');
  await page.waitForFunction(()=>!document.querySelector('[data-action="copy"]').disabled);
  assert.equal(await row.locator('.keledon-action-success').count(),0);
  await page.evaluate(()=>window.__denyCopy=true);await row.locator('[data-action="copy"]').click();assert.equal(await row.locator('[data-action="copy"] .keledon-action-success').count(),0);
  await page.evaluate(async()=>{localStorage.setItem('foreign-state','keep');localStorage.setItem('keledon-owned','remove');sessionStorage.setItem('foreign-session','keep');await caches.open('foreign-cache');await caches.open('keledon-owned');});
  await row.locator('[data-action="clear"]').click();await row.locator('[data-action="clear"] .keledon-action-success').waitFor();
  const reset=await page.evaluate(async()=>({own:localStorage.getItem('keledon-owned'),foreign:localStorage.getItem('foreign-state'),session:sessionStorage.getItem('foreign-session'),caches:await caches.keys()}));
  assert.equal(reset.own,null);assert.equal(reset.foreign,'keep');assert.equal(reset.session,'keep');assert.ok(reset.caches.includes('foreign-cache'));assert.ok(!reset.caches.includes('keledon-owned'));
  await page.waitForFunction(()=>!document.querySelector('[data-action="clear"]').disabled);
  for (const theme of ['light','corporate','dark']) { await page.getByRole('combobox',{name:'Tema de color',exact:true}).selectOption(theme); await page.waitForFunction(value=>document.documentElement.dataset.keledonTheme===value,theme); assert.equal(await page.evaluate(()=>localStorage.getItem('keledon-theme')),theme); await page.screenshot({path:path.join(evidence,'uat-login-'+theme+'.png')}); }
  checks.push('UAT-THEME actual dark/light/corporate shell selection and persistence PASS; full-app contrast certification not claimed');
  await page.screenshot({path:path.join(evidence,'uat-login-desktop.png')});
  await page.setViewportSize({width:390,height:844});assert.equal(await row.isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(evidence,'uat-login-mobile.png')});
  await page.goto(origin+'/');await page.locator('[data-testid="version-actions"]').waitFor();assert.equal(await page.locator('[data-testid="version-actions"]').count(),1);
  checks.push('UAT-002 anonymous home/login, compact sizes, awaited copy/check/revert, failure no false check, owned reset/foreign preservation, 390px layout PASS');
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
   await page.screenshot({path:path.join(evidence,'uat-'+role+'-company-details.png')});
   await context.close();
   checks.push('UAT-004 '+role+' frontend fixture details/keyboard/focus/collapsed diagnostic/privileged controls PASS; backend auth not claimed by mocked API');
  }
  const provider=await pageFor('admin');await provider.page.goto(origin+'/management/providers');
  const key=provider.page.getByPlaceholder('sk-… (enter your OpenAI API key)');await key.waitFor();assert.equal(await key.inputValue(),'');
  await key.fill('SYNTHETIC-UAT-REPLACEMENT');const section=key.locator('xpath=ancestor::section');await section.getByRole('button',{name:'Save',exact:true}).click();
  await provider.page.waitForFunction(()=>document.querySelector('input[placeholder^="sk-"]')?.value==='');
  assert.equal(writes.at(-1).openaiApiKey,'SYNTHETIC-UAT-REPLACEMENT');
  await section.getByRole('button',{name:'Save',exact:true}).click();await provider.page.waitForTimeout(100);
  assert.ok(!Object.hasOwn(writes.at(-1),'openaiApiKey'));
  await provider.context.close();
  checks.push('UAT-004 provider write-only key: no response prefill; replacement cleared after success; untouched blank omitted PASS');
  const guest=await pageFor('guest');await guest.page.goto(origin+'/management/companies');await guest.page.waitForURL(origin+'/');assert.equal(await guest.page.locator('[data-testid="version-actions"]').count(),1);await guest.context.close();
  checks.push('UAT-004 authenticated guest blocked from management without redirect loop PASS (frontend fixture)');
  await fs.writeFile(path.join(evidence,'uat-local-web.json'),JSON.stringify({version:'5.0.54',date:'2026-10-12',origin,provenance:'Local built web with intercepted Company Co API; not real server/DB or production authentication',checks,realVendorAudioCRM:'NOT_EXECUTED: client-specific integrations excluded by owner; provider-independent code reviewed'},null,2));
  console.log('PASS local web journeys:',checks.join('\n'));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
