// Separators belong between items on the same rendered line only.
const metadataRows = [...document.querySelectorAll('.metadata-row')];
function updateSeparators() {
  for (const row of metadataRows) {
    let previousTop;
    for (const item of row.children) {
      const top = item.offsetTop;
      item.classList.toggle('line-start', previousTop === undefined || Math.abs(top - previousTop) > 1);
      previousTop = top;
    }
  }
}
const metadataObserver = new ResizeObserver(updateSeparators);
metadataRows.forEach(row => metadataObserver.observe(row));
document.fonts.ready.then(updateSeparators);
document.addEventListener('portfolio:locale-changed',updateSeparators);
updateSeparators();

// Give the long photo → About journey a readable pace on touch and desktop.
(() => {
 const photo=document.querySelector('.hero-photo-slot'),about=document.getElementById('about');
 if(!photo||!about)return;
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 let frame=0;
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;};
 const finish=()=>{
  frame=0;
  about.setAttribute('tabindex','-1');about.focus({preventScroll:true});
 };
 photo.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();cancel();
  // Record the source position before scrolling so browser Back returns here.
  if(location.hash!=='#about')history.pushState(null,'','#about');
  const from=scrollY,to=Math.max(0,Math.min(scrollY+about.getBoundingClientRect().top,
   document.documentElement.scrollHeight-innerHeight));
  if(reduce.matches||Math.abs(to-from)<2){scrollTo({top:to,behavior:'instant'});finish();return;}
  const duration=Math.min(1800,1000+Math.abs(to-from)*.15),start=performance.now();
  const tick=now=>{
   const t=Math.min(1,(now-start)/duration),ease=t<.5?4*t*t*t:1-(-2*t+2)**3/2;
   scrollTo({top:from+(to-from)*ease,behavior:'instant'});
   if(t<1)frame=requestAnimationFrame(tick);else finish();
  };
  frame=requestAnimationFrame(tick);
 });
 for(const type of ['wheel','touchstart','pointerdown','pagehide'])addEventListener(type,cancel,{passive:true});
 addEventListener('keydown',event=>{if(['Escape','Tab','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cancel();});
 reduce.addEventListener('change',cancel);
})();
