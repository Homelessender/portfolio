/* Independent of the heading effect; one cursor instance per document. */
(() => {
  if(window.portfolioArrow)return;
  const root=document.documentElement;
  const preference=matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference) and (forced-colors:none)');
  const arrow=document.createElement('div');arrow.className='site-arrow';arrow.hidden=true;arrow.setAttribute('aria-hidden','true');document.body.append(arrow);
  let sample=null,timer=0;
  function release(){delete arrow.dataset.pressed;}
  function hide(){release();clearTimeout(timer);timer=0;sample=null;arrow.hidden=true;arrow.style.removeProperty('--cursor-size');root.classList.remove('site-arrow-active');}
  function move(event){
    if(!preference.matches||event.pointerType!=='mouse'||document.hidden){hide();return;}
    if(!(event.buttons&1))release();
    const now=performance.now();
    const speed=sample?Math.hypot(event.clientX-sample.x,event.clientY-sample.y)/Math.max(1,now-sample.time):0;
    sample={x:event.clientX,y:event.clientY,time:now};
    arrow.style.setProperty('--cursor-size',`${(12+16*(1-Math.exp(-speed/1.5))).toFixed(2)}px`);
    arrow.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0)`;
    arrow.hidden=false;root.classList.add('site-arrow-active');
    clearTimeout(timer);timer=setTimeout(()=>{timer=0;arrow.style.removeProperty('--cursor-size');sample=null;},160);
  }
  const press=event=>{if(event.button!==0||event.pointerType!=='mouse'||!preference.matches)return;move(event);arrow.dataset.pressed='true';};
  const leave=event=>{if(!event.relatedTarget)hide();};
  const visibility=()=>{if(document.hidden)hide();};
  document.addEventListener('pointerdown',press,{passive:true});
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerout',leave,{passive:true});
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('blur',hide);window.addEventListener('pagehide',hide);
  preference.addEventListener('change',hide);
  window.portfolioArrow=Object.freeze({hide,destroy(){hide();arrow.remove();document.removeEventListener('pointerdown',press);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);document.removeEventListener('pointermove',move);document.removeEventListener('pointerout',leave);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',hide);window.removeEventListener('pagehide',hide);preference.removeEventListener('change',hide);delete window.portfolioArrow;}});
})();
