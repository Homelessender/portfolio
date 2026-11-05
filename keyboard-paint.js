/* Safari can advance a long keyboard scroll before the corresponding tiles
   paint. Pace only root Home/End jumps on the main frame; retain smooth motion.
   Wheel/touch gestures, editable controls and nested scrollers stay native. */
(()=>{
 if(window.PortfolioKeyboardPaintSync)return;
 const ua=navigator.userAgent;
 if(!/Version\/[\d.]+.*Safari\//.test(ua)||/(?:Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//.test(ua))return;
 const fine=matchMedia('(any-pointer:fine)'),reduce=matchMedia('(prefers-reduced-motion:reduce)');
 if(!fine.matches)return;
 window.PortfolioKeyboardPaintSync=true;
 let frame=0,motion=null;
 function cancel(){cancelAnimationFrame(frame);frame=0;motion=null;}
 function ownsKey(target){
  if(!(target instanceof Element))return false;
  if(document.querySelector('dialog[open]'))return true;
  if(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="spinbutton"],[role="menu"],[role="listbox"],[role="tree"],[role="grid"],[role="tablist"]'))return true;
  for(let node=target;node&&node!==document.body&&node!==document.documentElement;node=node.parentElement){
   if(node.scrollHeight>node.clientHeight+1&&/^(auto|scroll)$/.test(getComputedStyle(node).overflowY))return true;
  }
  return false;
 }
 function step(now){
  frame=0;if(!motion)return;
  const t=Math.min(1,Math.max(0,(now-motion.start)/250));
  const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const maximum=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const target=motion.end?maximum:0;
  scrollTo({left:motion.x,top:motion.from+(target-motion.from)*eased,behavior:'instant'});
  if(t<1)frame=requestAnimationFrame(step);else motion=null;
 }
 addEventListener('keydown',event=>{
  const jump=event.key==='Home'||event.key==='End';
  if(!jump){if(motion)cancel();return;}
  if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||reduce.matches||!fine.matches||ownsKey(event.target)){cancel();return;}
  const end=event.key==='End';
  if(motion?.end===end){event.preventDefault();return;}
  const target=end?Math.max(0,document.documentElement.scrollHeight-innerHeight):0;
  // Small jumps do not traverse unpainted parts of the long case studies.
  if(Math.abs(target-scrollY)<innerHeight*2){cancel();return;}
  event.preventDefault();cancel();
  motion={from:scrollY,x:scrollX,end,start:performance.now()};
  frame=requestAnimationFrame(step);
 },{capture:true});
 for(const type of ['wheel','pointerdown','touchstart','focusin','pagehide','blur','resize'])addEventListener(type,cancel,{capture:true,passive:true});
 document.addEventListener('visibilitychange',cancel);
 fine.addEventListener('change',cancel);reduce.addEventListener('change',cancel);
})();
