from pathlib import Path
import shutil,subprocess,hashlib,json
root=Path(__file__).resolve().parents[2];scratch=Path('/tmp/sundae-copy-proof');scratch.mkdir(exist_ok=True)
for name in ['app.js','package.json','vite.config.js','index.html']:shutil.copyfile(root/name,scratch/name)
shutil.copytree(root/'src',scratch/'src',dirs_exist_ok=True)
(scratch/'scripts').mkdir(exist_ok=True);shutil.copyfile(root/'scripts/build-standalone.mjs',scratch/'scripts/build-standalone.mjs')
for name in ['node_modules','public']:
 p=scratch/name
 if not p.exists():p.symlink_to(root/name,target_is_directory=True)
old='Fit your favourite parts in the garage, then give the build a name. Your first completed brief earns 1,500 credits.'
new='Fit your favourite parts in the garage, then give the build a name. The Make it yours brief earns 1,500 credits.'
p=scratch/'src/club-ui.js';s=p.read_text();assert new in s;p.write_text(s.replace(new,old))
oldlink='Explore Sundae Run · culture &amp; clothing ↗';newlink='Explore Sundae Run · culture &amp; clothing'
p=scratch/'index.html';s=p.read_text();assert newlink in s;p.write_text(s.replace(newlink,oldlink))
subprocess.run([str(scratch/'node_modules/.bin/vite'),'build'],cwd=scratch,check=True,stdout=subprocess.DEVNULL)
subprocess.run(['node','scripts/build-standalone.mjs'],cwd=scratch,check=True,stdout=subprocess.DEVNULL)
before=(scratch/'dist/OPEN-SUNDAE-RUN.html').read_bytes();after=(root/'dist/OPEN-SUNDAE-RUN.html').read_bytes()
hashbytes=lambda data:hashlib.sha256(data).hexdigest()
assert hashbytes(before)=='6f0c4c08351e237b99a0d552eeb8866c4ba46bf0ed0ae296128011629ce580d2',hashbytes(before)
assert before.count(old.encode())==1 and before.count(oldlink.encode())==1
assert before.replace(old.encode(),new.encode()).replace(oldlink.encode(),newlink.encode())==after
record={'status':'passed','before_sha256':hashbytes(before),'after_sha256':hashbytes(after),'only_changes':[{'before':old,'after':new},{'before':oldlink,'after':newlink}],'normalised_portable_bytes_identical':True,'note':'The complete exterior portable matrix used the before artifact. Its entire byte difference from the final game is exactly these two UI text replacements; rendering/assets/masks are identical. Final five-car cabin and Club suites require the after artifact SHA.'}
(root/'qa/expansion/portable-copy-proof.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
