"""Package the exact verified six-car/cabin/steering release, retaining earlier evidence."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1];qa=root/'qa/rs3-interiors'
html=root/'dist/OPEN-SUNDAE-RUN.html';archive=root/'downloads/Sundae-Run-Playable.zip'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
reports={
 'interiors_native':'native/interior-results.json',
 'interiors_portable':'portable/interior-results.json',
 'sound_native':'sound-native/sound-results.json',
 'sound_portable':'sound-portable/sound-results.json',
 'exterior_native':'exterior-native/exterior-results.json',
 'exterior_portable':'exterior-portable/exterior-results.json',
 'club_native':'club-native/club-results.json',
 'club_portable':'club-portable/club-results.json',
 'legacy_renderers':'legacy-renderers/expansion-results.json',
 'website':'website/website-results.json',
 'offline_audio':'audio/offline-results.json',
 'image_failures':'image-failures/expansion-results.json',
}
results={name:json.loads((qa/file).read_text()) for name,file in reports.items()}
for name,data in results.items():
 assert data.get('status')=='passed',f'Unpassed report: {name}'
 if name.endswith('portable'):assert data['artifact_sha256']==sha(html),f'Artifact changed after {name}'
assert 'ℹ pass 48' in (qa/'node-results.txt').read_text()
assert len(results['offline_audio']['renders'])==48
frozen=json.loads((qa/'build-provenance.json').read_text())
assert frozen['portable_sha256']==sha(html)
for file,digest in frozen['source_sha256'].items():assert sha(root/file)==digest,f'Source changed after QA: {file}'
# The existing five cars' 60 distributed artwork assets must remain byte-identical.
preservation=json.loads((qa/'preserved-assets.json').read_text())
assert preservation['status']=='passed' and len(preservation['assets'])==60
for file,digest in preservation['assets'].items():assert sha(root/file)==digest,file
assert len(results['interiors_native']['previews'])==len(set(results['interiors_native']['previews']))==72
assert len(results['interiors_portable']['previews'])==len(set(results['interiors_portable']['previews']))==72
assert len(results['exterior_native']['paint_combinations'])==72
assert len(results['exterior_native']['mechanical_combinations'])==27
assert len(results['exterior_native']['maximum_combinations'])==12
instructions='''SUNDAE RUN GARAGE — SIX CARS, FOUR CABINS & INDEPENDENT STEERING

1. Extract this ZIP completely.
2. Open OPEN-SUNDAE-RUN.html in Chrome or Edge. No Node.js is needed.
3. Choose a car, preview exterior parts, then Apply to fit them.
4. Use Interior, Performance or Sound directly in the main menu.
   On phones all eight modification categories are visible in two rows.
5. Use BUILD CLUB for saved builds, credit briefs and sharing.

STI / Porsche 911 GT3 RS / Toyota 86 / BMW M3 E46 / Golf Mk7 GTI / Audi RS3 8Y Sportback
Six rims, twelve paints, three tyre packages, three suspension settings
and original/street/track bodywork for every car. Each model also has
four cabin packages: Original (included), Sundae Club (1800 credits),
Heritage tan (2300) and Track Alcantara (2600).
Interior > Steering wheel offers Factory (included), Alcantara sport (900)
and Carbon performance (1600). Steering is a separate per-car purchase,
with a close-up preview. Hub, airbag illustration and controls are retained.
Owned refits are free. Cabin show cards include the fitted steering finish.

ENGINE SOUNDS
Sound > Start engine, then Hold to rev or use the throttle slider.
Every car has its own sample-assisted engine concept, including the RS3
turbo inline-five. These are not authenticated model recordings. The
pressure-pulse revision removes the old continuous sine whistle and adds
combustion variation, filtered boost rush and a CC0 mechanical texture. Intake and exhaust change the tone; tunes change rev response.
Performance > Listen is a free four-second audition; only Fit uses credits.
The preview restores your fitted sound and stops if the engine was off.
Volume is remembered, but sound never starts automatically after reload.
Sound stops when the page is hidden. No audio downloads are required.

Save a named fitted build, complete matching one-time briefs for credits
and XP, then share an SR1 code or download a PNG show card. Imported
builds preview the exterior; they never give free purchases or money.

Progress stays in this browser. Keep the same file location/browser to
retain your save. Settings offers a confirmed reset of the local garage.
Cabins are illustrated left-hand-drive concepts with coordinated packages,
not independently selectable physical seats/knobs/mats. No live retailer
or affiliate offers are configured. Ratings, RPM limits and credits are
game concepts; real fitment and performance specifications are unverified.

The website link opens the hosted brand website when online:
https://bukenbekruip.github.io/sundaerun/website/
Clothing and signup remain previews without checkout/email services.

Offline browser proof used HTTP with every extra request blocked.
Direct file:// navigation is untested under this cloud browser's policy.
'''
temporary=archive.with_suffix('.zip.tmp')
with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 z.write(html,'OPEN-SUNDAE-RUN.html');z.writestr('START-HERE.txt',instructions)
 z.write(root/'node_modules/@fontsource-variable/inter/LICENSE','INTER-FONT-LICENSE.txt')
 z.write(root/'public/licenses/CarEngines-CC0.txt','ENGINE-TEXTURE-CC0-LICENSE.txt')
with zipfile.ZipFile(temporary) as z:
 assert z.testzip() is None and z.read('OPEN-SUNDAE-RUN.html')==html.read_bytes()
assert temporary.stat().st_size<100*1024*1024
temporary.replace(archive)
def info(p):return {'file':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':sha(p)}
source=['app.js','index.html',*(str(p.relative_to(root)) for p in sorted((root/'src').glob('*')) if p.is_file()),'scripts/build-standalone.mjs','tests/sound-browser.py','tests/engine-offline.py','tests/engine.test.js','tests/standalone-scanner.test.js','tests/rs3-interior-browser.py','tests/steering.test.js','docs/ENGINE_AUDIO_SOURCES.json','scripts/package-playable.py']
record={'edition':'Audi RS3 Sportback, four cabin packages, independent steering and sample-assisted sound','release_date':'2026-10-21','portable_html':info(html),'download_zip':info(archive),'archive_integrity':'CRC and exact embedded HTML verified','runtime_images':92,'vehicles':['sti','porsche','gt86','m3','golf','rs3'],'cabin_prices':{'stock':0,'club':1800,'heritage':2300,'track':2600},'steering_prices':{'stock':0,'alcantara':900,'carbon':1600},'pending':['authenticated model-specific engine recordings','full aftermarket steering wheel shapes','independent seat/knob/mat options and right-hand-drive cabins','real retailer and affiliate offers with verified fitment'],'node_tests_passed':48,'audio':'Sample-assisted Web Audio concepts, including CC0 mechanical residual; no authenticated model recordings, measured engine specs or autoplay.','audio_renders':48,'reports':{name:{'file':file,'sha256':sha(qa/file),'checks':data.get('passed_checks',data.get('checks') if isinstance(data.get('checks'),int) else len(data.get('renders',[])))} for name,file in reports.items() for data in [results[name]]},'previous_release':info(root/'qa/sound-navigation/release.json'),'preserved_artwork_assets':60,'cabin_steering_previews_per_artifact':72,'source_sha256':{p:sha(root/p) for p in source},'file_protocol':'Not tested: managed Chromium blocks file://; portable proof uses HTTP with all extra requests blocked.','public_deployment':'Automatic Pages workflow retained. Latest live deployment could not be verified from this environment.'}
(qa/'release.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:record[k] for k in ('edition','portable_html','download_zip','node_tests_passed','audio_renders')},indent=2))
