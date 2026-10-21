"""Five-car real AudioContext output, upgrade auditions, cancellation and direct responsive navigation."""
import argparse,asyncio,hashlib,json,traceback
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]; KEY='sundae-run-garage-v2'
INSTRUMENT='''(() => {
 const Native=window.AudioContext;window.__contexts=[];
 window.AudioContext=class extends Native {constructor(...args){super(...args);this.qaAnalyser=this.createAnalyser();this.qaAnalyser.fftSize=4096;window.__contexts.push(this)}};
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...rest){if(destination===this.context.destination&&this.context.qaAnalyser&&!this.__qaTapped){this.__qaTapped=true;connect.call(this,this.context.qaAnalyser)}return connect.call(this,destination,...rest)};
 window.__energy=()=>{const a=window.__contexts.at(-1)?.qaAnalyser;if(!a)return 0;const s=new Float32Array(a.fftSize);a.getFloatTimeDomainData(s);return Math.sqrt(s.reduce((n,v)=>n+v*v,0)/s.length)};
})()'''
async def main(args):
 out=args.output;out.mkdir(parents=True,exist_ok=True)
 report={'portable':args.portable,'checks':[],'page_errors':[],'console_errors':[],'http_errors':[],'extra_requests':[]}
 def check(ok,label):
  assert ok,label
  report['checks'].append(label);print('PASS '+label,flush=True)
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':1672,'height':941})
  target=args.base_url.rstrip('/')+('/OPEN-SUNDAE-RUN.html' if args.portable else '/')
  if args.portable:
   async def route(r):
    if r.request.is_navigation_request() and r.request.url==target:await r.continue_()
    else:report['extra_requests'].append(r.request.url);await r.abort()
   await context.route('**/*',route)
  await context.add_init_script(INSTRUMENT)
  p=await context.new_page();p.set_default_timeout(20000)
  p.on('pageerror',lambda e:report['page_errors'].append(str(e)))
  p.on('console',lambda m:report['console_errors'].append(m.text) if m.type=='error' else None)
  p.on('response',lambda r:report['http_errors'].append(r.url) if r.status>=400 else None)
  async def click(s):await p.locator(s).click()
  async def ready():await p.wait_for_function("document.querySelector('#scene').getAttribute('aria-busy')==='false'")
  async def stored():return await p.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
  async def close():await click('#club-dialog [data-close-dialog]')
  async def rpm():return int(''.join(c for c in await p.locator('.engine-rpm').inner_text() if c.isdigit()) or 0)
  async def running(value):await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-running',str(value).lower())
  async def shot(name):await p.screenshot(path=str(out/name),full_page=True,quality=86,type='jpeg')
  async def audio():await p.wait_for_function('window.__energy()>.001')
  try:
   await p.goto(target,wait_until='load',timeout=60000);await ready()
   check(await p.evaluate('__contexts.length')==0,'No AudioContext or autoplay on page load')
   await shot('garage-desktop.jpg')
   await click('[data-garage-section=sound]');await expect(p.locator('#club-title')).to_have_text('Engine sound')
   await click('[data-engine-toggle]');await running(True);await audio()
   check(True,'Start engine produces a real non-zero audio signal')
   await p.locator('[data-engine-rev]').hover();await p.mouse.down();await p.wait_for_timeout(800)
   check(await rpm()>4000,'Holding Rev raises the engine RPM')
   await p.mouse.up();await p.wait_for_timeout(1800)
   check(await rpm()<1300,'Pointer release returns toward idle')
   await p.locator('[data-engine-rev]').focus();await p.keyboard.down('Space');await p.wait_for_timeout(400)
   check(await rpm()>3000,'Keyboard Space operates Hold to rev')
   await p.keyboard.up('Space');await p.locator('[data-engine-rev]').dispatch_event('pointercancel')
   await p.wait_for_timeout(1800);check(await rpm()<1300,'Keyboard release and pointer cancellation release the throttle')
   await p.locator('[data-engine-volume]').fill('0');await p.wait_for_timeout(400)
   check(await p.evaluate('__energy()')<.00005,'Volume zero mutes the actual output signal')
   await p.locator('[data-engine-volume]').fill('60');await audio()
   await p.locator('[data-engine-throttle]').fill('70');await p.wait_for_timeout(1300)
   check(await rpm()>4500,'Throttle slider produces a sustained rev')
   await p.evaluate("window.dispatchEvent(new Event('blur'))");await p.wait_for_timeout(1800)
   check(await rpm()<1500,'Window blur releases held and sustained throttle')
   await shot('sound-desktop.jpg');await close()
   for car in ['sti','porsche','gt86','m3','golf']:
    await click(f'[data-vehicle={car}]');await ready();await click('[data-garage-section=sound]')
    await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-vehicle',car);await running(True);await audio()
    check(True,car+': changing cars updates the running voice without autoplay or a second AudioContext')
    await close()
   check(await p.evaluate('__contexts.length')==1,'All five cars share one AudioContext')
   await click('[data-vehicle=sti]');await ready();await click('[data-garage-section=performance]')
   check(await p.locator('.club-performance-family').count()==3,'Performance opens directly with Intake, Exhaust and Calibration groups')
   check(not await p.locator('.performance-sound-details').evaluate('(e)=>e.open'),'Audio controls are expandable so parts are easy to find')
   before=await stored();await click('[data-listen-kind=exhaust][data-listen-part=catback]')
   await expect(p.locator('.engine-status')).to_contain_text('Free sound preview');await audio()
   check((await stored())==before,'Listening to an unowned exhaust changes no purchases, fitted parts or credits')
   await expect(p.locator('.engine-status')).to_contain_text('Playing your fitted build',timeout=8000)
   await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-key','sti:stock:stock:stock')
   check(True,'Free audition automatically returns to the fitted sound when the engine was already running')
   await click('[data-engine-toggle]');await running(False)
   await click('[data-listen-kind=filter][data-listen-part=intake]');await running(True)
   await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-running','false',timeout=8000)
   check((await stored())==before,'An audition started with the engine off stops automatically and remains free')
   await click('[data-listen-kind=tune][data-listen-part=track]');await click('[data-club-tab=interior]')
   await click('[data-club-tab=sound]');await running(False)
   check(True,'Changing sections cancels an unpaid audition and restores fitted sound')
   await click('[data-engine-toggle]');await audio();await click('[data-club-tab=performance]')
   balance=before['balance']
   for kind,part,price in [('filter','intake',1400),('exhaust','catback',2900),('tune','track',2700)]:
    await click(f'[data-performance-kind={kind}][data-performance-part={part}]');balance-=price
    s=await stored();check(s['balance']==balance and s['club']['performance']['sti']['fitted'][kind]==part,kind+': Fit charges once and installs the selected upgrade')
   await click('[data-club-tab=sound]');await running(True);await audio()
   await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-key','sti:intake:catback:track')
   check(True,'Fitting all three upgrades updates the live engine recipe')
   await close();await click('[data-vehicle=golf]');await ready();await click('[data-garage-section=sound]')
   await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-key','golf:stock:stock:stock')
   check(True,'Performance ownership and audio recipes stay separate for each car')
   await p.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;")
   await running(False);await p.wait_for_timeout(300);check(await p.evaluate('__energy()')<.00005,'Hiding the page stops the actual audio output')
   await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))");await running(False)
   await close();await p.reload();await ready()
   check(await p.evaluate('__contexts.length')==0,'Reload restores progress but never starts sound automatically')
   await click('[data-vehicle=sti]');await ready();await click('[data-garage-section=sound]')
   await expect(p.locator('.engine-panel')).to_have_attribute('data-engine-key','sti:intake:catback:track')
   check(await p.locator('[data-engine-volume]').input_value()=='60' and (await stored())['balance']==balance,'Volume, per-car performance and exact credit balance survive reload')
   await close()
   for width,height in [(320,740),(360,800),(390,844),(768,1024),(1366,768),(1920,1080)]:
    await p.set_viewport_size({'width':width,'height':height});await ready()
    result=await p.locator('.category-menu').evaluate('''menu=>{
      const r=menu.getBoundingClientRect(),items=[...menu.querySelectorAll('button')];
      return {count:items.length,inside:items.every(b=>{const s=b.getBoundingClientRect();return s.left>=r.left-1&&s.right<=r.right+1&&s.top>=r.top&&s.bottom<=r.bottom+1&&s.width>=44&&s.height>=30}),overflow:document.documentElement.scrollWidth>innerWidth+1,menuScroll:menu.scrollWidth>menu.clientWidth+1};
    }''')
    check(result['count']==8 and result['inside'] and not result['overflow'] and not result['menuScroll'],f'{width}px: all eight modification categories fit without horizontal scrolling')
    await shot(f'garage-{width}.jpg')
    for section,title in [('interior','Interior'),('performance','Performance'),('sound','Engine sound')]:
     await click(f'[data-garage-section={section}]');await expect(p.locator('#club-title')).to_have_text(title)
     check(await p.locator(f'[data-club-tab={section}]').get_attribute('aria-pressed')=='true',f'{width}px: {section} opens in one click')
     if width in [320,390] and section in ['performance','sound']:await shot(f'{section}-{width}.jpg')
     await p.keyboard.press('Escape');await expect(p.locator('#club-dialog')).not_to_be_visible()
    if width<1100:
     for category in ['tyres','wheels','paint','suspension','body']:
      await click(f'.category-menu [data-category={category}]');await ready()
     check(True,f'{width}px: all exterior categories remain operable')
   # Close while resume is pending: a late browser promise must not revive an audition.
   await p.set_viewport_size({'width':1672,'height':941});await click('[data-garage-section=performance]')
   await p.evaluate("() => {window.__originalResume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){const resumed=window.__originalResume.call(this);return resumed.then(()=>new Promise(resolve=>{window.__releaseResume=resolve}))};}")
   await click('[data-listen-kind=exhaust][data-listen-part=axle]');await close()
   await p.wait_for_function('typeof window.__releaseResume === \"function\"');await p.evaluate('window.__releaseResume()');await p.wait_for_timeout(200)
   await click('[data-garage-section=sound]');await running(False)
   check(True,'Closing while audio permission resumes cannot start a cancelled audition')
   await close()
   # Unsupported browser: the garage and part purchases remain usable.
   await context.close();context=await browser.new_context(viewport={'width':390,'height':844})
   await context.add_init_script('window.AudioContext=undefined;window.webkitAudioContext=undefined;')
   if args.portable:await context.route('**/*',route)
   p=await context.new_page();p.on('pageerror',lambda e:report['page_errors'].append(str(e)))
   await p.goto(target,wait_until='load',timeout=60000);await ready();await click('[data-garage-section=sound]')
   await expect(p.locator('[data-engine-toggle]')).to_be_disabled()
   await expect(p.locator('.engine-status')).to_contain_text('unavailable')
   check(True,'Unsupported audio browsers show a clear message without breaking the garage')
   check(not report['page_errors'] and not report['console_errors'] and not report['http_errors'],'No uncaught errors, console errors or missing requests')
   check(not report['extra_requests'],'No extra network requests in portable mode')
   report['status']='passed'
  except Exception as e:
   report['status']='failed';report['error']=str(e);report['traceback']=traceback.format_exc();print(report['traceback']);await shot('failure.jpg');raise
  finally:
   report['passed_checks']=len(report['checks'])
   if args.portable:report['artifact_sha256']=hashlib.sha256((ROOT/'dist/OPEN-SUNDAE-RUN.html').read_bytes()).hexdigest()
   (out/'sound-results.json').write_text(json.dumps(report,indent=2)+'\n');await browser.close()
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:4173');p.add_argument('--output',type=Path,default=ROOT/'qa/sound-navigation/native');p.add_argument('--portable',action='store_true');asyncio.run(main(p.parse_args()))
