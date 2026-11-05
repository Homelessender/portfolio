(() => {
 const mode='candidate',isCandidate=true;
 const section=document.querySelector('.contact-section');if(!section)return;
 const scrollApproach=document.body.classList.contains('portfolio-home');
 section.dataset.study='candidate';
 const renderStudyFooter=()=>{
  const copy=document.documentElement.lang==='ru'
   ?{signature:'Ramin Shoniia, продуктовый и UX/UI-дизайнер',updated:'Обновлено — август 2026'}
   :{signature:'Ramin Shoniia, Product, UX/UI Designer',updated:'Last updated — August 2026'};
  document.querySelectorAll('[data-study-footer]').forEach(node=>node.textContent=copy[node.dataset.studyFooter]);
 };
 renderStudyFooter();document.addEventListener('portfolio:locale-changed',renderStudyFooter);
 // Full source component: identical raster hierarchy and dust sprite/seed/drawing math.
 const sunlightWindow=document.createElement('div');sunlightWindow.className='study-light-window';sunlightWindow.setAttribute('aria-hidden','true');
 let sunlight=document.createElement('img');sunlight.className='study-light-field';sunlight.alt='';sunlight.src='/assets/motion/morning-light.webp';
 let sunlightAmbient=sunlight.cloneNode();sunlightWindow.append(sunlightAmbient,sunlight);section.prepend(sunlightWindow);
 const glow=document.createElement('div');glow.className='study-hero-glow';glow.setAttribute('aria-hidden','true');section.prepend(glow);
 const canvas=document.createElement('canvas');canvas.className='study-dust-field';canvas.setAttribute('aria-hidden','true');section.prepend(canvas);
 const upperGlow=document.createElement('div');upperGlow.className='study-upper-glow how-section';upperGlow.setAttribute('aria-hidden','true');
 const sourceVisual=document.querySelector('#how-i-work .how-visual');
 const visual=document.createElement('div');visual.className='how-visual';
 const live=document.createElement('div');live.className='how-live is-visible';
 const sourceField=sourceVisual?.querySelector('.how-field');
 if(sourceField)live.append(sourceField.cloneNode(true));
 else{const template=document.createElement('template');template.innerHTML="<div class=\"how-field\"><div class=\"how-reveal\"><div class=\"how-breathe\"><img class=\"how-glow glow-pink\" src=\"/assets/dark/how-glow-1.webp\" alt=\"\" loading=\"lazy\"><img class=\"how-glow glow-soft\" src=\"/assets/dark/how-glow-2.webp\" alt=\"\" loading=\"lazy\"><img class=\"how-glow glow-blue\" src=\"/assets/dark/how-glow-3.webp\" alt=\"\" loading=\"lazy\"></div></div></div>";live.append(template.content.firstElementChild);}
 visual.append(live);
 // The same deterministic source factory also survives an interrupted hero initializer.
 const createSourceMotes=()=>{
  const field=document.createElement('div');field.className='how-particles';field.setAttribute('aria-hidden','true');
  for(let i=0;i<28;i++){
    const n=offset=>Math.abs(Math.sin((i+1)*127.1+offset*311.7)*43758.5453)%1;
    const angle=i/28*Math.PI*2;const x=50+Math.cos(angle)*(24+n(1)*19);
    let y=50+Math.sin(angle)*(23+n(2)*19);if(y>35&&y<66)y=y<50?32-n(3)*7:69+n(3)*7;
    const mote=document.createElement('span');const duration=14+n(4)*14;
    mote.style.cssText=`left:${x}%;top:${y}%;width:${1.7+n(5)*1.8}px;height:${1.7+n(5)*1.8}px;--dx:${5+n(6)*10}px;--dy:${7+n(7)*12}px;--mote-alpha:${.35+n(8)*.4};--mote-tint:${i%2?'#d0e1ff':'#ffd3e6'};animation-delay:${-n(9)*duration}s;animation-duration:${duration}s`;
    field.append(mote);
  }return field;
 };
 const motes=sourceVisual?.querySelector('.how-particles')?.cloneNode(true)||createSourceMotes();motes.hidden=false;motes.style.animationPlayState='running';visual.append(motes);
 upperGlow.append(visual);section.prepend(upperGlow);if(isCandidate){motes.classList.add('study-contact-motes');section.append(motes);}

 // Level 3: source glow textures through broad feathered wave masks.
 // They remain diffuse colour veils; the night contains no ray geometry.
 const aurora=document.createElement('div');aurora.className='study-aurora';aurora.setAttribute('aria-hidden','true');
 if(mode==='candidate'){
  if(scrollApproach){
   const frame=document.createElement('div');frame.className='night-veil-frame';
   for(const name of ['a','b']){
    const image=document.createElement('img');image.className=`study-aurora-sheet night-veil-${name}`;
    image.alt='';image.src='/assets/contact/selected-atmosphere-20261018/selected-light.webp';frame.append(image);
   }aurora.append(frame);
  }else{
   for(let i=0;i<3;i++){
    const image=document.createElement('img');image.className='study-aurora-sheet';image.alt='';image.src=`/assets/dark/how-glow-${[1,3,2][i]}.webp`;
    image.style.maskImage=`url("/assets/contact/atmosphere-masks/aurora-${i}.png")`;image.style.maskSize='100% 100%';aurora.append(image);
   }
  }section.prepend(aurora);
 }
 const updateStudyLinks=()=>{};
 const ctx=canvas.getContext('2d');
 const reduce=matchMedia('(prefers-reduced-motion:reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
 let width=0,ratio=1,clock=0,last=0,request=0,strength=1,hidden=false,visible=false;
 let particles=[],exclusions=[];let nextGlint=1.8,glintStart=-10,glintIndex=-1,glintCount=0;
 const glintDuration=1.9;let nextFlash=3.4,flashStart=-10,flashIndex=-1,flashCount=0;const flashDuration=.32;let height=360;let x=0,y=0,tx=0,ty=0;
 const depth=Array.from({length:3},(_,i)=>({x:0,y:0,tau:[.24,.65,1.3][i]}));
 let presence=0,inside=0,arrival=0,arrivalTarget=0;const depthRenderers=[];
 const glowArtwork=[...upperGlow.querySelectorAll('.how-glow')];
 // Keep every Candidate 4 source asset and envelope. Only the fine-pointer
 // candidate changes how light bends and illuminates the air within them.
 if(mode==='candidate'&&fine.matches&&!reduce.matches&&window.ContactDepthLight){
   const attach=(image,kind,layer,replace)=>{
     const ready=()=>{
       const renderer=window.ContactDepthLight.create(image,kind,layer,replace);
       if(renderer){depthRenderers.push(renderer);replace(renderer.canvas);paint();}
     };
     if(image.complete&&image.naturalWidth)ready();else image.addEventListener('load',ready,{once:true});
   };
   // Asset loads finish after the declarations and source sprites below.
   queueMicrotask(()=>{
     attach(sunlight,'day',0,node=>sunlight=node);
     attach(sunlightAmbient,'day',2,node=>sunlightAmbient=node);
     if(!scrollApproach)[...aurora.children].forEach((image,i)=>attach(image,'night',i,()=>{}));
     // Reuse the same broad nonuniform flex for the three original glow rasters.
     // Each keeps its own source animation and depth response in both themes.
     glowArtwork.forEach((image,i)=>attach(image,'glow',i,node=>glowArtwork[i]=node));
   });
 }
 let seed=9217;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
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
    width = section.clientWidth;
    const horizon=section.querySelector('.contact-landscape').offsetTop;
    section.style.setProperty('--study-horizon',`${horizon}px`);
    if(scrollApproach)aurora.style.removeProperty('height');
    else aurora.style.height=`${Math.min(section.clientHeight,horizon+110)}px`;
    height=isCandidate?Math.min(section.clientHeight,Math.max(360,section.querySelector('.contact-landscape').offsetTop+190)):360;
    canvas.style.height=`${height}px`;if(isCandidate)motes.style.height=`${height}px`;
    ratio = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(width*ratio);canvas.height = height*ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    seed = 9217;
    particles = Array.from({length:Math.round(Math.min(width,1600)/13)},()=>{
      const z = random(); const depth = z<.67?0:z<.94?1:2;
      return {x:random()*(width+120)-60,y:random()*(height-30)-20,phase:random()*Math.PI*2,
        depth,radius:depth===0?.55+random()*.55:depth===1?1.1+random()*.6:2+random(),
        velocity:.7+z*1.8,alpha:.24+random()*.42};
    });
    exclusions = [...document.querySelectorAll('.site-header .availability,.header-actions,.hero h1')].map(n=>{
      const b=n.getBoundingClientRect();return {left:b.left-12,right:b.right+12,top:b.top+scrollY-8,bottom:b.bottom+scrollY+8};
    });
    if(isCandidate){
      const origin=section.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(section.querySelector('h2'));
      const boxes=[...range.getClientRects(),...[...section.querySelectorAll('.contact-primary,.contact-meta>a,.contact-meta>button,.contact-status')].filter(n=>n.textContent.trim()).map(n=>n.getBoundingClientRect())];
      exclusions=boxes.map(b=>({left:b.left-origin.left-12,right:b.right-origin.left+12,top:b.top-origin.top-8,bottom:b.bottom-origin.top+8}));
      // Reuse the original mote artwork, clearing only live copy from its canvas.
      const rects=boxes.map(b=>`<rect x="${b.left-origin.left-12}" y="${b.top-origin.top-8}" width="${b.width+24}" height="${b.height+16}" fill="black"/>`).join('');
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${section.clientHeight}"><defs><filter id="soft"><feGaussianBlur stdDeviation="8"/></filter></defs><mask id="m" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><g filter="url(#soft)">${rects}</g></mask><rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>`;
      motes.style.maskImage=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }
    refresh();
  }
  function paint() {
    if(mode==='candidate'){
      const still=reduce.matches||!fine.matches;
      const breathe=still?0:Math.sin(clock*.56)*.025+Math.sin(clock*.31+1)*.015;
      const gain=isDaylight()?.50+presence*.10+breathe:.19+presence*.06+breathe*.35;
      section.style.setProperty('--study-arrival',String(arrival));
      if(scrollApproach)section.style.setProperty('--contact-approach-scale',String(.84+.16*arrival));
      upperGlow.style.opacity=String((isDaylight()?.32+arrival*.68:arrival)*gain);
      section.dataset.arrival=`${arrival.toFixed(3)},${arrivalTarget.toFixed(3)}`;
    }
    ctx.clearRect(0,0,width,height);
    if(hidden || !eligible())return;
    const daylight=isDaylight();
    const diffuseDay=mode==='candidate'&&daylight;
    // Mostly quiet light, with a rounded crest about every 35 seconds.
    // Different drift periods prevent the whole field rocking as one rigid sheet.
    const lightClock=reduce.matches||(isCandidate&&!fine.matches)?0:clock;
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
    if(isCandidate){
      // Steer the real source texture about its original origin. Ambient light
      // keeps an independent drift, while contrast and opacity still breathe.
      sunlight.style.transform=`translate(${x*width*.12+Math.sin(lightClock*.21)*Math.min(22,width*.018)}px,${y*12+Math.sin(lightClock*.15)*7}px) rotate(${x*6+raySway}deg) scale(${1.10+Math.sin(lightClock*.13)*.015})`;
      const contrast=sunContrast*(diffuseDay?1.35:1.7);
      sunlight.style.filter=`brightness(${(contrast+1)/(2*contrast)}) contrast(${contrast}) saturate(${diffuseDay?.88+sunCrest*.05:1.04+sunCrest*.08})`;
      if(diffuseDay){
        // Spread the existing warm light without its former dense colour crest.
        sunlight.style.opacity=String(Math.min(1,(.28+sunCrest*.28)*strength));
        sunlightAmbient.style.opacity=String(Math.min(.65,(.22+Math.sin(lightClock*.14)*.04)*strength));
        sunlightAmbient.style.filter='brightness(.9) contrast(1.15) saturate(.92)';
      }
      sunlightAmbient.style.transform=`translate(${-x*18+Math.sin(lightClock*.09+1)*-12}px,${-y*5+Math.sin(lightClock*.12)*4}px) scale(1.06)`;
      upperGlow.style.setProperty('--study-glow-x',`${x*(mode==='candidate'&&isDaylight()?width*.075:24)}px`);upperGlow.style.setProperty('--study-glow-y',`${y*12}px`);
      aurora.style.translate=`${x*32}px ${y*8}px`;
      section.dataset.pointer=`${x.toFixed(3)},${y.toFixed(3)}`;
    }
    if(mode==='candidate'){
      // The atmosphere stays anchored. Deformation and changing light density
      // replace the old 12%-width translation of the complete raster.
      sunlight.style.transform=`translate(${Math.sin(lightClock*.21)*Math.min(22,width*.018)}px,${Math.sin(lightClock*.15)*7}px) rotate(${raySway}deg) scale(${1.10+Math.sin(lightClock*.13)*.015})`;
      sunlightAmbient.style.transform=`translate(${Math.sin(lightClock*.09+1)*-12}px,${Math.sin(lightClock*.12)*4}px) scale(1.06)`;
      upperGlow.style.setProperty('--study-glow-x','0px');upperGlow.style.setProperty('--study-glow-y','0px');
      aurora.style.translate='0px 0px';
      glowArtwork.forEach((node,i)=>{
        const d=depth[i],back=depth[2];
        node.style.translate=`${(d.x-back.x)*22}px ${d.y*[7,-8,4][i]}px`;
        node.style.rotate=`${d.x*[2.4,-3,1.8][i]}deg`;
        node.style.scale=`${1+d.y*[.045,-.032,.025][i]} ${1+d.x*[.032,-.045,.024][i]}`;
      });
      for(const renderer of depthRenderers){
        if(renderer.kind!=='glow'&&(renderer.kind==='day')!==daylight)continue;
        const d=depth[renderer.layer],back=depth[2];
        const flex=renderer.kind==='glow'?1.55:1;
        renderer.draw({x:d.x*flex,y:d.y*flex},{x:back.x*flex,y:back.y*flex},{x:.5+d.x*.32,y:.5+d.y*.24},presence);
      }
      section.dataset.depth=depth.map(d=>`${d.x.toFixed(3)},${d.y.toFixed(3)}`).join(';');
      section.dataset.lightPresence=presence.toFixed(3);
    }
    const airClock=clock*(daylight?1.65:1);
    const frame = particles.map((p,index)=>{
      // Each particle follows a slow air current. Wrapping happens in the unlit margins.
      const d=depth[p.depth],parallax=mode==='candidate'?[10,4,1][p.depth]:0;
      const x=((p.x+airClock*p.velocity+Math.sin(airClock*.13+p.phase)*9+60)%(width+120))-60+d.x*parallax;
      const y=((p.y+airClock*p.velocity*.22+Math.sin(airClock*.17+p.phase)*11+30)%height)-30+d.y*parallax*.45;
      const catchLight=mode==='candidate'?1+presence*.65*(Math.exp(-Math.pow((x/width-(.5+d.x*.32))/.24,2)-Math.pow((y/height-(.5+d.y*.24))/.38,2))-Math.exp(-Math.pow((x/width-.5)/.24,2)-Math.pow((y/height-.5)/.38,2))):1;
      const light = catchLight*Math.exp(-Math.pow((x-width*(daylight?.23:.53))/(width*(daylight?.48:.44)),2))*
        smooth(-8,32,y)*(1-smooth(isCandidate?height*.38:(daylight?120:95),isCandidate?height*.88:(daylight?230:285),y))*smooth(-20,50,x)*(1-smooth(width-50,width+20,x))*
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

 function isDaylight(){return document.documentElement.dataset.theme!=='dark';}
 function eligible(){return isCandidate||width>600;}
 function running(){return eligible()&&!reduce.matches&&document.body.dataset.motionDisabled!=='true'&&document.body.dataset.motionPaused!=='true'&&new URLSearchParams(location.search).get('contact')!=='still'&&(!isCandidate||fine.matches)&&!document.hidden&&visible;}
 function updateArrivalTarget(){
   if(mode!=='candidate')return;
   if(scrollApproach){
     // Begin while About is still in view, before the Contact heading arrives.
     const lead=Math.min(280,innerHeight*.4);
     arrivalTarget=reduce.matches||document.body.dataset.motionDisabled==='true'?1:
       1-smooth(innerHeight*.24,innerHeight+lead,section.getBoundingClientRect().top);
   }else arrivalTarget=reduce.matches||!fine.matches?1:
     1-smooth(innerHeight*.44,innerHeight*.96,section.querySelector('h2').getBoundingClientRect().top);
 }
 function tick(now){
   request=0;if(!running()){last=0;return;}window.PortfolioEffects?.sample(now);if(!last)last=now;
   if(now-last>=(window.PortfolioEffects?.interval(30)??1000/30)){
     const dt=Math.min((now-last)/1000,.1);clock+=dt;
     x+=(tx-x)*(1-Math.exp(-dt/.42));y+=(ty-y)*(1-Math.exp(-dt/.55));
     depth.forEach(d=>{d.x+=(tx-d.x)*(1-Math.exp(-dt/d.tau));d.y+=(ty-d.y)*(1-Math.exp(-dt/(d.tau*1.2)));});
     presence+=(inside-presence)*(1-Math.exp(-dt/.55));
     arrival+=(arrivalTarget-arrival)*(1-Math.exp(-dt/(scrollApproach?.38:arrivalTarget>arrival?.9:.55)));
     last=now;paint();
   }request=requestAnimationFrame(tick);
 }
 function refresh(){
   updateArrivalTarget();
   if(isCandidate&&(reduce.matches||!fine.matches||(scrollApproach&&document.body.dataset.motionDisabled==='true'))){
     x=y=tx=ty=presence=inside=0;
     arrival=scrollApproach&&!reduce.matches&&document.body.dataset.motionDisabled!=='true'?arrivalTarget:1;
     if(!scrollApproach||reduce.matches||document.body.dataset.motionDisabled==='true')arrivalTarget=1;
     depth.forEach(d=>{d.x=d.y=0;});
   }
   cancelAnimationFrame(request);request=0;last=0;if(visible&&!document.hidden)paint();
   canvas.hidden=!eligible();sunlightWindow.hidden=!eligible()||!isDaylight();glow.hidden=isDaylight()||mode!=='baseline';
   upperGlow.hidden=mode==='baseline'||(mode==='centered'&&isDaylight());aurora.hidden=isDaylight();
   aurora.dataset.running=String(running()&&!isDaylight());
   aurora.dataset.nightRunning=String(scrollApproach&&!isDaylight()&&visible&&!document.hidden&&!reduce.matches&&document.body.dataset.motionDisabled!=='true'&&document.body.dataset.motionPaused!=='true'&&new URLSearchParams(location.search).get('contact')!=='still');updateStudyLinks();
   live.classList.toggle('is-visible',running());motes.style.animationPlayState=running()?'running':'paused';
   canvas.dataset.state=running()?'running':'paused';if(running())request=requestAnimationFrame(tick);
 }
 new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 // Observe the actual decorative envelopes, including the night veil's
 // deliberate reach above Contact, rather than a speculative scroll margin.
 const visibleFields=new Set();
 const visibilityObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting)visibleFields.add(entry.target);else visibleFields.delete(entry.target);}
   visible=visibleFields.size>0;refresh();
 });
 [canvas,sunlightWindow,upperGlow,aurora].forEach(node=>visibilityObserver.observe(node));
 document.addEventListener('visibilitychange',refresh);reduce.addEventListener('change',refresh);
 new ResizeObserver(resize).observe(section);document.fonts.ready.then(resize);document.addEventListener('portfolio:locale-changed',resize);
 const reset=()=>{tx=ty=inside=0;};
 section.addEventListener('pointermove',e=>{if(!isCandidate||e.pointerType!=='mouse'||!fine.matches||reduce.matches)return;inside=1;const b=section.getBoundingClientRect();tx=Math.max(-1,Math.min(1,(e.clientX-b.left)/b.width*2-1));ty=Math.max(-1,Math.min(1,(e.clientY-b.top)/b.height*2-1));},{passive:true});
 section.addEventListener('pointerleave',reset);section.addEventListener('pointercancel',reset);
 addEventListener('scroll',()=>{
   reset();
   if(scrollApproach&&document.body.dataset.motionPaused==='true')return;
   updateArrivalTarget();
   // Touch keeps the atmosphere still; only the deliberate scroll envelope changes.
   if(scrollApproach&&!fine.matches){arrival=arrivalTarget;if(visible&&!document.hidden)paint();}
 },{passive:true});
 addEventListener('blur',reset);fine.addEventListener('change',refresh);

 // Hand off the About action only once the full Contact action is available.
 if(mode==='candidate'){
   const aboutContact=document.querySelector('#about .about-copy > .text-link');
   const incomingContact=section.querySelector('.contact-primary');
   if(aboutContact&&incomingContact){
     let aboutFadeFrame=0,aboutFaded=false;
     const refreshAboutContact=()=>{
       aboutFadeFrame=0;
       const boundary=innerHeight*.90+(aboutFaded?24:0);
       const fade=incomingContact.getBoundingClientRect().bottom<=boundary&&!aboutContact.matches(':focus-visible');
       if(fade===aboutFaded&&aboutContact.hasAttribute('data-study-contact-hidden'))return;
       aboutFaded=fade;
       aboutContact.dataset.studyContactHidden=String(fade);
       aboutContact.inert=fade;
       aboutContact.setAttribute('aria-hidden',String(fade));
     };
     const queueAboutContact=()=>{
       if(!aboutFadeFrame)aboutFadeFrame=requestAnimationFrame(refreshAboutContact);
     };
     addEventListener('scroll',queueAboutContact,{passive:true});
     addEventListener('resize',queueAboutContact,{passive:true});
     document.addEventListener('portfolio:locale-changed',queueAboutContact);
     aboutContact.addEventListener('blur',queueAboutContact);
     document.fonts.ready.then(queueAboutContact);
     new ResizeObserver(queueAboutContact).observe(section);
     queueAboutContact();
   }
 }
 let copyResizeFrame=0;new MutationObserver(()=>{if(!copyResizeFrame)copyResizeFrame=requestAnimationFrame(()=>{copyResizeFrame=0;resize();});}).observe(section.querySelector('.contact-copy'),{childList:true,subtree:true,characterData:true});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['data-motion-disabled','data-motion-paused']});
 resize();
})();
