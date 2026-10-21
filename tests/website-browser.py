"""Check the supplied brand site and game roundtrip under a GitHub Pages project path."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'qa/expansion/website';BASE='http://127.0.0.1:4183/sundaerun/'
async def main():
 OUT.mkdir(parents=True,exist_ok=True);r={'checks':[],'page_errors':[],'http_errors':[],'console_errors':[]}
 def check(ok,label):
  if not ok:raise AssertionError(label)
  r['checks'].append(label);print('PASS '+label,flush=True)
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  try:
   p=await b.new_page();p.on('pageerror',lambda e:r['page_errors'].append(str(e)));p.on('console',lambda e:r['console_errors'].append(e.text) if e.type=='error' else None);p.on('response',lambda x:r['http_errors'].append(x.url) if x.status>=400 else None)
   for w,h in [(390,844),(1440,1000)]:
    await p.set_viewport_size({'width':w,'height':h})
    for name in ['index','culture','garage','community','shop','about','privacy','play']:
     response=await p.goto(BASE+'website/'+name+'.html',wait_until='networkidle')
     check(response.status==200,f'{w}/{name}: HTML responds 200 under project path')
     await p.evaluate("Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode()}))")
     check(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{w}/{name}: no horizontal overflow')
     check(await p.locator('main h1').count()==1,f'{w}/{name}: main page heading present')
     # Every relative link must resolve to a shipped page or an existing in-page anchor.
     missing=await p.evaluate("""async()=>{let bad=[];for(const a of document.querySelectorAll('a[href]')){let u=new URL(a.href);if(u.origin!==location.origin)continue;if(u.pathname===location.pathname&&u.hash){if(!document.getElementById(u.hash.slice(1)))bad.push(u.href);continue}const response=await fetch(u);if(!response.ok)bad.push(u.href)}return bad}""")
     check(not missing,f'{w}/{name}: all local navigation destinations exist')
     if w==390:
      await p.locator('.menu-button').click();await expect(p.locator('.nav')).to_have_class('nav open');await expect(p.locator('.menu-button')).to_have_attribute('aria-expanded','true');await p.locator('.menu-button').click()
     if name in ('index','garage','shop','play'):await p.screenshot(path=str(OUT/f'{name}-{w}.jpg'),full_page=True,type='jpeg',quality=85)
    await p.get_by_role('link',name='Open Sundae Run Garage',exact=False).click()
    await p.wait_for_function("()=>{let e=document.querySelector('#car-image');return e.complete&&e.naturalWidth>0&&document.querySelector('#scene').getAttribute('aria-busy')==='false'}",polling=100)
    check(await p.locator('[data-vehicle]').count()==5,f'{w}: website Play launches the five-car game')
    await p.locator('[data-vehicle="m3"]').click(no_wait_after=True)
    await p.wait_for_function("()=>document.querySelector('#car-image').dataset.variant==='m3:blue:sr-01'&&document.querySelector('#scene').getAttribute('aria-busy')==='false'",polling=100)
    await p.locator('#club-open').click();await p.locator('#brand-website').click()
    await expect(p).to_have_url(BASE+'website/index.html');check(True,f'{w}: game links back to the brand website')
   await p.goto(BASE+'website/community.html');await p.locator('#signup-demo input[name="name"]').fill('Garage visitor');await p.locator('#signup-demo input[type="email"]').fill('visitor@example.com');await p.locator('#signup-demo button').click();await expect(p.locator('#signup-status')).to_contain_text('nothing was submitted');check(True,'Community form is clearly a local demo without submitting an email')
   check(not r['page_errors'] and not r['http_errors'] and not r['console_errors'],'Website and game roundtrip have no page or HTTP errors')
   r['status']='passed'
  except Exception:
   r['status']='failed';raise
  finally:
   r['passed_checks']=len(r['checks']);(OUT/'website-results.json').write_text(json.dumps(r,indent=2)+'\n');await b.close()
asyncio.run(main())
