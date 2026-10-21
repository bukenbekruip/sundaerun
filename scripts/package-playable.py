"""Package the exact verified five-car/cabin portable game, retaining earlier evidence."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1];qa=root/'qa/expansion'
html=root/'dist/OPEN-SUNDAE-RUN.html';archive=root/'downloads/Sundae-Run-Playable.zip'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
reports={
 'cabins':'native-initial/expansion-results.json',
 'layouts':'layout/expansion-results.json',
 'legacy_renderers':'legacy-renderers-final/expansion-results.json',
 'image_failures':'failures/expansion-results.json',
 'initial_paint':'paint/browser-results.json',
 'final_m3_paint':'final-m3-paint/exterior-results.json',
 'mechanical':'mechanical-corrected/exterior-results.json',
 'maximum':'maximum/exterior-results.json',
 'golf_street_final':'final-golf-street/exterior-results.json',
 'portable_exterior':'portable-exterior/exterior-results.json',
 'portable_cabins':'portable-cabins/expansion-results.json',
 'club_regression':'club-regression/club-results.json',
 'portable_club_regression':'portable-club-regression/club-results.json',
 'website':'website/website-results.json',
}
results={name:json.loads((qa/file).read_text()) for name,file in reports.items()}
for name,data in results.items():
 assert data.get('status')=='passed' or (data.get('failed')==0 and data.get('passed')==data.get('case_count')),f'Unpassed report: {name}'
 if 'portable' in name:
  if name=='portable_exterior' and data['artifact_sha256']!=sha(html):
   proof=json.loads((qa/'portable-copy-proof.json').read_text())
   assert proof['status']=='passed' and proof['normalised_portable_bytes_identical']
   assert proof['before_sha256']==data['artifact_sha256'] and proof['after_sha256']==sha(html)
   assert len(proof['only_changes'])==2
   assert all('brief' in x['before'] or x['before'].startswith('Explore Sundae Run') for x in proof['only_changes'])
  else:assert data['artifact_sha256']==sha(html),f'Portable artifact changed after {name}'
assert 'ℹ pass 39' in (qa/'node-results.txt').read_text()
# Retain the final M3 mask rerun, plus Golf's unchanged first complete matrix.
paint=results['final_m3_paint']['paint_combinations']+[k for k in results['initial_paint']['combinations'] if k.startswith('golf:')]
expected={f'{v}:{p}:{w}' for v in ('m3','golf') for p in ('blue','black','mint','white','silver','graphite','red','orange','purple','pink','yellow','teal') for w in ('sr-01','te37','bbs-lm','oz','rotiform','work')}
assert len(paint)==len(set(paint))==144 and set(paint)==expected
coverage={'native_final_paint':paint,'native_mechanical':results['mechanical']['mechanical_combinations'],'native_maximum':results['maximum']['maximum_combinations'],'portable_paint':results['portable_exterior']['paint_combinations'],'portable_mechanical':results['portable_exterior']['mechanical_combinations'],'portable_maximum':results['portable_exterior']['maximum_combinations'],'note':'The initial M3 paint matrix is superseded by final-m3-paint; Golf masks did not change afterward. Availability enumeration of 9,720 keys is not browser coverage.'}
assert len(coverage['native_mechanical'])==54 and len(coverage['native_maximum'])==24
assert len(coverage['portable_paint'])==48 and len(coverage['portable_maximum'])==24
(qa/'coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
instructions='''SUNDAE RUN GARAGE — FIVE-CAR BUILD CLUB

1. Extract this ZIP completely.
2. Open OPEN-SUNDAE-RUN.html in Chrome or Edge.
3. Choose your car, preview parts, then Apply to fit them.
4. Open BUILD CLUB in the header for Interior, My builds, Build briefs,
   Performance and Import a build.

STI / Porsche 911 GT3 RS / Toyota 86 / BMW M3 E46 / Golf Mk7 GTI
Six rims, twelve paints, three tyre packages, three suspension settings
and original/street/track carbon bodywork for every car.
Each model has an Original cabin and a Sundae Club cabin concept.
Club cabins cost 1800 fictional credits per car. Previewing is free;
refitting owned or included parts is free. Performance parts are separate.

Save a named fitted build, complete matching one-time briefs for credits
and XP, then share an SR1 code or download a PNG show card. Imported
builds preview the exterior; they never give free purchases or money.

Progress stays in this browser. Keep the same file location/browser to
retain your save. Settings offers a confirmed reset of the local garage.
Cabins are illustrated left-hand-drive concepts with coordinated packages,
not independently selectable physical seats/knobs/mats. Exterior paint is
separate from cabin art. No live retailer/affiliate offers are configured.
Game ratings and credits are fictional; real fitment is unverified.

The website link opens the hosted brand website when online:
https://bukenbekruip.github.io/sundaerun/website/
Clothing and signup remain previews without checkout/email services.

No Node.js installation is needed for this download.
Offline browser proof used HTTP with every extra request blocked.
Direct file:// navigation is untested under this cloud browser's policy.
'''
temporary=archive.with_suffix('.zip.tmp')
with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 z.write(html,'OPEN-SUNDAE-RUN.html');z.writestr('START-HERE.txt',instructions)
 z.write(root/'node_modules/@fontsource-variable/inter/LICENSE','INTER-FONT-LICENSE.txt')
with zipfile.ZipFile(temporary) as z:
 assert z.testzip() is None and z.read('OPEN-SUNDAE-RUN.html')==html.read_bytes()
assert temporary.stat().st_size<100*1024*1024
temporary.replace(archive)
def info(p):return {'file':p.name,'bytes':p.stat().st_size,'sha256':sha(p)}
source=['app.js','index.html',*(str(p.relative_to(root)) for p in sorted((root/'src').glob('*')) if p.is_file()),'scripts/build-standalone.mjs','tests/expansion-browser.py','tests/expansion-exterior.py','tests/website-browser.py','tests/interiors.test.js']
record={'edition':'Five-car Build Club with model-specific cabins and brand website','release_date':'2026-10-21','implemented_vehicles':['Subaru WRX STI','Porsche 911 GT3 RS','Toyota 86','BMW M3 E46','Volkswagen Golf Mk7 GTI'],'cabin_packages':{'stock':0,'club':1800},'briefs_per_car':7,'pending':['independent interior accessories/right-hand-drive artwork','real retailer/affiliate offers and verified fitment','clothing checkout','online accounts/gallery/voting'],'portable_html':info(html),'download_zip':info(archive),'archive_integrity':'CRC and exact embedded HTML verified','runtime_images':68,'portable_copy_proof':info(qa/'portable-copy-proof.json'),'node_tests_passed':39,'reports':{name:{'file':file,'sha256':sha(qa/file),'checks':data.get('passed_checks',data.get('checks',data.get('assertions_passed')))} for name,file in reports.items() for data in [results[name]]},'coverage_counts':{k:len(v) for k,v in coverage.items() if isinstance(v,list)},'source_sha256':{p:sha(root/p) for p in source},'file_protocol':'Not tested: managed Chromium blocks file://; portable proof uses HTTP with all extra requests blocked.','public_deployment':'Automatic Pages workflow retained. Latest live deployment could not be verified from this environment.'}
(qa/'release.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:record[k] for k in ('edition','portable_html','download_zip','coverage_counts')},indent=2))
