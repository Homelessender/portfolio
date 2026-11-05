/* Content images keep their measured slot on slow/error responses. Decorative
   terrain and animated composites retain their own source-matched fallbacks. */
(() => {
 const selector='.product-board img,.mobile-hero-visual img,.case-hero-art img,.about-grid img.portrait';
 const records=new Map();
 const copy=()=>document.documentElement.lang==='ru'
  ?{loading:'Загрузка изображения…',failed:'Изображение не загрузилось',retry:'Повторить загрузку'}
  :{loading:'Loading image…',failed:'Image could not load',retry:'Retry image'};
 function attach(image){
  if(records.has(image))return;
  const host=image.closest('.product-board,.mobile-hero-visual,.case-hero-art,.corner-shell')||image.parentElement;
  if(!host)return;
  host.classList.add('media-host');
  const notice=document.createElement('div');notice.className='media-notice';notice.hidden=true;
  const label=document.createElement('span');label.className='media-label';
  const retry=document.createElement('button');retry.type='button';retry.className='media-retry';
  notice.append(label,retry);host.append(notice);
  let revision=0,state='loading',hasFocus=false;
  const localize=()=>{
   const t=copy();label.textContent=state==='error'?t.failed:t.loading;
   retry.textContent=state==='loading'?t.loading:t.retry;
   retry.setAttribute('aria-label',(state==='loading'?t.loading:t.retry)+(image.alt?' — '+image.alt:''));
  };
  const paint=next=>{
   const restoreFocus=next==='ready'&&hasFocus&&document.activeElement===retry;
   state=next;image.dataset.mediaState=next;host.dataset.mediaState=next;
   notice.hidden=next==='ready';retry.hidden=next!=='error'&&!(next==='loading'&&hasFocus);
   retry.setAttribute('aria-disabled',String(next==='loading'));localize();
   image.setAttribute('aria-busy',String(next==='loading'));
   if(restoreFocus){
    const target=host.querySelector('a')||image;
    if(target===image){image.tabIndex=-1;image.addEventListener('blur',()=>image.removeAttribute('tabindex'),{once:true});}
    target.focus({preventScroll:true});
   }
   if(next==='ready')hasFocus=false;
  };
  const ready=async()=>{
   const token=++revision,src=image.currentSrc||image.src;
   if(!image.getAttribute('src')){paint('loading');return;}
   if(!image.complete){paint('loading');return;}
   if(!image.naturalWidth){paint('error');return;}
   try{await image.decode();}catch{if(token===revision&&src===(image.currentSrc||image.src))paint('error');return;}
   if(token===revision&&src===(image.currentSrc||image.src))paint('ready');
  };
  image.addEventListener('load',ready);
  image.addEventListener('error',()=>{++revision;paint('error');});
  retry.addEventListener('click',()=>{
   if(state!=='error')return;
   hasFocus=document.activeElement===retry;
   ++revision;paint('loading');image.loading='eager';
   // Reload the currently selected themed/localized source, not a stored URL.
   const url=new URL(image.src,location.href);url.searchParams.set('media-retry',String(Date.now()));image.src=url.href;
  });
  new MutationObserver(()=>ready()).observe(image,{attributes:true,attributeFilter:['src','srcset']});
  records.set(image,{localize});ready();
 }
 document.querySelectorAll(selector).forEach(attach);
 // Corner smoothing may create a wrapper later; content sources already exist
 // before this deferred script. No body-wide attribute observer is needed.
 document.addEventListener('portfolio:locale-changed',()=>{for(const record of records.values())record.localize();});
})();
