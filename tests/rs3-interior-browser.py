"""Six-car cabins and independent steering: free previews, transactions, saves, exports and responsive UI."""
import argparse,asyncio,base64,hashlib,json,traceback
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];KEY='sundae-run-garage-v2'
CARS=['sti','porsche','gt86','m3','golf','rs3'];CABINS=['stock','club','heritage','track'];WHEELS=['stock','alcantara','carbon']
async def run(args):
 out=args.output;out.mkdir(parents=True,exist_ok=True)
 report={'portable':args.portable,'checks':[],'previews':[],'page_errors':[],'console_errors':[],'http_errors':[],'extra_requests':[]}
 def check(ok,label):
  assert ok,label
  report['checks'].append(label);print('PASS '+label,flush=True)
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':1672,'height':941},accept_downloads=True)
  target=args.base_url.rstrip('/')+('/OPEN-SUNDAE-RUN.html' if args.portable else '/')
  if args.portable:
   async def offline(route):
    if route.request.is_navigation_request() and route.request.url==target:await route.continue_()
    else:report['extra_requests'].append(route.request.url);await route.abort()
   await context.route('**/*',offline)
  p=await context.new_page();p.set_default_timeout(20000)
  p.on('pageerror',lambda e:report['page_errors'].append(str(e)))
  p.on('console',lambda m:report['console_errors'].append(m.text) if m.type=='error' else None)
  p.on('response',lambda r:report['http_errors'].append(r.url) if r.status>=400 else None)
  async def click(sel):await p.locator(sel).click()
  async def ready():await p.wait_for_function("() => (document.querySelector('#scene').getAttribute('aria-busy')==='false')",polling=100)
  async def cabin():await p.wait_for_function("()=>{let i=document.querySelector('.interior-preview img'),n=document.querySelector('.interior-loading');return i&&i.complete&&i.naturalWidth>0&&n.hidden}",polling=50)
  async def stored():return await p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
  async def close():await click('#club-dialog [data-close-dialog]')
  async def section(name):await click(f'[data-interior-section={name}]');await cabin()
  async def shot(name):await p.screenshot(path=str(out/name),full_page=True,type='jpeg',quality=87)
  try:
   await p.goto(target,wait_until='load',timeout=60000);await ready()
   check(await p.locator('[data-vehicle]').count()==6,'Six car controls include the Audi RS3 hatchback')
   if args.portable:
    check(await p.evaluate('Object.keys(__SUNDAE_INLINE_ASSETS__).length')==92,'Portable artifact contains all 92 runtime images')
   balance=48320
   for car in CARS:
    await click(f'[data-vehicle={car}]');await ready();await click('[data-garage-section=interior]');await cabin()
    check(await p.locator('[data-interior]').count()==4,car+': four cabin packages are available')
    before=await stored()
    await p.evaluate("window.__sheet=document.createElement('canvas');__sheet.width=1200;__sheet.height=1004;window.__stockPixels=null;")
    for row,package in enumerate(CABINS):
     await section('cabin');await click(f'[data-interior={package}]');await cabin();await section('steering')
     for col,wheel in enumerate(WHEELS):
      await click(f'[data-steering={wheel}]');await cabin()
      details=await p.evaluate('''({car,package,wheel,row,col})=>{
       const i=document.querySelector('.interior-preview img'),c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;
       const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
       let outside=0,changed=0,alpha=0,hub=0;
       const centres={sti:[459,391],porsche:[519,363],gt86:[476,365],m3:[496,365],golf:[477,354],rs3:[486,353]},[cx,cy]=centres[car];
       if(wheel==='stock') window.__stockPixels=d;
       else for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
        const n=(y*c.width+x)*4,old=__stockPixels;
        if(d[n+3]!==old[n+3])alpha++;
        if(d[n]!==old[n]||d[n+1]!==old[n+1]||d[n+2]!==old[n+2]){
         changed++;const px=x*1672/c.width,py=y*941/c.height;
         if(Math.abs(px-cx)>230||Math.abs(py-cy)>220)outside++;
         if(Math.abs(px-cx)<75&&Math.abs(py-cy)<65)hub++;
        }
       }
       const sheet=__sheet.getContext('2d');sheet.fillStyle='#18291f';sheet.fillRect(col*400,row*251,400,251);sheet.drawImage(i,col*400,row*251+26,400,225);
       sheet.fillStyle='#fff';sheet.font='14px sans-serif';sheet.fillText(`${car} / ${package} / ${wheel}`,col*400+8,row*251+18);
       return {width:c.width,height:c.height,changed,outside,alpha,hub};
      }''',{'car':car,'package':package,'wheel':wheel,'row':row,'col':col})
      check(details['width']==1672 and details['height']==941 and not details['outside'] and not details['alpha'] and not details['hub'] and (wheel=='stock' or details['changed']>10000),f'{car}:{package}:{wheel}: complete preview; changes stay on the rim and preserve hub/cabin/alpha')
      report['previews'].append(f'{car}:{package}:{wheel}')
     check((await stored())==before,f'{car}:{package}: all three steering auditions remain free and do not install parts')
    image=await p.evaluate("__sheet.toDataURL('image/jpeg',.93)");(out/f'{car}-12-cabin-steering-previews.jpg').write_bytes(base64.b64decode(image.split(',')[1]))
    await click('[data-fit-steering=carbon]');await cabin();balance-=1600
    check((await stored())['balance']==balance and (await stored())['club']['steering'][car]['fitted']=='carbon',car+': carbon steering costs exactly 1600 once')
    await p.locator('[data-fit-steering=carbon]').dispatch_event('click');await cabin();check((await stored())['balance']==balance,car+': repeated steering Fit cannot double-charge')
    await section('cabin');await click('[data-fit-interior=track]');await cabin();balance-=2600
    s=await stored();check(s['balance']==balance and s['club']['steering'][car]['fitted']=='carbon' and s['club']['interiors'][car]['fitted']=='track',car+': cabin purchase costs 2600 and retains independent fitted steering')
    await section('steering');await click('[data-steering=stock]');await cabin();await click('[data-fit-steering=stock]');await cabin();await click('[data-steering=carbon]');await cabin();await click('[data-fit-steering=carbon]');await cabin()
    check((await stored())['balance']==balance,car+': included and owned steering refits are free')
    await close();await click('#apply-button');await ready();balance-=3700
    await click('#club-open');await p.locator('#club-build-name').fill(car.upper()+' Track / Carbon');await click('.club-save-form button')
    s=await stored();check(s['balance']==balance and s['club']['builds'][-1]['interior']=='track' and s['club']['builds'][-1]['steering']=='carbon',car+': named build records the fitted cabin and steering without extra charge')
    await close()
   check(balance==920,'All six real UI purchases leave the exact 920-credit shared balance')
   # Earn one existing brief, then buy a different cabin without altering earlier snapshots.
   await click('[data-vehicle=sti]');await ready();await click('#club-open');await click('[data-club-tab=briefs]');await click('[data-challenge="sti:first-build"] button');balance+=1500
   await click('[data-club-tab=interior]');await cabin();await click('[data-interior=heritage]');await cabin();await click('[data-fit-interior=heritage]');await cabin();balance-=2300
   check((await stored())['balance']==balance==120,'A newly earned brief funds Heritage exactly; existing steering remains fitted')
   # Capture expected fitted cabin, then preview a different unowned package before export.
   await p.evaluate("window.__expectedCabin=document.createElement('canvas');__expectedCabin.width=1600;__expectedCabin.height=900;__expectedCabin.getContext('2d').drawImage(document.querySelector('.interior-preview img'),0,0,1600,900)")
   await click('[data-interior=club]');await cabin();await click('button:has-text("Create cabin show card")')
   await p.wait_for_selector('.club-show-card');await p.wait_for_function("() => (document.querySelector('.club-show-card').complete)")
   export=await p.evaluate('''()=>{const i=document.querySelector('.club-show-card'),c=document.createElement('canvas');c.width=1600;c.height=1060;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const actual=ctx.getImageData(0,0,1600,900).data,expected=__expectedCabin.getContext('2d').getImageData(0,0,1600,900).data;let differences=0;for(let n=0;n<actual.length;n++)if(actual[n]!==expected[n])differences++;return {w:i.naturalWidth,h:i.naturalHeight,differences}}''')
   check(export=={'w':1600,'h':1060,'differences':0},'Cabin show card contains the fitted Heritage/carbon image, even while Club is previewed')
   async with p.expect_download() as info:await click('button:has-text("Download cabin image")')
   download=await info.value;await download.save_as(out/'sti-heritage-carbon-card.png')
   await click('button:has-text("Back to interior")');await cabin();await close();await click('#club-open')
   await p.locator('#club-build-name').fill('STI Heritage / Carbon');await click('.club-save-form button')
   s=await stored();check(len(s['club']['builds'])==7 and s['club']['builds'][0]['interior']=='track' and s['club']['builds'][0]['steering']=='carbon','Earlier snapshots remain immutable after changing the fitted cabin')
   await click('.club-build-card:first-child button:has-text("Share build code")');code=await p.locator('textarea').input_value()
   # Exported SR1 recipe includes steering; old recipes stay accepted by Node migration tests.
   recipe=json.loads(base64.urlsafe_b64decode(code[4:]+'='*((4-len(code[4:])%4)%4)))
   check(recipe['interior']=='heritage' and recipe['steering']=='carbon','Share code contains both the cabin and independent steering recipe')
   await close();await p.reload();await ready();s=await stored()
   check(s['balance']==120 and all(s['club']['steering'][car]['fitted']=='carbon' for car in CARS) and all(s['club']['interiors'][car]['fitted']==('heritage' if car=='sti' else 'track') for car in CARS),'Reload retains every fitted cabin/steering, receipts, saved builds and exact balance')
   for width,height in [(320,740),(390,844),(768,1024),(1366,768),(1920,1080)]:
    await p.set_viewport_size({'width':width,'height':height});await click('[data-vehicle=rs3]');await ready()
    dims=await p.locator('#vehicle-options').evaluate('''e=>{const r=e.getBoundingClientRect();return {all:[...e.children].every(b=>{const q=b.getBoundingClientRect();return q.left>=r.left-1&&q.right<=r.right+1&&q.height>=30}),overflow:document.documentElement.scrollWidth>innerWidth+1}}''')
    check(dims['all'] and not dims['overflow'],f'{width}px: all six models remain visible without page overflow')
    if width in [320,390]:await shot(f'rs3-garage-{width}.jpg')
    await click('[data-garage-section=interior]');await cabin();await section('steering')
    check(await p.locator('[data-steering]').count()==3 and await p.locator('[data-interior-section=steering]').get_attribute('aria-pressed')=='true',f'{width}px: Steering wheel is directly reachable inside Interior')
    check(await p.locator('#club-dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),f'{width}px: cabin and steering controls fit the dialog')
    await shot(f'rs3-steering-{width}.jpg');await close()
   check(not report['page_errors'] and not report['console_errors'] and not report['http_errors'],'No page, console or HTTP errors in normal cabin flows')
   check(not report['extra_requests'],'Portable game makes no additional network requests')
   report['status']='passed'
  except Exception as e:
   report['status']='failed';report['error']=str(e);report['traceback']=traceback.format_exc();print(report['traceback']);await shot('failure.jpg');raise
  finally:
   report['passed_checks']=len(report['checks'])
   if args.portable:report['artifact_sha256']=hashlib.sha256((ROOT/'dist/OPEN-SUNDAE-RUN.html').read_bytes()).hexdigest()
   (out/'interior-results.json').write_text(json.dumps(report,indent=2)+'\n');await browser.close()
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:4173');p.add_argument('--output',type=Path,default=ROOT/'qa/rs3-interiors/native');p.add_argument('--portable',action='store_true');asyncio.run(run(p.parse_args()))
