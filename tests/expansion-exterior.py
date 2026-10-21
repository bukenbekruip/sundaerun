"""Targeted new-model exterior QA using the established strict pixel assertions."""
import argparse,asyncio,hashlib,importlib.util,json
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime,timezone
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('legacy_browser',ROOT/'tests/browser-smoke.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Expansion(m.BrowserSuite):
 def __init__(self,browser,args):
  super().__init__(browser,args.base_url,args.output,matrix_vehicles=args.vehicle or ['m3','golf']);self.portable=args.portable;self.extra=[]
  if self.portable:self.paint_scope=('blue','white','black','mint')
 @asynccontextmanager
 async def page(self,*a,**kw):
  async with super().page(*a,**kw) as (context,page,events):
   if self.portable:
    async def offline(r):
     if r.request.is_navigation_request() and r.request.url==self.base_url+'/OPEN-SUNDAE-RUN.html':await r.continue_()
     else:self.extra.append(r.request.url);await r.abort()
    await context.route('**/*',offline)
   yield context,page,events
 async def open(self,page):
  r=await page.goto(self.base_url+('/OPEN-SUNDAE-RUN.html' if self.portable else '/'),wait_until='load',timeout=60000)
  self.check(r.status==200,'Production artifact responds HTTP 200');await page.evaluate('document.fonts.ready')
 async def maximum(self):
  for car in self.matrix_vehicles:
   async with self.page() as (_,p,events):
    await self.open(p);await self.ready(p,'sti:blue:sr-01');await self.install_upgrade_probe(p);await self.select(p,vehicle=car);tiles=[]
    for wheel in m.WHEELS:
     await self.select(p,wheel=wheel,paint='blue',**m.PART_DEFAULTS);await self.ready(p,m.variant_key(car,wheel));await self.upgrade_base_pixels(p,car)
     for paint in ('white','black'):
      parts={'tyre':'track','suspension':'track','body':'track'}
      await self.select(p,paint=paint,**parts);key=m.variant_key(car,wheel,paint,**parts);await self.ready(p,key)
      await self.upgrade_pixels(p,key,paint=paint,**parts);await self.layout(p);await self.quote(p,wheel,**parts)
      self.painted_upgrade_combinations.append(key);tiles.append((key,await p.locator('#scene').screenshot(type='jpeg',quality=90)))
    await self.contact_sheet(tiles,car+'-white-black-maximum.jpg',columns=3);self.clean(events)
 async def execute(self,args):
  if args.mode in ('paint','all'):await self.run_case('new-model-paint-native-matrix',self.variants_and_controls)
  if args.mode in ('mechanical','all'):
   self.matrix_wheels=('sr-01',);await self.run_case('54-blue-mechanical-builds',self.mechanical_matrix)
  if args.mode in ('maximum','all'):await self.run_case('24-white-black-maximum-builds',self.maximum)
  self.check(not self.extra,'Portable game made no additional network requests',self.extra)
  r={'generated_at_utc':datetime.now(timezone.utc).isoformat(),'portable':self.portable,'status':'failed' if any(x['status']=='failed' for x in self.cases) else 'passed','cases':self.cases,'checks':len(self.assertions),'paint_combinations':self.combinations,'mechanical_combinations':self.mechanical_combinations,'maximum_combinations':self.painted_upgrade_combinations,'paint_pixels':self.pixel_results,'upgrade_pixels':self.upgrade_pixel_results,'observations':self.observations,'extra_requests':self.extra,'screenshots':self.screenshots}
  if self.portable:r['artifact_sha256']=hashlib.sha256((ROOT/'dist/OPEN-SUNDAE-RUN.html').read_bytes()).hexdigest()
  (self.output/'exterior-results.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r[k] for k in ('status','checks','cases')},indent=2),flush=True);return r['status']!='passed'
async def main(args):
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  try:return await Expansion(b,args).execute(args)
  finally:await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:4173');p.add_argument('--output',type=Path,default=ROOT/'qa/expansion/exterior');p.add_argument('--portable',action='store_true');p.add_argument('--mode',choices=['paint','mechanical','maximum','all'],default='all');p.add_argument('--vehicle',action='append',choices=['m3','golf']);raise SystemExit(asyncio.run(main(p.parse_args())))
