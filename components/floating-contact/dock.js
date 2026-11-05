/* Shared floating navigation, promoted from the selected isolated component. */
(() => {
  if(document.querySelector('[data-floating-contact]'))return;
  const isHome=document.body.classList.contains('portfolio-home');
  const work=isHome?document.querySelector('#work'):null;
  const root=document.createElement('nav');root.className='floating-contact';root.dataset.floatingContact='';root.hidden=true;
  const iconBase=new URL('icons/',document.currentScript.src);
  const icon=(name,extra='')=>{const e=document.createElement('span');e.className='dock-icon '+extra;e.style.setProperty('--dock-icon',`url("${new URL(name+'.svg',iconBase)}")`);e.setAttribute('aria-hidden','true');return e;};
  const home=document.createElement('a');home.className='dock-home dock-surface';home.target='_self';home.append(icon(isHome?'arrow-up':'home'));
  const hint=document.createElement('span');hint.className='dock-home-label';hint.setAttribute('aria-hidden','true');home.append(hint);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='dock-trigger dock-surface';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','floating-contact-panel');trigger.setAttribute('aria-haspopup','menu');
  const label=document.createElement('span');label.className='dock-label';const core=document.createElement('span');core.className='dock-core';core.append(icon('message-circle'));trigger.append(label,core);
  const panel=document.createElement('div');panel.className='dock-panel dock-surface';panel.id='floating-contact-panel';panel.setAttribute('role','menu');panel.hidden=true;
  const item=(tag,kind,text)=>{const el=document.createElement(tag);el.className='dock-item';if(tag==='button')el.type='button';else{el.target='_blank';el.rel='noopener noreferrer';}el.append(icon(kind));const span=document.createElement('span');span.className='dock-item-label';span.textContent=text;el.append(span,icon(tag==='button'?'check':'arrow-up-right','dock-external'));if(tag==='button')el.lastChild.style.visibility='hidden';panel.append(el);return el;};
  const telegram=item('a','send','Telegram');telegram.href='https://t.me/Raminovichus';
  const email=item('button','mail','');
  const linkedin=item('a','linkedin','LinkedIn');
  for(const entry of [telegram,email,linkedin])entry.setAttribute('role','menuitem');
  const feedback=document.createElement('span');feedback.className='dock-feedback sr-only';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  if(isHome){root.dataset.mode='work-return';root.append(home);}else root.append(home,trigger,panel,feedback);
  document.body.append(root);
  let prepareGlass;
  import(new URL('dock-glass.js?v=a6554a25a84e',document.currentScript.src).href).then(({attachGlass})=>{prepareGlass=attachGlass(root);}).catch(error=>console.warn('Dock optics unavailable; readable native glass retained.',error));
  // One reversible presence animation for the dock and its contact sheet.
  // Keep the element painted until the exit ends; inert removes closing controls
  // from pointer/keyboard interaction immediately. Reversals start where they are.
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const presence=new Map();
  function setPresence(element,visible){
    const previous=presence.get(element);
    if(previous?.visible===visible)return;
    const style=previous?.animation?getComputedStyle(element):null;
    const current=style?{opacity:style.opacity,transform:style.transform,filter:style.filter}:null;
    previous?.animation?.cancel();
    const state={visible,animation:null};presence.set(element,state);
    element.inert=!visible;
    if(reduce.matches||(!visible&&element.hidden)){
      element.hidden=!visible;if(visible)prepareGlass?.(element);return;
    }
    element.hidden=false;
    // Resolve the actual backdrop before the first painted opening frame.
    if(visible)prepareGlass?.(element);
    const sheet=element===panel;
    const dissolved={opacity:0,transform:`translateY(${sheet?10:8}px) scale(${sheet?'.94':'.95'})`,filter:'blur(3px)'};
    const clear={opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0px)'};
    const animation=element.animate([current||(visible?dissolved:clear),visible?clear:dissolved],{
      duration:visible?420:240,easing:visible?'cubic-bezier(.16,1,.3,1)':'cubic-bezier(.4,0,.8,.4)',fill:'both'
    });
    state.animation=animation;
    animation.onfinish=()=>{
      if(presence.get(element)!==state)return;
      element.hidden=!visible;state.animation=null;animation.cancel();
    };
  }
  reduce.addEventListener('change',()=>{
    if(!reduce.matches)return;
    for(const [element,state] of presence){state.animation?.cancel();state.animation=null;element.hidden=!state.visible;}
  });
  let open=false,copyTimer,copySerial=0,copiedUntil=0,copyFailed=false,pointerOpen=null;
  const strings=()=>document.documentElement.lang==='ru'?{contact:'Связаться',home:isHome?'К кейсам':'На главную',nav:isHome?'Навигация по странице':'Навигация и контакты',panel:'Способы связи',email:'Почта',copy:'Копировать почту',copied:'Скопировано',fail:'Почта: shoniya.ramin@gmail.com'}:{contact:'Get in touch',home:isHome?'Back to projects':'Home',nav:isHome?'Page navigation':'Navigation and contact',panel:'Contact options',email:'Email',copy:'Copy email',copied:'Copied',fail:'Email: shoniya.ramin@gmail.com'};
  const setOpen=(next,focusFirst=false,returnFocus=false)=>{open=next;root.dataset.open=String(open);setPresence(panel,open);trigger.setAttribute('aria-expanded',String(open));core.replaceChildren(icon(open?'x':'message-circle'));if(open&&focusFirst)telegram.focus();if(!open&&returnFocus)trigger.focus({preventScroll:true});};
  const render=()=>{const s=strings();root.setAttribute('aria-label',s.nav);home.setAttribute('aria-label',s.home);home.href=isHome?'#work':(window.PortfolioHomeHref?.()||'/?lang='+(document.documentElement.lang==='ru'?'ru':'en'));hint.textContent=s.home;label.textContent=s.contact;panel.setAttribute('aria-label',s.panel);email.querySelector('.dock-item-label').textContent=s.email;email.setAttribute('aria-label',s.copy);email.title='shoniya.ramin@gmail.com';linkedin.href='https://www.linkedin.com/in/ramin-shonia-0677031a0/'+(document.documentElement.lang==='ru'?'?locale=ru-RU':'');};
  if(isHome)home.addEventListener('click',event=>{
    if(!work||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    work.tabIndex=-1;work.focus({preventScroll:true});
    work.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});
    history.replaceState(history.state,'',home.href);
  });
  // Safari does not focus buttons on pointer click. Keep focus inside the dock
  // and capture intent before focusout can close it between pointerdown/click.
  trigger.addEventListener('pointerdown',()=>{pointerOpen=!open;trigger.focus({preventScroll:true});});
  trigger.addEventListener('pointercancel',()=>{pointerOpen=null;});
  trigger.addEventListener('click',event=>{const next=event.detail>0&&pointerOpen!==null?pointerOpen:!open;pointerOpen=null;setOpen(next,next&&event.detail===0);});
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true,true);}});
  document.addEventListener('pointerdown',event=>{if(open&&!root.contains(event.target))setOpen(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false,false,true);}});
  // A touch activation in iOS Safari can blur the trigger to body immediately
  // before click. That is not navigation away: a queued focusout check would
  // close the menu just opened by that same tap. Close on an actual new focus
  // target outside instead; pointer dismissal and Escape remain independent.
  document.addEventListener('focusin',event=>{
    if(!open||root.contains(event.target))return;
    // The HTTP clipboard fallback briefly focuses a temporary textarea, then
    // restores the menu item synchronously. Let that transfer finish first.
    requestAnimationFrame(()=>{if(open&&!root.contains(document.activeElement))setOpen(false);});
  });
  panel.addEventListener('keydown',event=>{if(document.activeElement===feedback)return;const items=[telegram,email,linkedin];const at=items.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(at+(event.key==='ArrowDown'?1:2))%3].focus();}else if(event.key==='Home'){event.preventDefault();telegram.focus();}else if(event.key==='End'){event.preventDefault();linkedin.focus();}});
  email.addEventListener('pointerdown',()=>email.focus({preventScroll:true}));
  feedback.addEventListener('pointerdown',()=>{if(copyFailed)feedback.focus({preventScroll:true});});
  const showCopy=()=>{
    const copied=Date.now()<copiedUntil,s=strings();
    email.querySelector('.dock-item-label').textContent=copied?s.copied:s.email;
    email.setAttribute('aria-label',copied?s.copied:s.copy);
    email.lastChild.style.visibility=copied?'visible':'hidden';
    feedback.classList.toggle('sr-only',!copyFailed);
    feedback.tabIndex=copyFailed?0:-1;
    // Recovery belongs to the scrollable menu flow. A fixed offset above the
    // trigger overlaps enlarged menu labels and can leave a short viewport.
    const feedbackParent=copyFailed?panel:root;
    if(feedback.parentElement!==feedbackParent)feedbackParent.append(feedback);
    feedback.textContent=copyFailed?s.fail:(copied?s.copied:'');
    // A denied clipboard leaves a selectable address until the next attempt.
    feedback.style.pointerEvents=copyFailed?'auto':'';
    feedback.style.userSelect=copyFailed?'text':'';
    feedback.style.webkitUserSelect=copyFailed?'text':'';
    if(copyFailed)panel.scrollTop=panel.scrollHeight;
  };
  email.addEventListener('click',async()=>{
    // iOS can drop the pointerdown focus before click; the copy helper must
    // restore this menu item, not body, after its temporary native-copy field.
    email.focus({preventScroll:true});
    const serial=++copySerial;
    clearTimeout(copyTimer);copiedUntil=0;copyFailed=false;showCopy();
    try{
      await (window.PortfolioCopyText ? window.PortfolioCopyText('shoniya.ramin@gmail.com') : navigator.clipboard.writeText('shoniya.ramin@gmail.com'));
      if(serial!==copySerial)return;
      copiedUntil=Date.now()+4000;showCopy();
      copyTimer=setTimeout(()=>{copiedUntil=0;showCopy();},4000);
    }catch{
      if(serial!==copySerial)return;
      copyFailed=true;showCopy();
    }
  });
  let queued=false;
  const sync=()=>{queued=false;const contact=document.querySelector('#contact');const box=contact?.getBoundingClientRect();const hide=!!document.querySelector('dialog[open]')||(isHome?(!work||work.getBoundingClientRect().bottom>0):(scrollY<250||(box&&box.top<innerHeight&&box.bottom>0)));if(hide&&open){setOpen(false);if(root.contains(document.activeElement))document.activeElement.blur();}setPresence(root,!hide);};
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(sync);}};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  if(work)new ResizeObserver(schedule).observe(work);
  const renderLocale=()=>{render();showCopy();schedule();};
  document.addEventListener('portfolio:locale-changed',renderLocale);
  new MutationObserver(renderLocale).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  new MutationObserver(schedule).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  addEventListener('pagehide',()=>{
    copySerial++;clearTimeout(copyTimer);copiedUntil=0;copyFailed=false;showCopy();
    pointerOpen=null;setOpen(false);
    for(const [element,state] of presence){state.animation?.cancel();state.animation=null;element.hidden=!state.visible;}
  });
  addEventListener('pageshow',()=>{renderLocale();sync();});
  render();sync();
  document.documentElement.dataset.dockMaterial='clear';
  root.dataset.ready='true';
})();
