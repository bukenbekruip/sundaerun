"""Native build-club regression. Run against a production preview, optionally offline portable HTML."""
import argparse
import asyncio
import base64
import hashlib
import json
from pathlib import Path
import traceback
from datetime import datetime, timezone
from playwright.async_api import async_playwright, expect

PROJECT = Path(__file__).resolve().parents[1]
KEY = 'sundae-run-garage-v2'


async def run(args):
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    report = {'started_at_utc': datetime.now(timezone.utc).isoformat(), 'portable': args.portable,
              'checks': [], 'page_errors': [], 'console_errors': [], 'http_errors': [], 'extra_requests': []}

    def check(condition, message):
        if not condition:
            raise AssertionError(message)
        report['checks'].append(message)
        print('PASS ' + message, flush=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            context = await browser.new_context(viewport={'width': 1672, 'height': 941}, accept_downloads=True)
            page = await context.new_page()
            page.set_default_timeout(30000)
            page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
            page.on('console', lambda m: report['console_errors'].append(m.text) if m.type == 'error' else None)
            page.on('response', lambda r: report['http_errors'].append(r.url) if r.status >= 400 else None)
            target = args.base_url.rstrip('/') + ('/OPEN-SUNDAE-RUN.html' if args.portable else '/')
            if args.portable:
                async def route(r):
                    if r.request.is_navigation_request() and r.request.url == target:
                        await r.continue_()
                    else:
                        report['extra_requests'].append(r.request.url)
                        await r.abort()
                await context.route('**/*', route)

            async def ready(variant=None):
                await page.wait_for_function("""variant => {
                    const c=document.querySelector('#car-image'), g=document.querySelector('#garage-image');
                    return document.querySelector('#scene').getAttribute('aria-busy')==='false' && c.complete && c.naturalWidth>0 && g.complete && g.naturalWidth>0 && (!variant || c.dataset.variant===variant);
                }""", arg=variant, polling=100)

            async def stored():
                return await page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

            async def click(selector):
                await page.locator(selector).click(no_wait_after=True)

            async def club(tab='builds'):
                await click('#club-open')
                await expect(page.locator('#club-dialog')).to_be_visible()
                if tab != 'builds':
                    await click('[data-club-tab="'+tab+'"]')

            async def close():
                await click('#club-dialog [data-close-dialog]')

            async def photo(name):
                await page.screenshot(path=str(out/name), type='jpeg', quality=87, full_page=True)

            await page.goto(target, wait_until='load', timeout=60000)
            await ready('sti:blue:sr-01')
            check(await page.locator('.level-box strong').inner_text() == 'Lv. 1', 'Fresh XP starts at a real level 1')
            await photo('garage-desktop.jpg')
            for wheel,paint,name in [('te37','blue','alternate-wheels'),('te37','black','black-paint'),('te37','mint','mint-paint'),('sr-01','blue','back-to-blue')]:
                await click(f'.wheel-select[data-wheel="{wheel}"]')
                await click(f'.paint-option[data-paint="{paint}"]')
                await ready(f'sti:{paint}:{wheel}')
                check((await stored())['balance'] == 48320, name+': exterior preview remains free')
                await photo(name+'.jpg')
            await club()
            await expect(page.locator('.club-save-form button')).to_be_disabled()
            check(await page.locator('.club-empty').count() == 1, 'Unfitted default cannot be saved as a purchased build')
            await photo('club-empty-desktop.jpg')
            await close()
            await click('#apply-button')
            await expect(page.locator('#balance')).to_have_text('$ 44,620')
            await club()
            await page.locator('#club-build-name').fill('Coast club')
            await click('.club-save-form button')
            s = await stored()
            first_id = s['club']['builds'][0]['id']
            check(len(s['club']['builds']) == 1 and s['balance'] == 44620, 'Saving a named build preserves credits and fitted parts')
            await click('[data-club-tab="briefs"]')
            await click('[data-challenge="sti:first-build"] button')
            s = await stored()
            check(s['balance'] == 46120 and s['club']['completed'] == ['sti:first-build'], 'First brief adds exactly 1500 credits in the same save')
            await expect(page.locator('[data-challenge="sti:first-build"] button')).to_be_disabled()
            check('100 / 500 XP' in await page.locator('.level-box').inner_text(), 'Claimed brief updates the real XP HUD')
            await photo('club-briefs-desktop.jpg')
            await click('[data-club-tab="performance"]')
            await click('[data-performance-kind="filter"][data-performance-part="panel"]')
            s = await stored()
            check(s['balance'] == 45670 and s['club']['performance']['sti']['fitted']['filter'] == 'panel', 'Panel filter costs 450 credits and fits only the STI')
            await expect(page.locator('[data-performance-kind="filter"][data-performance-part="panel"]')).to_be_disabled()
            await click('[data-performance-kind="filter"][data-performance-part="stock"]')
            await click('[data-performance-kind="filter"][data-performance-part="panel"]')
            check((await stored())['balance'] == 45670, 'Refitting included or owned performance parts is free')
            await click('[data-performance-kind="exhaust"][data-performance-part="catback"]')
            await click('[data-performance-kind="tune"][data-performance-part="road"]')
            check((await stored())['balance'] == 41070, 'Exhaust and tune use separate exact game prices')
            await photo('club-performance-desktop.jpg')
            await click('[data-club-tab="builds"]')
            await page.locator('#club-build-name').fill('Café 🚗 <script>')
            await click('.club-save-form button')
            s = await stored()
            check(len(s['club']['builds']) == 2, 'A different performance recipe creates a second immutable saved snapshot')
            check(s['club']['builds'][0]['spec']['filter'] == 'stock', 'Changing performance does not mutate an earlier saved build')
            await photo('club-saved-builds-desktop.jpg')
            await page.locator(f'[data-build="{first_id}"]').get_by_role('button', name='Create show card', exact=True).click(no_wait_after=True)
            await expect(page.locator('.club-show-card')).to_be_visible(timeout=60000)
            await page.locator('.club-show-card').evaluate('(img)=>img.decode()')
            dims = await page.locator('.club-show-card').evaluate('(img)=>[img.naturalWidth,img.naturalHeight]')
            check(dims == [1600,980], 'Saved snapshot renders a full 1600×980 show card')
            async with page.expect_download() as event:
                await page.get_by_role('button', name='Download image', exact=True).click(no_wait_after=True)
            dl = await event.value
            await dl.save_as(str(out/'coast-club-show-card.png'))
            check((out/'coast-club-show-card.png').read_bytes()[:8] == b'\x89PNG\r\n\x1a\n', 'Native download produces an actual PNG show card')
            await photo('club-show-card-desktop.jpg')
            await page.get_by_role('button', name='Copy build code', exact=True).click(no_wait_after=True)
            code = await page.locator('.club-share-code').input_value()
            check(code.startswith('SR1.'), 'Share flow exposes a portable SR1 code')
            recipe = json.loads(base64.urlsafe_b64decode(code[4:] + '=' * (-len(code[4:]) % 4)))
            check(not any(k in recipe for k in ['balance','purchased','completed','id']), 'Shared build excludes wallet, purchases, rewards and local identity')
            await page.locator('#club-shopping-region').select_option('US')
            check((await stored())['club']['region'] == 'US', 'International shopping preference is saved without fabricating offers')
            await close()
            await page.reload(wait_until='load', timeout=60000)
            await ready('sti:blue:sr-01')
            s = await stored()
            check(s['balance'] == 41070 and len(s['club']['builds']) == 2 and len(s['club']['completed']) == 1, 'Reload retains builds, performance, exact wallet and one-time reward')
            await click('[data-vehicle="porsche"]')
            await ready('porsche:blue:sr-01')
            await club('performance')
            check('Fitted ✓' in await page.locator('[data-performance-kind="filter"][data-performance-part="stock"]').inner_text(), 'Other cars retain their original performance parts')
            await click('[data-club-tab="import"]')
            await page.locator('#club-import-code').fill('SR1.invalid')
            await click('.club-import-form button')
            await expect(page.locator('#club-status')).to_contain_text('could not be read')
            check((await stored())['balance'] == 41070, 'Invalid import gives a readable error and changes no credits')
            recipe['vehicle'] = 'porsche'; recipe['selection']['paint'] = 'mint'; recipe['selection']['wheel'] = 'te37'
            recipe['spec'] = {'filter':'intake','exhaust':'catback','tune':'track'}
            friend = 'SR1.' + base64.urlsafe_b64encode(json.dumps(recipe).encode()).decode().rstrip('=')
            await page.locator('#club-import-code').fill(friend)
            await click('.club-import-form button')
            await page.get_by_role('button', name='Preview this exterior', exact=True).click(no_wait_after=True)
            await ready('porsche:mint:te37')
            s = await stored()
            check(s['balance'] == 41070 and not s['garage']['porsche']['purchased'], 'Imported exterior previews for free without granting ownership or rewards')
            check(s['club']['performance']['porsche']['fitted']['tune'] == 'stock', 'Imported performance recipe does not grant unpurchased upgrades')
            await expect(page.locator('#total-price')).to_have_text('$ 4,000')
            await click('#cancel-preview'); await ready('porsche:blue:sr-01')
            check((await stored())['club']['region'] == 'US', 'Preference and club data survive normal exterior preview/cancel transactions')
            for vehicle,wheel,paint,parts in [('porsche','bbs-lm','white',{'tyre':'track','suspension':'track','body':'track'}),('gt86','te37','black',{'tyre':'sport','suspension':'sport','body':'street'})]:
                await click(f'[data-vehicle="{vehicle}"]'); await ready(f'{vehicle}:blue:sr-01')
                await click('.category-menu [data-category="wheels"]')
                await click(f'.wheel-select[data-wheel="{wheel}"]')
                await click(f'.paint-option[data-paint="{paint}"]')
                for kind,value in parts.items():
                    category={'tyre':'tyres','suspension':'suspension','body':'body'}[kind]
                    await click(f'.category-menu [data-category="{category}"]')
                    await click(f'.part-select[data-part-kind="{kind}"][data-part="{value}"]')
                await ready(f'{vehicle}:{paint}:{wheel}:{parts["tyre"]}:{parts["suspension"]}:{parts["body"]}')
                await click('#apply-button')
                await club()
                await page.locator('#club-build-name').fill(vehicle+' show build')
                await click('.club-save-form button')
                saved_build=next(b for b in (await stored())['club']['builds'] if b['name']==vehicle+' show build')
                await page.locator(f'[data-build="{saved_build["id"]}"]').get_by_role('button',name='Create show card',exact=True).click(no_wait_after=True)
                await expect(page.locator('.club-show-card')).to_be_visible(timeout=60000)
                await page.locator('.club-show-card').evaluate('(img)=>img.decode()')
                async with page.expect_download() as event:
                    await page.get_by_role('button',name='Download image',exact=True).click(no_wait_after=True)
                dl=await event.value; await dl.save_as(str(out/(vehicle+'-upgraded-show-card.png')))
                check((out/(vehicle+'-upgraded-show-card.png')).read_bytes()[:8] == b'\x89PNG\r\n\x1a\n',vehicle+': painted/upgraded saved build exports a PNG through native controls')
                await close()
            await context.close()

            if not args.portable:
                for width,height in [(1920,1080),(1366,768),(768,1024),(390,844),(360,780),(320,700)]:
                    mobile = await browser.new_context(viewport={'width':width,'height':height})
                    page = await mobile.new_page(); page.set_default_timeout(30000)
                    page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
                    await page.goto(target,wait_until='load',timeout=60000); await ready('sti:blue:sr-01')
                    await expect(page.locator('#club-open')).to_be_visible()
                    await club()
                    for tab in ['builds','briefs','performance','import']:
                        await click('[data-club-tab="'+tab+'"]')
                        box = await page.locator('#club-dialog').bounding_box()
                        check(box['x']>=0 and box['x']+box['width']<=width+1, f'{width}px {tab}: dialog stays within viewport')
                        overflow=await page.locator('#club-dialog').evaluate('(e)=>e.scrollWidth>e.clientWidth+1')
                        check(not overflow, f'{width}px {tab}: no horizontal content overflow')
                        await photo(f'club-{tab}-{width}.jpg')
                    await close()
                    check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), f'{width}px garage remains free of horizontal overflow')
                    await mobile.close()
            check(not report['page_errors'], 'No uncaught browser exceptions')
            check(not report['console_errors'], 'No console errors in the main feature flow')
            check(not report['http_errors'], 'No HTTP failures in the main feature flow')
            check(not report['extra_requests'], 'Portable mode requests no additional resources' if args.portable else 'Normal build does not use the offline interception path')
            report['status'] = 'passed'
        except Exception as e:
            report['status'] = 'failed'; report['error'] = str(e); report['traceback'] = traceback.format_exc()
            print(report['traceback'], flush=True)
        finally:
            await browser.close()
    report['passed_checks'] = len(report['checks'])
    report['finished_at_utc'] = datetime.now(timezone.utc).isoformat()
    if args.portable:
        path = PROJECT/'dist/OPEN-SUNDAE-RUN.html'
        report['artifact_sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    (out/'club-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['status','passed_checks']},indent=2),flush=True)
    if report['status'] != 'passed':raise SystemExit(1)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',default='http://127.0.0.1:4173')
    parser.add_argument('--output',type=Path,default=PROJECT/'qa/club')
    parser.add_argument('--portable',action='store_true')
    asyncio.run(run(parser.parse_args()))
