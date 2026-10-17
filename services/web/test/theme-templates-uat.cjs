// Scoped PHDK UAT: production-built Web editor, synthetic API, no external requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('../../api/node_modules/playwright');
const dist = path.resolve(__dirname, '../dist');
const version = require('../package.json').version;
const evidence = path.resolve(__dirname, `../../../docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-085-theme-templates-${version}.json`);
const colors = ['background','foreground','primary','primaryForeground','accent','accentForeground','muted','mutedForeground','border','ring','popover','card','cardForeground','sidebar','sidebarForeground','sidebarActive'];
const palette = values => Object.fromEntries(colors.map((key,index)=>[key,values[index]]));
let config = {
  corporateEnabled: true,
  presets: {
    light: palette(['#f8fafc','#0f172a','#0f766e','#ffffff','#0f766e','#ffffff','#e2e8f0','#475569','#cbd5e1','#0f766e','#ffffff','#ffffff','#0f172a','#ffffff','#334155','#0f766e']),
    dark: palette(['#0b1220','#f8fafc','#14b8a6','#0b1220','#14b8a6','#0b1220','#171f2e','#a1aab8','#273244','#14b8a6','#171f2e','#171f2e','#f8fafc','#101a2c','#a1aab8','#14b8a6']),
    corporate: palette(['#f3f6fc','#102a43','#194185','#ffffff','#194185','#ffffff','#d9e2ec','#486581','#bcccdc','#194185','#ffffff','#ffffff','#102a43','#ffffff','#334e68','#194185']),
  },
  revision: 0,
};
async function main() {
  const server = http.createServer((req,res) => {
    const url = new URL(req.url,'http://localhost');
    const candidate=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
    const file=candidate.startsWith(dist+path.sep)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(dist,'index.html');
    res.setHeader('Content-Type',{'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser, writes=0, role='superadmin', externalBlocked=0;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.addInitScript(()=>{sessionStorage.setItem('auth_token','isolated-theme-uat');localStorage.setItem('keledon-locale','en');if(!localStorage.getItem('keledon-theme'))localStorage.setItem('keledon-theme','corporate');});
    const address='http://127.0.0.1:'+server.address().port;
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      const reply=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname==='/api/auth/me') return reply(200,{success:true,user:{id:'uat-superadmin',name:'Synthetic reviewer',email:'uat@example.invalid',role,companyId:'uat-company',teamId:'uat-team'}});
      if(url.pathname==='/api/theme') return reply(200,config);
      if(url.pathname==='/api/admin/theme'&&request.method()==='GET') return role==='superadmin'?reply(200,config):reply(403,{});
      if(url.pathname==='/api/admin/theme'&&request.method()==='PUT') {
        writes++;
        if(role!=='superadmin') return reply(403,{});
        const input=request.postDataJSON();
        assert.equal(input.expectedRevision,config.revision);
        config={corporateEnabled:input.corporateEnabled,presets:input.presets,revision:config.revision+1};
        return reply(200,config);
      }
      if(url.pathname.startsWith('/api/')) return reply(200,{});
      if(url.origin!==address){externalBlocked++;return route.abort();}
      return route.continue();
    });
    const page=await context.newPage();
    await page.goto(address+'/admin/settings/templates');
    await page.getByRole('heading',{name:'Configuration · Visual templates'}).waitFor();
    const previews=page.locator('div[style*="--color-background"]');
    assert.equal(await previews.count(),3);
    const previewColors=await previews.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundColor));
    assert.deepEqual(previewColors,['rgb(248, 250, 252)','rgb(11, 18, 32)','rgb(243, 246, 252)']);
    const themeSelect=page.getByRole('combobox',{name:'Color theme'});
    await themeSelect.waitFor();
    assert.equal(await themeSelect.locator('option[value="corporate"]').count(),1);
    const lightBackground=page.getByLabel('Light · Background');
    await lightBackground.fill('#123456');
    assert.equal(await previews.nth(0).evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(18, 52, 86)');
    await page.getByRole('button',{name:'Cancel'}).click();
    assert.equal(await previews.nth(0).evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(248, 250, 252)');
    await page.getByRole('checkbox',{name:'Show the corporate theme to users'}).uncheck();
    await page.getByLabel('Light · Background').fill('#123456');
    await page.getByRole('button',{name:'Save changes'}).click();
    await page.getByText('Settings saved.').waitFor();
    await page.waitForFunction(()=>document.querySelector('[aria-label="Color theme"] option[value="corporate"]')===null);
    assert.equal(await themeSelect.inputValue(),'light');
    assert.equal(await page.getByRole('heading',{name:'Corporate'}).count(),1);
    assert.equal(writes,1); assert.equal(config.revision,1); assert.equal(config.presets.light.background,'#123456');
    await page.reload();
    await page.getByLabel('Light · Background').waitFor();
    assert.equal(await page.getByLabel('Light · Background').inputValue(),'#123456');
    assert.equal(await page.getByRole('combobox',{name:'Color theme'}).locator('option[value="corporate"]').count(),0);
    assert.equal(await page.getByRole('heading',{name:'Corporate'}).count(),1);

    role='admin';
    let adminSettingsRequests=0;
    await page.route('**/api/admin/theme',async route=>{adminSettingsRequests++;return route.fulfill({status:403,contentType:'application/json',body:'{}'});});
    await page.goto(address+'/admin/settings/templates');
    await page.waitForURL('**/dashboard');
    assert.equal(adminSettingsRequests,0);
    assert.equal(writes,1);
    const result={date:new Date().toISOString(),candidate:version,target:'production-built Web SPA with synthetic role/theme API',result:'PASS_SCOPED',assertions:12,checks:['distinct light/dark/corporate real-component previews','unsaved color preview and cancel restore','superadmin save revision and stored value','corporate visibility option removed and active corporate selection falls back to light','corporate editor remains available after hiding it from users','reload reads saved configuration','tenant admin route denial before protected API access'],limitations:['synthetic API persistence only; no database migration or restart persistence','contrast check is not a full WCAG matrix','no customer data or external endpoints']};
    fs.mkdirSync(path.dirname(evidence),{recursive:true});fs.writeFileSync(evidence,JSON.stringify(result,null,2)+'\n');
    console.log('PASS theme templates UAT: distinct presets, cancel/preview, superadmin save, corporate fallback/visibility, reload, and tenant-admin denial; synthetic API only.');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
