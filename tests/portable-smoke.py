#!/usr/bin/env python3
"""Exercise the portable HTML while blocking every other network request.

Build the game and portable artifact, start Vite preview on 4173, then run:
    python3 tests/portable-smoke.py

The managed Chromium policy blocks file:// navigation in this environment. This
test proves that the HTTP-served artifact needs zero additional network requests;
it does not claim that file:// navigation itself was tested successfully.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys
import traceback
from time import perf_counter
from urllib.parse import urlsplit, urlunsplit

from playwright.sync_api import sync_playwright, expect


PROJECT = Path(__file__).resolve().parents[1]
DEFAULT_URL = 'http://127.0.0.1:4173/OPEN-SUNDAE-RUN.html'
VEHICLES = ('sti', 'porsche', 'gt86')
WHEELS = ('sr-01', 'te37', 'bbs-lm', 'oz', 'rotiform', 'work')
PAINTS = ('blue', 'black', 'mint', 'white', 'silver', 'graphite', 'red', 'orange', 'purple', 'pink', 'yellow', 'teal')
PRICES = dict(zip(WHEELS, (2500, 2800, 2800, 2800, 2400, 2600)))
STORAGE_KEY = 'sundae-run-garage-v2'
PART_DEFAULTS = {'tyre': 'road', 'suspension': 'original', 'body': 'original'}
PART_CATEGORIES = {'tyre': 'tyres', 'suspension': 'suspension', 'body': 'body'}
PART_PRICES = {'tyre': {'road': 0, 'sport': 1600, 'track': 2400}, 'suspension': {'original': 0, 'sport': 2200, 'track': 3400}, 'body': {'original': 0, 'street': 2800, 'track': 4600}}
QUOTE_LABELS = ('Wheels', 'Paint', 'Tyres', 'Suspension', 'Body kit')


def variant_key(vehicle, wheel='sr-01', paint='blue', **parts):
    values = PART_DEFAULTS | parts
    key = f'{vehicle}:{paint}:{wheel}'
    if values != PART_DEFAULTS:
        key += ':' + ':'.join(values[kind] for kind in PART_DEFAULTS)
    return key



def summary_url(url):
    if url.startswith('data:'):
        return url.partition(',')[0] + ',…'
    return url


def portable_url(value):
    parsed = urlsplit(value)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        raise ValueError('Use an HTTP(S) preview origin or complete portable HTML URL.')
    path = parsed.path
    if not path.lower().endswith('.html'):
        path = path.rstrip('/') + '/OPEN-SUNDAE-RUN.html'
    return urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, ''))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default=DEFAULT_URL, help='Preview origin or complete portable HTML URL')
    parser.add_argument('--output', type=Path, default=PROJECT / 'qa/upgrades')
    parser.add_argument('--chromium', default=shutil.which('chromium') or '/usr/bin/chromium')
    args = parser.parse_args()
    target = portable_url(args.base_url)
    args.output.mkdir(parents=True, exist_ok=True)
    result = {
        'started_at_utc': datetime.now(timezone.utc).isoformat(),
        'target': target,
        'fresh_browser_context': True,
        'proof_scope': 'HTTP-served portable HTML with every other network request blocked',
        'file_protocol': 'Not tested: file:// navigation is blocked by managed Chromium policy.',
        'checks': [], 'navigation_requests': [], 'unexpected_requests': [],
        'failed_requests': [], 'http_errors': [], 'page_errors': [], 'console_errors': [],
        'screenshots': [], 'combinations': [], 'upgrade_combinations': [],
        'preview_timings_ms': [],
        'coverage_scope': '216 baseline paint combinations plus 18 representative upgraded builds; the browser suite covers all 486 blue mechanical builds.',
    }

    def check(condition, label, details=None):
        record = {'name': label, 'status': 'passed' if condition else 'failed'}
        if details is not None:
            record['details'] = details
        result['checks'].append(record)
        if not condition:
            raise AssertionError(label + (': ' + repr(details) if details is not None else ''))

    def text(page, selector, expected, label):
        expect(page.locator(selector)).to_have_text(expected)
        check(True, label)

    def ready(page, variant):
        page.wait_for_function("""variant => {
            const car = document.querySelector('#car-image');
            const garage = document.querySelector('#garage-image');
            return car && garage && car.dataset.variant === variant
                && car.complete && car.naturalWidth > 0 && car.currentSrc.startsWith('data:image/')
                && garage.complete && garage.naturalWidth > 0 && garage.currentSrc.startsWith('data:image/')
                && document.querySelector('#scene').getAttribute('aria-busy') === 'false';
        }""", arg=variant)
        expect(page.locator('#scene-notice')).to_be_hidden()
        check(True, f'{variant} car and garage load from embedded image data')

    def select(page, vehicle=None, wheel=None, paint=None, **parts):
        if vehicle is not None:
            page.locator(f'#vehicle-options [data-vehicle="{vehicle}"]').click(no_wait_after=True)
        if wheel is not None:
            if not page.locator(f'.wheel-select[data-wheel="{wheel}"]').is_visible():
                page.locator('.category-menu .category[data-category="wheels"]').click(no_wait_after=True)
            page.locator(f'.wheel-select[data-wheel="{wheel}"]').click(no_wait_after=True)
        for kind, value in parts.items():
            page.locator(f'.category-menu .category[data-category="{PART_CATEGORIES[kind]}"]').click(no_wait_after=True)
            page.locator(f'.part-select[data-part-kind="{kind}"][data-part="{value}"]').click(no_wait_after=True)
        if paint is not None:
            page.locator(f'.paint-option[data-paint="{paint}"]').click(no_wait_after=True)

    def five_controls(page, vehicle, wheel='sr-01', paint='blue', **parts):
        for selector in (f'#vehicle-options [data-vehicle="{vehicle}"]', f'.wheel-select[data-wheel="{wheel}"]', f'.paint-option[data-paint="{paint}"]'):
            expect(page.locator(selector)).to_have_attribute('aria-pressed', 'true')
        for kind, value in (PART_DEFAULTS | parts).items():
            expect(page.locator(f'.part-select[data-part-kind="{kind}"][data-part="{value}"]')).to_have_attribute('aria-pressed', 'true')
        labels = page.locator('#quote-items .quote-line > span').all_text_contents()
        check(tuple(labels) == QUOTE_LABELS, 'Portable checkout contains all five readable selection lines', labels)

    def quote(page, wheel='sr-01', **parts):
        parts = PART_DEFAULTS | parts
        expected = [f'$ {PRICES[wheel]:,}', '$ 1,200'] + [f'$ {PART_PRICES[kind][value]:,}' if PART_PRICES[kind][value] else 'Included' for kind, value in parts.items()]
        actual = page.locator('#quote-items .quote-line > strong').all_text_contents()
        check(actual == expected, 'All five offline quote lines show correct unowned prices', {'actual': actual, 'expected': expected})
        total = PRICES[wheel] + 1200 + sum(PART_PRICES[kind][value] for kind, value in parts.items())
        text(page, '#total-price', f'$ {total:,}', 'Portable quote charges every selected part exactly once')

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=args.chromium, headless=True, args=['--no-sandbox'],
            )
            context = browser.new_context(viewport={'width': 1672, 'height': 941})
            page = context.new_page()
            page.set_default_timeout(30000)
            # The self-contained document now embeds 69 MiB of artwork; allow
            # its parse/decode work; native UI assertions still use explicit readiness.
            page.set_default_navigation_timeout(60000)

            def guard(route):
                request = route.request
                details = {'url': summary_url(request.url), 'type': request.resource_type}
                if request.is_navigation_request() and request.resource_type == 'document' and request.url == target:
                    result['navigation_requests'].append(details)
                    route.continue_()
                else:
                    result['unexpected_requests'].append(details)
                    route.abort()

            context.route('**/*', guard)
            page.on('pageerror', lambda error: result['page_errors'].append(str(error)))
            page.on('console', lambda message: result['console_errors'].append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: result['failed_requests'].append({'url': summary_url(request.url), 'failure': request.failure}))
            page.on('response', lambda response: result['http_errors'].append({'url': summary_url(response.url), 'status': response.status}) if response.status >= 400 else None)

            response = page.goto(target, wait_until='networkidle')
            check(response is not None and response.status == 200, 'Portable artifact navigation responds HTTP 200')
            # Chromium may evict a 25+ MiB response body from its inspector cache.
            # Navigation Timing records its decoded size without another request.
            result['artifact_bytes'] = page.evaluate("performance.getEntriesByType('navigation')[0].decodedBodySize")
            check(0 < result['artifact_bytes'] < 96 * 1024 * 1024, 'Loaded portable artifact is below the 96 MiB build budget')
            local_artifact = PROJECT / 'dist/OPEN-SUNDAE-RUN.html'
            if local_artifact.is_file():
                result['local_artifact_sha256'] = hashlib.sha256(local_artifact.read_bytes()).hexdigest()
                result['local_artifact_bytes'] = local_artifact.stat().st_size
            expect(page).to_have_title('Sundae Run Garage — Customisation')
            check(True, 'Portable game has the intended page title')
            ready(page, 'sti:blue:sr-01')
            text(page, '#balance', '$ 48,320', 'Fresh context starts with 48320 credits')
            text(page, '#total-price', '$ 3,700', 'Default build quote is 3700 credits')

            page.evaluate('document.fonts.load(\'400 16px "Inter Variable"\', "Sundae Run Garage")')
            page.evaluate('document.fonts.ready')
            fonts = page.evaluate("""() => ({
                family: getComputedStyle(document.body).fontFamily,
                faces: [...document.fonts].map(font => ({family: font.family, status: font.status})),
                ready: document.fonts.check('400 16px "Inter Variable"')
            })""")
            result['fonts'] = fonts
            check(fonts['ready'] and 'Inter Variable' in fonts['family'] and any('Inter Variable' in face['family'] and face['status'] == 'loaded' for face in fonts['faces']), 'Bundled Inter font is loaded and used')

            page.wait_for_function("""() => [...document.images].filter(image => image.hasAttribute('src'))
                .every(image => image.complete && image.naturalWidth > 0 && image.currentSrc.startsWith('data:image/'))""")
            images = page.evaluate("""() => [...document.images].filter(image => image.hasAttribute('src')).map(image => ({
                id: image.id || null, embedded: image.currentSrc.startsWith('data:image/'),
                width: image.naturalWidth, height: image.naturalHeight
            }))""")
            result['default_images'] = images
            check(len(images) >= 9 and all(image['embedded'] for image in images), 'Scene, brand and all six wheel thumbnails load as embedded data images')
            result['embedded_image_map_count'] = page.evaluate('Object.keys(globalThis.__SUNDAE_INLINE_ASSETS__ ?? {}).length')
            check(result['embedded_image_map_count'] == 68, 'Runtime lookup map contains 30 base cars, two garage images, six wheel thumbnails, twenty upgrade skins and ten cabins')
            manifest = json.loads((PROJECT / 'public/assets/cars/manifest.json').read_text())
            expected_keys = {row['src'].removeprefix('./') for row in manifest['assets'].values()} | {'assets/scene/garage-plate.png', 'assets/scene/garage-logo.png'} | {f'assets/products/wheel-{wheel}.png' for wheel in WHEELS} | {f'assets/upgrades/{vehicle}/{kind}-{choice}.png' for vehicle in (*VEHICLES, 'm3', 'golf') for kind, choices in (('tyre', ('sport', 'track')), ('body', ('street', 'track'))) for choice in choices}
            expected_keys |= {f'assets/interiors/{vehicle}/{package}.webp' for vehicle in (*VEHICLES, 'm3', 'golf') for package in ('stock', 'club')}
            actual_keys = set(page.evaluate('Object.keys(globalThis.__SUNDAE_INLINE_ASSETS__)'))
            check(actual_keys == expected_keys, 'Every required base and upgrade image is embedded under its actual runtime key', sorted(actual_keys ^ expected_keys))
            page.mouse.move(1, 1)
            page.screenshot(path=str(args.output / 'portable-default.jpg'), type='jpeg', quality=88)
            result['screenshots'].append('portable-default.jpg')

            # Exercise every real UI combination with networking still blocked.
            # No synthetic variant keys or forced disabled controls count as proof.
            for vehicle in VEHICLES:
                page.locator(f'#vehicle-options [data-vehicle="{vehicle}"]').click(no_wait_after=True)
                ready(page, f'{vehicle}:blue:sr-01')
                check(page.locator('.wheel-select:not(:disabled)').count() == 6, f'{vehicle}: all six wheel previews are enabled offline')
                check(page.locator('.paint-option:not(:disabled)').count() == 12, f'{vehicle}: all twelve paints are enabled offline')
                for wheel in WHEELS:
                    page.locator(f'.wheel-select[data-wheel="{wheel}"]').click(no_wait_after=True)
                    for paint in PAINTS:
                        preview_started = perf_counter()
                        page.locator(f'.paint-option[data-paint="{paint}"]').click(no_wait_after=True)
                        key = f'{vehicle}:{paint}:{wheel}'
                        ready(page, key)
                        result['preview_timings_ms'].append({'variant':key,'milliseconds':round((perf_counter()-preview_started)*1000)})
                        expect(page.locator(f'.wheel-select[data-wheel="{wheel}"]')).to_have_attribute('aria-pressed', 'true')
                        expect(page.locator(f'.paint-option[data-paint="{paint}"]')).to_have_attribute('aria-pressed', 'true')
                        expect(page.locator(f'#vehicle-options [data-vehicle="{vehicle}"]')).to_have_attribute('aria-pressed', 'true')
                        five_controls(page, vehicle, wheel, paint)
                        check(True, key + ': all five native selections agree with embedded artwork')
                        text(page, '#balance', '$ 48,320', 'Offline previews never spend credits')
                        text(page, '#total-price', f'$ {PRICES[wheel] + 1200:,}', key + ': quote is correct')
                        result['combinations'].append(key)
                page.locator('.wheel-select[data-wheel="sr-01"]').click(no_wait_after=True)
                page.locator('.paint-option[data-paint="blue"]').click(no_wait_after=True)
                ready(page, f'{vehicle}:blue:sr-01')
                page.mouse.move(1, 1)
                name = f'portable-{vehicle}-default.jpg'
                page.screenshot(path=str(args.output / name), type='jpeg', quality=88)
                result['screenshots'].append(name)
            check(len(result['combinations']) == 216 and len(set(result['combinations'])) == 216, 'All 216 requested combinations work without external resources')

            # Bounded upgrade coverage adds all levels, each car, each rim, and
            # painted maximum builds without repeating the 486-case browser run.
            representatives = (
                ('road', 'sport', 'street'), ('sport', 'original', 'track'),
                ('track', 'track', 'original'), ('sport', 'sport', 'street'),
                ('track', 'original', 'track'), ('track', 'track', 'track'),
            )
            representative_paints = ('black', 'mint', 'white', 'red', 'yellow', 'teal')
            for vehicle in VEHICLES:
                select(page, vehicle=vehicle)
                for wheel, paint, values in zip(WHEELS, representative_paints, representatives):
                    parts = dict(zip(PART_DEFAULTS, values))
                    select(page, wheel=wheel, paint=paint, **parts)
                    key = variant_key(vehicle, wheel, paint, **parts)
                    ready(page, key); five_controls(page, vehicle, wheel, paint, **parts); quote(page, wheel, **parts)
                    text(page, '#balance', '$ 48,320', 'Representative offline upgrades remain free previews')
                    result['upgrade_combinations'].append(key)
                page.mouse.move(1, 1)
                name = f'portable-{vehicle}-maximum-upgrades.jpg'
                page.screenshot(path=str(args.output / name), type='jpeg', quality=88)
                result['screenshots'].append(name)
            check(len(result['upgrade_combinations']) == 18 and len(set(result['upgrade_combinations'])) == 18, 'Eighteen representative upgraded builds render with every other network request blocked')

            balance = 48320
            fitted = {}
            parts = {'tyre': 'track', 'suspension': 'track', 'body': 'track'}
            for vehicle, wheel, paint in zip(VEHICLES, ('te37', 'bbs-lm', 'oz'), ('black', 'mint', 'red')):
                select(page, vehicle=vehicle)
                ready(page, f'{vehicle}:blue:sr-01')
                text(page, '#total-price', '$ 3,700', f'{vehicle}: purchases on other cars do not grant parts')
                select(page, wheel=wheel, paint=paint, **parts)
                key = variant_key(vehicle, wheel, paint, **parts)
                ready(page, key); five_controls(page, vehicle, wheel, paint, **parts); quote(page, wheel, **parts)
                expect(page.locator('#apply-button')).to_be_enabled()
                page.locator('#apply-button').dblclick(no_wait_after=True)
                balance -= 14400
                text(page, '#balance', f'$ {balance:,}', f'{vehicle}: five parts charge exactly once on double-click')
                text(page, '#total-price', '$ 0', f'{vehicle}: all five fitted parts have no remaining charge')
                check(page.locator('#quote-items strong').all_text_contents() == ['Owned'] * 5, f'{vehicle}: all five paid parts are owned')
                expect(page.locator('#apply-button')).to_be_disabled()
                page.locator('#apply-button').dispatch_event('click')
                text(page, '#balance', f'$ {balance:,}', 'Repeated offline Apply cannot spend twice')
                select(page, **PART_DEFAULTS)
                ready(page, variant_key(vehicle, wheel, paint))
                text(page, '#total-price', '$ 0', 'Original upgrade parts remain included offline')
                page.locator('#cancel-preview').click(no_wait_after=True); ready(page, key)
                select(page, paint='purple'); ready(page, variant_key(vehicle, wheel, 'purple', **parts))
                reload_response = page.reload(wait_until='networkidle')
                check(reload_response is not None and reload_response.status == 200, 'Portable reload navigation is permitted by the network guard')
                ready(page, key); five_controls(page, vehicle, wheel, paint, **parts)
                text(page, '#balance', f'$ {balance:,}', f'{vehicle}: balance survives reload')
                text(page, '#total-price', '$ 0', f'{vehicle}: reload restores all five fitted parts, not the free preview')
                expect(page.locator('#apply-button')).to_be_disabled()
                fitted[vehicle] = {'wheel': wheel, 'paint': paint, **parts}
            saved = page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', STORAGE_KEY)
            check(saved['version'] == 4 and saved['balance'] == 5120, 'Portable schema 4 stores exact shared credits after three five-part purchases', saved)
            for vehicle, selection in fitted.items():
                select(page, vehicle=vehicle)
                ready(page, variant_key(vehicle, **selection))
                five_controls(page, vehicle, **selection)
                text(page, '#total-price', '$ 0', f'{vehicle}: switching restores its own five-part fitted build')
                text(page, '#balance', f'$ {balance:,}', 'Car switching never changes the shared balance')
                check(saved['garage'][vehicle]['applied'] == selection and len(saved['garage'][vehicle]['purchased']) == 5, f'{vehicle}: every fitted selection and its independent ownership is saved')
            result['coverage_counts'] = {'baseline_paint': len(result['combinations']), 'representative_upgrades': len(result['upgrade_combinations'])}
            check(len(result['navigation_requests']) == 4, 'Only initial and three explicit reload document navigations were allowed')
            check(not result['unexpected_requests'], 'Zero additional network requests were attempted', result['unexpected_requests'])
            check(not result['failed_requests'], 'Zero network requests failed', result['failed_requests'])
            check(not result['http_errors'], 'Zero HTTP error responses', result['http_errors'])
            check(not result['page_errors'], 'Zero uncaught browser exceptions', result['page_errors'])
            check(not result['console_errors'], 'Zero browser console errors', result['console_errors'])
            context.close()
            browser.close()
        result['status'] = 'passed'
    except Exception as error:
        result['status'] = 'failed'
        result['failure'] = str(error)
        result['traceback'] = traceback.format_exc()
        if not any(item['status'] == 'failed' for item in result['checks']):
            result['checks'].append({'name': 'Portable smoke execution', 'status': 'failed', 'details': str(error)})
    finally:
        result['finished_at_utc'] = datetime.now(timezone.utc).isoformat()
        result['passed_checks'] = sum(item['status'] == 'passed' for item in result['checks'])
        result['failed_checks'] = sum(item['status'] == 'failed' for item in result['checks'])
        (args.output / 'portable-results.json').write_text(json.dumps(result, indent=2) + '\n')

    print(json.dumps({
        'status': result['status'], 'passed_checks': result['passed_checks'],
        'failed_checks': result['failed_checks'], 'unexpected_requests': len(result['unexpected_requests']),
        'page_errors': len(result['page_errors']), 'console_errors': len(result['console_errors']),
        'artifact_bytes': result.get('artifact_bytes'), 'results': str(args.output / 'portable-results.json'),
        'failure': result.get('failure'),
    }, indent=2))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    sys.exit(main())
