"""Render the production Web Audio graph offline, and retain a stock/upgraded audition montage.
Run with Vite dev at --base-url so the authored source modules can be imported.
"""
import argparse,asyncio,base64,hashlib,json,struct,wave
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main(args):
 out=args.output;out.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page();await page.goto(args.base_url)
  data=await page.evaluate('''async () => {
    const {createEngineVoice}=await import('/src/engine-audio.js');
    const {engineCharacter}=await import('/src/engine-voices.js');
    const results=[];
    const recipes={stock:{},panel:{filter:'panel'},intake:{filter:'intake'},axle:{exhaust:'axle'},catback:{exhaust:'catback'},road:{tune:'road'},track:{tune:'track'},upgraded:{filter:'intake',exhaust:'catback',tune:'track'}};
    for(const car of ['sti','porsche','gt86','m3','golf']) for(const [grade,spec] of Object.entries(recipes)) {
      const ctx=new OfflineAudioContext(1,24000*2,24000), master=ctx.createGain();master.gain.value=.45;
      const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.ratio.value=5;compressor.connect(master).connect(ctx.destination);
      const voice=createEngineVoice(ctx,compressor,engineCharacter(car,spec));voice.update(3500,.65);
      const rendered=await ctx.startRendering(), s=rendered.getChannelData(0).slice(4800);
      let sum=0,peak=0,energy=0,roughness=0;
      for(let i=0;i<s.length;i++){sum+=s[i];peak=Math.max(peak,Math.abs(s[i]));energy+=s[i]**2;if(i)roughness+=(s[i]-s[i-1])**2;}
      const pcm=new Int16Array(s.length);for(let i=0;i<s.length;i++)pcm[i]=Math.round(Math.max(-1,Math.min(1,s[i]))*32767);
      let binary='';for(const n of new Uint8Array(pcm.buffer))binary+=String.fromCharCode(n);
      results.push({car,grade,rms:Math.sqrt(energy/s.length),peak,dc:sum/s.length,roughness:Math.sqrt(roughness/s.length),pcm:btoa(binary)});
    }
    return results;
  }''')
  await browser.close()
 pcm=[];results=[]
 for row in data:
  raw=base64.b64decode(row.pop('pcm'));row['pcm_sha256']=hashlib.sha256(raw).hexdigest()
  assert .008<row['rms']<.5 and row['peak']<.98 and abs(row['dc'])<.01,row
  if row['grade'] in ['stock','upgraded']:pcm.extend([raw,b'\0'*(24000//3*2)])
  results.append(row)
 for car in ['sti','porsche','gt86','m3','golf']:
  a,b=[x for x in results if x['car']==car and x['grade'] in ['stock','upgraded']]
  assert b['roughness']>a['roughness']*1.15,(car,'upgraded exhaust must add harmonic energy')
 assert len(set(x['pcm_sha256'] for x in results))==40
 path=out/'five-car-stock-upgraded.wav'
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(b''.join(pcm))
 report={'status':'passed','source':'Actual createEngineVoice graph in OfflineAudioContext; 3500 RPM, 65% load. Stock then intake/catback/track for STI, Porsche, 86, M3, Golf.','audition':path.name,'sample_rate':24000,'renders':results}
 (out/'offline-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:5173');p.add_argument('--output',type=Path,default=ROOT/'qa/sound-navigation/offline');asyncio.run(main(p.parse_args()))
