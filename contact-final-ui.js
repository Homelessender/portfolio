/* Native contact UI and the same word entrance used by the hero. */
(() => {
  const section = document.querySelector('.contact-section');
  if (!section) return;
  // Reuse the original scene geometry; fine stone is clipped to source bank pixels.
  // Add before contact-focus clones the terrain, so both representations match.
  for (const terrain of section.querySelectorAll('.contact-landscape:not([data-static-scene]) .contact-terrain')) {
    if (terrain.querySelector('.contact-bank-detail')) continue;
    const field=document.createElement('div');field.className='contact-bank-detail';field.setAttribute('aria-hidden','true');
    for (const [side,x] of [['left',70],['right',770]]) {
      const image=document.createElement('img');image.className='contact-bank-tile contact-bank-'+side;
      image.alt='';image.loading='lazy';image.decoding='async';
      image.dataset.bankSrc='/assets/contact/bank-detail-20261018/bank-'+side+'-1849w.webp';
      image.dataset.bankSrcset=[462,924,1849].map(w=>'/assets/contact/bank-detail-20261018/bank-'+side+'-'+w+'w.webp '+w+'w').join(', ');
      image.sizes='56.4972vw';
      image.style.cssText='left:'+(x/1770*100)+'%;top:'+(400/889*100)+'%;width:'+(1000/1770*100)+'%;height:'+(460/889*100)+'%;';field.append(image);
    }
    terrain.append(field);
  }
  // Resolve only CTA assets before water initialization; defer day-only textures at night.
  const renderTerrainAssets=()=>{
    const dark=document.documentElement.dataset.theme==='dark';
    // Night-only materials do not participate in the generic light/dark image hook.
    // In a fresh light document they have no src, so no empty/invalid URL is fetched.
    if (dark) for (const image of section.querySelectorAll('.contact-bank-tile')) {
      if (image.getAttribute('srcset')!==image.dataset.bankSrcset) image.srcset=image.dataset.bankSrcset;
      if (image.getAttribute('src')!==image.dataset.bankSrc) image.src=image.dataset.bankSrc;
    }

    for(const image of section.querySelectorAll('img[data-light-src]')){
      const sharedGrass=image.matches('.contact-new-grass,.contact-grass-tile');
      const source=dark?(image.dataset.darkSrc||(sharedGrass?image.dataset.lightSrc:'')):image.dataset.lightSrc;
      if(!source)continue; // Keep other genuinely day-only layers unfetched at night.
      const sourceSet=(dark?(image.dataset.darkSrcset||(sharedGrass?image.dataset.lightSrcset:'')):image.dataset.lightSrcset)||'';
      if(image.getAttribute('srcset')!==sourceSet)image.srcset=sourceSet;
      if(image.getAttribute('src')!==source)image.src=source;
    }
  };
  renderTerrainAssets();
  new MutationObserver(renderTerrainAssets).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const strings = {
    en: { heading:'A conversation is a good start.', telegram:'Message on Telegram', email:'Copy email', signature:'Ramin Shoniia · Product Designer', top:'Back to top', copied:'Email copied', failed:'Copy unavailable — email: ' },
    ru: { heading:'Разговор — хорошее начало.', telegram:'Написать в Telegram', email:'Копировать почту', signature:'Рамин Шония · Продуктовый дизайнер', top:'Наверх', copied:'Почта скопирована', failed:'Не удалось скопировать — почта: ' },
  };
  const heading=section.querySelector('#contact-title');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const status=section.querySelector('.contact-status');
  let feedbackAnimation, feedbackTimer, copyAttempt=0;
  const clearFeedback=()=>{
    clearTimeout(feedbackTimer);
    feedbackAnimation?.cancel();
    feedbackAnimation=null;
    status.textContent='';
  };
  const showCopied=(text)=>{
    status.textContent=text;
    if(!status.animate){feedbackTimer=setTimeout(clearFeedback,2100);return;}
    const frames=reduce.matches
      ?[{opacity:0,offset:0},{opacity:1,offset:.1},{opacity:1,offset:.88},{opacity:0,offset:1}]
      :[
        {opacity:0,transform:'translateY(-3px)',offset:0,easing:'cubic-bezier(.16,1,.3,1)'},
        {opacity:1,transform:'translateY(0)',offset:.12},
        {opacity:1,transform:'translateY(0)',offset:.58,easing:'cubic-bezier(.35,0,.65,1)'},
        {opacity:.88,transform:'translateY(8px)',offset:.72,easing:'cubic-bezier(.18,.6,.3,1)'},
        {opacity:0,transform:'translateY(24px)',offset:1},
      ];
    const animation=status.animate(frames,{duration:2100,fill:'forwards'});
    feedbackAnimation=animation;
    animation.finished.then(()=>{
      if(feedbackAnimation!==animation)return;
      status.textContent='';
      feedbackAnimation=null;
      animation.cancel();
    },()=>{});
  };
  let entered=false, observer, timer;
  const finish=()=>{
    entered=true;
    observer?.disconnect();
    clearTimeout(timer);
    heading.classList.remove('contact-reveal-pending','contact-revealing');
    heading.textContent=heading.getAttribute('aria-label')||heading.textContent;
    heading.removeAttribute('aria-label');
  };
  const prepareEntrance=()=>{
    if(entered||reduce.matches||document.body.dataset.motionDisabled==='true'||!('IntersectionObserver' in window))return;
    const text=heading.textContent;
    heading.setAttribute('aria-label',text);
    heading.replaceChildren();
    for(const token of text.match(/\s+|\S+/g)||[]){
      if(/^\s+$/.test(token)){heading.append(document.createTextNode(token));continue;}
      const word=document.createElement('span');
      word.className='contact-word';word.textContent=token;word.setAttribute('aria-hidden','true');
      heading.append(word);
    }
    heading.classList.add('contact-reveal-pending');
    observer?.disconnect();
    observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting||entry.intersectionRatio<.75)return;
      observer.disconnect();
      // Reuse the hero's rendered-line cadence, without its page-load lead-in.
      // Measure at entry so mobile wrapping and loaded fonts drive the sequence.
      const lines=[];
      for(const word of heading.querySelectorAll('.contact-word')){
        const top=word.getBoundingClientRect().top;
        let line=lines.at(-1);
        if(!line||Math.abs(line.top-top)>2){line={top,words:[]};lines.push(line);}
        line.words.push(word);
      }
      let start=140,end=0;
      lines.forEach((line,lineIndex)=>{
        const pace=lineIndex*3/Math.max(3,lines.length-1);
        const duration=850+pace*200,stagger=45+pace*15;
        line.words.forEach((word,wordIndex)=>{
          const delay=start+wordIndex*stagger;
          word.style.setProperty('--word-delay',`${delay}ms`);
          word.style.setProperty('--word-duration',`${duration}ms`);
          end=delay+duration;
        });
        start=end-duration*.78;
      });
      heading.classList.add('contact-revealing');
      timer=setTimeout(finish,end+500);
    },{threshold:.75,rootMargin:'0px 0px -18% 0px'});
    observer.observe(heading);
  };
  const render = () => {
    clearTimeout(timer);
    observer?.disconnect();
    heading.classList.remove('contact-reveal-pending','contact-revealing');
    heading.removeAttribute('aria-label');
    const copy = strings[document.documentElement.lang] || strings.en;
    document.querySelectorAll('[data-contact-copy]').forEach(node => { node.textContent = copy[node.dataset.contactCopy]; });
    section.querySelector('.contact-email').title = 'shoniya.ramin@gmail.com';
    section.querySelector('.contact-linkedin').href = 'https://www.linkedin.com/in/ramin-shonia-0677031a0/' + (document.documentElement.lang==='ru'?'?locale=ru-RU':'');
    copyAttempt++;
    clearFeedback();
    prepareEntrance();
  };
  reduce.addEventListener('change',()=>{if(reduce.matches)finish();});
  section.addEventListener('focusin',finish);
  new MutationObserver(()=>{
    if(document.body.dataset.motionDisabled==='true')finish();
  }).observe(document.body,{attributes:true,attributeFilter:['data-motion-disabled']});
  document.addEventListener('portfolio:locale-changed',render);
  const email='shoniya.ramin@gmail.com';
  section.querySelector('.contact-email').addEventListener('click',async()=>{
    const copy=strings[document.documentElement.lang]||strings.en;
    const attempt=++copyAttempt;
    clearFeedback();
    try {
      await (window.PortfolioCopyText ? window.PortfolioCopyText(email) : navigator.clipboard.writeText(email));
      if(attempt===copyAttempt)showCopied(copy.copied);
    }catch {
      if(attempt===copyAttempt)status.textContent=copy.failed+email;
    }
  });
  addEventListener('pagehide',()=>{copyAttempt++;clearFeedback();});
  const meta=section.querySelector('.contact-meta');
  const separators=()=>{
    let previous;
    for(const item of meta.children){
      const top=item.offsetTop;
      item.classList.toggle('line-start',previous===undefined||Math.abs(top-previous)>1);previous=top;
    }
  };
  new ResizeObserver(separators).observe(meta);
  document.fonts.ready.then(separators);
  render();
})();
