import {attachPointerLight} from '../surface-light/pointer-light.js?v=7f2cbcb0921c';
/* Optical enhancement for this isolated specimen. No page snapshot or render loop.
   A rounded-surface normal map refracts the actual backdrop, never the UI text.
   Native blur is the fallback; Chromium SVG backdrop filters are enhanced here. */
export function attachGlass(root){
  const surfaces=[...root.querySelectorAll('.dock-surface')];
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const imagePixels=new WeakMap();
  const ns='http://www.w3.org/2000/svg';
  const chromium=new URLSearchParams(location.search).get('glass')!=='native'&&/Chrome|Chromium/.test(navigator.userAgent)&&CSS.supports('backdrop-filter','url("#dock-lens")');
  let defs;
  if(chromium){
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:fixed;pointer-events:none;overflow:hidden';
    defs=document.createElementNS(ns,'defs');svg.append(defs);root.append(svg);
  }
  const filters=new WeakMap();
  function lens(surface,index){
    if(!defs||surface.hidden)return;
    const box=surface.getBoundingClientRect(),w=Math.round(box.width),h=Math.round(box.height);
    if(!w||!h)return;
    const pageUrl=location.href.split('#')[0],key=`${w}:${h}:${pageUrl}`;
    const old=filters.get(surface);if(old?.size===key)return;
    old?.node.remove();
    const map=document.createElement('canvas');map.width=w;map.height=h;
    const ctx=map.getContext('2d'),pixels=ctx.createImageData(w,h);
    const radius=Math.min(h/2,parseFloat(getComputedStyle(surface).borderRadius)||h/2),depth=Math.min(12,radius*.72);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const dx=x+.5-Math.max(radius,Math.min(w-radius,x+.5));
      const dy=y+.5-Math.max(radius,Math.min(h-radius,y+.5));
      const length=Math.hypot(dx,dy),distance=radius-length;
      const edge=Math.max(0,Math.min(1,1-distance/depth));
      const bend=Math.sin(edge*Math.PI)*.82;
      const at=(y*w+x)*4;
      pixels.data[at]=Math.round(128+(length?dx/length:0)*bend*127);
      pixels.data[at+1]=Math.round(128+(length?dy/length:0)*bend*127);
      pixels.data[at+2]=128;pixels.data[at+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const filter=document.createElementNS(ns,'filter'),id=`dock-lens-${index}`;
    for(const [key,value]of Object.entries({id,x:'0',y:'0',width:w,height:h,filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'}))filter.setAttribute(key,String(value));
    const image=document.createElementNS(ns,'feImage');
    for(const [key,value]of Object.entries({href:map.toDataURL(),x:0,y:0,width:w,height:h,result:'normals',preserveAspectRatio:'none'}))image.setAttribute(key,String(value));
    const displacement=document.createElementNS(ns,'feDisplacementMap');
    for(const [key,value]of Object.entries({in:'SourceGraphic',in2:'normals',scale:18,xChannelSelector:'R',yChannelSelector:'G'}))displacement.setAttribute(key,String(value));
    filter.append(image,displacement);defs.append(filter);filters.set(surface,{size:key,node:filter});
    // Absolute fragment is needed because source-page assets use a canonical <base>.
    surface.style.setProperty('--dock-lens',`url("${pageUrl}#${id}")`);
    surface.dataset.optics='refractive';
  }
  function rgba(value){const parts=value.match(/[\d.]+/g)?.map(Number);return parts?.length>=3?[parts[0],parts[1],parts[2],parts[3]??1]:[255,255,255,0];}
  function imageColor(image,x,y){
    if(!image.complete||!image.naturalWidth)return null;
    let cached=imagePixels.get(image);
    if(cached?.src!==image.currentSrc){
      try{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,96,96);cached={src:image.currentSrc,pixels:ctx.getImageData(0,0,96,96).data};imagePixels.set(image,cached);}catch{return null;}
    }
    const box=image.getBoundingClientRect(),style=getComputedStyle(image);
    let iw=box.width,ih=box.height,ox=0,oy=0;
    if(style.objectFit==='cover'||style.objectFit==='contain'){
      const scale=Math[style.objectFit==='cover'?'max':'min'](box.width/image.naturalWidth,box.height/image.naturalHeight);
      iw=image.naturalWidth*scale;ih=image.naturalHeight*scale;
      const position=style.objectPosition.split(' ').map(parseFloat);ox=(box.width-iw)*(position[0]||0)/100;oy=(box.height-ih)*(position[1]||0)/100;
    }
    const u=(x-box.x-ox)/iw,v=(y-box.y-oy)/ih;if(u<0||u>1||v<0||v>1)return null;
    const at=(Math.min(95,Math.floor(v*96))*96+Math.min(95,Math.floor(u*96)))*4;
    return [cached.pixels[at],cached.pixels[at+1],cached.pixels[at+2],cached.pixels[at+3]/255];
  }
  function luminanceAt(x,y){
    let alpha=0,r=0,g=0,b=0;
    for(const element of document.elementsFromPoint(x,y)){
      if(root.contains(element)||element===root)continue;
      const color=element.tagName==='IMG'?imageColor(element,x,y):rgba(getComputedStyle(element).backgroundColor);
      if(!color)continue;const weight=(1-alpha)*color[3];
      r+=color[0]*weight;g+=color[1]*weight;b+=color[2]*weight;alpha+=weight;if(alpha>.99)break;
    }
    const base=document.documentElement.dataset.theme==='dark'?20:255;
    const linear=[r+base*(1-alpha),g+base*(1-alpha),b+base*(1-alpha)].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
  }
  function contrast(surface){
    if(surface.hidden)return;
    const target=surface.querySelector('.dock-label')||surface;
    const box=target.getBoundingClientRect();if(box.width===0)return;
    const values=[];
    for(const x of [.15,.38,.62,.85])for(const y of [.2,.5,.8])values.push(luminanceAt(box.x+box.width*x,box.y+box.height*y));
    const sorted=values.slice().sort((a,b)=>a-b),low=sorted[0],high=sorted.at(-1),median=(sorted[5]+sorted[6])/2;
    const mixed=low<.16&&high>.45;
    // Hysteresis avoids switching ink back and forth around a single threshold.
    const threshold=surface.dataset.backdrop==='dark'?.25:.2;
    const iconNeedsLight=surface.classList.contains('dock-home')&&low<.13&&median<.32;
    surface.dataset.backdrop=mixed?'mixed':iconNeedsLight||median<threshold?'dark':'light';
  }
  let scheduled=false,last=0;
  function update(){scheduled=false;last=performance.now();if(root.hidden)return;surfaces.forEach((s,i)=>{lens(s,i);contrast(s);});}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>requestAnimationFrame(update),Math.max(0,80-(performance.now()-last)));}
  const observer=new ResizeObserver(schedule);surfaces.forEach(surface=>{
    observer.observe(surface);
  });
  attachPointerLight(surfaces,{x:'--dock-glass-x',y:'--dock-glass-y',enabled:()=>!reduced.matches});
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  document.addEventListener('load',schedule,true);
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['hidden','data-open']});
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','lang']});
  schedule();
  // Opening cannot use the scroll sampler's delayed (up to 80ms) colour.
  // Hidden panels keep their last sample; refresh after layout, before motion.
  return element=>{
    const visible=element===root?surfaces:surfaces.filter(surface=>surface===element);
    visible.forEach(surface=>{lens(surface,surfaces.indexOf(surface));contrast(surface);});
  };
}
