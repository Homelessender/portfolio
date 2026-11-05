/* Native document navigation: keep the old frame until the next is ready.
   No blank exit screen, location timer or transform on the live body. */
(() => {
 const root=document.documentElement,reduce=matchMedia('(prefers-reduced-motion:reduce)');
 // Prepare one complete initial view before exposing it or fading the old
 // document snapshot. Keep a bounded fail-open path if a resource fails.
 root.classList.add('page-preparing');
 root.classList.add('page-motion-preparing');
 window.PortfolioPaintTasks=[];
 // A theme/locale change can replace a source while decode() is pending.
 // Do not release on that rejected, obsolete decode: check the current view again.
 const visibleImages=()=>[...document.images].filter(image=>{
  const box=image.getBoundingClientRect();
  return box.width>0&&box.height>0&&box.bottom>0&&box.top<innerHeight+100;
 });
 window.PortfolioPrepareView=async()=>{
  let previous;
  do{
   previous=visibleImages().map(image=>({image,src:image.src}));
   for(const {image} of previous){image.loading='eager';image.decoding='sync';}
   await Promise.allSettled([document.fonts.ready,
    ...previous.map(({image})=>image.decode()),...window.PortfolioPaintTasks,
    ...(window.PortfolioVisiblePaintTasks?.()||[])]);
  }while(previous.some(({image,src})=>image.src!==src)||
   visibleImages().some(image=>!previous.some(item=>item.image===image)));
 };
 let releasePaint;
 window.PortfolioPageReady=new Promise(resolve=>{releasePaint=resolve;});
 let paintReleased=false;
 const release=reason=>{
  if(paintReleased)return;paintReleased=true;clearTimeout(paintTimeout);
  root.dataset.paintReady=reason;root.classList.remove('page-preparing');
  const epoch=arrivalEpoch;
  let started=false,warmupTimeout;
  const start=()=>{
   if(started)return;started=true;
   clearTimeout(warmupTimeout);
   document.removeEventListener('visibilitychange',onVisibility);
   removeEventListener('pagehide',onDeparture);
   // Reset only this visible visit, never a resumed/new visit or a gesture
   // that already took control while the prepared view was painting.
   if(epoch===arrivalEpoch&&!arrivalInterrupted&&!reduce.matches&&document.visibilityState!=='hidden'){
    for(const animation of document.getAnimations()){
     if(['page-arrival-veil','page-snapshot-exit'].includes(animation.animationName))animation.currentTime=0;
    }
   }
   root.classList.remove('page-motion-preparing');releasePaint();
  };
  const onVisibility=()=>{if(document.visibilityState==='hidden')start();};
  const onDeparture=()=>start();
  if(reduce.matches||document.visibilityState==='hidden'||
   (!root.classList.contains('page-arriving')&&!root.classList.contains('page-navigation-incoming')))start();
  else{
   document.addEventListener('visibilitychange',onVisibility);
   addEventListener('pagehide',onDeparture,{once:true});
   warmupTimeout=setTimeout(start,500);
   requestAnimationFrame(()=>requestAnimationFrame(start));
  }
 };
 const paintTimeout=setTimeout(()=>release('timeout'),3000);
 document.addEventListener('DOMContentLoaded',()=>setTimeout(async()=>{
  try{
   // Restore context before choosing the resources needed for this viewport.
   restoreWorkPosition();
   await window.PortfolioPrepareView();
   if(!paintReleased){restoreWorkPosition();await window.PortfolioPrepareView();}
   release('ready');
  }catch{release('fallback');}
 },0),{once:true});
 const key='portfolio:page-arrival';
 const route=url=>url.pathname.replace(/index\.html$/,'')+url.search+url.hash;
 const known=url=>url.origin===location.origin&&['/','/404.html','/cases/monthly-forecast/','/cases/reducing-churn/'].includes(url.pathname.replace(/index\.html$/,''));
 const contextKey='portfolio:work-context';
 const caseId=url=>({
  '/cases/monthly-forecast/':'project-monthly-forecast',
  '/cases/reducing-churn/':'project-reducing-churn'
 })[url.pathname.replace(/index\.html$/,'')];
 const home=url=>url.pathname.replace(/index\.html$/,'')==='/';
 window.PortfolioHomeHref=()=>{
  const url=new URL('/',location.href);
  url.searchParams.set('lang',root.lang==='ru'?'ru':'en');
  const id=caseId(new URL(location.href));if(id)url.hash=id;
  return url.href;
 };
 function restoreWorkPosition(){
  if(!home(new URL(location.href))||!arriving||
   performance.getEntriesByType('navigation')[0]?.type==='back_forward')return;
  const card=document.getElementById(location.hash.slice(1));
  if(!card?.matches('.case-card'))return;
  let offset=24;
  try{
   const saved=JSON.parse(sessionStorage.getItem(contextKey)||'null');
   if(saved?.id===card.id&&Date.now()-saved.time<3600000&&
    Math.abs(saved.width-innerWidth)<2&&Number.isFinite(saved.top))offset=saved.top;
  }catch{}
  scrollTo({top:scrollY+card.getBoundingClientRect().top-offset,behavior:'instant'});
 }
 function returnLinks(){
  const id=caseId(new URL(location.href));if(!id)return;
  for(const link of document.querySelectorAll('a[href]')){
   const url=new URL(link.href,location.href);
   if(url.origin===location.origin&&home(url)&&(!url.hash||url.hash==='#work')){
    url.hash=id;link.href=url.href;
   }
  }
 }
 document.addEventListener('DOMContentLoaded',returnLinks,{once:true});
 document.addEventListener('portfolio:locale-changed',()=>queueMicrotask(returnLinks));
 let arriving=false,arrivalTimer,fallbackStarted=false,arrivalEpoch=0,arrivalInterrupted=false;
 try{
  const record=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);
  arriving=!!record&&Date.now()-record.time<15000&&record.to===route(new URL(location.href));
 }catch{}
 arriving ||= performance.getEntriesByType('navigation')[0]?.type==='back_forward';
 // Storage may be unavailable. A same-site document link is still a return.
 try{const from=new URL(document.referrer);arriving ||= known(from)&&route(from)!==route(new URL(location.href));}catch{}
 if(arriving)root.dataset.pageArrival='fast';
 const finish=()=>{clearTimeout(arrivalTimer);root.classList.remove('page-arriving');};
 function fallbackEntrance(){
  if(fallbackStarted||arrivalInterrupted||reduce.matches)return;
  fallbackStarted=true;
  const epoch=arrivalEpoch;
  root.classList.add('page-arriving');
  // Start cleanup after readiness; slow assets must not consume the entrance.
  window.PortfolioPageReady.then(()=>{
   if(epoch===arrivalEpoch&&root.classList.contains('page-arriving'))arrivalTimer=setTimeout(finish,650);
  });
 }
 // Arm a prepared entrance before the first paint. Event support alone does
 // not guarantee pagereveal will arrive. Native snapshots and live appearance
 // share readiness, with independent cleanup.
 if(arriving)fallbackEntrance();
 addEventListener('pagereveal',event=>{
  window.PortfolioPageTransition=event.viewTransition;
  if(!event.viewTransition){if(arriving)fallbackEntrance();return;}
  // Fade only the outgoing snapshot. Capturing the incoming root would remove
  // its live controls from hit testing until the transition finishes, swallowing
  // a first quick click even with pointer-events:none on the snapshot overlay.
  root.classList.add('page-navigation-incoming');
  const transition=event.viewTransition;
  const epoch=arrivalEpoch;
  let nativeStarted=false;
  // A ViewTransition object also exists when Safari skips its animation.
  // finished resolves even then; ready is the actual start gate. Recover only
  // this visit, never after a deliberate gesture, departure or reduced motion.
  transition.ready?.then(()=>{nativeStarted=true;},()=>{
   if(epoch!==arrivalEpoch||arrivalInterrupted||reduce.matches||window.PortfolioPageTransition!==transition)return;
   root.classList.remove('page-navigation-incoming');
   fallbackEntrance();
  });
  transition.finished.catch(()=>{}).finally(()=>{
   if(epoch!==arrivalEpoch||window.PortfolioPageTransition!==transition)return;
   // Retire the suppressed fallback before removing its suppression class.
   // Otherwise CSS creates a new veil animation over the already visible page.
   // A rejected native ready still owns a real fallback entrance: let it finish.
   if(nativeStarted)finish();
   root.classList.remove('page-navigation-incoming');
  });
  // The old snapshot fades above the live page; it does not animate the new
  // content. Keep its prepared entrance in native Safari too, without restarting
  // an entrance already armed before parsing or taking away live hit testing.
  root.dataset.pageArrival='fast';fallbackEntrance();
  if(reduce.matches)event.viewTransition.skipTransition();
 });
 addEventListener('pageswap',()=>{root.classList.remove('page-navigation-incoming');window.PortfolioPageTransition=null;});
 addEventListener('pageshow',event=>{
  queueMicrotask(returnLinks);
  root.classList.remove('page-leaving');
  if(event.persisted){arrivalInterrupted=false;arriving=true;root.dataset.pageArrival='fast';if(!window.PortfolioPageTransition)fallbackEntrance();}
 });
 addEventListener('pagehide',()=>{arrivalEpoch++;arrivalInterrupted=true;fallbackStarted=false;finish();});
 reduce.addEventListener('change',()=>{if(reduce.matches){arrivalInterrupted=true;finish();}});
 // A deliberate gesture takes over from a document animation, never from an
 // unprepared screen. Programmatic scroll restoration must not cancel it.
 const interrupt=()=>{
  if(root.classList.contains('page-preparing'))return;
  arrivalInterrupted=true;window.PortfolioPageTransition?.skipTransition();finish();
 };
 addEventListener('wheel',interrupt,{passive:true});
 addEventListener('touchstart',interrupt,{passive:true});
 document.addEventListener('pointerdown',interrupt,{passive:true,capture:true});
 document.addEventListener('keydown',event=>{
  if(['Tab','Escape','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))interrupt();
 });
 document.addEventListener('portfolio:before-theme-change',interrupt);
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const a=event.target.closest?.('a[href]');
  if(!a||a.hasAttribute('download')||a.dataset.pageTransition==='off'||(a.target&&a.target!=='_self'&&!(a.target==='_top'&&window===top)))return;
  const url=new URL(a.href,location.href),current=new URL(location.href);
  if(!known(url)||url.pathname===current.pathname&&url.search===current.search)return;
  const card=a.closest?.('.case-card');
  if(home(current)&&card&&caseId(url)){
   try{sessionStorage.setItem(contextKey,JSON.stringify({id:card.id,
    top:card.getBoundingClientRect().top,width:innerWidth,time:Date.now()}));}catch{}
  }
  document.dispatchEvent(new Event('portfolio:before-navigation'));
  try{sessionStorage.setItem(key,JSON.stringify({to:route(url),time:Date.now()}));}catch{}
  // Leave links and history native: the browser owns commit, cancellation and
  // Back/Forward. A delayed location.assign used to erase the old frame first.
 });
})();
