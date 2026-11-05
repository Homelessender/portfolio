// Native text paint. Measured word boxes retain the original shaping advances
// when per-glyph spans would otherwise accumulate fractional rounding errors.
const instances = new WeakMap();
let serial = 0;
export const MAX_TRAIL = 15;
export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
export function expand(rect, pad = 4) {
  return {left:rect.left-pad,right:rect.right+pad,top:rect.top-pad,bottom:rect.bottom+pad};
}
export function strengthAt(rect, point, protectedRects, radius = 82) {
  if (protectedRects.some(p => point.x >= p.left && point.x <= p.right && point.y >= p.top && point.y <= p.bottom)) return 0;
  // Include the complete finite shadow footprint, not just the glyph or H1 box.
  const paint = {left:rect.left-14,right:rect.right+14,top:rect.top-2,bottom:rect.bottom+MAX_TRAIL+14};
  if (protectedRects.some(p => overlaps(paint,p))) return 0;
  const dx=Math.max(rect.left-point.x,0,point.x-rect.right);
  const dy=Math.max(rect.top-point.y,0,point.y-rect.bottom);
  return Math.max(0,1-Math.hypot(dx,dy)/radius)**2;
}
export function createHeroRefraction(heading, {enabled=true,radius=82}={}) {
  if(!heading?.ownerDocument?.defaultView)throw new TypeError('Expected an existing heading element');
  if(instances.has(heading))return instances.get(heading);
  const doc=heading.ownerDocument,win=doc.defaultView;
  const supported=!!win.CSS?.highlights && typeof win.Highlight==='function';
  if(!supported){const inert=Object.freeze({enabled:false,supported:false,diagnostics:{enabled:false,supported:false,framePending:false,frames:0,rangeCount:0,glyphs:0},setEnabled(){},destroy(){instances.delete(heading)}});instances.set(heading,inert);return inert;}
  const preference=win.matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference) and (forced-colors:none)');
  const root=doc.documentElement,prefix=`hero-refraction-${++serial}`,levels=12;
  const protectedSelector='a,button,input,textarea,select,img,picture,svg,canvas,[aria-hidden="true"],script,style';
  let wanted=enabled,destroyed=false,mounted=false,frame=0,point=null,lastMove=0,previous=0;
  let cursorTimer=0,cursorSample=null,releasing=false,cursorFrame=0,cursorPaint=null;
  const wrapped=[];let paints=[];
  let cursor,style,glyphs=[],dirty=true,ink='',frames=0,rangeCount=0;
  const highlights=Array.from({length:levels},()=>new win.Highlight());
  const names=highlights.map((_,i)=>`${prefix}-${i}`);
  const stats=()=>({enabled:mounted,supported,framePending:!!frame,frames,rangeCount,glyphs:glyphs.length});
  function clear(){
    // Once the heading is idle, pointer traffic elsewhere must stay O(1).
    if(!frame&&!point&&!rangeCount)return;
    win.cancelAnimationFrame(frame);frame=0;point=null;rangeCount=0;
    glyphs.forEach(g=>{g.amount=0;if(g.element&&g.level>=0){g.element.style.removeProperty("color");g.element.style.removeProperty("text-shadow");}g.level=-1;});highlights.forEach(h=>h.clear());
  }
  function hide(){clear();win.cancelAnimationFrame(cursorFrame);cursorFrame=0;cursorPaint=null;win.clearTimeout(cursorTimer);if(cursor){cursor.hidden=true;cursor.style.removeProperty('--cursor-size');cursorSample=null;}}
  function resetGeometry(){
    dirty=true;clear();
    // Pixel advances belong to the current font/viewport only. Restore native
    // flow immediately on reflow, even if the pointer never moves again.
    if(wrapped.length){
      contentObserver.disconnect();restoreText();glyphs=[];
      if(mounted)contentObserver.observe(heading,{childList:true,characterData:true,subtree:true});
    }
  }
  function setInk(){
    const next=win.getComputedStyle(heading).color;
    if(next===ink)return;ink=next;
    // Highlight properties paint glyphs only; no background/filter is involved.
    paints=names.map((name,i)=>{
      const s=(i+1)/levels;
      return `color:color-mix(in srgb,${ink} ${100-s*86}%,transparent);text-shadow:0 ${1.5*s}px ${.3+1.5*s}px color-mix(in srgb,${ink} ${s*82}%,transparent),0 ${5*s}px ${1+2*s}px color-mix(in srgb,${ink} ${s*60}%,transparent),0 ${10*s}px ${1+2.8*s}px color-mix(in srgb,${ink} ${s*38}%,transparent),0 ${MAX_TRAIL*s}px ${1+3.2*s}px color-mix(in srgb,${ink} ${s*18}%,transparent)`;
    });
    style.textContent='';
  }
  function collect(rect){
    contentObserver.disconnect();
    restoreText();
    // Native inline paint has room for the full shadow; custom highlight paint
    // can be clipped at its line fragment. Move text nodes, never clone text.
    const walker=doc.createTreeWalker(heading,win.NodeFilter.SHOW_TEXT),nodes=[];
    let node;while((node=walker.nextNode()))if(!node.parentElement?.closest(protectedSelector)&&!node.parentElement?.hasAttribute('data-smear-glyph'))nodes.push(node);
    // Safari Range fragment bounds can round outwards to whole pixels.
    // Measure native inline element boxes instead, before splitting any glyph.
    const words=[];
    for(const original of nodes){
      const fragment=doc.createDocumentFragment(),parts=[];
      for(const text of original.textContent.match(/\s+|[^\s-]+-?|-/g)||[]){
        if(/^\s+$/u.test(text)){const plain=doc.createTextNode(text);fragment.append(plain);parts.push(plain);continue;}
        const word=doc.createElement('span');word.dataset.smearWord='';word.textContent=text;
        fragment.append(word);parts.push(word);words.push(word);
      }
      original.replaceWith(fragment);wrapped.push({original,parts});
    }
    const measured=words.map(word=>({word,width:word.getClientRects().length===1?word.getBoundingClientRect().width:null}));
    for(const {word,width} of measured){
      // Preserve native wrapping of a long token at narrow/enlarged layouts.
      if(width==null)continue;
      const text=word.textContent;
      word.style.cssText=`display:inline-block;vertical-align:baseline;width:${width}px;white-space:nowrap;`;
      word.textContent='';
      for(const char of text){const span=doc.createElement('span');span.dataset.smearGlyph='';span.textContent=char;word.append(span);}
    }
    glyphs=[];
    const canvas=doc.createElement('canvas'),context=canvas.getContext('2d');
    const font=win.getComputedStyle(heading);context.font=font.font;
    for(const element of heading.querySelectorAll('[data-smear-glyph]')){
      const range=doc.createRange();range.selectNodeContents(element);
      const box=range.getBoundingClientRect(),metrics=context.measureText(element.textContent);
      // Range boxes include font leading. Protect the actual ink instead.
      const marker=doc.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';element.append(marker);
      const baseline=marker.getBoundingClientRect().top;marker.remove();
      glyphs.push({element,range,left:box.left-rect.left,right:box.right-rect.left,top:baseline-metrics.actualBoundingBoxAscent-rect.top,bottom:baseline+metrics.actualBoundingBoxDescent-rect.top,amount:0,level:-1});
    }
    contentObserver.observe(heading,{childList:true,characterData:true,subtree:true});dirty=false;
  }
  function restoreText(){
    for(const {original,parts} of wrapped){
      if(parts.length&&parts.every(n=>n.isConnected&&n.parentNode===parts[0].parentNode)){
        parts[0].before(original);parts.forEach(n=>n.remove());
      }
    }
    wrapped.length=0;
  }
  function protectedBoxes(){
    return [...heading.querySelectorAll(protectedSelector)].map(n=>expand(n.getBoundingClientRect(),.5));
  }
  function render(now){
    frame=0;frames++;
    if(!mounted||doc.hidden||!heading.isConnected||heading.classList.contains('hero-reveal-pending'))return clear();
    if(now-lastMove>4275)return clear();
    const rect=heading.getBoundingClientRect();
    if(dirty)collect(rect);
    setInk();
    const excluded=protectedBoxes(),dt=Math.min(50,Math.max(0,now-previous));previous=now;
    const hot=!releasing&&!!point&&now-lastMove<170&&!heading.classList.contains('hero-reveal-pending');
    highlights.forEach(h=>h.clear());rangeCount=0;
    let remaining=false;
    for(const glyph of glyphs){
      const box={left:rect.left+glyph.left,right:rect.left+glyph.right,top:rect.top+glyph.top,bottom:rect.top+glyph.bottom};
      const safe=point?strengthAt(box,point,excluded,Math.min(90,Math.max(24,radius))):0;
      const target=hot?safe:0;
      glyph.amount+=(target-glyph.amount)*(1-Math.exp(-dt/(hot?30:810)));
      // Geometry protection is immediate, even while previous text paint decays.
      if(!safe)glyph.amount=0;
      const level=Math.min(levels-1,Math.floor(glyph.amount*levels)-1);
      if(level!==glyph.level){glyph.element.style.cssText=level>=0?paints[level]:'';glyph.level=level;}
      if(level>=0){rangeCount++;remaining=true;}
    }
    if(hot||remaining)frame=win.requestAnimationFrame(render);
  }
  function paintCursor(){
    cursorFrame=0;
    if(!mounted||doc.hidden||!cursorPaint)return;
    const {x,y,size,action}=cursorPaint;cursorPaint=null;
    cursor.hidden=false;
    cursor.style.setProperty('--cursor-size',size);
    cursor.style.transform=`translate3d(${x}px,${y}px,0)`;
    if(cursor.dataset.action!==action)cursor.dataset.action=action;
  }
  function move(event){
    if(event.pointerType!=='mouse'){hide();return;}
    const textTarget=heading.contains(event.target)&&!event.target.closest?.(protectedSelector);
    // Selection reads can force layout. Read only for text interaction, before
    // changing cursor styles; card movement never needs this document query.
    const selecting=textTarget&&(event.buttons||!doc.getSelection()?.isCollapsed);
    if(!textTarget){clear();return;}
    if(selecting){release();return;}
    releasing=false;point={x:event.clientX,y:event.clientY};lastMove=win.performance.now();
    if(!frame){previous=lastMove;frame=win.requestAnimationFrame(render);}
  }
  const onExit=e=>{if(!e.relatedTarget)hide();};
  function release(){
    if(!mounted||!point)return;
    if(!releasing){releasing=true;lastMove=win.performance.now();}
    if(!frame){previous=win.performance.now();frame=win.requestAnimationFrame(render);}
  }
  const onPointerDown=event=>{if(heading.contains(event.target)&&!event.target.closest?.(protectedSelector))release();else clear();};
  const onSelection=()=>{if(!doc.getSelection()?.isCollapsed)release();};
  const onTheme=()=>{ink='';resetGeometry();};
  const contentObserver=new win.MutationObserver(resetGeometry);
  const themeObserver=new win.MutationObserver(onTheme);
  let observedSize=null;
  const resizeObserver=new win.ResizeObserver(([entry])=>{
    if(!entry)return;
    const {width,height}=entry.contentRect;
    if(!observedSize){observedSize={width,height};return;}
    // Inline-block baselines can differ by a few layout subpixels in WebKit.
    // Do not tear down the effect because of that imperceptible paint setup.
    if(Math.abs(width-observedSize.width)<.5&&Math.abs(height-observedSize.height)<.5)return;
    observedSize={width,height};resetGeometry();
  });
  function mount(){
    mounted=true;dirty=true;observedSize=null;
    style=doc.createElement('style');style.dataset.heroRefraction=prefix;doc.head.append(style);setInk();
    names.forEach((name,i)=>win.CSS.highlights.set(name,highlights[i]));
    doc.addEventListener('pointermove',move,{passive:true});
    doc.addEventListener('pointerdown',onPointerDown,{passive:true});
    doc.addEventListener('pointerout',onExit,{passive:true});
    doc.addEventListener('selectionchange',onSelection);
    doc.addEventListener('visibilitychange',hide);
    win.addEventListener('scroll',resetGeometry,{capture:true,passive:true});
    win.addEventListener('resize',resetGeometry,{passive:true});
    win.addEventListener('blur',hide);win.addEventListener('pagehide',hide);
    doc.fonts?.addEventListener('loadingdone',resetGeometry);
    contentObserver.observe(heading,{childList:true,characterData:true,subtree:true});
    themeObserver.observe(root,{attributes:true,attributeFilter:['data-theme']});resizeObserver.observe(heading);
  }
  function unmount(){
    hide();mounted=false;ink='';
    root.classList.remove('hero-refraction-cursor-enabled');cursor?.remove();style?.remove();
    names.forEach(name=>win.CSS.highlights.delete(name));
    doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerdown',onPointerDown);
    doc.removeEventListener('pointerout',onExit);doc.removeEventListener('selectionchange',onSelection);doc.removeEventListener('visibilitychange',hide);
    win.removeEventListener('scroll',resetGeometry,true);win.removeEventListener('resize',resetGeometry);
    win.removeEventListener('blur',hide);win.removeEventListener('pagehide',hide);doc.fonts?.removeEventListener('loadingdone',resetGeometry);
    contentObserver.disconnect();themeObserver.disconnect();resizeObserver.disconnect();
    restoreText();glyphs=[];
  }
  function sync(){const active=wanted&&!destroyed&&supported&&preference.matches;if(active&&!mounted)mount();else if(!active&&mounted)unmount();}
  const api=Object.freeze({get enabled(){return mounted},get supported(){return supported},get diagnostics(){return stats()},setEnabled(value){wanted=!!value;sync()},destroy(){if(destroyed)return;destroyed=true;if(mounted)unmount();preference.removeEventListener('change',sync);instances.delete(heading)}});
  instances.set(heading,api);preference.addEventListener('change',sync);sync();return api;
}
