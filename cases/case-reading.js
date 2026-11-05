/* Stable deep links for the two source compositions; no injected contents bar. */
(() => {
  const forecast=location.pathname.includes('monthly-forecast');
  const chapters=forecast
    ? [['539:1983','565:5286'],['539:1937','565:5322'],['539:1971','630:2189']]
    : [['539:3040','833:21660'],['539:3076','833:21725'],['539:3097','833:25773']];
  for(const [index,selector] of ['.case-desktop','.case-mobile'].entries()){
    const article=document.querySelector(selector);if(!article)continue;
    for(const [i,pair] of chapters.entries()){
      const heading=article.querySelector(`[data-i18n="${pair[index]}"]`);
      if(!heading)continue;
      heading.id=`chapter-${index}-${i}`;heading.tabIndex=-1;
    }
  }
  const dock=document.createElement('a');dock.className='case-contact-dock';dock.href='#contact';
  const preview=new URL(location.href).searchParams.get('contact-dock')==='1';
  if(preview){document.body.append(dock);document.body.classList.add('contact-dock-preview');}
  const render=()=>{
    const ru=document.documentElement.lang==='ru';
    dock.textContent=ru?'Связаться ↗':'Get in touch ↗';
  };
  if(preview){
    const sync=()=>{const box=document.querySelector('#contact').getBoundingClientRect();dock.hidden=scrollY<250||box.top<innerHeight||!!document.querySelector('dialog[open]');};
    addEventListener('scroll',sync,{passive:true});addEventListener('resize',sync);sync();
  }
  document.addEventListener('portfolio:locale-changed',render);render();
})();
