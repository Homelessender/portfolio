/* Shared cursor coordinates for the dock and glass surface highlights. */
export function attachPointerLight(surfaces,{x,y,enabled=()=>true,target=surface=>surface,onChange=()=>{},cacheGeometry=false,writeCoordinates=()=>true}){
 if(!surfaces.length)return ()=>{};
 const win=surfaces[0].ownerDocument.defaultView,cleanups=[],pending=new Map();let frame=0;
 // Static card geometry is reusable until scrolling, resizing or re-entry.
 // The dock keeps live measurements because its shell can transform.
 const boxes=new Map();
 const invalidate=()=>boxes.clear();
 const resize=cacheGeometry&&win.ResizeObserver?new win.ResizeObserver(invalidate):null;
 if(cacheGeometry){win.addEventListener('scroll',invalidate,{passive:true,capture:true});win.addEventListener('resize',invalidate,{passive:true});}
 function flush(){
  frame=0;
  if(!enabled()){pending.clear();return;}
  // Read every affected surface before any style writes. Keep the latest
  // pointer sample, with no easing and no second animation-frame delay.
  const paints=[];
  for(const [surface,{output,clientX,clientY}] of pending){
   const canCache=typeof cacheGeometry==='function'?cacheGeometry(surface):cacheGeometry;
   let box=canCache?boxes.get(surface):null;
   if(!box){box=surface.getBoundingClientRect();if(canCache)boxes.set(surface,box);}
   if(!box.width||!box.height)continue;
   paints.push({surface,output,px:Math.round(Math.max(0,Math.min(1,(clientX-box.x)/box.width))*100),py:Math.round(Math.max(0,Math.min(1,(clientY-box.y)/box.height))*100)});
  }
  pending.clear();
  for(const {surface,output,px,py} of paints){
   const sx=`${px}%`,sy=`${py}%`;
   if(writeCoordinates(surface)&&output.style.getPropertyValue(x)!==sx)output.style.setProperty(x,sx);
   if(writeCoordinates(surface)&&output.style.getPropertyValue(y)!==sy)output.style.setProperty(y,sy);
   onChange(surface,{x:px/100,y:py/100});
  }
 }
 for(const surface of surfaces){
  const output=target(surface);resize?.observe(surface);
  const reset=()=>{
   pending.delete(surface);boxes.delete(surface);
   if(!pending.size){win.cancelAnimationFrame(frame);frame=0;}
   output.style.removeProperty(x);output.style.removeProperty(y);onChange(surface,null);
  };
  const move=event=>{
   if(event.pointerType!=='mouse'||!enabled())return;
   pending.set(surface,{output,clientX:event.clientX,clientY:event.clientY});
   if(!frame)frame=win.requestAnimationFrame(flush);
  };
  surface.addEventListener('pointermove',move,{passive:true});
  surface.addEventListener('pointerleave',reset);
  cleanups.push(()=>{surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerleave',reset);reset();});
 }
 return ()=>{cleanups.forEach(cleanup=>cleanup());win.cancelAnimationFrame(frame);pending.clear();resize?.disconnect();if(cacheGeometry){win.removeEventListener('scroll',invalidate,true);win.removeEventListener('resize',invalidate);}boxes.clear();};
}
