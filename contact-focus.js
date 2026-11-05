/* Selected option1, homepage integration. No extra animation loop
   or canvas: reuse the already decoded static artwork and fade one cached layer. */
(() => {
  if(!document.body.classList.contains('portfolio-home'))return;
  const host=document.querySelector('#contact .contact-landscape');
  const original=host?.querySelector('.contact-static-scene')||host?.querySelector('.contact-terrain');
  if(!original)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const soft=original.cloneNode(true);
  soft.classList.add('contact-focus-soft');
  const layer=document.createElement('div');
  layer.className='contact-focus-layer';
  layer.setAttribute('aria-hidden','true');
  soft.querySelectorAll('canvas').forEach(node=>node.remove());
  soft.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  const diffuse=document.createElement('div');
  diffuse.className='contact-focus-diffuse';
  diffuse.append(soft);layer.append(diffuse);host.append(layer);
  let frame=0;
  const smooth=value=>value*value*value*(value*(value*6-15)+10);
  function update(){
    frame=0;
    const disabled=reduce.matches||document.body.dataset.motionDisabled==='true';
    if(disabled){layer.hidden=true;layer.dataset.compositing='false';host.style.setProperty('--contact-sharp-opacity','1');return;}
    if(document.hidden||document.body.dataset.motionPaused==='true')return;
    const rect=original.getBoundingClientRect();
    // Native scroll may advance before IO delivers its new intersection.
    // Use current geometry so stale IO/RAF state cannot hide the sharp layer.
    const nearby=rect.top<innerHeight+800&&rect.bottom>-800;
    if(!nearby){layer.dataset.compositing='false';return;}
    const maximum=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    const start=scrollY+rect.top-innerHeight*.95;
    // Finish as the hills reach the lower quarter of the viewport, before
    // the full landscape is exposed. Short pages still clear before the end.
    const end=Math.min(Math.max(0,maximum-24),scrollY+rect.top-innerHeight*.75);
    const progress=end<=start?1:Math.max(0,Math.min(1,(scrollY-start)/(end-start)));
    const opacity=1-smooth(progress);
    layer.hidden=opacity<=.001;
    // Suppress the sharp duplicate while the diffuse representation is shown.
    host.style.setProperty('--contact-sharp-opacity',String(layer.hidden?1:1-opacity));
    layer.dataset.compositing=String(nearby&&opacity>.001);
    layer.style.setProperty('--contact-soft-opacity',String(opacity));
    host.dataset.focusProgress=progress.toFixed(4);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  new IntersectionObserver(()=>schedule(),{rootMargin:'800px 0px'}).observe(host);
  new ResizeObserver(schedule).observe(document.body);
  addEventListener('scroll',()=>{
    if(document.hidden)return;
    cancelAnimationFrame(frame);frame=0;update();
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  addEventListener('resize',schedule,{passive:true});
  reduce.addEventListener('change',schedule);
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-motion-disabled','data-motion-paused']});
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.addEventListener('portfolio:locale-changed',schedule);
  document.fonts.ready.then(schedule);
  update();
})();
