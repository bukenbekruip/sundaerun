#!/usr/bin/env python3
"""Real-browser regressions for the built STI screen (no extra test framework).

Run `npm run build`, start `npm run preview -- --host 127.0.0.1 --port 4173`,
then run `python3 tests/browser-smoke.py`. Evidence goes to qa/current/.
"""
import argparse
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import traceback

from playwright.async_api import async_playwright, expect


class BrowserSuite:
    def __init__(self, browser, base_url, output):
        self.browser = browser
        self.base_url = base_url.rstrip('/')
        self.output = output
        self.output.mkdir(parents=True, exist_ok=True)
        self.manifest = json.loads((Path(__file__).resolve().parents[1] / 'public/assets/scene/manifest.json').read_text())
        self.cases = []
        self.assertions = []
        self.screenshots = []
        self.observations = []
        self.current_case = ''

    def passed(self, label):
        self.assertions.append({'case': self.current_case, 'assertion': label, 'status': 'passed'})

    def check(self, condition, label, details=None):
        if not condition:
            raise AssertionError(f'{label}: {details!r}')
        self.passed(label)

    async def text(self, page, selector, value, label):
        await expect(page.locator(selector)).to_have_text(value)
        self.passed(label)

    async def attribute(self, page, selector, attribute, value, label):
        await expect(page.locator(selector)).to_have_attribute(attribute, value)
        self.passed(label)

    async def ready(self, page, variant):
        await page.wait_for_function(
            """variant => {
                const car = document.querySelector('#car-image');
                const garage = document.querySelector('#garage-image');
                return document.querySelector('#scene').getAttribute('aria-busy') === 'false'
                    && car.dataset.variant === variant && car.complete && car.naturalWidth > 0
                    && garage.complete && garage.naturalWidth > 0;
            }""", arg=variant,
        )
        await expect(page.locator('#scene-notice')).to_be_hidden()

    @asynccontextmanager
    async def page(self, *, width=1672, height=941, dpr=1, expected_network_failures=False):
        context = await self.browser.new_context(
            viewport={'width': width, 'height': height}, device_scale_factor=dpr,
        )
        page = await context.new_page()
        page.set_default_timeout(10000)
        events = {'case': self.current_case, 'page_errors': [], 'http_errors': [], 'failed_requests': [], 'console_errors': [], 'expected_network_failures': expected_network_failures}
        page.on('pageerror', lambda error: events['page_errors'].append(str(error)))
        page.on('response', lambda response: events['http_errors'].append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
        page.on('requestfailed', lambda request: events['failed_requests'].append({'url': request.url, 'failure': request.failure}))
        page.on('console', lambda message: events['console_errors'].append({'text': message.text, 'url': message.location.get('url')}) if message.type == 'error' else None)
        try:
            yield context, page, events
        finally:
            self.observations.append(events)
            await context.close()

    async def open(self, page):
        response = await page.goto(self.base_url + '/', wait_until='networkidle')
        self.check(response is not None and response.status == 200, 'Built page responds successfully')
        await expect(page).to_have_title('Sundae Run Garage — STI Customisation')
        self.passed('Built page has the intended title')
        await page.evaluate('document.fonts.ready')

    def clean(self, events):
        self.check(not events['page_errors'], 'No uncaught browser exceptions', events['page_errors'])
        self.check(not events['http_errors'], 'No HTTP error responses', events['http_errors'])
        if not events['expected_network_failures']:
            self.check(not events['failed_requests'], 'No failed network requests', events['failed_requests'])
            self.check(not events['console_errors'], 'No browser console errors', events['console_errors'])

    async def screenshot(self, page, name, *, full_page=False, clip=None):
        await page.mouse.move(1, 1)
        await page.screenshot(path=str(self.output / name), type='jpeg', quality=88, full_page=full_page, clip=clip, scale='device')
        self.screenshots.append(name)

    async def controls(self, page, wheel, paint, category):
        self.check(await page.locator('.wheel-select[aria-pressed="true"]').count() == 1, 'Exactly one wheel is selected')
        self.check(await page.locator('.paint-option[aria-pressed="true"]').count() == 1, 'Exactly one paint is selected')
        await self.attribute(page, f'.wheel-select[data-wheel="{wheel}"]', 'aria-pressed', 'true', 'Selected wheel agrees with rendered variant')
        await self.attribute(page, f'.paint-option[data-paint="{paint}"]', 'aria-pressed', 'true', 'Selected paint agrees with rendered variant')
        self.check(await page.locator('.selection-check:visible').count() == 1, 'Exactly one native wheel checkmark is visible')
        check_count = await page.locator('.paint-option').evaluate_all(
            "buttons => buttons.filter(button => !['none', 'normal', '\"\"'].includes(getComputedStyle(button, '::after').content)).length"
        )
        self.check(check_count == 1, 'Exactly one native paint checkmark is rendered', check_count)
        active = await page.locator('[data-category][aria-pressed="true"]').evaluate_all('buttons => [...new Set(buttons.map(button => button.dataset.category))]')
        self.check(active == [category], 'Category highlights agree with the last interaction', active)

    async def select(self, page, *, wheel=None, paint=None):
        if wheel is not None:
            await page.locator(f'.wheel-select[data-wheel="{wheel}"]').click()
        if paint is not None:
            await page.locator(f'.paint-option[data-paint="{paint}"]').click()

    async def layout(self, page, variant, *, mobile=False):
        data = await page.evaluate("""() => {
            const rectangle = element => {const b = element.getBoundingClientRect(); return {x:b.x, y:b.y, width:b.width, height:b.height};};
            const car = document.querySelector('#car-image');
            return {
                documentWidth:document.documentElement.scrollWidth,
                bodyWidth:document.body.scrollWidth,
                viewportWidth:innerWidth, viewportHeight:innerHeight,
                car:rectangle(car), scene:rectangle(document.querySelector('#scene')),
                naturalWidth:car.naturalWidth, naturalHeight:car.naturalHeight
            };
        }""")
        self.check(data['documentWidth'] <= data['viewportWidth'] + 1 and data['bodyWidth'] <= data['viewportWidth'] + 1, 'Document has no horizontal overflow', data)
        source_bounds = self.manifest['assets'][variant.replace(':', '-')]['opaqueBoundsAlpha128']
        image_scale = min(data['car']['width'] / data['naturalWidth'], data['car']['height'] / data['naturalHeight'])
        opaque = {
            'left': data['car']['x'] + source_bounds[0] * image_scale,
            'top': data['car']['y'] + source_bounds[1] * image_scale,
            'right': data['car']['x'] + source_bounds[2] * image_scale,
            'bottom': data['car']['y'] + source_bounds[3] * image_scale,
        }
        scene = data['scene']
        self.check(
            opaque['left'] >= scene['x'] - 1 and opaque['right'] <= scene['x'] + scene['width'] + 1
            and opaque['top'] >= scene['y'] - 1 and opaque['bottom'] <= scene['y'] + scene['height'] + 1,
            'The complete opaque car fits inside the scene (transparent canvas padding excluded)', opaque,
        )
        self.check(opaque['left'] >= -1 and opaque['right'] <= data['viewportWidth'] + 1, 'Car width is fully within the viewport', opaque)
        await page.locator('.checkout-panel').scroll_into_view_if_needed()
        checkout = await page.locator('.checkout-panel').bounding_box()
        self.check(checkout['x'] >= -1 and checkout['x'] + checkout['width'] <= data['viewportWidth'] + 1, 'Checkout width is not clipped', checkout)
        self.check(checkout['y'] >= -1 and checkout['y'] + checkout['height'] <= data['viewportHeight'] + 1, 'Entire checkout is visible after scrolling when needed', checkout)
        await expect(page.locator('#apply-button')).to_be_in_viewport()
        self.passed('Apply button is reachable in the viewport')
        if mobile:
            document_height = await page.evaluate('document.documentElement.scrollHeight')
            self.check(document_height > data['viewportHeight'], 'Narrow layout uses readable vertical scrolling')

    async def variants_and_controls(self):
        async with self.page() as (_, page, events):
            await self.open(page)
            await self.ready(page, 'blue:sr-01')
            await self.text(page, '#balance', '$ 48,320', 'Starting balance is 48320 credits')
            await self.text(page, '#total-price', '$ 3,700', 'Initial wheel and paint quote is 3700 credits')
            original = await page.locator('#car-image').bounding_box()
            await self.controls(page, 'sr-01', 'blue', 'wheels')
            await self.layout(page, 'blue:sr-01')
            await self.screenshot(page, 'default-1672.jpg')
            sequence = [
                ('blue', 'te37', 'wheels', 'blue-alternate-wheels.jpg'),
                ('black', 'te37', 'paint', 'black-alternate-wheels.jpg'),
                ('mint', 'te37', 'paint', 'mint-alternate-wheels.jpg'),
                ('mint', 'sr-01', 'wheels', 'mint-paint.jpg'),
                ('black', 'sr-01', 'paint', 'black-paint.jpg'),
                ('blue', 'sr-01', 'paint', 'back-to-blue.jpg'),
            ]
            for paint, wheel, category, screenshot in sequence:
                if category == 'wheels':
                    await self.select(page, wheel=wheel)
                else:
                    await self.select(page, paint=paint)
                key = f'{paint}:{wheel}'
                await self.ready(page, key)
                current = await page.locator('#car-image').bounding_box()
                self.check(all(abs(current[axis] - original[axis]) < 0.1 for axis in ['x', 'y', 'width', 'height']), f'{key} keeps the same complete-car transform', current)
                dimensions = await page.locator('#car-image').evaluate('(image) => ({width:image.naturalWidth,height:image.naturalHeight,src:image.currentSrc})')
                self.check(dimensions['width'] >= 1500 and dimensions['height'] >= 900 and dimensions['src'].endswith(f'{paint}-{wheel}.png'), f'{key} loads its own full-resolution car image', dimensions)
                await self.controls(page, wheel, paint, category)
                await self.text(page, '#balance', '$ 48,320', 'Changing previews never spends credits')
                await self.text(page, '#total-price', '$ 4,000' if wheel == 'te37' else '$ 3,700', 'Quote follows the selected wheel and paint')
                await self.screenshot(page, screenshot)
            self.clean(events)

    async def purchases_and_persistence(self):
        async with self.page() as (_, page, events):
            await self.open(page)
            await self.ready(page, 'blue:sr-01')
            await page.locator('#apply-button').click()
            await self.text(page, '#balance', '$ 44,620', 'First fitting charges exactly 3700 credits')
            await self.text(page, '#total-price', '$ 0', 'Owned default build has a zero quote')
            await expect(page.locator('#apply-button')).to_be_disabled()
            self.passed('An already-fitted build cannot be purchased again')
            await page.locator('#apply-button').dispatch_event('click')
            await self.text(page, '#balance', '$ 44,620', 'Repeated Apply does not debit credits')
            await self.select(page, wheel='te37', paint='black')
            await self.ready(page, 'black:te37')
            await page.locator('#cancel-preview').click()
            await self.ready(page, 'blue:sr-01')
            await self.text(page, '#balance', '$ 44,620', 'Cancel preview does not debit credits')
            await self.controls(page, 'sr-01', 'blue', 'paint')
            await self.select(page, wheel='te37', paint='black')
            await self.ready(page, 'black:te37')
            await page.locator('#apply-button').click()
            await self.text(page, '#balance', '$ 40,620', 'New wheel and paint charge only their 4000 credits')
            await self.select(page, paint='mint')
            await self.ready(page, 'mint:te37')
            await page.reload(wait_until='networkidle')
            await self.ready(page, 'black:te37')
            await self.text(page, '#balance', '$ 40,620', 'Reload preserves the applied purchase balance')
            await self.controls(page, 'te37', 'black', 'paint')
            await self.text(page, '#total-price', '$ 0', 'Reload restores applied parts, not an uncommitted preview')
            await self.select(page, wheel='sr-01', paint='blue')
            await self.ready(page, 'blue:sr-01')
            await self.text(page, '#total-price', '$ 0', 'Previously purchased parts can be fitted for free')
            await expect(page.locator('#apply-button')).to_be_enabled()
            await page.locator('#apply-button').click()
            await self.text(page, '#balance', '$ 40,620', 'Refitting owned parts costs no credits')
            await page.locator('#settings-open').click()
            await page.locator('#reset-request').click()
            await expect(page.locator('#reset-confirmation')).to_be_visible()
            self.passed('Reset requires a visible confirmation')
            await page.locator('#reset-cancel').click()
            await expect(page.locator('#reset-confirmation')).to_be_hidden()
            await self.text(page, '#balance', '$ 40,620', 'Cancelling reset preserves progress')
            await page.locator('#reset-request').click()
            await page.locator('#reset-confirm').click()
            await self.ready(page, 'blue:sr-01')
            await expect(page.locator('#settings-dialog')).not_to_be_visible()
            await self.text(page, '#balance', '$ 48,320', 'Confirmed reset restores starting balance')
            await self.text(page, '#total-price', '$ 3,700', 'Confirmed reset clears owned upgrades')
            self.clean(events)

    async def product_details(self):
        async with self.page() as (_, page, events):
            await self.open(page)
            await self.ready(page, 'blue:sr-01')
            await expect(page.locator('.wheel-select[data-wheel="bbs-lm"]')).to_be_disabled()
            await page.locator('.product-details[data-product="bbs-lm"]').click()
            await expect(page.get_by_role('dialog', name='BBS LM')).to_be_visible()
            self.passed('Unavailable preview still has an accessible product-details dialog')
            await expect(page.locator('#product-content')).to_contain_text('Physical vehicle fitment has not been verified.')
            await expect(page.locator('#product-content')).to_contain_text('Real product and retailer details are coming later.')
            self.passed('Concept details distinguish unverified fitment and pending retailer data')
            self.check(await page.locator('#product-dialog a[href]').count() == 0, 'No fabricated merchant or affiliate destination is shown')
            await page.keyboard.press('Escape')
            await expect(page.locator('#product-dialog')).not_to_be_visible()
            await expect(page.locator('.product-details[data-product="bbs-lm"]')).to_be_focused()
            self.passed('Escape closes the modal and returns focus to its trigger')
            self.clean(events)

    async def viewport(self, width, height, mobile=False):
        async with self.page(width=width, height=height) as (_, page, events):
            await self.open(page)
            await self.ready(page, 'blue:sr-01')
            await self.layout(page, 'blue:sr-01', mobile=mobile)
            await self.screenshot(page, 'phone-full-page.jpg' if mobile else f'default-{width}.jpg', full_page=mobile)
            if mobile:
                await page.locator('.category[data-category="paint"]').click()
                await expect(page.locator('#paint-options button:not(:disabled)').first).to_be_in_viewport()
                self.passed('Narrow Paint navigation brings its controls into view')
                await page.locator('.category[data-category="wheels"]').click()
                await expect(page.locator('.wheel-select:not(:disabled)').first).to_be_in_viewport()
                self.passed('Narrow Wheels navigation brings its controls into view')
            self.clean(events)

    async def wheel_crops(self):
        async with self.page(dpr=2) as (_, page, events):
            await self.open(page)
            for wheel in ['sr-01', 'te37']:
                if wheel == 'te37':
                    await self.select(page, wheel=wheel)
                await self.ready(page, 'blue:' + wheel)
                for axle, clip in [('rear', {'x':450,'y':410,'width':140,'height':175}), ('front', {'x':775,'y':405,'width':160,'height':220})]:
                    await self.screenshot(page, f'{wheel}-{axle}-arch-2x.jpg', clip=clip)
            self.clean(events)

    async def race(self, cancel=False):
        async with self.page() as (context, page, events):
            await self.open(page)
            await self.ready(page, 'blue:sr-01')
            payload = await context.request.get(self.base_url + '/assets/scene/black-sr-01.png')
            self.check(payload.status == 200, 'Race test has a real black-car image response')
            body = await payload.body()
            held, release, delivered = asyncio.Event(), asyncio.Event(), asyncio.Event()

            async def delayed(route):
                held.set()
                await release.wait()
                await route.fulfill(status=200, content_type='image/png', body=body)
                delivered.set()

            await page.route('**/assets/scene/black-sr-01.png', delayed)
            try:
                await self.select(page, paint='black')
                await asyncio.wait_for(held.wait(), timeout=10)
                await self.attribute(page, '#scene', 'aria-busy', 'true', 'A delayed preview reports a loading state')
                await expect(page.locator('#apply-button')).to_be_disabled()
                self.passed('Apply is disabled while artwork is loading')
                await page.locator('#apply-button').dispatch_event('click')
                await self.text(page, '#balance', '$ 48,320', 'A loading preview cannot spend credits')
                if cancel:
                    await page.locator('#cancel-preview').click()
                    await self.ready(page, 'blue:sr-01')
                    expected_paint = 'blue'
                else:
                    await self.select(page, paint='mint')
                    await self.ready(page, 'mint:sr-01')
                    expected_paint = 'mint'
                release.set()
                await asyncio.wait_for(delivered.wait(), timeout=10)
                # Deliberately allow the stale response's load event to run; this is
                # the race-under-test, rather than a fixed-delay readiness check.
                await page.wait_for_timeout(700)
                await self.ready(page, expected_paint + ':sr-01')
                await self.controls(page, 'sr-01', expected_paint, 'paint')
                await self.text(page, '#balance', '$ 48,320', 'An out-of-order image response does not charge credits')
                self.passed('A stale black image cannot replace the later selection or cancelled preview')
                self.clean(events)
            finally:
                release.set()
                await page.unroute('**/assets/scene/black-sr-01.png', delayed)

    async def initial_asset_failure(self, asset):
        async with self.page(expected_network_failures=True) as (_, page, events):
            pattern = '**/assets/scene/' + asset

            async def abort(route):
                await route.abort('failed')

            await page.route(pattern, abort)
            await self.open(page)
            await expect(page.locator('#scene-notice')).to_be_visible()
            await expect(page.locator('#apply-button')).to_be_disabled()
            self.passed('Missing initial scene artwork visibly blocks purchases')
            await page.locator('#apply-button').dispatch_event('click')
            await self.text(page, '#balance', '$ 48,320', 'A missing initial asset cannot debit credits')
            self.check(bool(events['failed_requests']), 'The test actually blocked its target image')
            await self.screenshot(page, 'error-' + asset.replace('.png', '.jpg'))
            await page.unroute(pattern, abort)
            await page.locator('#scene-retry').click()
            await self.ready(page, 'blue:sr-01')
            await expect(page.locator('#apply-button')).to_be_enabled()
            self.passed('Retry recovers after the failed asset becomes available')
            self.clean(events)

    async def alternate_failure(self):
        async with self.page(expected_network_failures=True) as (_, page, events):
            await self.open(page)
            await self.ready(page, 'blue:sr-01')

            async def abort(route):
                await route.abort('failed')

            await page.route('**/assets/scene/black-sr-01.png', abort)
            await self.select(page, paint='black')
            await expect(page.locator('#toast')).to_contain_text('Your previous look has been kept.')
            await self.ready(page, 'blue:sr-01')
            await self.controls(page, 'sr-01', 'blue', 'paint')
            await self.text(page, '#total-price', '$ 3,700', 'Failed alternative preview restores the prior quote')
            await self.text(page, '#balance', '$ 48,320', 'Failed alternative preview preserves credits')
            self.check(bool(events['failed_requests']), 'The test actually aborted the alternative image')
            self.clean(events)

    async def run_case(self, name, action):
        self.current_case = name
        start = len(self.assertions)
        print('RUN ' + name, flush=True)
        try:
            await action()
        except Exception as error:
            self.cases.append({'name': name, 'status': 'failed', 'assertions_passed': len(self.assertions) - start, 'error': str(error), 'traceback': traceback.format_exc()})
            print('FAIL ' + name + ': ' + str(error), flush=True)
        else:
            self.cases.append({'name': name, 'status': 'passed', 'assertions_passed': len(self.assertions) - start})
            print('PASS ' + name, flush=True)

    async def run(self):
        for name, action in [
            ('six-variants-and-controls', self.variants_and_controls),
            ('purchases-cancel-reload-reset', self.purchases_and_persistence),
            ('product-details-accessibility', self.product_details),
            ('viewport-1366', lambda: self.viewport(1366, 768)),
            ('viewport-1920', lambda: self.viewport(1920, 1080)),
            ('viewport-phone', lambda: self.viewport(390, 844, mobile=True)),
            ('wheel-arches-2x', self.wheel_crops),
            ('out-of-order-black-then-mint', self.race),
            ('cancel-delayed-black', lambda: self.race(cancel=True)),
            ('initial-car-failure-and-retry', lambda: self.initial_asset_failure('blue-sr-01.png')),
            ('initial-garage-failure-and-retry', lambda: self.initial_asset_failure('garage-plate.png')),
            ('alternate-image-failure-fallback', self.alternate_failure),
        ]:
            await self.run_case(name, action)
        result = {
            'generated_at_utc': datetime.now(timezone.utc).isoformat(),
            'base_url': self.base_url,
            'case_count': len(self.cases),
            'passed': sum(case['status'] == 'passed' for case in self.cases),
            'failed': sum(case['status'] == 'failed' for case in self.cases),
            'assertions_passed': len(self.assertions),
            'cases': self.cases,
            'assertions': self.assertions,
            'screenshots': self.screenshots,
            'browser_observations': self.observations,
            'visual_acceptance': 'Screenshots require independent visual review; passing behavior tests do not prove artwork fidelity.',
        }
        (self.output / 'browser-results.json').write_text(json.dumps(result, indent=2))
        print(json.dumps({key: result[key] for key in ['case_count', 'passed', 'failed', 'assertions_passed']}, indent=2), flush=True)
        return result['failed']


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:4173')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'qa/current')
    args = parser.parse_args()
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        try:
            failures = await BrowserSuite(browser, args.base_url, args.output).run()
        finally:
            await browser.close()
    raise SystemExit(1 if failures else 0)


if __name__ == '__main__':
    asyncio.run(main())
