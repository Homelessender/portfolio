(() => {
  const visual=document.querySelector('.how-visual');
  const live=visual?.querySelector('.how-live');
  if(!live)return;
  const scrollEntry=!!visual.closest('#how-i-work');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,frame=0;
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const wake=document.createElement('div');
  wake.className='how-wake';wake.setAttribute('aria-hidden','true');
  live.querySelector('.how-breathe').append(wake);
  let pointerFrame=0,lastFrame=0,lastMove=0,inside=false,energy=0;
  const cursor={x:50,y:50,targetX:50,targetY:50,alpha:0};
  const pointerAllowed=()=>visible&&!reduce.matches&&fine.matches&&!document.hidden&&
    document.body.dataset.motionPaused!=='true'&&document.body.dataset.motionDisabled!=='true';
  function animateWake(now){
    pointerFrame=0;
    if(!pointerAllowed()){resetPointer(true);return;}
    window.PortfolioEffects?.sample(now);
    const delta=Math.max(0,Math.min(now-lastFrame,50));lastFrame=now;
    const blend=1-Math.exp(-delta/190);
    cursor.x+=(cursor.targetX-cursor.x)*blend;
    cursor.y+=(cursor.targetY-cursor.y)*blend;
    const target=inside?energy*Math.exp(-(now-lastMove)/1100):0;
    cursor.alpha+=(target-cursor.alpha)*(1-Math.exp(-delta/260));
    // The paint layer extends 30% beyond the visual on each side, so its
    // radial colour can finish fading before reaching a rectangular edge.
    wake.style.setProperty('--how-wake-x',`${(cursor.x+30)/1.6}%`);
    wake.style.setProperty('--how-wake-y',`${(cursor.y+30)/1.6}%`);
    wake.style.setProperty('--how-wake-alpha',String(cursor.alpha));
    if(cursor.alpha>.001||target>.001)pointerFrame=requestAnimationFrame(animateWake);
    else wake.style.setProperty('--how-wake-alpha','0');
  }
  function resetPointer(immediate=false){
    visual.style.setProperty('--how-pointer-x','0px');
    visual.style.setProperty('--how-pointer-y','0px');
    inside=false;
    if(immediate){cancelAnimationFrame(pointerFrame);pointerFrame=0;cursor.alpha=0;wake.style.setProperty('--how-wake-alpha','0');}
  }
  // Listen around the field too: the glow can lean toward a nearby pointer,
  // while the stronger colour wake remains confined to the original orb.
  document.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||!pointerAllowed())return;
    const box=visual.getBoundingClientRect();
    const dx=event.clientX-(box.left+box.width/2);
    const dy=event.clientY-(box.top+box.height/2);
    const beyond=Math.hypot(Math.max(0,Math.abs(dx)-box.width/2),Math.max(0,Math.abs(dy)-box.height/2));
    const reach=Math.max(240,Math.min(innerWidth*.24,460));
    const falloff=Math.max(0,1-beyond/reach);
    const influence=falloff*falloff*(3-2*falloff);
    if(!influence){resetPointer();return;}
    const offset=(value,size)=>Math.max(-1,Math.min(1,value/(size/2)))*42*influence;
    visual.style.setProperty('--how-pointer-x',`${offset(dx,box.width)}px`);
    visual.style.setProperty('--how-pointer-y',`${offset(dy,box.height)}px`);
    const x=Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100));
    const y=Math.max(0,Math.min(100,(event.clientY-box.top)/box.height*100));
    const speed=Math.hypot(x-cursor.targetX,y-cursor.targetY);
    const region=Math.max(0,1-Math.hypot((x-50)/46,(y-50)/46));
    cursor.targetX=x;cursor.targetY=y;inside=true;
    const edge=Math.min(1,region/.32);
    energy=Math.min(1,.9+speed*.015)*edge*edge*(3-2*edge);
    lastMove=performance.now();
    if(!pointerFrame){lastFrame=lastMove;pointerFrame=requestAnimationFrame(animateWake);}
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>resetPointer());
  addEventListener('blur',()=>resetPointer(true));
  function update(){
    frame=0;
    const disabled=document.body.dataset.motionDisabled==='true';
    if(disabled){
      const source=visual.querySelector('.how-source');
      source.removeAttribute('data-deferred-source');
      const staticSrc=document.documentElement.dataset.theme==='dark'?source.dataset.darkSrc:source.dataset.lightSrc;
      if(source.getAttribute('src')!==staticSrc)source.src=staticSrc;
    }
    const paused=document.body.dataset.motionPaused==='true';
    const active=visible&&!document.hidden&&!paused&&!disabled&&!reduce.matches;
    if(!active)resetPointer(true);
    live.classList.toggle('is-visible',active);
    const box=visual.getBoundingClientRect();
    // Reveal from the upper glow, while the last work cards are still visible.
    // Keep the original composition and cursor wake; only its scroll envelope changes.
    const leadingLight=box.top+box.height*.12;
    const progress=reduce.matches||disabled?1:Math.max(0,Math.min(1,(innerHeight-leadingLight)/(innerHeight*.5)));
    const eased=progress*progress*(3-2*progress);
    if(scrollEntry){
      if(paused&&!disabled&&!reduce.matches)return;
      // The complete source component, including its glass label, grows as
      // its centre approaches the viewport centre. Its final size is unchanged.
      const centre=box.top+box.height/2;
      const start=innerHeight+Math.min(box.height*.25,160);
      const target=innerHeight*.5;
      const approach=reduce.matches||disabled?1:Math.max(0,Math.min(1,(start-centre)/(start-target)));
      const envelope=approach*approach*(3-2*approach);
      visual.style.setProperty('--how-scroll-scale',String(.78+.22*envelope));
      visual.style.setProperty('--how-scroll-opacity',String(.15+.85*envelope));
      visual.style.setProperty('--how-scroll-y',`${34*(1-envelope)}px`);
      visual.style.setProperty('--how-scale','1');
      visual.style.setProperty('--how-opacity','1');
      visual.style.setProperty('--how-entry-y','0px');
      return;
    }
    visual.style.setProperty('--how-scale',String(.9+.1*eased));
    visual.style.setProperty('--how-opacity',String(.55+.45*eased));
    visual.style.setProperty('--how-entry-y',`${-64*(1-eased)}px`);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;schedule();}).observe(visual);
  addEventListener('scroll',()=>{resetPointer();if(visible)schedule();},{passive:true});
  addEventListener('resize',schedule);
  reduce.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused','data-motion-disabled']});
  update();
})();

// About enters on scroll, independently of the intro at the top of the page.
(() => {
  const section = document.querySelector('#about');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || reduce.matches || !('IntersectionObserver' in window)) return;
  const items = [...section.querySelectorAll('.section-label, .about-copy > *, .portrait')];
  const pending = new Set(items);
  const timers = new Map();
  function finish(item) {
    clearTimeout(timers.get(item));
    timers.delete(item);
    item.classList.remove('about-reveal-pending', 'about-revealing');
    item.style.removeProperty('--about-delay');
    pending.delete(item);
    observer.unobserve(item);
    if (!pending.size) {
      observer.disconnect();
      reduce.removeEventListener('change', onPreference);
      section.removeEventListener('focusin', onFocus);
    }
  }
  function onPreference() { if (reduce.matches) [...pending].forEach(finish); }
  function onFocus() { [...pending].forEach(finish); }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || !pending.has(entry.target)) continue;
      const item = entry.target;
      observer.unobserve(item);
      item.classList.add('about-revealing');
      item.addEventListener('animationend', event => {
        if (event.target === item) finish(item);
      }, {once:true});
      timers.set(item, setTimeout(() => finish(item), 1800));
    }
  }, {threshold: 0, rootMargin: '0px 0px -40px 0px'});
  items.forEach((item, index) => {
    const delay = item.matches('.portrait') ? 120 : Math.min(Math.max(index - 1, 0) * 80, 240);
    item.style.setProperty('--about-delay', `${delay}ms`);
    item.classList.add('about-reveal-pending');
    observer.observe(item);
  });
  reduce.addEventListener('change', onPreference);
  section.addEventListener('focusin', onFocus);
})();
