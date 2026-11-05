/* The approved atmosphere runs on the home page; the query keeps its tuning panel. */
(() => {
  const ui = id => window.PortfolioLocale.ui(id);
  const showControls = new URLSearchParams(location.search).get('motion') === 'dust';
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'motion-preview.css?v=13';
  document.head.append(css);
  document.body.classList.add('dust-preview');
  const sunlight=document.createElement('img');
  sunlight.className='sunlight-field';sunlight.alt='';sunlight.setAttribute('aria-hidden','true');
  sunlight.src='assets/motion/morning-light.webp';sunlight.hidden=true;
  // Reuse the approved raster: ambient illumination and rays move independently.
  const sunlightAmbient=sunlight.cloneNode();
  sunlightAmbient.className='sunlight-field sunlight-ambient';sunlightAmbient.hidden=false;
  const sunlightWindow=document.createElement('div');sunlightWindow.className='sunlight-window';
  sunlightWindow.setAttribute('aria-hidden','true');sunlightWindow.hidden=true;sunlightWindow.append(sunlightAmbient,sunlight);
  document.body.prepend(sunlightWindow);
  const canvas = document.createElement('canvas');
  canvas.className = 'dust-field'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const panel = document.createElement('details');
  panel.className = 'motion-preview';
  panel.lang = 'ru';
  panel.innerHTML = `<summary>${ui('dustPreview')}</summary><div class="motion-preview-controls">
    <label>${ui('visibility')}<input aria-label="${ui('dustVisibility')}" type="range" min="0.5" max="1.8" step="0.1" value="1"></label>
    <label>${ui('speed')}<input aria-label="${ui('dustSpeed')}" type="range" min="0.5" max="2" step="0.1" value="1"></label>
    <div class="motion-preview-buttons"><button type="button" data-dust-compare aria-pressed="false">${ui('noEffect')}</button><button type="button" data-dust-pause aria-pressed="false">${ui('pause')}</button></div>
    <p data-dust-note>${ui('initialDustNote')}</p></div>`;
  panel.hidden = !showControls;
  document.body.append(panel);
  const [strengthInput, speedInput] = panel.querySelectorAll('input');
  const compare = panel.querySelector('[data-dust-compare]');
  const pause = panel.querySelector('[data-dust-pause]');
  const note = panel.querySelector('[data-dust-note]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, ratio = 1, clock = 0, last = 0, request = 0;
  let strength = 1, speed = 1, hidden = false, paused = false, visible = true;
  let particles = [], exclusions = [];
  let nextGlint = 1.8, glintStart = -10, glintIndex = -1, glintCount = 0;
  const glintDuration = 1.9;
  let nextFlash = 3.4, flashStart = -10, flashIndex = -1, flashCount = 0;
  const flashDuration = .32;
  const height = 360;
  const howVisual=document.querySelector('.how-visual');
  const howField=document.createElement('div');
  howField.className='how-particles';howField.setAttribute('aria-hidden','true');
  howVisual?.append(howField);
  let howVisible=false;
  const howMotes=[];
  // Quiet motes around the light. Keep a clear horizontal band around the label.
  for(let i=0;i<28;i++){
    const n=offset=>Math.abs(Math.sin((i+1)*127.1+offset*311.7)*43758.5453)%1;
    const angle=i/28*Math.PI*2;
    const x=50+Math.cos(angle)*(24+n(1)*19);
    let y=50+Math.sin(angle)*(23+n(2)*19);
    if(y>35&&y<66)y=y<50?32-n(3)*7:69+n(3)*7;
    const mote=document.createElement('span');
    const duration=14+n(4)*14;
    mote.style.cssText=`left:${x}%;top:${y}%;width:${1.7+n(5)*1.8}px;height:${1.7+n(5)*1.8}px;--dx:${5+n(6)*10}px;--dy:${7+n(7)*12}px;--mote-alpha:${.35+n(8)*.4};--mote-tint:${i%2?'#d0e1ff':'#ffd3e6'};animation-delay:${-n(9)*duration}s`;
    howField.append(mote);howMotes.push({mote,duration});
  }
  function syncHowParticles(){
    howField.hidden=hidden||!eligible();
    const active=howVisible&&!howField.hidden&&!paused&&!reduce.matches&&!document.hidden;
    howField.style.animationPlayState=active?'running':'paused';
    howField.dataset.state=active?'running':'paused';
    howField.style.setProperty('--particle-strength',strength);
    for(const {mote,duration} of howMotes)mote.style.animationDuration=`${duration/speed}s`;
  }
  if(howVisual)new IntersectionObserver(([entry])=>{howVisible=entry.isIntersecting;syncHowParticles();}).observe(howVisual);
  // Fixed seed keeps the on/off comparison reproducible; no layout randomness.
  let seed = 9217;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  const smooth = (a,b,x) => { const t = Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };

  // Small warm-neutral specks: depth comes from focus and speed, not halos.
  const sprites = Array.from({length:3}, (_,depth) => {
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
    const c = sprite.getContext('2d');
    const g = c.createRadialGradient(16,16,0,16,16,16);
    g.addColorStop(0,'rgba(248,239,226,1)');
    g.addColorStop(depth===0?.38:.12,`rgba(244,233,220,${depth===0?.8:.5})`);
    g.addColorStop(1,'rgba(244,233,220,0)');
    c.fillStyle=g;c.fillRect(0,0,32,32);return sprite;
  });
  const daylightMote=document.createElement('canvas');daylightMote.width=daylightMote.height=32;
  const daylightContext=daylightMote.getContext('2d');
  const daylightFill=daylightContext.createRadialGradient(16,16,0,16,16,16);
  daylightFill.addColorStop(0,'rgba(185,137,69,.7)');
  daylightFill.addColorStop(.3,'rgba(219,174,101,.4)');
  daylightFill.addColorStop(1,'rgba(239,207,145,0)');
  daylightContext.fillStyle=daylightFill;daylightContext.fillRect(0,0,32,32);
  const daylightGlint=document.createElement('canvas');daylightGlint.width=daylightGlint.height=64;
  const glintContext=daylightGlint.getContext('2d');
  const glintFill=glintContext.createRadialGradient(32,32,0,32,32,32);
  glintFill.addColorStop(0,'rgba(255,255,249,1)');
  glintFill.addColorStop(.17,'rgba(255,255,244,.95)');
  glintFill.addColorStop(.38,'rgba(248,216,150,.45)');
  glintFill.addColorStop(1,'rgba(248,216,150,0)');
  glintContext.fillStyle=glintFill;glintContext.fillRect(0,0,64,64);
  const whiteFlash=document.createElement('canvas');whiteFlash.width=whiteFlash.height=32;
  const flashContext=whiteFlash.getContext('2d');
  const flashFill=flashContext.createRadialGradient(16,16,0,16,16,16);
  flashFill.addColorStop(0,'rgba(255,255,255,1)');
  flashFill.addColorStop(.25,'rgba(255,255,255,.95)');
  flashFill.addColorStop(1,'rgba(255,255,255,0)');
  flashContext.fillStyle=flashFill;flashContext.fillRect(0,0,32,32);

  function resize() {
    width = document.documentElement.clientWidth;
    ratio = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(width*ratio);canvas.height = height*ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    seed = 9217;
    particles = Array.from({length:Math.round(Math.min(width,1600)/13)},()=>{
      const z = random(); const depth = z<.67?0:z<.94?1:2;
      return {x:random()*(width+120)-60,y:random()*330-20,phase:random()*Math.PI*2,
        depth,radius:depth===0?.55+random()*.55:depth===1?1.1+random()*.6:2+random(),
        velocity:.7+z*1.8,alpha:.24+random()*.42};
    });
    exclusions = [...document.querySelectorAll('.site-header .availability,.header-actions,.hero h1')].map(n=>{
      const b=n.getBoundingClientRect();return {left:b.left-12,right:b.right+12,top:b.top+scrollY-8,bottom:b.bottom+scrollY+8};
    });
    refresh();
  }
  function isDaylight(){return document.documentElement.dataset.theme!=='dark';}
  function eligible() { return width>600; }
  function paint() {
    ctx.clearRect(0,0,width,height);
    if(hidden || !eligible())return;
    const daylight=isDaylight();
    // Mostly quiet light, with a rounded crest about every 35 seconds.
    // Different drift periods prevent the whole field rocking as one rigid sheet.
    const lightClock=reduce.matches?0:clock;
    // A brighter first crest is already visible before the headline starts.
    // It relaxes into the existing slow breathing cycle without extending it.
    const sunCrest=reduce.matches?.18:Math.max(Math.pow(.5+.5*Math.sin(lightClock*.18-.9),2),.78*Math.exp(-lightClock/3.8));
    const raySway=Math.sin(lightClock*.24)*.32+Math.sin(lightClock*.11)*.14;
    sunlight.style.transform=`translate(${Math.sin(lightClock*.21)*Math.min(22,width*.018)}px,${Math.sin(lightClock*.15)*7}px) rotate(${raySway}deg) scale(${1.045+Math.sin(lightClock*.13)*.015})`;
    sunlight.style.opacity=String(Math.min(1,(.34+sunCrest*.38)*strength));
    const sunContrast=1.65+sunCrest*1.75;
    // Keep white neutral; deepen only the warm information already in the raster.
    sunlight.style.filter=`brightness(${(sunContrast+1)/(2*sunContrast)}) contrast(${sunContrast}) saturate(${1.04+sunCrest*.08})`;
    sunlightAmbient.style.transform=`translate(${Math.sin(lightClock*.09+1)*-12}px,${Math.sin(lightClock*.12)*4}px) scale(1.06)`;
    sunlightAmbient.style.opacity=String(Math.min(.65,(.28+Math.sin(lightClock*.14)*.06)*strength));
    sunlightAmbient.style.filter='brightness(.9) contrast(1.25) saturate(1.05)';
    const airClock=clock*(daylight?1.65:1);
    const frame = particles.map((p,index)=>{
      // Each particle follows a slow air current. Wrapping happens in the unlit margins.
      const x=((p.x+airClock*p.velocity+Math.sin(airClock*.13+p.phase)*9+60)%(width+120))-60;
      const y=((p.y+airClock*p.velocity*.22+Math.sin(airClock*.17+p.phase)*11+30)%360)-30;
      const light = Math.exp(-Math.pow((x-width*(daylight?.23:.53))/(width*(daylight?.48:.44)),2))*
        smooth(-8,32,y)*(1-smooth(daylight?120:95,daylight?230:285,y))*smooth(-20,50,x)*(1-smooth(width-50,width+20,x))*
        (daylight&&index%3!==0?0:1);
      const behindText = exclusions.some(b=>x>b.left&&x<b.right&&y>b.top&&y<b.bottom);
      return {p,x,y,light,behindText};
    });
    // One turning mote at a time, chosen only within the light and away from copy.
    // A separate sequence preserves the original seed, density and trajectories.
    if(!reduce.matches && clock>=nextGlint){
      const candidates=frame.map((item,index)=>({item,index})).filter(({item})=>item.light>.35&&!item.behindText&&item.p.depth<2);
      const choice=(Math.sin(++glintCount*127.1)*43758.5453)%1;
      glintIndex=candidates.length?candidates[Math.floor(Math.abs(choice)*candidates.length)].index:-1;
      glintStart=clock;
      nextGlint=clock+glintDuration+2.4+Math.abs(choice)*2.8;
    }
    const phase=Math.max(0,Math.min(1,(clock-glintStart)/glintDuration));
    const gleam=reduce.matches?0:Math.pow(Math.sin(Math.PI*phase),2);
    // A separate, rare white catchlight: quick onset, soft decay, never a strobe.
    if(!reduce.matches && clock>=nextFlash){
      const candidates=frame.map((item,index)=>({item,index})).filter(({item,index})=>
        item.light>.4&&!item.behindText&&item.p.depth<2&&index!==glintIndex);
      const choice=Math.abs((Math.sin(++flashCount*83.7)*19237.41)%1);
      flashIndex=candidates.length?candidates[Math.floor(choice*candidates.length)].index:-1;
      flashStart=clock;
      nextFlash=clock+6+choice*5;
    }
    const flashPhase=(clock-flashStart)/flashDuration;
    const flash=reduce.matches||flashPhase<0||flashPhase>1?0:
      smooth(0,.18,flashPhase)*(1-smooth(.18,1,flashPhase));
    for(const [index,{p,x,y,light,behindText}] of frame.entries()){
      const focus = p.depth===2?.28:p.depth===1?.55:1;
      const reflection=index===glintIndex&&!behindText?gleam:0;
      if(daylight){
        const size=(4.1+p.radius*1.1)*.75;
        ctx.globalAlpha=Math.min(.6,light*p.alpha*1.45*strength*(behindText?.06:1));
        ctx.drawImage(daylightMote,x-size/2,y-size/2,size,size);
        if(reflection>0){
          const glowSize=(10+reflection*3)*.75;
          ctx.globalAlpha=Math.min(1,light*reflection*strength);
          ctx.drawImage(daylightGlint,x-glowSize/2,y-glowSize/2,glowSize,glowSize);
        }
      }else{
        ctx.globalAlpha = Math.min(.85,light*(p.alpha*focus+reflection*.65)*strength*(behindText?.12:1));
        const size = p.radius*2.5*(1+reflection*.16);
        ctx.drawImage(sprites[p.depth],x-size/2,y-size/2,size,size);
      }
      if(index===flashIndex&&!behindText&&flash>0){
        const flashSize=daylight?5.25:5;
        ctx.globalAlpha=Math.min(1,flash*light*strength*1.5);
        ctx.drawImage(whiteFlash,x-flashSize/2,y-flashSize/2,flashSize,flashSize);
      }
    }
    ctx.globalAlpha=1;
  }
  function running(){return eligible()&&!hidden&&!paused&&!reduce.matches&&!document.hidden&&visible;}
  function tick(now){
    request=0;
    if(!running()){last=0;return;}
    window.PortfolioEffects?.sample(now);
    if(!last)last=now;
    if(now-last>=(window.PortfolioEffects?.interval(30)??1000/30)){clock+=Math.min((now-last)/1000,.1)*speed;last=now;paint();}
    request=requestAnimationFrame(tick);
  }
  function refresh(){
    document.body.dataset.motionPaused=String(paused);
    document.body.dataset.motionDisabled=String(hidden);
    cancelAnimationFrame(request);request=0;last=0;if(visible&&!document.hidden)paint();
    canvas.dataset.state=running()?'running':'paused';
    canvas.hidden=hidden||!eligible();
    sunlight.hidden=hidden||!eligible()||!isDaylight();
    sunlightWindow.hidden=sunlight.hidden;
    syncHowParticles();
    panel.querySelector('summary').textContent=isDaylight()?ui('lightPreview'):ui('dustPreview');
    note.textContent=width<=600?ui('widePreview'):reduce.matches?ui('reducedNote'):isDaylight()?ui('lightNote'):ui('darkNote');
    pause.disabled=reduce.matches;
    if(running())request=requestAnimationFrame(tick);
  }
  compare.addEventListener('click',()=>{hidden=!hidden;compare.setAttribute('aria-pressed',String(hidden));refresh();});
  pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?ui('resume'):ui('pause');refresh();});
  strengthInput.addEventListener('input',()=>{strength=Number(strengthInput.value);paint();syncHowParticles();});
  speedInput.addEventListener('input',()=>{speed=Number(speedInput.value);syncHowParticles();});
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refresh();}).observe(canvas);
  document.addEventListener('visibilitychange',refresh);
  document.addEventListener('portfolio:locale-changed',()=>{
    panel.lang=document.documentElement.lang;
    const labels=panel.querySelectorAll('label');
    labels[0].firstChild.textContent=ui('visibility');labels[1].firstChild.textContent=ui('speed');
    strengthInput.setAttribute('aria-label',ui('dustVisibility'));
    speedInput.setAttribute('aria-label',ui('dustSpeed'));
    compare.textContent=ui('noEffect');pause.textContent=paused?ui('resume'):ui('pause');
    const replay=panel.querySelector('.motion-preview-controls>button');
    if(replay)replay.textContent=ui('replay');
    refresh();
  });
  reduce.addEventListener('change',refresh);
  addEventListener('resize',resize);
  resize();document.fonts.ready.then(resize);
})();
