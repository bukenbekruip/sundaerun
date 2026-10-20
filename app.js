(() => {
  'use strict';
  // Coordinates are locked to the approved 1672x941 scene; no image resizing or guessed axle positions.
  const WIDTH = 1672, HEIGHT = 941;
  const wheels = [
    {id:'sr-01', name:'Sundae Run SR-01', cost:2500},
    {id:'te37', name:'Rays TE37', cost:2800},
    {id:'bbs-lm', name:'BBS LM', cost:2800},
    {id:'oz', name:'OZ Ultraleggera', cost:2800},
    {id:'rotiform', name:'Rotiform TUF-R', cost:2400},
    {id:'work', name:'Work Meister S1', cost:2600},
  ];
  const paints = [
    {id:'white',name:'Pearl White'},{id:'silver',name:'Glacier Silver'},
    {id:'grey',name:'Graphite Grey'},{id:'black',name:'Onyx Black'},
    {id:'red',name:'Cherry Red'},{id:'orange',name:'Sunset Orange'},
    {id:'white',name:'Glacier White'},{id:'blue',name:'WR Blue Pearl'},
    {id:'purple',name:'Midnight Violet'},{id:'pink',name:'Cherry Blossom'},
    {id:'yellow',name:'Sundae Yellow'},{id:'mint',name:'Mint Coast'}
  ];
  const finishes = {solid:{label:'Solid Finish',cost:1200},metallic:{label:'Metallic Finish',cost:1750},special:{label:'Special Finish',cost:2600}};
  const initial = {balance:48320, wheel:'sr-01', paint:'blue', paintSlot:7, finish:'solid', purchased:[], category:'tyres', xp:1820};
  let stored;
  try {stored=JSON.parse(localStorage.getItem('sundae-run-sti-v1')||'null');} catch {stored=null;}
  let state={...initial,...(stored&&typeof stored==='object'?stored:{})};
  if (!Array.isArray(state.purchased)) state.purchased=[];
  if (!wheels.some(w=>w.id===state.wheel))state.wheel='sr-01';
  if (!paints.some(p=>p.id===state.paint))state.paint='blue';
  if (!finishes[state.finish])state.finish='solid';
  const assetUrl=(path)=>window.__SUNDAE_ASSETS__?.[path]||path;
  const $=(q)=>document.querySelector(q), $$=(q)=>Array.from(document.querySelectorAll(q));
  const stage=$('#stage');
  let toastTimer;
  const money=n=>'$ '+Math.round(n).toLocaleString('en-US');
  const save=()=>{try{localStorage.setItem('sundae-run-sti-v1',JSON.stringify(state));}catch{}};
  function fit(){const s=Math.min(innerWidth/WIDTH, innerHeight/HEIGHT);stage.style.transform=`scale(${s})`;stage.style.left=`${(innerWidth-WIDTH*s)/2}px`;stage.style.top=`${(innerHeight-HEIGHT*s)/2}px`;}
  addEventListener('resize',fit);fit();
  const productIndex=()=>wheels.findIndex(w=>w.id===state.wheel);
  const paintIndex=()=>Number.isInteger(state.paintSlot)&&paints[state.paintSlot]?.id===state.paint?state.paintSlot:paints.findIndex(p=>p.id===state.paint);
  const wheelCost=()=>wheels[productIndex()].cost;
  const paintCost=()=>finishes[state.finish].cost;
  const keyWheel=()=>`w:${state.wheel}`;
  const keyPaint=()=>`p:${state.paint}:${state.finish}`;
  function total(){return (state.purchased.includes(keyWheel())?0:wheelCost())+(state.purchased.includes(keyPaint())?0:paintCost());}
  function announce(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2700);}
  function render(){
    const paint=$('#paint-layer');
    if(state.paint==='blue'){paint.removeAttribute('src');paint.style.display='none';}
    else {paint.src=assetUrl(`./assets/paint-${state.paint}.webp`);paint.style.display='block';}
    const wheel=$('#wheel-layer');
    if(state.wheel==='sr-01'){wheel.removeAttribute('src');wheel.style.display='none';}
    else {wheel.src=assetUrl(`./assets/wheels-${state.wheel}.webp`);wheel.style.display='block';}
    $$('.wheel-product').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wheel===state.wheel)));
    const idx=productIndex();
    const outline=$('#wheel-outline');
    outline.style.left=`${74+idx*149.5}px`;
    $('#wheel-check').style.left=`${175+idx*149.5}px`;
    $('#wheel-check').style.zIndex=14;
    outline.classList.toggle('active',idx!==0);
    $('#ui-wheel-reset').classList.toggle('visible',idx!==0);
    $$('.swatches button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===paintIndex())));
    const pi=paintIndex(), swatch=$('#swatch-outline');
    swatch.style.left=`${1006+(pi%6)*59}px`;swatch.style.top=`${728+Math.floor(pi/6)*51}px`;
    $('#paint-check').style.left=`${1038+(pi%6)*59}px`;
    $('#paint-check').style.top=`${779+Math.floor(pi/6)*51}px`;
    swatch.classList.toggle('active',pi!==7);
    $('#ui-paint-reset').classList.toggle('visible',pi!==7);
    $$('.paint-finishes button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.finish===state.finish)));
    $('.paint-detail').classList.toggle('modified',state.paint!=='blue'||state.finish!=='solid');
    $('#paint-name').textContent=paints[pi].name;
    $('#finish-label').textContent=finishes[state.finish].label;
    $('#paint-price').textContent=money(state.purchased.includes(keyPaint())?0:paintCost());
    $('#total-price').textContent=money(total());
    $('.summary-card').classList.toggle('modified',total()!==3700);
    $('#apply-label').textContent=total()===0?'Already Fitted':'Apply Changes';
    $('#money-readout').textContent=money(state.balance);
    $('#money-readout').classList.toggle('modified',state.balance!==48320);
    $('#apply-button').classList.toggle('purchased',total()===0);
    $$('.category').forEach(b=>b.classList.toggle('current',b.dataset.category===state.category));
    save();
  }
  $$('.wheel-product').forEach(btn=>btn.addEventListener('click',()=>{state.wheel=btn.dataset.wheel;state.category='wheels';render();announce(`${wheels[productIndex()].name} · ${money(wheelCost())}`);}));
  $$('.swatches button').forEach((btn,i)=>btn.addEventListener('click',()=>{state.paint=paints[i].id;state.paintSlot=i;state.category='paint';render();announce(`${paints[i].name} preview selected`);}));
  $$('.paint-finishes button').forEach(btn=>btn.addEventListener('click',()=>{state.finish=btn.dataset.finish;state.category='paint';render();announce(`${finishes[state.finish].label} · preview finish is illustrative`);}));
  $$('.category').forEach(btn=>btn.addEventListener('click',()=>{
    state.category=btn.dataset.category;render();
    if(state.category==='wheels')announce('Choose your wheels from the bottom menu');
    else if(state.category==='paint')announce('Choose a paint colour from the bottom menu');
    else if(state.category==='tyres')announce('Tyre customisation needs separate sidewall artwork — coming later');
    else if(state.category==='suspension')announce('Suspension animation needs separated car artwork — coming later');
    else announce('Body kits need alternate car renders — coming later');
  }));
  $$('.wheel-arrow').forEach(btn=>btn.addEventListener('click',()=>{const move=btn.classList.contains('wheel-arrow-left')?-1:1;state.wheel=wheels[(productIndex()+move+wheels.length)%wheels.length].id;state.category='wheels';render();}));
  $$('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    const mode=btn.dataset.mode;
    $$('[data-mode]').forEach(other=>other.setAttribute('aria-selected',String(other.dataset.mode===mode)));
    if(mode==='tyres')announce('Tyre visual swaps are not available in this first page');
    else announce('Choose a rim to preview it on the STI');
  }));
  $('#apply-button').addEventListener('click',()=>{
    const charge=total();
    if(!charge){announce('Those upgrades are already fitted. Try a new colour or wheel!');return;}
    if(charge>state.balance){announce('Not enough garage credits for those upgrades');return;}
    state.balance-=charge;
    if(!state.purchased.includes(keyWheel()))state.purchased.push(keyWheel());
    if(!state.purchased.includes(keyPaint()))state.purchased.push(keyPaint());
    render();announce(`Upgrades fitted! ${money(charge)} spent`);
  });
  function showDialog(title,message,reset=false){$('#dialog-title').textContent=title;$('#dialog-message').textContent=message;$('#reset-button').hidden=!reset;$('#dialog').hidden=false;$('#dialog-close').focus();}
  $('#settings-button').addEventListener('click',()=>showDialog('Garage Settings','This is the first playable STI customisation screen. Changes save automatically in your browser. To start over, use the Reset Progress button below.',true));
  $('#money-plus').addEventListener('click',()=>showDialog('Garage Credits','Credits will be earned through customer jobs in the garage game. This page demonstrates customisation and checkout using fictional starting credits.'));
  $('#dialog-close').addEventListener('click',()=>{$('#dialog').hidden=true;});
  $('#reset-button').addEventListener('click',()=>{state={...initial,purchased:[]};render();$('#dialog').hidden=true;announce('Garage customisation reset');});
  $('#dialog').addEventListener('click',e=>{if(e.target.id==='dialog')$('#dialog').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#dialog').hidden=true;});
  render();
})();
