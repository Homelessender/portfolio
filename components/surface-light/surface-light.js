import {attachPointerLight} from './pointer-light.js?v=7f2cbcb0921c';

function mountSurfaceLights(){
 const surfaces=[...document.querySelectorAll('.portfolio-home .work-grid .case-card,.metrics,.mobile-metrics')];
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),ns='http://www.w3.org/2000/svg';
 const records=new Map();let serial=0;
 const node=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
 const stop=(offset,color,opacity)=>node('stop',{offset,'stop-color':color,'stop-opacity':opacity});
 for(const surface of surfaces){
  if(surface.dataset.surfaceLight)continue;
  const shell=surface.parentElement.matches('.corner-shell')?surface.parentElement:null;
  const svg=shell?.querySelector(':scope > .corner-stroke'),source=svg?.querySelector(':scope > path');
  const topLight=surface.matches('.portfolio-home .work-grid .case-card');
  const host=shell||surface;host.classList.add('surface-light-host');let refresh=()=>{},paint=()=>{};
  if(source){
   // Same two paints as the dock, rendered directly on the existing contour.
   // Native SVG strokes keep this independent of foreignObject masking support.
   const id=`surface-light-${++serial}`,defs=node('defs');
   const linear=node('linearGradient',{id:id+'-base',gradientUnits:'userSpaceOnUse'});
   linear.append(stop('0%','#fff',.88),stop('44%','#fff',.08),stop('76%','#2a2536',.2),stop('100%','#fff',.5));
   const radial=node('radialGradient',{id:id+'-spot',cx:0,cy:0,r:1,gradientUnits:'objectBoundingBox'});
   radial.append(stop('0%','#fff',.95),stop('62%','#fff',.07));defs.append(linear,radial);
   const group=node('g',{class:'surface-light-glint'});
   const paths=[node('path',{fill:'none','stroke-width':'1.2'}),node('path',{fill:'none','stroke-width':'1.2'})];
   group.append(...paths);svg.append(defs,group);
   refresh=()=>{const url=location.href.split('#')[0];paths[0].setAttribute('stroke',`url("${url}#${id}-base")`);paths[1].setAttribute('stroke',`url("${url}#${id}-spot")`);};
   let position=null;
   paint=(next=position)=>{position=next;
    const cx=position?.x??(topLight ? .5 : .25),cy=position?.y??0;
    // CSS ellipse farthest-corner: preserve the dock's normalized field size.
    const rx=Math.max(cx,1-cx)*Math.SQRT2,ry=Math.max(cy,1-cy)*Math.SQRT2;
    radial.setAttribute('gradientTransform',`translate(${cx} ${cy}) scale(${rx} ${ry})`);
   };
   const sync=()=>{
    for(const path of paths)for(const attr of ['d','transform']){const value=source.getAttribute(attr);if(value===null)path.removeAttribute(attr);else path.setAttribute(attr,value);}
    const w=parseFloat(svg.getAttribute('width')),h=parseFloat(svg.getAttribute('height'));
    if(w&&h){linear.setAttribute('x1',topLight?w/2:(w-h)/4);linear.setAttribute('y1',topLight?0:(h-w)/4);linear.setAttribute('x2',topLight?w/2:(3*w+h)/4);linear.setAttribute('y2',topLight?h:(w+3*h)/4);}paint();
   };
   refresh();sync();new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['d','transform']});
   surface.dataset.surfaceLight='contour';
  }else{
   const rim=document.createElement('span');rim.className='surface-light-glint surface-light-fallback surface-light-paint';rim.setAttribute('aria-hidden','true');surface.append(rim);surface.dataset.surfaceLight='fallback';
  }
  records.set(surface,{host,paint,refresh});
 }
 const enabled=()=>!document.hidden&&document.documentElement.dataset.theme==='dark'&&!reduced.matches&&document.body.dataset.motionDisabled!=='true'&&document.body.dataset.motionPaused!=='true';
 // One paint per input frame, with no easing behind the pointer or idle tail.
 attachPointerLight([...records.keys()],{
  x:'--surface-light-x',y:'--surface-light-y',enabled,cacheGeometry:surface=>!surface.closest('.work-revealing'),
  writeCoordinates:surface=>surface.dataset.surfaceLight!=='contour',
  target:surface=>records.get(surface).host,
  onChange:(surface,point)=>{if(enabled())records.get(surface).paint(point);}
 });
 const reset=()=>{for(const {host,paint}of records.values()){host.style.removeProperty('--surface-light-x');host.style.removeProperty('--surface-light-y');paint(null);}};
 new MutationObserver(reset).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 new MutationObserver(reset).observe(document.body,{attributes:true,attributeFilter:['data-motion-disabled','data-motion-paused']});
 reduced.addEventListener('change',reset);document.addEventListener('visibilitychange',reset);
 document.addEventListener('portfolio:locale-changed',()=>records.forEach(r=>r.refresh()));
}
if(document.readyState==='complete')mountSurfaceLights();else document.addEventListener('DOMContentLoaded',mountSurfaceLights,{once:true});
