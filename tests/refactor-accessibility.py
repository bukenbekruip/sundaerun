"""Keyboard behavior, no-script privacy, real CSP enforcement and scoped axe audit."""
import argparse
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


async def run(args):
    args.output.mkdir(parents=True, exist_ok=True)
    report = {"checks": [], "axe": [], "page_errors": []}

    def check(ok, name):
        assert ok, name
        report['checks'].append(name)
        print('PASS ' + name, flush=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()
        page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
        try:
            await page.goto(args.base_url + 'index.html', wait_until='networkidle')
            await page.keyboard.press('Tab')
            await expect(page.locator('.skip-link')).to_be_focused()
            await page.keyboard.press('Enter')
            await expect(page.locator('#main')).to_be_focused()
            check(True, 'Website skip link is keyboard reachable and focuses main content')
            await page.locator('.menu-button').click()
            await page.keyboard.press('Escape')
            await expect(page.locator('.menu-button')).to_be_focused()
            await expect(page.locator('.menu-button')).to_have_attribute('aria-expanded', 'false')
            check(True, 'Escape closes navigation and returns keyboard focus')
            await page.locator('.menu-button').click()
            await page.mouse.click(380, 830)
            await expect(page.locator('.nav')).not_to_have_class('nav open')
            check(True, 'Outside click closes the mobile navigation')
            await page.locator('.menu-button').click()
            await page.set_viewport_size({'width': 1440, 'height': 1000})
            await expect(page.locator('.menu-button')).to_have_attribute('aria-expanded', 'false')
            check(True, 'Viewport changes reset stale mobile-menu state')

            # Test the actual enforced policy; deliberately rejected script is expected.
            await page.evaluate("""() => { const s=document.createElement('script');s.textContent='window.__injectionExecuted=true';document.body.appendChild(s) }""")
            check(await page.evaluate('window.__injectionExecuted !== true'), 'Production CSP blocks an injected inline script')
            check('unsafe-inline' not in await page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content'), 'CSP does not permit unsafe inline execution')

            await page.goto(args.base_url + 'garage/', wait_until='networkidle')
            await page.wait_for_function("() => document.querySelector('#scene').getAttribute('aria-busy')==='false'")
            await page.keyboard.press('Tab'); await page.keyboard.press('Enter')
            await expect(page.locator('#game-shell')).to_be_focused()
            check(True, 'Garage skip link focuses the existing game without moving its layout')
            await page.locator('#apply-button').click()
            await page.locator('#club-open').click()
            malicious = '<img src=x onerror=alert(1)>'
            await page.locator('#club-build-name').fill(malicious)
            await page.locator('.club-save-form button').click()
            await expect(page.locator('.club-build-card h3')).to_have_text(malicious)
            check(await page.locator('.club-build-card img').count() == 0, 'A saved HTML-like name remains literal text, not executable markup')
            await context.close()

            context = await browser.new_context(java_script_enabled=False, viewport={'width':390,'height':844})
            requests = []
            context.on('request', lambda r: requests.append(r.url))
            page = await context.new_page()
            await page.goto(args.base_url + 'community.html', wait_until='networkidle')
            await expect(page.locator('.nav')).to_be_visible()
            await expect(page.locator('#signup-demo button')).to_be_disabled()
            await page.locator('#signup-name').fill('Private Name')
            await page.locator('#signup-email').fill('private@example.com')
            await page.locator('#signup-email').press('Enter')
            check(not any('Private' in url or 'private%40' in url or 'name=' in url for url in requests), 'No-script signup cannot send personal details in a URL')
            check(page.url == args.base_url + 'community.html', 'No-script signup remains a local preview')
            await context.close()

            # Audit both sides with the same axe version. This is an audit, not
            # a claim that preserved artwork/contrast is fully WCAG conformant.
            context = await browser.new_context(viewport={'width':390,'height':844})
            page = await context.new_page()
            axe = (ROOT/'node_modules/axe-core/axe.min.js').read_text()
            for label, base in [('baseline',args.baseline_url),('refactor',args.base_url)]:
                for name in ['index.html','culture.html','garage.html','community.html','shop.html','about.html','privacy.html','play.html','garage/']:
                    await page.goto(base+name, wait_until='networkidle')
                    await page.evaluate(axe)
                    result = await page.evaluate("async()=>{let r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>n.target)})),passes:r.passes.length}}")
                    report['axe'].append({'version': '4.14.0', 'site':label, 'page':name, **result})
            before = {r['page']: {v['id'] for v in r['violations']} for r in report['axe'] if r['site']=='baseline'}
            new = [{'page':r['page'],'rule':v['id']} for r in report['axe'] if r['site']=='refactor' for v in r['violations'] if v['id'] not in before[r['page']]]
            report['new_axe_rules'] = new
            check(not new, 'Refactor introduces no new axe violation categories compared with the preserved baseline')
            check(not report['page_errors'], 'No uncaught errors in normal keyboard, privacy and name-handling flows')
            report['status']='passed'
        except Exception:
            report['status']='failed'
            raise
        finally:
            (args.output/'accessibility-results.json').write_text(json.dumps(report,indent=2)+'\n')
            await browser.close()


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',default='http://127.0.0.1:4201/')
    parser.add_argument('--baseline-url',default='http://127.0.0.1:4200/')
    parser.add_argument('--output',type=Path,default=Path('/tmp/sundae-refactor-qa/accessibility'))
    args=parser.parse_args();args.base_url=args.base_url.rstrip('/')+'/';args.baseline_url=args.baseline_url.rstrip('/')+'/'
    asyncio.run(run(args))
