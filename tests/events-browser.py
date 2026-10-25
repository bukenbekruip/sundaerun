"""Events UI, real source snapshot, unsafe-input handling and preserved website content."""
import argparse, asyncio, json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from PIL import Image, ImageChops
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

async def run(args):
    args.output.mkdir(parents=True, exist_ok=True)
    report = {'checks': [], 'errors': [], 'console_errors': [], 'http_errors': [], 'preserved': []}
    def check(ok, label):
        assert ok, label
        report['checks'].append(label)
        print('PASS '+label, flush=True)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width':1440,'height':1000})
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.on('console', lambda message: report['console_errors'].append(message.text) if message.type=='error' else None)
        page.on('response', lambda response: report['http_errors'].append(response.url) if response.status>=400 else None)
        try:
            response = await page.request.get(args.base_url+'data/events.json')
            snapshot = await response.json()
            check(response.status==200 and snapshot.get('refreshedAt'), 'Production publishes a real refreshed calendar snapshot')
            check(any(e['scope']=='international' for e in snapshot['events']) and any(e['scope']=='south-africa' for e in snapshot['events']), 'Snapshot contains verified international and South African listings')
            by_id = {event['id']:event for event in snapshot['events']}
            for width in [320,390,820,1024,1440,1920]:
                await page.set_viewport_size({'width':width,'height':900})
                await page.goto(args.base_url+'events.html', wait_until='networkidle')
                await page.wait_for_function("() => document.querySelector('[data-events-list]').getAttribute('aria-busy')==='false'")
                check(await page.locator('.event-card').count()>0, f'{width}: upcoming event cards load')
                check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), f'{width}: event page has no horizontal overflow')
                check(await page.locator('.nav a[href="events.html"][aria-current="page"]').count()==1, f'{width}: Events navigation is active')
                await page.screenshot(path=str(args.output/f'events-{width}.jpg'), full_page=True, type='jpeg', quality=85)
            await page.locator('[data-scope="international"]').click()
            ids = await page.locator('.event-card').evaluate_all('(cards)=>cards.map(card=>card.dataset.eventId)')
            check(ids and all(by_id[key]['scope']=='international' for key in ids), 'International filter only shows approved major-series records')
            await expect(page.locator('#event-province')).to_be_disabled()
            await page.locator('[data-scope="south-africa"]').click()
            await page.locator('#event-province').select_option('Gauteng')
            ids = await page.locator('.event-card').evaluate_all('(cards)=>cards.map(card=>card.dataset.eventId)')
            check(ids and all(by_id[key]['scope']=='south-africa' and by_id[key]['province']=='Gauteng' for key in ids), 'Province filtering applies to verified South African records')
            await page.locator('#event-search').fill('no-such-event-9a807')
            await expect(page.locator('.events-empty')).to_be_visible()
            check(await page.locator('.event-card').count()==0, 'No-match filter gives an honest empty state')
            await page.locator('#event-search').fill('')
            await page.locator('#event-province').select_option('all')
            await page.locator('[data-scope="all"]').click()
            links = await page.locator('.event-card a').evaluate_all('(links)=>links.map(link=>({href:link.href,rel:link.rel}))')
            check(all(link['href'].startswith('https://') and 'noopener' in link['rel'] for link in links), 'Event destinations use HTTPS and safe external-link behavior')
            await page.evaluate((ROOT/'node_modules/axe-core/axe.min.js').read_text())
            violations = await page.evaluate("async()=>{let r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
            report['axe'] = violations
            check(not violations, 'Events page passes scoped axe accessibility checks')
            for prefix in ['', 'website/']:
                await page.goto(args.base_url+prefix+'events.html', wait_until='networkidle')
                await expect(page.locator('.event-card').first).to_be_visible()
                check(True, f'{prefix or "root/"}: Events modules and snapshot resolve at the production route')
            for name in ['index','community']:
                await page.goto(args.base_url+name+'.html', wait_until='networkidle')
                await expect(page.locator('[data-events-preview-list] .event-card')).to_have_count(3)
                check(True, name+': upcoming-events preview contains three source-backed cards')
                await page.screenshot(path=str(args.output/f'{name}-preview.jpg'), full_page=True, type='jpeg', quality=85)

            # Main-page content is unchanged outside the requested Events additions.
            # Hide navigation through CSSOM on both sides; no injected stylesheet/CSP bypass.
            if args.baseline_url:
                for width in [390,820,1440]:
                    await page.set_viewport_size({'width':width,'height':900})
                    for name in ['culture','garage','shop','about','privacy','play']:
                        paths=[]
                        for label,base in [('before',args.baseline_url),('after',args.base_url)]:
                            await page.goto(base+name+'.html',wait_until='networkidle')
                            await page.evaluate("Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode()}))")
                            await page.evaluate("document.fonts.ready")
                            await page.evaluate("document.querySelector('.header').style.visibility='hidden'")
                            await page.mouse.move(0,0)
                            path=args.output/f'{name}-{width}-{label}.png'
                            await page.locator('main').screenshot(path=str(path),animations='disabled')
                            paths.append(path)
                        old,new=[Image.open(path).convert('RGB') for path in paths]
                        same=old.size==new.size and ImageChops.difference(old,new).getbbox() is None
                        report['preserved'].append({'page':name,'width':width,'exact':same})
                        check(same,f'{width}/{name}: preserved main content matches the production baseline exactly')

            check(not report['errors'] and not report['console_errors'] and not report['http_errors'], 'Normal Events, preview and preserved-page flows have no page/console/HTTP errors')
            # Fixtures exercise edge cases; these records are never written to production data.
            future=(datetime.now(timezone.utc)+timedelta(days=5)).date().isoformat()
            stamp=datetime.now(timezone.utc).isoformat()
            sample=dict(snapshot['events'][0], startDate=future,endDate=future,scope='south-africa',country='ZA',province='Gauteng',category='funrun',verifiedAt=stamp)
            samples=[dict(sample,id=f'fixture-{index}',title=f'Fixture fun run {index}') for index in range(30)]
            malicious='<img src=x onerror="window.__eventInjected=true">'
            samples[0]['title']=malicious
            samples.append(dict(sample,id='cancelled',title='Cancelled fixture',status='cancelled'))
            samples.append(dict(sample,id='invalid-link',url='javascript:alert(1)'))
            fixture=dict(snapshot,refreshedAt=stamp,events=samples)
            await page.route('**/data/events.json', lambda route: route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture)))
            await page.goto(args.base_url+'events.html',wait_until='networkidle')
            await expect(page.locator('.event-card')).to_have_count(24)
            await page.locator('[data-events-more]').click()
            await expect(page.locator('.event-card')).to_have_count(30)
            check(True, 'Pagination reveals all matching records without publishing cancelled or unsafe-link entries')
            await expect(page.locator('.event-card h3').filter(has_text=malicious)).to_have_count(1)
            check(await page.locator('.event-card img').count()==0 and not await page.evaluate('window.__eventInjected===true'), 'Source text is rendered literally and cannot inject executable markup')
            await page.locator('#event-category').select_option('funrun')
            await expect(page.locator('.event-card')).to_have_count(24)
            check(True,'Local fun runs use the same searchable, paginated calendar as major events')
            stale=dict(fixture,refreshedAt='2020-01-01T00:00:00Z',events=[dict(sample,id='stale',verifiedAt='2020-01-01T00:00:00Z')])
            await page.unroute('**/data/events.json')
            await page.route('**/data/events.json', lambda route: route.fulfill(status=200,content_type='application/json',body=json.dumps(stale)))
            await page.goto(args.base_url+'events.html',wait_until='networkidle')
            await expect(page.locator('.event-stale')).to_be_visible()
            await expect(page.locator('[data-events-notice]')).to_be_visible()
            check(True,'Outdated snapshots and old confirmations are visibly labelled')
            await page.unroute('**/data/events.json')
            nojs=await browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
            offline=await nojs.new_page();await offline.goto(args.base_url+'events.html',wait_until='networkidle')
            await expect(offline.locator('noscript')).to_contain_text('official calendar links')
            check(await offline.locator('a[href="https://www.motorsport.co.za/events/"]').count()>0,'No-script visitors retain direct official-calendar access')
            await nojs.close()
            report['status']='passed'
        except Exception:
            report['status']='failed'
            await page.screenshot(path=str(args.output/'failure.jpg'),full_page=True)
            raise
        finally:
            report['passed_checks']=len(report['checks'])
            (args.output/'events-results.json').write_text(json.dumps(report,indent=2)+'\n')
            await browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',required=True)
    parser.add_argument('--baseline-url')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();args.base_url=args.base_url.rstrip('/')+'/'
    if args.baseline_url:args.baseline_url=args.baseline_url.rstrip('/')+'/'
    asyncio.run(run(args))
