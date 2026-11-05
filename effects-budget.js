/* Decorative work only. No timer or independent animation loop: the effects
   themselves supply visible frame samples, and IO owns CSS pause boundaries. */
(() => {
  if (window.PortfolioEffects) return;
  const root=document.documentElement;
  const selector='.hero-photo-slot,.availability,.how-visual,.photo-stack,.case-card,.study-aurora,.study-upper-glow,.study-contact-motes,.error-orb';
  let quality='normal',last=0,windowStart=0,samples=0,slow=0,healthy=0;
  function resetSamples(){last=windowStart=samples=slow=healthy=0;}
  function setQuality(next){
    if(quality===next)return;
    quality=next;root.dataset.effectsQuality=quality;
    window.dispatchEvent(new CustomEvent('portfolio:effects-quality',{detail:{quality}}));
  }
  function sample(now){
    if(document.hidden||document.body?.dataset.motionPaused==='true'||document.body?.dataset.motionDisabled==='true'){
      resetSamples();return;
    }
    // Several effects share one browser frame. Count that callback just once.
    if(now===last)return;
    const gap=last?now-last:0;last=now;
    // A resume, debugger stop or isolated long task is not rendering capacity.
    if(gap<=0||gap>250){windowStart=now;samples=slow=healthy=0;return;}
    if(!windowStart)windowStart=now;
    samples++;if(gap>24)slow++;
    if(now-windowStart<1800)return;
    if(samples>=30&&slow/samples>.6){setQuality('limited');healthy=0;}
    else if(samples>=60&&slow/samples<.12){healthy+=now-windowStart;if(healthy>=5400)setQuality('normal');}
    else healthy=0;
    windowStart=now;samples=slow=0;
  }
  window.PortfolioEffects={sample,interval:(fps=30)=>1000/(quality==='limited'?Math.min(fps,20):fps),get quality(){return quality;}};
  root.dataset.effectsQuality=quality;
  const seen=new WeakSet();
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries)entry.target.dataset.effectsVisible=String(entry.isIntersecting);
  }):null;
  function watch(node){
    if(seen.has(node))return;seen.add(node);
    const box=node.getBoundingClientRect();
    node.dataset.effectsVisible=String(box.width>0&&box.height>0&&box.bottom>0&&box.top<innerHeight);
    observer?.observe(node);
  }
  function scan(node){
    if(node.nodeType!==1)return;
    if(node.matches(selector))watch(node);
    node.querySelectorAll(selector).forEach(watch);
  }
  function visibility(){root.dataset.effectsHidden=String(document.hidden);resetSamples();}
  function mount(){
    scan(document.body);
    new MutationObserver(records=>{for(const record of records)record.addedNodes.forEach(scan);}).observe(document.body,{childList:true,subtree:true});
    new MutationObserver(resetSamples).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused','data-motion-disabled']});
  }
  document.addEventListener('visibilitychange',visibility);visibility();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
