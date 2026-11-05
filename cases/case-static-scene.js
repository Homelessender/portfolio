/* Keep one prepared copy of the exact static atlas for fine-pointer Safari.
   The source IMG owns layout and remains the failure/context-loss fallback. */
(()=>{
 const ua=navigator.userAgent;
 if(!/Version\/[\d.]+.*Safari\//.test(ua)||/(?:Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//.test(ua)||!matchMedia('(any-pointer:fine)').matches||!document.body.classList.contains('case-churn'))return;
 const image=document.querySelector('.contact-landscape[data-static-scene]>.contact-static-scene>.contact-static-image');
 if(!image)return;
 const host=image.parentElement,canvas=document.createElement('canvas');
 canvas.className='contact-static-bitmap';canvas.setAttribute('aria-hidden','true');
 const context=canvas.getContext('2d');if(!context)return;
 let revision=0,lost=false,painted='';
 const source=()=>image.src+'|'+image.srcset+'|'+image.currentSrc;
 const fallback=()=>{host.removeAttribute('data-bitmap-ready');canvas.remove();painted='';};
 async function prepare(){
  const signature=source();
  if(painted===signature&&canvas.isConnected&&!lost)return;
  const token=++revision;fallback();
  if(lost||document.hidden)return;
  try{
   await image.decode();
   if(token!==revision||signature!==source()||lost||document.hidden||!image.naturalWidth)return;
   if(canvas.width!==image.naturalWidth||canvas.height!==image.naturalHeight){canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;}
   context.clearRect(0,0,canvas.width,canvas.height);
   context.drawImage(image,0,0);
   // Finish the initial static raster outside the first scrolling paint.
   context.getImageData(0,0,1,1);
   if(token!==revision||signature!==source()||lost||context.isContextLost?.())return;
   host.append(canvas);painted=signature;host.dataset.bitmapReady='true';
  }catch{
   if(token===revision&&signature===source())fallback();
  }
 }
 const initial=prepare();window.PortfolioPaintTasks?.push(initial);
 new MutationObserver(prepare).observe(image,{attributes:true,attributeFilter:['src','srcset']});
 image.addEventListener('load',prepare);
 image.addEventListener('error',()=>{if(image.complete&&image.naturalWidth)return;++revision;fallback();});
 canvas.addEventListener('contextlost',()=>{lost=true;++revision;fallback();});
 canvas.addEventListener('contextrestored',()=>{lost=false;prepare();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)prepare();});
 addEventListener('pageshow',prepare);
})();
