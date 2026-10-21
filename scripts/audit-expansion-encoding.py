"""Read-only provenance, dimensions and exact-alpha checks; never edits artwork."""
from pathlib import Path
import hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[1]
records=json.loads((root/'public/assets/expansion-sources.json').read_text());report=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for key,r in records.items():
 published=root/'public'/r['src'];assert sha(published)==r['sha256'],key+' published hash'
 original=root.parent/'generated_images'/r['sourceGeneratedOriginal']
 if original.is_file():assert sha(original)==r['sourceSha256'],key+' generated source hash'
 image=Image.open(published).convert('RGBA');item={'asset':key,'size':image.size,'published_sha256':sha(published),'generated_original_verified':original.is_file()}
 if 'portableSrc' in r:
  assert sha(published)==r['sourceSha256'],key+' original PNG preserved'
  encoded=root/'public'/r['portableSrc'];assert sha(encoded)==r['portableSha256'],key+' portable hash'
  compact=Image.open(encoded).convert('RGBA');assert image.size==compact.size,key+' dimensions'
  assert image.getchannel('A').tobytes()==compact.getchannel('A').tobytes(),key+' alpha'
  item.update({'portable_bytes':encoded.stat().st_size,'portable_sha256':sha(encoded),'every_alpha_value_identical':True})
 else:
  assert ':cabin:' in key and image.width>=1600 and image.height>=900
  item['cabin_bytes']=published.stat().st_size
 report.append(item)
assert len(report)==30 and sum('portable_bytes' in x for x in report)==20
out=root/'qa/expansion/encoding-integrity.json';out.write_text(json.dumps({'status':'passed','assets':report,'total_new_webp_bytes':sum(x.get('portable_bytes',x.get('cabin_bytes',0)) for x in report)},indent=2)+'\n')
print('30 published hashes verified; 20 compact exterior WebPs preserve every source alpha byte and dimension.')
