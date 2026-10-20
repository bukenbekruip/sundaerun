#!/usr/bin/env python3
"""Production browser checks for three cars, six wheels, twelve paints and upgrades.

Build the app, start Vite preview on 4173, then run this file. Evidence defaults to
qa/upgrades so earlier release evidence remains intact. Screenshots still require
independent visual review; successful behaviour is not proof of artwork quality.
"""
import argparse
import asyncio
import base64
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import html
from pathlib import Path
import traceback

from playwright.async_api import async_playwright, expect

PROJECT = Path(__file__).resolve().parents[1]
VEHICLES = ('sti', 'porsche', 'gt86')
WHEELS = ('sr-01', 'te37', 'bbs-lm', 'oz', 'rotiform', 'work')
PAINTS = ('blue', 'black', 'mint', 'white', 'silver', 'graphite', 'red', 'orange', 'purple', 'pink', 'yellow', 'teal')
PRICES = dict(zip(WHEELS, (2500, 2800, 2800, 2800, 2400, 2600)))
STORAGE_KEY = 'sundae-run-garage-v2'
TYRES = ('road', 'sport', 'track')
SUSPENSIONS = ('original', 'sport', 'track')
BODIES = ('original', 'street', 'track')
PART_DEFAULTS = {'tyre': 'road', 'suspension': 'original', 'body': 'original'}
PART_CATEGORIES = {'tyre': 'tyres', 'suspension': 'suspension', 'body': 'body'}
PART_PRICES = {'tyre': dict(zip(TYRES, (0, 1600, 2400))), 'suspension': dict(zip(SUSPENSIONS, (0, 2200, 3400))), 'body': dict(zip(BODIES, (0, 2800, 4600)))}
QUOTE_LABELS = ('Wheels', 'Paint', 'Tyres', 'Suspension', 'Body kit')


def variant_key(vehicle, wheel='sr-01', paint='blue', **parts):
    values = PART_DEFAULTS | parts
    key = f'{vehicle}:{paint}:{wheel}'
    if values != PART_DEFAULTS:
        key += ':' + ':'.join(values[kind] for kind in PART_DEFAULTS)
    return key



class BrowserSuite:
    def __init__(self, browser, base_url, output, only_cases=None, matrix_vehicles=None, matrix_wheels=None):
        self.browser, self.base_url, self.output = browser, base_url.rstrip('/'), output
        output.mkdir(parents=True, exist_ok=True)
        self.manifest = json.loads((PROJECT / 'public/assets/cars/manifest.json').read_text())
        self.cases, self.assertions, self.screenshots, self.observations = [], [], [], []
        self.pixel_results, self.combinations = [], []
        self.mechanical_combinations, self.painted_upgrade_combinations, self.upgrade_pixel_results = [], [], []
        self.current_case = ''
        self.only_cases = set(only_cases or [])
        self.matrix_vehicles = tuple(dict.fromkeys(matrix_vehicles or VEHICLES))
        self.matrix_wheels = tuple(dict.fromkeys(matrix_wheels or WHEELS))
        self.readiness_failures = []

    def check(self, condition, label, details=None):
        if not condition:
            raise AssertionError(f'{label}: {details!r}')
        self.assertions.append({'case': self.current_case, 'assertion': label, 'status': 'passed'})

    async def text(self, page, selector, value, label):
        await expect(page.locator(selector)).to_have_text(value)
        self.check(True, label)

    async def ready(self, page, variant):
        await page.bring_to_front()
        try:
            await page.wait_for_function("""variant => {
                const car=document.querySelector('#car-image'), garage=document.querySelector('#garage-image');
                return document.querySelector('#scene').getAttribute('aria-busy')==='false'
                    && car.dataset.variant===variant && car.complete && car.naturalWidth>0
                    && garage.complete && garage.naturalWidth>0;
            }""", arg=variant, polling=100)
        except Exception:
            diagnostic={'expected_variant':variant}
            try:
                diagnostic['dom']=await asyncio.wait_for(page.evaluate("""()=>({variant:document.querySelector('#car-image')?.dataset.variant,
                    busy:document.querySelector('#scene')?.getAttribute('aria-busy'),
                    carComplete:document.querySelector('#car-image')?.complete,
                    carWidth:document.querySelector('#car-image')?.naturalWidth,
                    noticeHidden:document.querySelector('#scene-notice')?.hidden,
                    toast:document.querySelector('#toast')?.textContent,
                    selected:[...document.querySelectorAll('[aria-pressed=true]')].map(e=>({vehicle:e.dataset.vehicle,wheel:e.dataset.wheel,paint:e.dataset.paint,partKind:e.dataset.partKind,part:e.dataset.part,category:e.dataset.category}))})"""),timeout=5)
                filename='ready-timeout-'+variant.replace(':','-')+'.jpg'
                await page.screenshot(path=str(self.output/filename),type='jpeg',quality=90,timeout=5000)
                diagnostic['screenshot']=filename
            except Exception as error:diagnostic['capture_error']=str(error)
            self.readiness_failures.append(diagnostic)
            print('READINESS_DIAGNOSTIC '+json.dumps(diagnostic),flush=True)
            raise
        await expect(page.locator('#scene-notice')).to_be_hidden()

    @asynccontextmanager
    async def page(self, width=1672, height=941, dpr=1, expected_failures=False):
        context = await self.browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=dpr)
        page = await context.new_page()
        page.set_default_timeout(30000)
        events = {'case': self.current_case, 'page_errors': [], 'http_errors': [], 'failed_requests': [], 'console_errors': [], 'expected_network_failures': expected_failures}
        page.on('pageerror', lambda error: events['page_errors'].append(str(error)))
        page.on('response', lambda r: events['http_errors'].append({'url': r.url, 'status': r.status}) if r.status>=400 else None)
        page.on('requestfailed', lambda r: events['failed_requests'].append({'url': r.url, 'failure': r.failure}))
        page.on('console', lambda m: events['console_errors'].append(m.text) if m.type=='error' else None)
        try:
            yield context, page, events
        finally:
            self.observations.append(events)
            await context.close()

    async def open(self, page):
        response = await page.goto(self.base_url+'/', wait_until='networkidle')
        self.check(response is not None and response.status==200, 'Built page responds HTTP 200')
        await expect(page).to_have_title('Sundae Run Garage — Customisation')
        self.check(True, 'Three-car page has its intended title')
        await page.evaluate('document.fonts.ready')

    def clean(self, events):
        for key in ('page_errors', 'http_errors'):
            self.check(not events[key], 'No '+key, events[key])
        if not events['expected_network_failures']:
            for key in ('failed_requests', 'console_errors'):
                self.check(not events[key], 'No '+key, events[key])
        else:
            unexpected = [message for message in events['console_errors'] if not ('Failed to load resource' in message and 'net::ERR_FAILED' in message)]
            self.check(not unexpected, 'No console errors beyond the deliberately aborted image request', unexpected)

    async def screenshot(self, page, name, full_page=False):
        await page.mouse.move(1, 1)
        await page.screenshot(path=str(self.output/name), type='jpeg', quality=88, full_page=full_page)
        self.screenshots.append(name)

    async def category(self, page, category):
        await page.bring_to_front()
        await page.locator(f'.category-menu .category[data-category="{category}"]').click(no_wait_after=True)

    async def select(self, page, vehicle=None, wheel=None, paint=None, **parts):
        await page.bring_to_front()
        if vehicle is not None:
            await page.locator(f'#vehicle-options [data-vehicle="{vehicle}"]').click(no_wait_after=True)
        if wheel is not None:
            if not await page.locator(f'.wheel-select[data-wheel="{wheel}"]').is_visible():
                await self.category(page, 'wheels')
            await page.locator(f'.wheel-select[data-wheel="{wheel}"]').click(no_wait_after=True)
        for kind, value in parts.items():
            await self.category(page, PART_CATEGORIES[kind])
            await page.locator(f'.part-select[data-part-kind="{kind}"][data-part="{value}"]').click(no_wait_after=True)
        if paint is not None:
            await page.locator(f'.paint-option[data-paint="{paint}"]').click(no_wait_after=True)

    async def controls(self, page, vehicle, wheel, paint, category, **parts):
        families = [('#vehicle-options button', f'#vehicle-options [data-vehicle="{vehicle}"]'), ('.wheel-select', f'.wheel-select[data-wheel="{wheel}"]'), ('.paint-option', f'.paint-option[data-paint="{paint}"]')]
        for kind, value in (PART_DEFAULTS | parts).items():
            families.append((f'.part-select[data-part-kind="{kind}"]', f'.part-select[data-part-kind="{kind}"][data-part="{value}"]'))
        # Read independent DOM facts together; every original assertion remains.
        data=await page.evaluate("""families=>({
            families:families.map(([family,selected])=>({family,selected,
                count:document.querySelectorAll(family+'[aria-pressed="true"]').length,
                pressed:document.querySelector(selected)?.getAttribute('aria-pressed')})),
            checks:[...document.querySelectorAll('.selection-check')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').length,
            paintMarks:[...document.querySelectorAll('.paint-option')].filter(b=>!['none','normal','""'].includes(getComputedStyle(b,'::after').content)).length,
            categories:[...document.querySelectorAll('.category-menu [data-category][aria-pressed="true"]')].map(b=>b.dataset.category),
            labels:[...document.querySelectorAll('#quote-items .quote-line > span')].map(e=>e.textContent)
        })""", families)
        for family in data['families']:
            self.check(family['count']==1, 'Exactly one '+family['family']+' selection', family)
            self.check(family['pressed']=='true','Native selection agrees with rendered '+family['selected'],family)
        self.check(data['checks']==1,'Exactly one active parts-panel checkmark is visible',data['checks'])
        self.check(data['paintMarks']==1,'Exactly one paint checkmark is rendered',data['paintMarks'])
        self.check(data['categories']==[category],'Category highlights agree with the last interaction',data['categories'])
        self.check(tuple(data['labels'])==QUOTE_LABELS,'Checkout shows all five correctly labelled selections',data['labels'])

    async def select_mechanical(self, page, parts):
        # Adjacent matrix entries usually change one option. Native clicks are
        # still used for every change; avoid clicking already-selected controls.
        await page.bring_to_front()
        current=await page.evaluate("""()=>({category:document.querySelector('.category-menu [aria-pressed="true"]')?.dataset.category,
            parts:Object.fromEntries([...document.querySelectorAll('.part-select[aria-pressed="true"]')].map(e=>[e.dataset.partKind,e.dataset.part]))})""")
        for kind,value in parts.items():
            if current['parts'].get(kind)==value:continue
            category=PART_CATEGORIES[kind]
            if current['category']!=category:
                await self.category(page,category);current['category']=category
            await page.locator(f'.part-select[data-part-kind="{kind}"][data-part="{value}"]').click(no_wait_after=True)
            current['parts'][kind]=value
        category=PART_CATEGORIES[next(reversed(parts))]
        if current['category']!=category:await self.category(page,category)

    async def quote(self, page, wheel='sr-01', **parts):
        parts = PART_DEFAULTS | parts
        expected = [f'$ {PRICES[wheel]:,}', '$ 1,200'] + [f'$ {PART_PRICES[kind][value]:,}' if PART_PRICES[kind][value] else 'Included' for kind, value in parts.items()]
        actual = await page.locator('#quote-items .quote-line > strong').all_text_contents()
        self.check(actual==expected, 'All five quote lines reflect selected unowned parts', {'actual':actual,'expected':expected})
        total = PRICES[wheel]+1200+sum(PART_PRICES[kind][value] for kind,value in parts.items())
        await self.text(page, '#total-price', f'$ {total:,}', 'Total includes each selected paid part exactly once')

    async def layout(self, page, mobile=False):
        data = await page.evaluate("""() => {
            const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
            const image=document.querySelector('#car-image'), c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
            const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;
            let l=c.width,t=c.height,r=0,b=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>=128){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1)}
            return {documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,
                car:rect(image),scene:rect(document.querySelector('#scene')),naturalWidth:c.width,naturalHeight:c.height,bounds:[l,t,r,b]};
        }""")
        self.check(data['documentWidth']<=data['viewportWidth']+1 and data['bodyWidth']<=data['viewportWidth']+1, 'Document has no horizontal overflow', data)
        scale = min(data['car']['width']/data['naturalWidth'], data['car']['height']/data['naturalHeight'])
        l,t,r,b = data['bounds']; car,scene = data['car'],data['scene']
        bounds = [car['x']+l*scale,car['y']+t*scale,car['x']+r*scale,car['y']+b*scale]
        self.check(bounds[0]>=scene['x']-1 and bounds[2]<=scene['x']+scene['width']+1 and bounds[1]>=scene['y']-1 and bounds[3]<=scene['y']+scene['height']+1, 'Complete opaque car fits inside scene', bounds)
        self.check(bounds[0]>=-1 and bounds[2]<=data['viewportWidth']+1, 'Whole car width fits the viewport', bounds)
        await page.locator('.checkout-panel').scroll_into_view_if_needed()
        checkout = await page.locator('.checkout-panel').bounding_box()
        self.check(checkout['x']>=-1 and checkout['x']+checkout['width']<=data['viewportWidth']+1, 'Checkout width is not clipped', checkout)
        self.check(checkout['y']>=-1 and checkout['y']+checkout['height']<=data['viewportHeight']+1, 'Checkout is visible after scrolling when needed', checkout)
        await expect(page.locator('#apply-button')).to_be_in_viewport()
        self.check(True, 'Apply button is reachable')
        checkout_geometry = await page.locator('.checkout-panel').evaluate("""panel=>{
            const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
            return {panel:box(panel),rows:[...panel.querySelectorAll('.quote-line')].map(box),total:box(panel.querySelector('.total-row')),apply:box(panel.querySelector('#apply-button'))};
        }""")
        rows=checkout_geometry['rows'];panel=checkout_geometry['panel']
        self.check(len(rows)==5 and all(row['left']>=panel['left'] and row['right']<=panel['right'] and row['height']>0 for row in rows), 'All five quote rows fit inside checkout', checkout_geometry)
        self.check(all(rows[i]['bottom']<=rows[i+1]['top']+0.5 for i in range(4)) and rows[-1]['bottom']<=checkout_geometry['total']['top']+0.5 and checkout_geometry['total']['bottom']<=checkout_geometry['apply']['top']+0.5, 'Five-line quote, total and Apply do not overlap', checkout_geometry)
        if mobile:
            self.check(await page.evaluate('document.documentElement.scrollHeight')>data['viewportHeight'], 'Narrow layout uses readable vertical scrolling')

    async def install_pixel_probe(self, page):
        # Pure diagnostic helpers are imported from the actual source through a
        # data URL, without adding product debug globals or requesting /src/.
        module_url = 'data:text/javascript;base64,'+base64.b64encode((PROJECT/'src/paint-renderer.js').read_bytes()).decode()
        await page.evaluate("""async url => {
            globalThis.__qaRenderer=await import(url);
            globalThis.__qaReadPixels=image=>{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
                const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const result={width:c.width,height:c.height,pixels:ctx.getImageData(0,0,c.width,c.height).data};c.width=0;c.height=0;return result;};
        }""", module_url)

    async def base_pixels(self, page, vehicle):
        info = await page.evaluate("""vehicle => {
            const base=__qaReadPixels(document.querySelector('#car-image'));
            const mask=__qaRenderer.createPaintMask(vehicle,base.width,base.height);
            const pixels=mask.getContext('2d',{willReadFrequently:true}).getImageData(0,0,base.width,base.height).data;
            globalThis.__qaBase={...base,mask:pixels,vehicle};if(!globalThis.__qaGarage)globalThis.__qaGarage=__qaReadPixels(document.querySelector('#garage-image'));
            let count=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])count++;
            return {width:base.width,height:base.height,paintPixels:count};
        }""", vehicle)
        self.check(info['paintPixels']>10000, 'Paint mask contains substantive body panels', info)

    async def compare_pixels(self, page, key, paint):
        info = await page.evaluate("""async () => {
            const rendered=__qaReadPixels(document.querySelector('#car-image')),base=__qaBase;
            if(rendered.width!==base.width||rendered.height!==base.height)return {dimensionsMatch:false};
            let alphaChanged=0,outsideMaskChanged=0,bodyChanged=0,protectedOpaque=0;
            for(let i=0;i<base.pixels.length;i+=4){
                if(rendered.pixels[i+3]!==base.pixels[i+3])alphaChanged++;
                const changed=rendered.pixels[i]!==base.pixels[i]||rendered.pixels[i+1]!==base.pixels[i+1]||rendered.pixels[i+2]!==base.pixels[i+2];
                if(!base.mask[i+3]){if(base.pixels[i+3]>=250)protectedOpaque++;if(changed)outsideMaskChanged++}else if(changed)bodyChanged++;
            }
            const garage=__qaReadPixels(document.querySelector('#garage-image'));let garageChanged=0;
            for(let i=0;i<garage.pixels.length;i++)if(garage.pixels[i]!==__qaGarage.pixels[i])garageChanged++;
            const probes=__qaRenderer.protectedPaintSamples[base.vehicle];
            const protectedSamples=Object.entries(probes).map(([name,point])=>{
                const x=Math.round((point.x??point[0])*base.width/1672),y=Math.round((point.y??point[1])*base.height/941),i=(y*base.width+x)*4;
                return {name:point.name??name,x,y,maskAlpha:base.mask[i+3],sourceAlpha:base.pixels[i+3],unchanged:[0,1,2,3].every(o=>rendered.pixels[i+o]===base.pixels[i+o])};
            });
            const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rendered.pixels))).map(x=>x.toString(16).padStart(2,'0')).join('');
            return {dimensionsMatch:true,alphaChanged,outsideMaskChanged,bodyChanged,protectedOpaque,garageChanged,protectedSamples,fingerprint};
        }""")
        self.pixel_results.append({'variant':key,**info})
        self.check(info['dimensionsMatch'],key+': source dimensions preserved',info)
        self.check(info['alphaChanged']==0,key+': every alpha value preserved',info)
        self.check(info['outsideMaskChanged']==0,key+': every pixel outside body mask unchanged',info)
        self.check(info['protectedOpaque']>10000,key+': substantive opaque detail protected',info)
        self.check(info['garageChanged']==0,key+': garage pixels unchanged',info)
        self.check(bool(info['protectedSamples']) and all(s['maskAlpha']==0 and s['sourceAlpha']>0 and s['unchanged'] for s in info['protectedSamples']),key+': independent wheel/glass/lamp/detail probes remain unchanged',info['protectedSamples'])
        self.check(info['bodyChanged']==0 if paint=='blue' else info['bodyChanged']>10000,key+(': exact blue restored' if paint=='blue' else ': paint changes substantive body pixels'),info)
        return info

    async def contact_sheet(self, tiles, name, columns=4):
        # Compose a normal HTML review page and capture Chromium's rendering.
        # Pixel analysis elsewhere never edits the product artwork.
        width, height = 552, 334
        rows = (len(tiles) + columns - 1) // columns
        context = await self.browser.new_context(viewport={'width': columns*width, 'height': rows*height})
        try:
            page = await context.new_page()
            cards = ''.join('<figure><figcaption>'+html.escape(label)+'</figcaption><img src="data:image/jpeg;base64,'+base64.b64encode(content).decode()+'"></figure>' for label, content in tiles)
            await page.set_content('<!doctype html><html><head><style>html,body{margin:0;background:#101613;color:#d4f2d8;font:14px Arial}main{display:grid;grid-template-columns:repeat('+str(columns)+',552px)}figure{margin:0;height:334px;overflow:hidden}figcaption{height:24px;box-sizing:border-box;padding:5px 8px}img{display:block;width:552px;height:310px;object-fit:contain}</style></head><body><main>'+cards+'</main></body></html>')
            await page.wait_for_function('()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0)')
            await page.screenshot(path=str(self.output/name), type='jpeg', quality=91, full_page=True)
            self.screenshots.append(name)
        finally:
            await context.close()

    async def variants_and_controls(self):
        async with self.page() as (_,page,events):
            await self.open(page);await self.ready(page,'sti:blue:sr-01');await self.install_pixel_probe(page)
            self.check(await page.locator('#vehicle-options button').count()==3,'Three vehicle controls present')
            self.check(await page.locator('.wheel-select:not(:disabled)').count()==6,'Six wheel designs enabled')
            self.check(await page.locator('.paint-option:not(:disabled)').count()==12,'Twelve paint choices enabled')
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);await self.ready(page,f'{vehicle}:blue:sr-01')
                await self.layout(page);await self.screenshot(page,f'{vehicle}-default-1672.jpg')
                original=await page.locator('#car-image').bounding_box();base_fingerprints=[]
                for wheel in WHEELS:
                    await self.select(page,wheel=wheel,paint='blue');await self.ready(page,f'{vehicle}:blue:{wheel}')
                    await self.layout(page);await self.base_pixels(page,vehicle);tiles=[];paint_fingerprints=[]
                    for paint in PAINTS:
                        await self.select(page,paint=paint);key=f'{vehicle}:{paint}:{wheel}';await self.ready(page,key)
                        await self.controls(page,vehicle,wheel,paint,'paint')
                        await self.text(page,'#balance','$ 48,320','Preview changes do not spend credits')
                        await self.text(page,'#total-price',f'$ {PRICES[wheel]+1200:,}','Selected wheel and paint produce the correct quote')
                        current=await page.locator('#car-image').bounding_box()
                        self.check(all(abs(current[a]-original[a])<0.1 for a in ('x','y','width','height')),key+': shared complete-car transform',current)
                        pixels=await self.compare_pixels(page,key,paint)
                        paint_fingerprints.append(pixels['fingerprint'])
                        if paint=='blue':base_fingerprints.append(pixels['fingerprint'])
                        await page.mouse.move(1,1)
                        tiles.append((key,await page.locator('#scene').screenshot(type='jpeg',quality=84)))
                        self.combinations.append(key)
                    self.check(len(set(paint_fingerprints))==12,f'{vehicle}:{wheel}: all twelve paint renderings differ')
                    await self.select(page,paint='blue');await self.ready(page,f'{vehicle}:blue:{wheel}')
                    await self.compare_pixels(page,f'{vehicle}:blue:{wheel}:restored','blue')
                    await self.contact_sheet(tiles,f'{vehicle}-{wheel}-12-paints.jpg')
                self.check(len(set(base_fingerprints))==6,vehicle+': all six wheel-base renderings differ')
            self.check(len(self.combinations)==216 and len(set(self.combinations))==216,'Every requested combination completed once')
            self.clean(events)

    async def install_upgrade_probe(self, page):
        await self.install_pixel_probe(page)
        paint_url = 'data:text/javascript;base64,'+base64.b64encode((PROJECT/'src/paint-renderer.js').read_bytes()).decode()
        source = (PROJECT/'src/upgrade-renderer.js').read_text()
        self.check('"./paint-renderer.js"' in source, 'Upgrade diagnostic imports the actual paint renderer dependency')
        source = source.replace('"./paint-renderer.js"', json.dumps(paint_url))
        module_url = 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
        await page.evaluate('async url=>{globalThis.__qaUpgrades=await import(url)}', module_url)

    async def upgrade_base_pixels(self, page, vehicle):
        await page.evaluate("""vehicle => {
            const base=__qaReadPixels(document.querySelector('#car-image'));
            const tyre=__qaUpgrades.createTyreMask(vehicle,base.width,base.height);
            globalThis.__qaUpgradeBase={...base,vehicle,tyreMask:tyre.getContext('2d').getImageData(0,0,base.width,base.height).data};
            if(!globalThis.__qaGarage)globalThis.__qaGarage=__qaReadPixels(document.querySelector('#garage-image'));
        }""", vehicle)

    async def upgrade_pixels(self, page, key, tyre='road', suspension='original', body='original', paint='blue'):
        info = await page.evaluate("""async () => {
            const current=__qaReadPixels(document.querySelector('#car-image')),base=__qaUpgradeBase;
            if(current.width!==base.width||current.height!==base.height)return {dimensionsMatch:false};
            let changed=0,alphaChanged=0,outsideTyreChanged=0;
            for(let i=0;i<base.pixels.length;i+=4){
                const differs=current.pixels[i]!==base.pixels[i]||current.pixels[i+1]!==base.pixels[i+1]||current.pixels[i+2]!==base.pixels[i+2]||current.pixels[i+3]!==base.pixels[i+3];
                if(differs){changed++;if(!base.tyreMask[i+3])outsideTyreChanged++}
                if(current.pixels[i+3]!==base.pixels[i+3])alphaChanged++;
            }
            const {width,height}=__qaUpgrades.upgradeGeometry,scale=Math.min(base.width/width,base.height/height);
            const ox=(base.width-width*scale)/2,oy=(base.height-height*scale)/2;
            const protectedSamples=__qaUpgrades.protectedWheelSamples[base.vehicle].map(point=>{
                const x=Math.round(ox+point.x*scale),y=Math.round(oy+point.y*scale);let changes=0,alphaChanges=0,opaque=0;
                for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=((y+dy)*base.width+x+dx)*4;
                    if(base.pixels[i+3]>0)opaque++;if([0,1,2,3].some(o=>current.pixels[i+o]!==base.pixels[i+o]))changes++;
                    if(current.pixels[i+3]!==base.pixels[i+3])alphaChanges++;}
                return {name:point.name,x,y,changes,alphaChanges,opaque};
            });
            const garage=__qaReadPixels(document.querySelector('#garage-image'));let garageChanged=0;
            for(let i=0;i<garage.pixels.length;i++)if(garage.pixels[i]!==__qaGarage.pixels[i])garageChanged++;
            const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',current.pixels))).map(x=>x.toString(16).padStart(2,'0')).join('');
            return {dimensionsMatch:true,changed,alphaChanged,outsideTyreChanged,rimSamples:protectedSamples.filter(p=>p.name.includes('wheel')),contactSamples:protectedSamples.filter(p=>p.name.includes('contact')),garageChanged,fingerprint};
        }""")
        self.upgrade_pixel_results.append({'variant':key,**info})
        self.check(info['dimensionsMatch'], key+': complete-car canvas dimensions preserved', info)
        self.check(info['garageChanged']==0, key+': garage plate remains identical', info)
        self.check(len(info['rimSamples'])==2 and all(sample['opaque']==25 and sample['changes']==0 for sample in info['rimSamples']), key+': both rim centres retain their position and original pixels', info['rimSamples'])
        self.check(len(info['contactSamples'])==2, key+': front and rear ground contacts are both measured', info['contactSamples'])
        if body=='original':
            self.check(all(sample['opaque']>0 and sample['alphaChanges']==0 for sample in info['contactSamples']), key+': both original-body tyre contact patches retain their alpha footprint and coordinates', info['contactSamples'])
            if tyre=='road' and paint=='blue':
                self.check(all(sample['changes']==0 for sample in info['contactSamples']), key+': suspension keeps both road-tyre contact patches pixel-identical', info['contactSamples'])
        if paint=='blue' and suspension=='original' and body=='original':
            self.check(info['alphaChanged']==0, key+': tyre choice preserves every alpha byte', info)
            self.check(info['outsideTyreChanged']==0, key+': tyre choice changes only the renderer-authored rubber mask', info)
        baseline = tyre=='road' and suspension=='original' and body=='original' and paint=='blue'
        self.check(info['changed']==0 if baseline else info['changed']>0, key+': baseline exact or selected upgrade visibly changes pixels', info)
        return info

    async def mechanical_matrix(self):
        # Each rim gets a clean context: the diagnostic reads millions of pixels,
        # and retaining a long cross-product in one renderer pressures its heap.
        for vehicle in self.matrix_vehicles:
            for wheel in self.matrix_wheels:
                async with self.page() as (_,page,events):
                    await self.open(page);await self.ready(page,'sti:blue:sr-01');await self.install_upgrade_probe(page)
                    await self.select(page,vehicle=vehicle);await self.ready(page,f'{vehicle}:blue:sr-01')
                    await self.select(page,wheel=wheel,paint='blue',**PART_DEFAULTS)
                    await self.ready(page,variant_key(vehicle,wheel));await self.upgrade_base_pixels(page,vehicle)
                    tiles=[];fingerprints=[]
                    for tyre in TYRES:
                        for suspension in SUSPENSIONS:
                            for body in BODIES:
                                parts={'tyre':tyre,'suspension':suspension,'body':body}
                                await self.select_mechanical(page,parts)
                                key=variant_key(vehicle,wheel,**parts);await self.ready(page,key)
                                await self.controls(page,vehicle,wheel,'blue','body',**parts)
                                await self.quote(page,wheel,**parts)
                                await self.text(page,'#balance','$ 48,320','Mechanical preview never spends credits')
                                pixels=await self.upgrade_pixels(page,key,**parts);fingerprints.append(pixels['fingerprint'])
                                self.mechanical_combinations.append(key)
                                await page.mouse.move(1,1)
                                tiles.append((key,await page.locator('#scene').screenshot(type='jpeg',quality=80)))
                    self.check(len(set(fingerprints))==27,vehicle+':'+wheel+': all 27 mechanical arrangements produce distinct pixels')
                    await self.contact_sheet(tiles,f'{vehicle}-{wheel}-27-mechanical-builds.jpg')
                    self.clean(events)
        expected=len(self.matrix_vehicles)*len(self.matrix_wheels)*len(TYRES)*len(SUSPENSIONS)*len(BODIES)
        self.check(len(self.mechanical_combinations)==expected and len(set(self.mechanical_combinations))==expected,
                   f'All {expected} blue mechanical combinations for the selected cars exercised through native controls')

    async def painted_maximum_upgrades(self):
        paints=('black','mint','white','red','yellow','teal')
        for vehicle in VEHICLES:
            async with self.page() as (_,page,events):
                await self.open(page);await self.ready(page,'sti:blue:sr-01');await self.install_upgrade_probe(page)
                await self.select(page,vehicle=vehicle);tiles=[]
                for wheel,paint in zip(WHEELS,paints):
                    await self.select(page,wheel=wheel,paint='blue',**PART_DEFAULTS)
                    await self.ready(page,variant_key(vehicle,wheel));await self.upgrade_base_pixels(page,vehicle)
                    parts={'tyre':'track','suspension':'track','body':'track'}
                    await self.select(page,paint=paint,**parts);key=variant_key(vehicle,wheel,paint,**parts);await self.ready(page,key)
                    await self.controls(page,vehicle,wheel,paint,'paint',**parts);await self.quote(page,wheel,**parts)
                    await self.upgrade_pixels(page,key,paint=paint,**parts)
                    await self.layout(page);self.painted_upgrade_combinations.append(key)
                    tiles.append((key,await page.locator('#scene').screenshot(type='jpeg',quality=88)))
                await self.contact_sheet(tiles,vehicle+'-painted-maximum-upgrades.jpg',columns=3)
                self.clean(events)
        self.check(len(self.painted_upgrade_combinations)==18,'Eighteen painted maximum builds cover every car and rim plus six paints')

    async def five_part_purchases(self):
        async with self.page() as (_,page,events):
            await self.open(page);balance=48320
            parts={'tyre':'track','suspension':'track','body':'track'}
            fitted={}
            for vehicle,wheel,paint in zip(VEHICLES,('te37','bbs-lm','oz'),('black','mint','red')):
                await self.select(page,vehicle=vehicle);await self.ready(page,variant_key(vehicle))
                await self.select(page,wheel=wheel,paint=paint,**parts)
                key=variant_key(vehicle,wheel,paint,**parts);await self.ready(page,key);await self.quote(page,wheel,**parts)
                await page.locator('#apply-button').dblclick(no_wait_after=True);balance-=14400
                await self.text(page,'#balance',f'$ {balance:,}',vehicle+': one transaction purchases all five selected parts exactly once')
                await self.text(page,'#total-price','$ 0','Five owned parts produce no further charge')
                self.check(await page.locator('#quote-items strong').all_text_contents()==['Owned']*5,'All five paid selections become owned together')
                await expect(page.locator('#apply-button')).to_be_disabled();await page.locator('#apply-button').dispatch_event('click')
                await self.text(page,'#balance',f'$ {balance:,}','Repeated Apply cannot purchase five parts twice')
                await self.select(page,**PART_DEFAULTS);await self.ready(page,variant_key(vehicle,wheel,paint))
                await self.text(page,'#total-price','$ 0','Original tyres, suspension and body remain included')
                await page.locator('#cancel-preview').click(no_wait_after=True);await self.ready(page,key)
                await self.controls(page,vehicle,wheel,paint,'body',**parts)
                await self.select(page,paint='purple');await self.ready(page,variant_key(vehicle,wheel,'purple',**parts))
                await page.reload(wait_until='networkidle');await self.ready(page,key)
                await self.text(page,'#balance',f'$ {balance:,}','Reload preserves shared credits and fitted five-part build')
                fitted[vehicle]={'wheel':wheel,'paint':paint,**parts}
            saved=await page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',STORAGE_KEY)
            self.check(saved['version']==4 and saved['balance']==5120,'Version 4 persists all three five-part purchases with exact shared balance',saved)
            for vehicle,selection in fitted.items():
                self.check(saved['garage'][vehicle]['applied']==selection,vehicle+': every fitted part persisted',saved['garage'][vehicle])
                self.check(len(saved['garage'][vehicle]['purchased'])==5,vehicle+': exactly five purchased part keys persisted',saved['garage'][vehicle])
                await self.select(page,vehicle=vehicle);await self.ready(page,variant_key(vehicle,**selection))
                await self.text(page,'#total-price','$ 0',vehicle+': five-part ownership is restored when switching cars')
            await page.locator('#settings-open').click(no_wait_after=True);await page.locator('#reset-request').click(no_wait_after=True);await page.locator('#reset-confirm').click(no_wait_after=True)
            await self.ready(page,'sti:blue:sr-01')
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);await self.ready(page,variant_key(vehicle));await self.controls(page,vehicle,'sr-01','blue','wheels')
                await self.quote(page)
            self.clean(events)

    async def migration_v3(self):
        selections={'sti':{'wheel':'te37','paint':'black'},'porsche':{'wheel':'work','paint':'teal'},'gt86':{'wheel':'bbs-lm','paint':'mint'}}
        old={'version':3,'balance':36320,'vehicle':'porsche','category':'paint','garage':{vehicle:{'applied':selection,'purchased':[kind+':'+value for kind,value in selection.items()]} for vehicle,selection in selections.items()}}
        async with self.page() as (context,page,events):
            await context.add_init_script('if(!localStorage.getItem('+json.dumps(STORAGE_KEY)+'))localStorage.setItem('+json.dumps(STORAGE_KEY)+','+json.dumps(json.dumps(old))+');')
            await self.open(page);await self.ready(page,'porsche:teal:work')
            for vehicle,selection in selections.items():
                await self.select(page,vehicle=vehicle);await self.ready(page,variant_key(vehicle,**selection))
                await self.controls(page,vehicle,selection['wheel'],selection['paint'],'paint')
                await self.text(page,'#total-price','$ 0','V3 owned wheels and paint retain value; default new parts are included')
                await self.text(page,'#balance','$ 36,320','V3 migration preserves the shared balance')
            saved=await page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',STORAGE_KEY)
            self.check(saved['version']==4,'V3 state is rewritten as schema 4',saved)
            for vehicle,selection in selections.items():
                self.check(saved['garage'][vehicle]['applied']==selection|PART_DEFAULTS,vehicle+': migration adds three original upgrades without changing wheel or paint',saved['garage'][vehicle])
                self.check(set(saved['garage'][vehicle]['purchased'])==set(old['garage'][vehicle]['purchased']),vehicle+': migration does not grant paid upgrades')
            await page.reload(wait_until='networkidle');await self.ready(page,'gt86:mint:bbs-lm');self.clean(events)

    async def upgrade_failure(self,kind):
        async with self.page(expected_failures=True) as (_,page,events):
            await self.open(page);await self.ready(page,'sti:blue:sr-01')
            parts={'tyre':'sport','suspension':'sport','body':'street'}
            await self.select(page,wheel='te37',paint='mint',**parts)
            key=variant_key('sti','te37','mint',**parts);await self.ready(page,key)
            await page.locator('#apply-button').click(no_wait_after=True);await self.text(page,'#balance','$ 37,720','Failure fixture fits and purchases all five parts')
            before=await page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',STORAGE_KEY)
            path=f'assets/upgrades/sti/{kind}-track.png'
            async def abort(route):await route.abort('failed')
            pattern='**/'+path;await page.route(pattern,abort)
            await self.select(page,**{kind:'track'})
            await expect(page.locator('#toast')).to_contain_text('Your previous look has been kept.')
            await self.ready(page,key);await self.controls(page,'sti','te37','mint',PART_CATEGORIES[kind],**parts)
            await expect(page.locator('#apply-button')).to_be_disabled();await page.locator('#apply-button').dispatch_event('click')
            await self.text(page,'#balance','$ 37,720','Failed '+kind+' preview cannot spend credits')
            await self.text(page,'#total-price','$ 0','Failed '+kind+' preview restores all five quote selections')
            after=await page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',STORAGE_KEY)
            self.check(before['garage']==after['garage'] and before['balance']==after['balance'],'Failed upgrade preserves canonical fitted garage and ownership',after)
            self.check(bool(events['failed_requests']) and all(request['url'].split('?',1)[0].endswith('/'+path) for request in events['failed_requests']),'Only intended upgrade artwork is aborted',events['failed_requests'])
            await page.unroute(pattern,abort);await self.select(page,**{kind:'track'})
            await self.ready(page,variant_key('sti','te37','mint',**(parts|{kind:'track'})))
            await self.text(page,'#total-price',f'$ {PART_PRICES[kind]["track"]:,}','Retry loads artwork and quotes the new upgrade once')
            await page.locator('#cancel-preview').click(no_wait_after=True);await self.ready(page,key)
            self.clean(events)

    async def purchases_and_persistence(self):
        async with self.page() as (_,page,events):
            await self.open(page);balance=48320
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);await self.ready(page,f'{vehicle}:blue:sr-01')
                await self.text(page,'#total-price','$ 3,700',vehicle+': another car does not supply owned parts')
                await page.locator('#apply-button').click(no_wait_after=True);balance-=3700
                await self.text(page,'#balance',f'$ {balance:,}',vehicle+': default fitting charges exactly once')
                await self.text(page,'#total-price','$ 0','Owned build has zero remaining charge')
                await expect(page.locator('#apply-button')).to_be_disabled();await page.locator('#apply-button').dispatch_event('click')
                await self.text(page,'#balance',f'$ {balance:,}','Repeated Apply never charges again')
                await self.select(page,wheel='te37',paint='black');await self.ready(page,f'{vehicle}:black:te37')
                await self.text(page,'#total-price','$ 4,000',vehicle+': new wheel and paint cost 4000 credits')
                await page.locator('#cancel-preview').click(no_wait_after=True);await self.ready(page,f'{vehicle}:blue:sr-01')
                await self.text(page,'#balance',f'$ {balance:,}','Cancel restores fitted build without charging')
                await self.select(page,wheel='te37',paint='black');await self.ready(page,f'{vehicle}:black:te37')
                await page.locator('#apply-button').click(no_wait_after=True);balance-=4000
                await self.text(page,'#balance',f'$ {balance:,}',vehicle+': its own new parts charged once')
                await self.select(page,paint='mint');await self.ready(page,f'{vehicle}:mint:te37')
                await page.reload(wait_until='networkidle');await self.ready(page,f'{vehicle}:black:te37')
                await self.controls(page,vehicle,'te37','black','paint')
                await self.text(page,'#balance',f'$ {balance:,}','Reload preserves shared credit balance')
                await self.text(page,'#total-price','$ 0','Reload restores applied build instead of an uncommitted preview')
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);await self.ready(page,f'{vehicle}:black:te37')
                await self.text(page,'#total-price','$ 0',vehicle+': switching restores its own fitted build')
                await self.select(page,wheel='sr-01',paint='blue');await self.ready(page,f'{vehicle}:blue:sr-01')
                await self.text(page,'#total-price','$ 0',vehicle+': previously purchased parts refit free')
                await expect(page.locator('#apply-button')).to_be_enabled();await page.locator('#apply-button').click(no_wait_after=True)
                await self.text(page,'#balance',f'$ {balance:,}','Refitting owned parts costs no credits')
            saved=await page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',STORAGE_KEY)
            self.check(saved['version']==4 and set(saved['garage'])==set(VEHICLES),'Saved state contains all three canonical garages',saved)
            self.check(all(len(saved['garage'][v]['purchased'])==4 for v in VEHICLES),'Each car retains its own four purchased items',saved)
            self.check(not any(k in saved for k in ('preview','applied','purchased')),'Transient previews and derived aliases are not persisted',saved)
            await page.locator('#settings-open').click(no_wait_after=True);await page.locator('#reset-request').click(no_wait_after=True)
            await expect(page.locator('#reset-confirmation')).to_be_visible();self.check(True,'Reset requires confirmation')
            await page.locator('#reset-cancel').click(no_wait_after=True);await expect(page.locator('#reset-confirmation')).to_be_hidden()
            await self.text(page,'#balance',f'$ {balance:,}','Cancelling reset preserves garage progress')
            await page.locator('#reset-request').click(no_wait_after=True);await page.locator('#reset-confirm').click(no_wait_after=True);await self.ready(page,'sti:blue:sr-01')
            await self.text(page,'#balance','$ 48,320','Confirmed reset restores original balance and STI')
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);await self.ready(page,f'{vehicle}:blue:sr-01')
                await self.text(page,'#total-price','$ 3,700',vehicle+': reset clears its owned upgrades')
            self.clean(events)

    async def migration(self):
        old={'version':2,'balance':40620,'applied':{'wheel':'te37','paint':'black'},'purchased':['wheel:sr-01','paint:blue','wheel:te37','paint:black'],'category':'paint'}
        async with self.page() as (context,page,events):
            await context.add_init_script('if(!localStorage.getItem('+json.dumps(STORAGE_KEY)+'))localStorage.setItem('+json.dumps(STORAGE_KEY)+','+json.dumps(json.dumps(old))+');')
            await self.open(page);await self.ready(page,'sti:black:te37')
            await self.text(page,'#balance','$ 40,620','V2 migration preserves existing balance')
            await self.text(page,'#total-price','$ 0','V2 migration preserves purchased STI parts')
            await self.select(page,vehicle='porsche');await self.ready(page,'porsche:blue:sr-01')
            await self.text(page,'#total-price','$ 3,700','V2 ownership is not copied onto another car')
            await page.reload(wait_until='networkidle');await self.ready(page,'porsche:blue:sr-01')
            await self.select(page,vehicle='sti');await self.ready(page,'sti:black:te37')
            saved=await page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',STORAGE_KEY)
            self.check(saved['version']==4,'Migrated state is saved in schema 4',saved);self.clean(events)

    async def product_details(self):
        async with self.page() as (_,page,events):
            await self.open(page);await self.ready(page,'sti:blue:sr-01')
            for kind, category in PART_CATEGORIES.items():
                await expect(page.locator('.category-menu .category[data-category="'+category+'"]')).to_be_enabled()
                await self.category(page, category)
                self.check(await page.locator(f'.part-select[data-part-kind="{kind}"]:not(:disabled)').count()==3, 'Three '+category+' choices are available')
            await self.category(page, 'wheels')
            await expect(page.locator('.wheel-select[data-wheel="bbs-lm"]')).to_be_enabled()
            await page.locator('.product-details[data-product="bbs-lm"]').click(no_wait_after=True)
            await expect(page.get_by_role('dialog',name='BBS LM')).to_be_visible()
            await expect(page.locator('#product-content')).to_contain_text('Physical vehicle fitment has not been verified.')
            await expect(page.locator('#product-content')).to_contain_text('Real product and retailer details are coming later.')
            self.check(True,'Product details distinguish concept preview from verified fitment and real shopping')
            self.check(await page.locator('#product-dialog a[href]').count()==0,'No fabricated affiliate destination')
            await page.keyboard.press('Escape');await expect(page.locator('#product-dialog')).not_to_be_visible()
            await expect(page.locator('.product-details[data-product="bbs-lm"]')).to_be_focused()
            self.check(True,'Escape returns focus to the product trigger');self.clean(events)

    async def viewport(self,width,height,mobile=False):
        async with self.page(width,height) as (_,page,events):
            await self.open(page)
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);await self.ready(page,f'{vehicle}:blue:sr-01')
                await self.layout(page,mobile)
                await self.screenshot(page,f'{vehicle}-'+(f'phone-{width}-full-page.jpg' if mobile else f'default-{width}.jpg'),full_page=mobile)
                if mobile:
                    for kind,selector in (('paint','#paint-options .paint-option'),('wheels','.wheel-select'),('tyres','.part-select[data-part-kind=tyre]'),('suspension','.part-select[data-part-kind=suspension]'),('body','.part-select[data-part-kind=body]')):
                        await page.locator(f'.category[data-category="{kind}"]').click(no_wait_after=True)
                        await expect(page.locator(selector).first).to_be_in_viewport()
                        self.check(True,vehicle+': narrow '+kind+' navigation reaches its controls')
                        targets=await page.locator(selector).evaluate_all('buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height}})')
                        self.check(bool(targets) and all(target['width']>=43.5 and target['height']>=43.5 for target in targets),vehicle+': narrow '+kind+' controls provide 44-pixel touch targets',targets)
                    await self.select(page,wheel='work',paint='teal');await self.ready(page,f'{vehicle}:teal:work')
                    await self.controls(page,vehicle,'work','teal','paint')
                    await page.locator('#apply-button').scroll_into_view_if_needed();await expect(page.locator('#apply-button')).to_be_in_viewport()
                    self.check(True,vehicle+': final wheel, final paint, and Apply reachable on phone')
            self.clean(events)

    async def wheel_contacts(self):
        async with self.page(dpr=2) as (_,page,events):
            await self.open(page);await self.ready(page,'sti:blue:sr-01')
            await self.install_pixel_probe(page)
            probes=await page.evaluate('__qaRenderer.protectedPaintSamples')
            for vehicle in VEHICLES:
                await self.select(page,vehicle=vehicle);tiles=[]
                wheels=[sample for sample in probes[vehicle] if 'wheel' in sample['name']]
                self.check(len(wheels)==2,vehicle+': both independent axle probes are available',wheels)
                for wheel in WHEELS:
                    await self.select(page,wheel=wheel);await self.ready(page,f'{vehicle}:blue:{wheel}')
                    car=await page.locator('#car-image').bounding_box()
                    natural=await page.locator('#car-image').evaluate('image=>({width:image.naturalWidth,height:image.naturalHeight})')
                    scale=min(car['width']/natural['width'],car['height']/natural['height'])
                    for axle in wheels:
                        center_x=car['x']+(axle['x']/1672)*natural['width']*scale
                        center_y=car['y']+(axle['y']/941)*natural['height']*scale
                        clip={'x':max(0,center_x-95),'y':max(0,center_y-95),'width':190,'height':190}
                        await page.mouse.move(1,1)
                        tiles.append((vehicle+' / '+wheel+' / '+axle['name'],await page.screenshot(type='jpeg',quality=94,clip=clip,scale='device')))
                await self.contact_sheet(tiles,vehicle+'-six-wheel-contact-proof.jpg',columns=2)
            self.clean(events)

    def base_path(self,vehicle,wheel):
        return self.manifest['assets'][vehicle+':'+wheel]['src'].removeprefix('./').lstrip('/')

    async def race(self,mode='wheel'):
        async with self.page() as (context,page,events):
            await self.open(page);await self.ready(page,'sti:blue:sr-01')
            path=self.base_path('porsche','sr-01') if mode=='vehicle' else self.base_path('sti','te37')
            payload=await context.request.get(self.base_url+'/'+path);self.check(payload.status==200,'Race uses a real base-image response')
            body=await payload.body();held,release,delivered=asyncio.Event(),asyncio.Event(),asyncio.Event()
            async def delayed(route):
                held.set();await release.wait();await route.fulfill(status=200,content_type='image/png',body=body);delivered.set()
            pattern='**/'+path;await page.route(pattern,delayed)
            try:
                if mode=='vehicle':await self.select(page,vehicle='porsche')
                else:await self.select(page,wheel='te37')
                await asyncio.wait_for(held.wait(),timeout=10)
                await expect(page.locator('#scene')).to_have_attribute('aria-busy','true')
                await expect(page.locator('#apply-button')).to_be_disabled();await page.locator('#apply-button').dispatch_event('click')
                await self.text(page,'#balance','$ 48,320','Loading artwork cannot spend credits')
                if mode=='cancel':
                    await page.locator('#cancel-preview').click(no_wait_after=True);expected=('sti','blue','sr-01');category='wheels'
                elif mode=='vehicle':
                    await self.select(page,vehicle='gt86');expected=('gt86','blue','sr-01');category='wheels'
                else:
                    await self.select(page,wheel='bbs-lm',paint='mint');expected=('sti','mint','bbs-lm');category='paint'
                await self.ready(page,':'.join(expected));release.set();await asyncio.wait_for(delivered.wait(),timeout=10)
                # This delay intentionally settles the stale response under test;
                # readiness itself uses state and decoded image checks.
                await page.wait_for_timeout(700);await self.ready(page,':'.join(expected))
                await self.controls(page,expected[0],expected[2],expected[1],category)
                await self.text(page,'#balance','$ 48,320','Stale response cannot spend credits')
                self.check(True,'Stale base cannot replace the later car/wheel/paint or cancelled preview');self.clean(events)
            finally:
                release.set();await page.unroute(pattern,delayed)

    async def initial_failure(self,garage=False):
        path='assets/scene/garage-plate.png' if garage else self.base_path('sti','sr-01')
        async with self.page(expected_failures=True) as (_,page,events):
            async def abort(route):await route.abort('failed')
            pattern='**/'+path;await page.route(pattern,abort);await self.open(page)
            await expect(page.locator('#scene-notice')).to_be_visible();await expect(page.locator('#apply-button')).to_be_disabled()
            await page.locator('#apply-button').dispatch_event('click')
            await self.text(page,'#balance','$ 48,320','Missing initial image blocks purchases without charging')
            self.check(bool(events['failed_requests']) and all(request['url'].split('?',1)[0].endswith('/'+path) for request in events['failed_requests']),'Only the intended target image was actually blocked',events['failed_requests'])
            await self.screenshot(page,'error-'+('garage' if garage else 'car')+'.jpg')
            await page.unroute(pattern,abort);await page.locator('#scene-retry').click(no_wait_after=True);await self.ready(page,'sti:blue:sr-01')
            await expect(page.locator('#apply-button')).to_be_enabled();self.check(True,'Retry recovers initial image failure');self.clean(events)

    async def alternate_failure(self,vehicle=False):
        async with self.page(expected_failures=True) as (_,page,events):
            await self.open(page);await self.ready(page,'sti:blue:sr-01')
            path=self.base_path('porsche','sr-01') if vehicle else self.base_path('sti','bbs-lm')
            async def abort(route):await route.abort('failed')
            await page.route('**/'+path,abort)
            if vehicle:await self.select(page,vehicle='porsche')
            else:await self.select(page,wheel='bbs-lm')
            await expect(page.locator('#toast')).to_contain_text('Your previous look has been kept.')
            await self.ready(page,'sti:blue:sr-01');await self.controls(page,'sti','sr-01','blue','wheels')
            await self.text(page,'#total-price','$ 3,700','Failed alternate restores previous car, appearance and quote')
            await self.text(page,'#balance','$ 48,320','Failed alternate preserves credits')
            self.check(bool(events['failed_requests']) and all(request['url'].split('?',1)[0].endswith('/'+path) for request in events['failed_requests']),'Only the intended alternate image was aborted',events['failed_requests']);self.clean(events)

    async def run_case(self,name,action):
        self.current_case=name;start=len(self.assertions);print('RUN '+name,flush=True)
        try:await action()
        except Exception as error:
            self.cases.append({'name':name,'status':'failed','assertions_passed':len(self.assertions)-start,'error':str(error),'traceback':traceback.format_exc()})
            print('FAIL '+name+': '+str(error),flush=True)
        else:
            self.cases.append({'name':name,'status':'passed','assertions_passed':len(self.assertions)-start});print('PASS '+name,flush=True)

    async def run(self):
        cases=[('all-216-previews-controls-and-paint-pixels',self.variants_and_controls),('all-486-blue-mechanical-combinations',self.mechanical_matrix),('painted-maximum-upgrade-builds',self.painted_maximum_upgrades),('all-five-parts-purchase-once-persist-reset',self.five_part_purchases),('per-car-purchases-switch-cancel-reload-reset',self.purchases_and_persistence),('existing-v2-state-migration',self.migration),('existing-v3-state-migration',self.migration_v3),('tyre-failure-five-part-rollback',lambda:self.upgrade_failure('tyre')),('body-failure-five-part-rollback',lambda:self.upgrade_failure('body')),('product-details-accessibility',self.product_details),('all-car-viewport-1366',lambda:self.viewport(1366,768)),('all-car-viewport-1920',lambda:self.viewport(1920,1080)),('all-car-viewport-phone',lambda:self.viewport(390,844,True)),('all-car-viewport-phone-360',lambda:self.viewport(360,780,True)),('all-car-viewport-phone-320',lambda:self.viewport(320,700,True)),('all-18-wheel-contacts-2x',self.wheel_contacts),('out-of-order-wheel-image',self.race),('cancel-delayed-wheel',lambda:self.race('cancel')),('out-of-order-vehicle-image',lambda:self.race('vehicle')),('initial-car-failure-retry',self.initial_failure),('initial-garage-failure-retry',lambda:self.initial_failure(True)),('alternate-wheel-failure-fallback',self.alternate_failure),('alternate-vehicle-failure-fallback',lambda:self.alternate_failure(True))]
        unknown = self.only_cases - {name for name, _ in cases}
        if unknown:
            raise ValueError('Unknown browser case(s): '+', '.join(sorted(unknown)))
        for name,action in cases:
            if not self.only_cases or name in self.only_cases:
                await self.run_case(name,action)
        result={'generated_at_utc':datetime.now(timezone.utc).isoformat(),'base_url':self.base_url,'case_count':len(self.cases),'passed':sum(c['status']=='passed' for c in self.cases),'failed':sum(c['status']=='failed' for c in self.cases),'assertions_passed':len(self.assertions),'cases':self.cases,'assertions':self.assertions,'combinations':self.combinations,'paint_pixel_comparisons':self.pixel_results,'mechanical_combinations':self.mechanical_combinations,'painted_upgrade_combinations':self.painted_upgrade_combinations,'upgrade_pixel_comparisons':self.upgrade_pixel_results,'readiness_failures':self.readiness_failures,'matrix_wheel_scope':list(self.matrix_wheels),'matrix_vehicle_scope':list(self.matrix_vehicles),'coverage_counts':{'baseline_paint':len(self.combinations),'blue_mechanical':len(self.mechanical_combinations),'painted_maximum_upgrades':len(self.painted_upgrade_combinations)},'screenshots':self.screenshots,'browser_observations':self.observations,'visual_acceptance':'Contact sheets require independent visual review; passing tests do not prove artistic fidelity.'}
        (self.output/'browser-results.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps({k:result[k] for k in ('case_count','passed','failed','assertions_passed')},indent=2),flush=True)
        return result['failed']


async def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base-url',default='http://127.0.0.1:4173');parser.add_argument('--output',type=Path,default=PROJECT/'qa/upgrades');parser.add_argument('--case',action='append',help='Run one named case; repeat to select multiple cases');parser.add_argument('--matrix-vehicle',action='append',choices=VEHICLES,help='Restrict only mechanical-matrix cars; repeat to select several');parser.add_argument('--matrix-wheel',action='append',choices=WHEELS,help='Restrict only mechanical-matrix rims; repeat to select several');args=parser.parse_args()
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        try:failures=await BrowserSuite(browser,args.base_url,args.output,args.case,args.matrix_vehicle,args.matrix_wheel).run()
        finally:await browser.close()
    raise SystemExit(1 if failures else 0)


if __name__=='__main__':asyncio.run(main())
