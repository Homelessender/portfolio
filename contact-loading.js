/* A tiny source-matched scene is present in CSS from the first paint.
   Start the scene eagerly and warm details on the first downward scroll; retain the small scene
   underneath during an immediate jump, slow connection or failed request. */
(() => {
  const section=document.querySelector('.contact-section');
  if(!section)return;
  const isMaterial=image=>image instanceof HTMLImageElement&&!!image.closest('.contact-terrain');
  const masks=new Map();
  const maskReady=image=>{
    const pending=[];
    for(let node=image;node&&node!==section;node=node.parentElement){
      const value=getComputedStyle(node).maskImage;
      for(const match of value.matchAll(/url\(["']?(.*?)["']?\)/g)){
        const url=match[1];
        if(!masks.has(url)){
          const mask=new Image();mask.src=url;
          masks.set(url,mask.decode().catch(()=>{}));
        }
        pending.push(masks.get(url));
      }
    }
    return Promise.all(pending);
  };
  const markReady=async image=>{
    if(!isMaterial(image)||!image.complete||!image.naturalWidth)return;
    const source=image.currentSrc;
    try { await Promise.all([image.decode(),maskReady(image)]); } catch { return; }
    if(source!==image.currentSrc||!image.naturalWidth||image.dataset.contactReady==='true')return;
    // Give WebKit a committed zero-opacity state before revealing a decoded
    // image. Decode completion and lazy-image insertion may share one update.
    getComputedStyle(image).opacity;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(source===image.currentSrc&&image.naturalWidth)image.dataset.contactReady='true';
    }));
  };
  section.addEventListener('load',event=>markReady(event.target),true);
  // A transient preview/network failure gets one retry; the inline scene
  // remains available even when that retry also fails.
  section.addEventListener('error',event=>{
    const image=event.target;
    if(!isMaterial(image)||!image.getAttribute('src'))return;
    const source=new URL(image.currentSrc||image.src,location.href);
    if(source.searchParams.has('contact-retry'))return;
    const retry=url=>{
      const value=new URL(url,location.href);value.searchParams.set('contact-retry','1');return value.href;
    };
    if(image.srcset)image.srcset=image.srcset.split(',').map(candidate=>{
      const [url,size]=candidate.trim().split(/\s+/);return retry(url)+(size?' '+size:'');
    }).join(', ');
    image.src=retry(image.src);
  },true);
  new MutationObserver(records=>{
    for(const record of records)if(isMaterial(record.target)){
      delete record.target.dataset.contactReady;
      markReady(record.target);
    }
  }).observe(section,{subtree:true,attributes:true,attributeFilter:['src','srcset']});
  let warmed=false;
  const warm=()=>{
    warmed=true;section.dataset.terrainWarmed='true';
    removeEventListener('scroll',warmOnScroll);
    section.dispatchEvent(new Event('contact:terrain-warm'));
    for(const image of section.querySelectorAll('.contact-terrain img')){
      image.loading='eager';markReady(image);
    }
  };
  // The base scene does not wait for lazy-loading eligibility. The much larger
  // grass/bank textures still wait for the reader to start scrolling.
  const scene=section.querySelector('.contact-extended');
  if(scene){scene.loading='eager';scene.fetchPriority='low';markReady(scene);}
  const warmOnScroll=()=>{if(scrollY>0)warm();};
  addEventListener('scroll',warmOnScroll,{passive:true});
  let near;
  const observeApproach=()=>{
    if(warmed)return;
    near?.disconnect();
    near=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){
        warm();near.disconnect();removeEventListener('resize',observeApproach);
      }
    },{rootMargin:Math.ceil(innerHeight*2)+'px 0px'});
    near.observe(section);
  };
  observeApproach();
  addEventListener('resize',observeApproach,{passive:true});
  // Covers the homepage's diffuse clone as well as later theme material nodes.
  new MutationObserver(()=>{
    if(warmed)for(const image of section.querySelectorAll('.contact-terrain img')){
      image.loading='eager';markReady(image);
    }
  }).observe(section,{subtree:true,childList:true});
  // History/reload may restore a nonzero position before listeners attach.
  warmOnScroll();
})();
