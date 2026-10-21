"""Five-car expansion: cabin ownership, native exports, legacy rendering, failures and layout."""
import argparse, asyncio, base64, hashlib, importlib.util, json, subprocess, traceback
from pathlib import Path
from datetime import datetime, timezone
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
KEY='sundae-run-garage-v2'
CARS=('sti','porsche','gt86','m3','golf')
spec=importlib.util.spec_from_file_location('exterior_suite',ROOT/'tests/browser-smoke.py')
legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)

def module_url(source):return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
def renderer_urls(revision=None):
 def source(name):return subprocess.check_output(['git','show',f'{revision}:src/{name}.js'],cwd=ROOT,text=True) if revision else (ROOT/f'src/{name}.js').read_text()
 paint=module_url(source('paint-renderer'))
 return [paint,module_url(source('upgrade-renderer').replace('"./paint-renderer.js"',json.dumps(paint)))]

async def run(args):
 out=args.output;out.mkdir(parents=True,exist_ok=True)
 report={'started_at_utc':datetime.now(timezone.utc).isoformat(),'portable':args.portable,'checks':[],'cases':[],'page_errors':[],'console_errors':[],'http_errors':[],'extra_requests':[]}
 def check(ok,label,detail=None):
  if not ok:raise AssertionError(label+': '+str(detail))
  report['checks'].append(label);print('PASS '+label,flush=True)
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  target=args.base_url.rstrip('/')+('/OPEN-SUNDAE-RUN.html' if args.portable else '/')
  async def newpage(width=1672,height=941):
   ctx=await browser.new_context(viewport={'width':width,'height':height},accept_downloads=True)
   if args.portable:
    async def offline(r):
     if r.request.is_navigation_request() and r.request.url==target:await r.continue_()
     else:report['extra_requests'].append(r.request.url);await r.abort()
    await ctx.route('**/*',offline)
   page=await ctx.new_page();page.set_default_timeout(30000)
   page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
   page.on('console',lambda m:report['console_errors'].append(m.text) if m.type=='error' else None)
   page.on('response',lambda r:report['http_errors'].append(r.url) if r.status>=400 else None)
   await page.goto(target,wait_until='load',timeout=60000);await ready(page)
   return ctx,page
  async def click(p,s):await p.locator(s).click(no_wait_after=True)
  async def ready(p,key=None):
   await p.wait_for_function("k=>{let c=document.querySelector('#car-image');return document.querySelector('#scene').getAttribute('aria-busy')==='false'&&c.complete&&c.naturalWidth>0&&(!k||c.dataset.variant===k)}",arg=key,polling=100)
  async def stored(p):return await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
  async def cabin_ready(p):await p.wait_for_function("()=>{let e=document.querySelector('.interior-preview img');return e&&e.complete&&e.naturalWidth>0&&document.querySelector('.interior-loading').hidden}",polling=100)
  async def tab(p,name):await click(p,f'[data-club-tab="{name}"]')
  async def club(p,name='interior'):
   await click(p,'#club-open');await tab(p,name)
  async def close(p):await click(p,'#club-dialog [data-close-dialog]')
  async def shot(p,name):await p.screenshot(path=str(out/name),full_page=True,type='jpeg',quality=90)
  async def case(name,action):
   print('RUN '+name,flush=True)
   try:await action()
   except Exception as e:
    report['cases'].append({'name':name,'status':'failed','error':str(e),'traceback':traceback.format_exc()});print('FAIL '+name+': '+str(e),flush=True)
   else:report['cases'].append({'name':name,'status':'passed'})
  async def native_cabins():
   ctx,p=await newpage();balance=48320
   try:
    if args.portable:
     result=await p.evaluate("async()=>{const entries=Object.entries(__SUNDAE_INLINE_ASSETS__);return {count:entries.length,decoded:await Promise.all(entries.map(([key,url])=>new Promise(resolve=>{let i=new Image;i.onload=()=>resolve({key,w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>resolve({key,w:0,h:0});i.src=url})))}}")
     check(result['count']==68 and all(x['w']>0 and x['h']>0 for x in result['decoded']),'All 68 portable runtime images decode without network')
    for car in CARS:
     await click(p,f'[data-vehicle="{car}"]');await ready(p,f'{car}:blue:sr-01')
     s=await stored(p);check(s['club']['interiors'][car]['fitted']=='stock',car+': starts with its own original cabin')
     await club(p);await cabin_ready(p)
     await click(p,'[data-interior="club"]');await cabin_ready(p)
     check((await stored(p))['balance']==balance,car+': cabin preview is free')
     await click(p,'button:has-text("Restore fitted preview")');await cabin_ready(p)
     check(await p.locator('[data-interior="stock"]').get_attribute('aria-pressed')=='true',car+': restore returns to fitted original')
     await close(p);await click(p,'#apply-button');balance-=3700
     await club(p,'builds');await p.locator('#club-build-name').fill(car.upper()+' / original');await click(p,'.club-save-form button')
     s=await stored(p);oldid=s['club']['builds'][-1]['id']
     check(s['club']['builds'][-1]['interior']=='stock',car+': original snapshot records stock cabin')
     await tab(p,'interior');await click(p,'[data-interior="club"]');await cabin_ready(p)
     await click(p,'[data-fit-interior="club"]');balance-=1800;await cabin_ready(p)
     s=await stored(p);check(s['balance']==balance and s['club']['interiors'][car]=={'fitted':'club','owned':['club']},car+': fitting charges exactly 1800 once')
     await p.locator('[data-fit-interior="club"]').dispatch_event('click');await cabin_ready(p)
     check((await stored(p))['balance']==balance,car+': repeated fit cannot double charge')
     await click(p,'[data-interior="stock"]');await cabin_ready(p);await click(p,'[data-fit-interior="stock"]');await cabin_ready(p)
     await click(p,'[data-interior="club"]');await cabin_ready(p);await click(p,'[data-fit-interior="club"]');await cabin_ready(p)
     check((await stored(p))['balance']==balance,car+': included and owned cabin refits are free')
     await shot(p,car+'-club-cabin.jpg')
     await click(p,'[data-interior="stock"]');await cabin_ready(p)
     await click(p,'button:has-text("Create cabin show card")');await expect(p.locator('.club-show-card')).to_be_visible(timeout=60000)
     await p.locator('.club-show-card').evaluate('(i)=>i.decode()')
     dims=await p.locator('.club-show-card').evaluate('(i)=>[i.naturalWidth,i.naturalHeight]')
     check(dims==[1600,1060],car+': fitted cabin card has full export dimensions')
     matches=await p.evaluate("""async ({car,portable})=>{const card=document.querySelector('.club-show-card');const key=`assets/interiors/${car}/club.webp`;let src=portable?__SUNDAE_INLINE_ASSETS__[key]:new URL(key,location.href).href;let i=new Image;i.src=src;await i.decode();let a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=1600;a.height=b.height=900;let x=a.getContext('2d'),y=b.getContext('2d');x.drawImage(card,0,0);y.drawImage(i,0,0,1600,900);let pa=x.getImageData(0,0,1600,900).data,pb=y.getImageData(0,0,1600,900).data;return pa.every((v,n)=>v===pb[n])}""",{'car':car,'portable':args.portable})
     check(matches,car+': card uses fitted Club cabin while original is only previewed')
     async with p.expect_download() as dl:await click(p,'button:has-text("Download cabin image")')
     download=await dl.value;file=out/(car+'-cabin-card.png');await download.save_as(str(file))
     check(file.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'),car+': cabin download is an actual PNG')
     await tab(p,'builds');await p.locator('#club-build-name').fill(car.upper()+' / Sundae Club');await click(p,'.club-save-form button')
     s=await stored(p);build=s['club']['builds'][-1]
     check(build['interior']=='club' and next(x for x in s['club']['builds'] if x['id']==oldid)['interior']=='stock',car+': new cabin snapshot preserves original saved build')
     await tab(p,'briefs');check(await p.locator('[data-challenge]').count()==7,car+': seven build briefs available')
     for brief,reward in [('first-build',1500),('inside-counts',1000)]:
      await click(p,f'[data-challenge="{car}:{brief}"] button');balance+=reward
      await expect(p.locator(f'[data-challenge="{car}:{brief}"] button')).to_be_disabled()
     check((await stored(p))['balance']==balance,car+': first build and cabin brief award exact one-time rewards')
     if car in ('m3','golf'):
      await tab(p,'builds');await p.locator(f'[data-build="{build["id"]}"]').get_by_role('button',name='Create show card',exact=True).click(no_wait_after=True)
      await expect(p.locator('.club-show-card')).to_be_visible(timeout=60000);await p.locator('.club-show-card').evaluate('(i)=>i.decode()')
      check(await p.locator('.club-show-card').evaluate('(i)=>[i.naturalWidth,i.naturalHeight]')==[1600,980],car+': exterior saved build renders actual show card')
      async with p.expect_download() as dl:await p.get_by_role('button',name='Download image',exact=True).click(no_wait_after=True)
      await (await dl.value).save_as(str(out/(car+'-exterior-card.png')))
     await close(p)
    await p.reload(wait_until='load',timeout=60000);await ready(p,'golf:blue:sr-01');s=await stored(p)
    check(s['balance']==balance==33320 and len(s['club']['builds'])==10 and len(s['club']['completed'])==10,'All five cars retain purchases, ten snapshots and ten claimed rewards on reload')
    check(all(s['club']['interiors'][v]['fitted']=='club' for v in CARS),'All five fitted cabins survive reload')
   finally:await ctx.close()
  async def layouts():
   for w,h in [(320,700),(360,780),(390,844),(768,1024),(1366,768),(1920,1080)]:
    ctx,p=await newpage(w,h)
    try:
     for car in ('m3','golf'):
      await click(p,f'[data-vehicle="{car}"]');await ready(p,f'{car}:blue:sr-01')
      check(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{w}/{car}: garage has no horizontal overflow')
      await expect(p.locator('#apply-button')).to_be_visible();await p.locator('#apply-button').scroll_into_view_if_needed()
      check(await p.locator('#vehicle-options button').count()==5,f'{w}/{car}: five car controls retained')
      await club(p);await click(p,'[data-interior="club"]');await cabin_ready(p)
      for name in ('interior','builds','briefs','performance','import'):
       await tab(p,name)
       if name=='interior':await cabin_ready(p)
       geometry=await p.locator('#club-dialog').evaluate('(e)=>({w:e.clientWidth,s:e.scrollWidth,r:e.getBoundingClientRect().right,l:e.getBoundingClientRect().left})')
       check(geometry['s']<=geometry['w']+1 and geometry['l']>=0 and geometry['r']<=w+1,f'{w}/{car}/{name}: dialog fits viewport',geometry)
      await tab(p,'interior');await cabin_ready(p);await p.locator('[data-fit-interior]').scroll_into_view_if_needed();await expect(p.locator('[data-fit-interior]')).to_be_in_viewport()
      if car=='golf':await shot(p,f'cabin-{w}.jpg')
      await close(p)
    finally:await ctx.close()
  async def legacy_pixels():
   ctx,p=await newpage()
   try:
    await p.evaluate("async urls=>{globalThis.qaOld=await Promise.all(urls.old.map(u=>import(u)));globalThis.qaNew=await Promise.all(urls.current.map(u=>import(u)))}",{'old':renderer_urls('edc8739d09e128b231ac41823af40ecd63eebf9c'),'current':renderer_urls()})
    for car in CARS[:3]:
     for color in ('blue','white','black'):
      data=await p.evaluate("""async ({car,color,portable})=>{const load=async key=>{let i=new Image;i.src=portable?__SUNDAE_INLINE_ASSETS__[key]:new URL(key,location.href).href;await i.decode();return i};const base=await load(car==='sti'?'assets/scene/blue-sr-01.png':`assets/cars/${car}/sr-01.png`);const tyreImage=await load(`assets/upgrades/${car}/tyre-track.png`),kitImage=await load(`assets/upgrades/${car}/body-track.png`);let hashes=[];for(const [paint,upgrades] of [qaOld,qaNew]){let painted=new Image;painted.src=await paint.renderCar(base,car,{id:color,colour:{blue:'#245dcc',white:'#eef1ee',black:'#202226'}[color]});await painted.decode();let result=new Image;result.src=await upgrades.renderUpgrades(painted,car,{tyre:'track',suspension:'track',body:'track'},{baseImage:base,tyreImage,kitImage});await result.decode();let c=document.createElement('canvas');c.width=result.naturalWidth;c.height=result.naturalHeight;let x=c.getContext('2d');x.drawImage(result,0,0);hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',x.getImageData(0,0,c.width,c.height).data))).join(','))}return {same:hashes[0]===hashes[1]}}""",{'car':car,'color':color,'portable':args.portable})
      check(data['same'],car+'/'+color+': legacy maximum-upgrade pixels match published renderers exactly')
   finally:await ctx.close()
  async def failures():
   ctx,p=await newpage();failed=[];gate=asyncio.Event();requested=asyncio.Event()
   async def fail(r):failed.append(r.request.url);await r.abort()
   try:
    await ctx.route('**/assets/interiors/m3/club.webp',fail)
    await click(p,'[data-vehicle="m3"]');await ready(p);await club(p);await click(p,'[data-interior="club"]')
    await expect(p.locator('.interior-loading')).to_contain_text('could not load')
    await expect(p.locator('[data-fit-interior="club"]')).to_be_disabled()
    check((await stored(p))['balance']==48320 and len(failed)==1,'Failed cabin image disables purchase without spending')
    await ctx.unroute('**/assets/interiors/m3/club.webp',fail)
    await click(p,'button:has-text("Retry cabin")');await cabin_ready(p)
    await expect(p.locator('[data-fit-interior="club"]')).to_be_enabled();check(True,'Cabin retry restores preview and purchase availability')
    await close(p)
    async def delayed(r):requested.set();await gate.wait();await r.continue_()
    await ctx.route('**/assets/interiors/golf/club.webp',delayed)
    await click(p,'[data-vehicle="golf"]');await ready(p);await club(p);await click(p,'[data-interior="club"]');await asyncio.wait_for(requested.wait(),20)
    await expect(p.locator('[data-fit-interior="club"]')).to_be_disabled()
    await click(p,'[data-interior="stock"]');await cabin_ready(p);gate.set();await p.wait_for_timeout(500)
    check(await p.locator('[data-interior="stock"]').get_attribute('aria-pressed')=='true' and (await stored(p))['club']['interiors']['golf']['fitted']=='stock','Late cabin load cannot replace a newer original selection or charge credits')
   finally:gate.set();await ctx.close()
  try:
   if not args.only or args.only=='native':await case('five-car-cabin-transactions-snapshots-rewards-exports',native_cabins)
   if not args.only or args.only=='legacy':await case('legacy-renderer-nine-pixel-identities',legacy_pixels)
   if not args.only or args.only=='layout':await case('six-responsive-viewport-layouts',layouts)
   if not args.portable and (not args.only or args.only=='failures'):await case('cabin-failure-retry-and-late-load',failures)
   # Intentional failed-image console messages belong only to the failure case.
   check(not report['page_errors'],'No uncaught page errors',report['page_errors'])
   check(not report['http_errors'],'No HTTP errors',report['http_errors'])
   check(not report['extra_requests'],'No extra portable network requests',report['extra_requests'])
   unexpected=[e for e in report['console_errors'] if not ((not args.only or args.only=='failures') and 'Failed to load resource' in e and 'net::ERR_FAILED' in e)]
   check(not unexpected,'No unexpected console errors',unexpected)
  except Exception as e:
   report['cases'].append({'name':'browser-error-guard','status':'failed','error':str(e)})
   raise
  finally:
   await browser.close()
   report['status']='failed' if any(x['status']=='failed' for x in report['cases']) else 'passed'
   report['passed_checks']=len(report['checks'])
   if args.portable:report['artifact_sha256']=hashlib.sha256((ROOT/'dist/OPEN-SUNDAE-RUN.html').read_bytes()).hexdigest()
   (out/'expansion-results.json').write_text(json.dumps(report,indent=2)+'\n')
   print(json.dumps({k:report[k] for k in ('status','passed_checks','cases')},indent=2),flush=True)
 return report['status']!='passed'

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base-url',default='http://127.0.0.1:4173');parser.add_argument('--output',type=Path,default=ROOT/'qa/expansion/native');parser.add_argument('--portable',action='store_true');parser.add_argument('--only',choices=['native','legacy','layout','failures']);args=parser.parse_args()
 raise SystemExit(asyncio.run(run(args)))
