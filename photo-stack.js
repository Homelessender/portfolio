// Unified working homepage. Keep ?photos=single as the original portrait control.
function initializePhotoStack() {
  const query=new URL(location.href).searchParams;
  if (query.get('photos') === 'single') return;
  // Optional QA capture mode; the user-facing preview runs at normal speed.
  const timeScale=query.get('photo-debug')==='slow'?5:1;
  // Keep photographs opaque and flat. Change the layer only after a
  // complete sideways extraction, then return below both remaining prints.
  const shuffleMotion={out:380,advance:240,return:460,easing:{out:'cubic-bezier(.45,0,.55,1)',advance:'cubic-bezier(.22,0,.3,1)',return:'cubic-bezier(.35,0,.2,1)'}};
  const portrait = document.querySelector('.about-grid .portrait');
  if (!portrait) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // User-supplied photographs. Originals remain in Downloads.
  const photographs=[
    {src:'assets/photo-stack/portrait-borderless.webp',width:1112,height:1412,ru:'Портрет',en:'Portrait'},
    {src:'assets/photo-stack/outdoors.webp',width:1600,height:2133,ru:'На природе',en:'Outdoors'},
    {src:'assets/photo-stack/nature-detail.webp',width:1600,height:2133,ru:'Деталь природы',en:'Nature detail'}
  ];
  const slots = [
    {x:0,y:9.917,width:556,height:706,angle:-2,radius:48},
    {x:59.126,y:11.555,width:541.471,height:650.046,angle:3.483056,radius:44},
    {x:104.818,y:30.020,width:519.361,height:614.951,angle:6.190398,radius:44}
  ];
  const stage = document.createElement('div');
  stage.className='photo-stack'; stage.dataset.phase='loading';
  for (let i=1;i<=2;i++) {
    const shadow=document.createElement('img');
    shadow.src=`assets/photo-stack/shadow-${i}.webp`; shadow.alt='';
    shadow.className=`photo-stack-shadow photo-stack-shadow-${i}`;
    stage.append(shadow);
  }
  const hit = document.createElement('button');
  hit.type='button'; hit.className='photo-stack-next';
  const prints = [0,1,2].map(id => {
    // Clip the image inside the moving print; its shadow must remain outside
    // that contour, including while the print is being tucked behind the stack.
    const card=document.createElement('div'), face=document.createElement('div'), image=document.createElement('img');
    card.className='photo-stack-print'; card.dataset.photoId=id;
    image.className='photo-stack-image'; image.src=photographs[id].src;
    image.width=photographs[id].width;image.height=photographs[id].height;
    image.alt=''; image.draggable=false; face.className='photo-stack-face';
    face.append(image); card.append(face);
    stage.append(card); return card;
  });
  const hint=document.createElement('span');
  hint.className='photo-stack-hint'; hint.setAttribute('aria-hidden','true');
  hit.append(hint); stage.append(hit);
  const status=document.createElement('span');
  status.className='photo-stack-status'; status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true'); stage.append(status);
  let order=[0,1,2], scale=1, busy=false, runs=[], generation=0, hintTimer;
  const transform=slot=>`translate(${slot.x*scale}px,${slot.y*scale}px) rotate(${slot.angle}deg)`;
  const instant=()=>reduced.matches || document.body.dataset.motionDisabled==='true' || document.body.dataset.motionPaused==='true';
  let entryRuns=[],advancePaint=null,advanceFrame=0;
  function finishEntry() {
    entryRuns.forEach(run=>run.cancel()); entryRuns=[]; stage.dataset.entry='done';
  }
  function syncEntry() {
    const paused=document.hidden || stage.dataset.floatVisible!=='true' || document.body.dataset.motionPaused==='true';
    [...entryRuns,...runs,...fanRuns].forEach(run=>{if(run.playState!=='finished'&&run.playState!=='idle')paused?run.pause():run.play();});
    if(paused){cancelAnimationFrame(advanceFrame);advanceFrame=0;}
    else if(advancePaint&&!advanceFrame)advancePaint();
  }
  function beginEntry() {
    if(stage.dataset.entry!=='pending')return;
    if(instant()){finishEntry();return;}
    stage.dataset.entry='entering';
    // The front print has more right-hand space than the rear edge. Give it
    // a visible entrance without forcing the complete fan beyond the viewport.
    entryRuns=order.map((id,rank)=>{
      const card=prints[id], slot=slots[rank];
      const distance=Math.min(rank===0?42:rank===1?24:12,Math.max(0,innerWidth-card.getBoundingClientRect().right-4));
      return card.animate([
        {transform:transform(slot)+` translateX(${distance}px)`},
        {transform:transform(slot)}
      ],{duration:850,delay:rank*45,easing:'cubic-bezier(.22,.68,.24,1)',fill:'both'});
    });
    // Composite the opaque deck first, then fade that complete surface.
    // Fading each print independently exposed duplicate faces underneath.
    entryRuns.push(stage.animate([{opacity:0},{opacity:1}],{duration:850,easing:'ease-out',fill:'both'}));
    const current=entryRuns;
    Promise.allSettled(current.map(run=>run.finished)).then(()=>{if(entryRuns===current){finishEntry();updateFan();}});
    syncEntry();
  }
  function hideHint() {
    clearTimeout(hintTimer); hintTimer=undefined;
    delete stage.dataset.hintVisible;
  }
  function showHint() {
    // Pointer entry and keyboard focus may arrive together. Neither ongoing
    // hover nor a second focus event should restart the five-second window.
    if(busy || stage.dataset.hintVisible==='true')return;
    stage.dataset.hintVisible='true';
    hintTimer=setTimeout(hideHint,5000);
  }
  function language() {
    const ru=document.documentElement.lang==='ru';
    hit.setAttribute('aria-label',ru?'Стопка фотографий. Показать следующую':'Photograph stack. Show next photograph');
    hint.textContent=ru?'Нажми, чтобы перелистнуть':'Click to shuffle';
    announce();
  }
  // Keep the same contour after promotion. Removing it at the phase boundary
  // exposed the bitmap edge in one frame, despite continuous slot geometry.
  function clipForSlot(slot) {
    if(!window.FigmaSquircle)return '';
    const path=window.FigmaSquircle.getSvgPath({width:slot.width*scale,height:slot.height*scale,cornerRadius:slot.radius*scale,cornerSmoothing:.6});
    return `path('${path}')`;
  }
  function geometry() {
    scale=parseFloat(getComputedStyle(stage).width)/556;
    for(const [name,value] of Object.entries({'near-x':6,'near-y':4,'near-blur':9,'far-y':14,'far-blur':20})) {
      stage.style.setProperty(`--photo-shadow-${name}`,`${value*scale}px`);
    }
    order.forEach((id,rank)=>{
      const card=prints[id], face=card.firstElementChild, slot=slots[rank];
      card.dataset.rank=rank;
      card.style.width=`${slot.width*scale}px`; card.style.height=`${slot.height*scale}px`;
      card.style.transform=transform(slot); card.style.zIndex=3-rank;
      card.style.opacity='1'; face.style.clipPath=clipForSlot(slot);
    });
    hit.style.width=`${slots[0].width*scale}px`; hit.style.height=`${slots[0].height*scale}px`;
    hit.style.transform=transform(slots[0]); stage.dataset.front=order[0];
  }
  let fanRuns=[], pointerInside=false, keyboardInside=false;
  const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
  function stopFan(commit=true) {
    fanRuns.forEach(run=>{
      if(commit)run.effect.target.style.transform=getComputedStyle(run.effect.target).transform;
      run.cancel();
    });
    fanRuns=[];
  }
  function fanPose(rank,open) {
    const slot={...slots[rank]};
    if(!open || !rank)return slot;
    // Turn toward upright: extra clockwise rotation tucked the lower edges
    // under the front print and hid the far photograph on hover.
    slot.angle-=rank===1?.7:1.4;
    slot.y-=rank===1?4:7;
    // Keep the resting source. Limit extra spread to available screen space.
    const rightLimit=(innerWidth-stage.getBoundingClientRect().left-8)/scale;
    const rotatedRight=slot.width*Math.cos(slot.angle*Math.PI/180);
    slot.x+=Math.min(rank===1?1:19,Math.max(0,rightLimit-slot.x-rotatedRight));
    return slot;
  }
  async function spread(open,duration=320) {
    stopFan();
    if(instant())open=false;
    stage.dataset.fan=open?'open':'closed';
    const current=order.slice(1).map((id,index)=>{
      const card=prints[id],to=transform(fanPose(index+1,open));
      if(instant()){card.style.transform=to;return null;}
      return card.animate([{transform:getComputedStyle(card).transform},{transform:to}],
        {duration,easing:'cubic-bezier(.22,.68,.24,1)',fill:'forwards'});
    }).filter(Boolean);
    fanRuns=current;
    await Promise.allSettled(current.map(run=>run.finished));
    if(fanRuns!==current)return;
    current.forEach(run=>{run.effect.target.style.transform=getComputedStyle(run.effect.target).transform;run.cancel();});
    fanRuns=[];
  }
  function updateFan() {
    // A stationary pointer can enter when scrolling places the deck under it.
    // Let that passive hover wait for the entrance; clicks/focus still finish it.
    if(busy || stage.dataset.entry!=='done')return;
    spread(pointerInside || keyboardInside);
  }
  function cancel() {
    stopFan(false);stage.dataset.fan='closed';
    cancelAnimationFrame(advanceFrame);advanceFrame=0;advancePaint=null;
    generation++; runs.forEach(run=>run.cancel()); runs=[]; busy=false;
    stage.dataset.phase='idle'; geometry();
  }
  function announce() {
    const ru=document.documentElement.lang==='ru';
    const photo=photographs[order[0]];
    status.textContent=ru?`Фотография ${order[0]+1} из ${photographs.length}: ${photo.ru}.`:`Photograph ${order[0]+1} of ${photographs.length}: ${photo.en}.`;
  }
  async function next() {
    hideHint();
    if(busy)return;
    finishEntry();
    busy=true; const token=++generation, outgoingId=order[0], outgoing=prints[outgoingId];
    if(instant()) {
      order.push(order.shift()); geometry(); announce(); busy=false; stage.dataset.phase='idle'; return;
    }
    stage.dataset.phase='prepare';
    if(stage.dataset.fan==='open' || fanRuns.length)await spread(false,180);
    if(token!==generation)return;
    const front=slots[0], rear=slots[2];
    // Sideways extraction follows the original interaction. The right side
    // has no About copy; the viewport clips a deliberate exit, not a fade.
    // The whole print is outside before any layer/crop/size change.
    const stageLeft=stage.getBoundingClientRect().left;
    const peakX=(innerWidth-stageLeft+32)/scale+rear.height*Math.sin(rear.angle*Math.PI/180)+8;
    const exitFront={...front,x:peakX}, exitRear={...rear,x:peakX};
    stage.dataset.phase='out';
    const out=outgoing.animate([
      {transform:transform(front)}, {transform:transform(exitFront)}
    ],{duration:shuffleMotion.out*timeScale,easing:shuffleMotion.easing.out,fill:'forwards'});
    runs=[out];syncEntry(); await out.finished.catch(()=>{});
    if(token!==generation)return;
    // Save the direct layer-switch observation in this isolated study.
    const box=outgoing.getBoundingClientRect();
    const backRight=Math.max(...order.slice(1).map(id=>prints[id].getBoundingClientRect().right));
    stage.dataset.switchGap=String(box.left-backRight);
    stage.dataset.switchOutside=String(box.left-innerWidth);
    outgoing.style.transform=transform(exitRear);
    outgoing.style.width=`${rear.width*scale}px`; outgoing.style.height=`${rear.height*scale}px`;
    outgoing.firstElementChild.style.clipPath=clipForSlot(rear); outgoing.style.zIndex='0';
    out.cancel(); runs=[];
    // Only now advance the remaining opaque prints, while outgoing is clear.
    stage.dataset.phase='advance';
    const timing={duration:shuffleMotion.advance*timeScale,easing:shuffleMotion.easing.advance,fill:'forwards'};
    // One clock updates layout, contour and pose together. A path tween on a
    // separate effect could produce a contour different from that frame's box.
    const clock=stage.animate([{},{}],timing);
    runs=[clock];
    const moving=order.slice(1);
    const paint=()=>{
      advanceFrame=0;
      if(token!==generation || stage.dataset.phase!=='advance')return;
      const progress=clock.effect.getComputedTiming().progress ?? 0;
      moving.forEach((id,index)=>{
        const from=slots[index+1],to=slots[index],slot={};
        for(const key of Object.keys(from))slot[key]=from[key]+(to[key]-from[key])*progress;
        const card=prints[id];
        card.style.transform=transform(slot);
        card.style.width=`${slot.width*scale}px`;card.style.height=`${slot.height*scale}px`;
        card.firstElementChild.style.clipPath=clipForSlot(slot);
      });
      if(clock.playState==='running')advanceFrame=requestAnimationFrame(paint);
    };
    advancePaint=paint;syncEntry();await clock.finished.catch(()=>{});advancePaint=null;cancelAnimationFrame(advanceFrame);advanceFrame=0;
    if(token!==generation)return;
    order.slice(1).forEach((id,index)=>{
      const card=prints[id], slot=slots[index];
      card.style.transform=transform(slot);card.style.width=`${slot.width*scale}px`;card.style.height=`${slot.height*scale}px`;
      card.firstElementChild.style.clipPath=clipForSlot(slot);
    });
    runs.forEach(run=>run.cancel()); runs=[]; stage.dataset.phase='return';
    // Return below BOTH stationary prints with its final size/crop throughout.
    // No size change on screen, no depth rotation, no transparent photograph.
    const tuck=outgoing.animate([
      {transform:transform(exitRear)},{transform:transform(rear)}
    ],{duration:shuffleMotion.return*timeScale,easing:shuffleMotion.easing.return,fill:'forwards'});
    runs=[tuck];syncEntry(); await tuck.finished.catch(()=>{});
    if(token!==generation)return;
    order.push(order.shift()); runs.forEach(run=>run.cancel()); geometry();
    runs=[]; busy=false; stage.dataset.phase='idle'; announce();
    if(pointerInside || keyboardInside)spread(true);
  }
  hit.addEventListener('click',next);
  hit.addEventListener('pointerdown',finishEntry);
  hit.addEventListener('focus',finishEntry);
  hit.addEventListener('pointerenter',event=>{showHint();pointerInside=event.pointerType!=='touch' && finePointer.matches;updateFan();});
  hit.addEventListener('pointerleave',()=>{hideHint();pointerInside=false;updateFan();});
  hit.addEventListener('focus',()=>{showHint();keyboardInside=hit.matches(':focus-visible');updateFan();});
  hit.addEventListener('blur',()=>{hideHint();keyboardInside=false;updateFan();});
  reduced.addEventListener('change',()=>{if(reduced.matches){finishEntry();cancel();}else updateFan();});
  stage.dataset.pageHidden=String(document.hidden);
  document.addEventListener('visibilitychange',()=>{
    stage.dataset.pageHidden=String(document.hidden);
    if(document.hidden)hideHint();
    syncEntry();
  });
  new MutationObserver(()=>{if(reduced.matches||document.body.dataset.motionDisabled==='true'){finishEntry();cancel();}else syncEntry();}).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused','data-motion-disabled']});
  document.addEventListener('portfolio:locale-changed',language);
  const resize=new ResizeObserver(()=>{
    if(entryRuns.length)finishEntry();
    // Old hover keyframes contain the previous viewport's scale. Cancel them
    // before measuring, then preserve the current pointer/keyboard pose.
    stopFan(false);
    if(busy)cancel();else geometry();
    const open=!instant() && stage.dataset.entry==='done' && (pointerInside || keyboardInside);
    stage.dataset.fan=open?'open':'closed';
    order.slice(1).forEach((id,index)=>{prints[id].style.transform=transform(fanPose(index+1,open));});
  });
  // If an asset fails, the old single portrait remains visible and usable.
  Promise.all(prints.map(card=>card.querySelector('img').decode())).then(()=>{
    const fallback=portrait.closest('.corner-shell') || portrait;
    fallback.after(stage);
    // Failed stylesheet loading must never replace the responsive portrait
    // with three unstyled block images. Retain the original control instead.
    if(getComputedStyle(stage).position!=='relative' || getComputedStyle(prints[0]).position!=='absolute'){stage.remove();return;}
    fallback.hidden=true;
    stage.dataset.entry=instant() || !('IntersectionObserver' in window)?'done':'pending';
    document.querySelector('#about').classList.add('has-photo-stack');
    resize.observe(stage); geometry(); language(); stage.dataset.phase='idle';
    if(!('IntersectionObserver' in window))return;
    new IntersectionObserver(([entry])=>{
      stage.dataset.floatVisible=String(entry.isIntersecting);
      if(entry.isIntersecting && entry.intersectionRatio>=.08)beginEntry();
      syncEntry();
    },{threshold:[0,.08]}).observe(stage);
  }).catch(()=>{});
}
// Decode the full-resolution deck only as About approaches. Keep the original
// responsive portrait as the unchanged fallback until every photo is ready.
function schedulePhotoStack() {
  const portrait=document.querySelector('.about-grid .portrait');
  if(!portrait || !('IntersectionObserver' in window)){initializePhotoStack();return;}
  const observer=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting)return;
    observer.disconnect();initializePhotoStack();
  },{rootMargin:'600px'});
  observer.observe(portrait);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedulePhotoStack,{once:true});
else schedulePhotoStack();
