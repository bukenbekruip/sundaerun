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
from urllib.parse import urlsplit, urlunsplit

from playwright.sync_api import sync_playwright, expect


PROJECT = Path(__file__).resolve().parents[1]
DEFAULT_URL = 'http://127.0.0.1:4173/OPEN-SUNDAE-RUN.html'


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
    parser.add_argument('--output', type=Path, default=PROJECT / 'qa/current')
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
        'screenshots': [],
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

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=args.chromium, headless=True, args=['--no-sandbox'],
            )
            context = browser.new_context(viewport={'width': 1672, 'height': 941})
            page = context.new_page()
            page.set_default_timeout(12000)

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
            check(0 < result['artifact_bytes'] < 32 * 1024 * 1024, 'Loaded portable artifact is below 32 MiB')
            local_artifact = PROJECT / 'dist/OPEN-SUNDAE-RUN.html'
            if local_artifact.is_file():
                result['local_artifact_sha256'] = hashlib.sha256(local_artifact.read_bytes()).hexdigest()
                result['local_artifact_bytes'] = local_artifact.stat().st_size
            expect(page).to_have_title('Sundae Run Garage — STI Customisation')
            check(True, 'Portable game has the intended page title')
            ready(page, 'blue:sr-01')
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
            check(result['embedded_image_map_count'] >= 14, 'Runtime lookup map contains all scene and wheel thumbnail families')
            page.mouse.move(1, 1)
            page.screenshot(path=str(args.output / 'portable-default.jpg'), type='jpeg', quality=88)
            result['screenshots'].append('portable-default.jpg')

            page.locator('.wheel-select[data-wheel="te37"]').click()
            ready(page, 'blue:te37')
            expect(page.locator('.wheel-select[data-wheel="te37"]')).to_have_attribute('aria-pressed', 'true')
            check(True, 'TE37 selection updates the native wheel control')
            text(page, '#total-price', '$ 4,000', 'TE37 plus paint quote is 4000 credits')
            for paint in ('black', 'mint', 'blue'):
                page.locator(f'.paint-option[data-paint="{paint}"]').click()
                ready(page, f'{paint}:te37')
                expect(page.locator(f'.paint-option[data-paint="{paint}"]')).to_have_attribute('aria-pressed', 'true')
                check(True, f'{paint} paint selection updates its native control')

            page.locator('.wheel-select[data-wheel="sr-01"]').click()
            ready(page, 'blue:sr-01')
            text(page, '#total-price', '$ 3,700', 'Returning to the original blue build restores its 3700 quote')
            expect(page.locator('#apply-button')).to_be_enabled()
            page.locator('#apply-button').dblclick()
            text(page, '#balance', '$ 44,620', 'Double-clicking Apply debits the default build exactly once')
            text(page, '#total-price', '$ 0', 'Fitted default parts have no remaining charge')
            expect(page.locator('#apply-button')).to_be_disabled()
            check(True, 'Already fitted build disables repeated Apply')

            reload_response = page.reload(wait_until='networkidle')
            check(reload_response is not None and reload_response.status == 200, 'Artifact reload navigation is permitted by the network guard')
            ready(page, 'blue:sr-01')
            text(page, '#balance', '$ 44,620', 'Purchase balance persists after reload')
            text(page, '#total-price', '$ 0', 'Owned-parts pricing persists after reload')
            expect(page.locator('#apply-button')).to_be_disabled()
            check(True, 'Reload preserves the already-fitted Apply state')

            check(len(result['navigation_requests']) == 2, 'Only initial and reload artifact navigations were allowed')
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
