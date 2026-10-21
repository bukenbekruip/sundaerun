"""Package the passed Build Club portable artifact without changing its bytes."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
qa = root / 'qa/club'
html = root / 'dist/OPEN-SUNDAE-RUN.html'
archive = root / 'downloads/Sundae-Run-Playable.zip'
browser = json.loads((qa / 'club-results.json').read_text())
portable = json.loads((qa / 'portable/club-results.json').read_text())
assert browser['status'] == portable['status'] == 'passed'
assert portable['artifact_sha256'] == hashlib.sha256(html.read_bytes()).hexdigest()
instructions = '''SUNDAE RUN GARAGE — BUILD CLUB

1. Extract this ZIP completely.
2. Open OPEN-SUNDAE-RUN.html in Chrome or Edge.
3. Open BUILD CLUB in the garage header to save builds, earn challenge
   credits, fit performance parts, and create shareable photo cards.

The STI, Porsche 911 GT3 RS and Toyota 86 retain six rim concepts,
twelve paints, tyre packages, suspension settings and carbon kits.
Exterior previews are free. Apply uses fictional garage credits.
Each car owns its exterior and performance parts separately.
Save a named fitted build, then enter a matching Build brief to earn
a one-time reward. Share SR1 codes or download PNG show cards.
Friends can import exterior previews without receiving free purchases.

Progress, saved builds and completed briefs stay in this browser.
Keep the same file location/browser to retain an existing save.
Reset in settings clears the whole local garage after confirmation.

This is the first build-and-show milestone. BMW M3 E46, Golf Mk7 GTI,
interiors, online profiles and website integration are still pending.
Performance ratings are game values, not measured physical gains.
No real retailer/affiliate links or verified fitment are configured yet.

No Node.js installation is needed for this portable artifact.
Portable browser verification used HTTP delivery with every additional
request blocked. Direct file:// navigation remains untested under
the managed cloud-browser policy.
'''
temporary = archive.with_suffix('.zip.tmp')
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.write(html, 'OPEN-SUNDAE-RUN.html')
    z.writestr('START-HERE.txt', instructions)
    z.write(root / 'node_modules/@fontsource-variable/inter/LICENSE', 'INTER-FONT-LICENSE.txt')
with zipfile.ZipFile(temporary) as z:
    assert z.testzip() is None
    assert z.read('OPEN-SUNDAE-RUN.html') == html.read_bytes()
assert temporary.stat().st_size < 100 * 1024 * 1024
temporary.replace(archive)


def info(p):
    return {'file': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}


source = ['app.js', 'index.html', 'src/state.js', 'src/catalogue.js', 'src/scene.js',
          'src/ui.css', 'src/paint-renderer.js', 'src/upgrade-renderer.js', 'src/club.js',
          'src/club-ui.js', 'src/club.css', 'src/photography.js', 'tests/club.test.js', 'tests/club-browser.py']
record = {
    'edition': 'Build Club: first build-and-show milestone', 'release_date': '2026-10-21',
    'implemented_vehicles': ['Subaru WRX STI', 'Porsche 911 GT3 RS', 'Toyota 86'],
    'pending': ['BMW M3 E46', 'VW Golf Mk7 GTI', 'model-specific interiors', 'live retailer offers', 'online community', 'website integration'],
    'portable_html': info(html), 'download_zip': info(archive), 'archive_integrity': 'verified',
    'node_tests_passed': 34, 'browser_checks_passed': browser['passed_checks'],
    'portable_checks_passed': portable['passed_checks'],
    'source_sha256': {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in source},
    'coverage': 'Build Club transactions, persistence, first brief, real XP, performance purchases/refits, share/import isolation, PNG export for all three cars; desktop/tablet/phone layout down to 320px. Exterior renderers and assets are unchanged; previous exhaustive browser results remain historical.',
    'file_protocol': 'Not tested: managed Chromium blocks file://. Portable proof uses HTTP with all extra requests blocked.',
}
(qa / 'release.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
