"""Prepare the embedded CC0 mechanical residual. FFmpeg is only an authoring dependency."""
from pathlib import Path
import base64,hashlib,json,struct,subprocess
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'reference/audio/cc0-engine.wav'
raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(source),'-ac','1','-ar','22050','-f','f32le','-'])
samples=struct.unpack('<'+'f'*(len(raw)//4),raw)
low=0
for _ in range(2):
 residual=[]
 for x in samples:low=.79*low+.21*x;residual.append(x-low)
fade=512;tail=residual[-fade:];residual=residual[:-fade]
for i in range(fade):residual[i]=residual[i]*(i/fade)+tail[i]*(1-i/fade)
mean=sum(residual)/len(residual);residual=[x-mean for x in residual];peak=max(map(abs,residual))
pcm=bytes(max(0,min(255,round(x/(peak or 1)*117+128))) for x in residual)
encoded=base64.b64encode(pcm).decode()
(ROOT/'src/engine-texture.js').write_text('// CC0 engine recording residual. Source and processing: docs/ENGINE_AUDIO_SOURCES.json.\n// Uint8 PCM at 22050 Hz, centred at 128; embedded for offline playback.\nexport const ENGINE_TEXTURE_PCM = '+json.dumps(encoded)+';\n')
path=ROOT/'docs/ENGINE_AUDIO_SOURCES.json';record=json.loads(path.read_text());record.update({'original_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pcm_samples':len(pcm),'pcm_sha256':hashlib.sha256(pcm).hexdigest(),'authoring_script':'scripts/prepare-engine-texture.py','original_file':'reference/audio/cc0-engine.wav'});path.write_text(json.dumps(record,indent=2)+'\n')
