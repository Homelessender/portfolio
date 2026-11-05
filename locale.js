/* Texts come from the existing RU/EN Figma layouts; no runtime translation. */
(() => {
  const root = document.documentElement;
  const valid = value => value === 'ru' || value === 'en';
  const address = new URL(location.href);
  let saved;
  try { saved = localStorage.getItem('portfolio-language'); } catch {}
  const requested = address.searchParams.get('lang');
  let language = valid(requested) ? requested : valid(saved) ? saved : 'en';
  // The original history entry may have no lang parameter. Its language must
  // survive later preference writes when Back returns to that same document.
  const initialLanguage = language;
  root.lang = language;
  root.dataset.language = language;
  if (valid(requested)) try { localStorage.setItem('portfolio-language', language); } catch {}
  const data = window.PortfolioLocaleData;
  const copy = id => data.copy[id]?.[language] ?? '';
  const ui = (id, count) => {
    const value = data.ui[id]?.[language] ?? id;
    return count === undefined ? value : value.replace('{count}', count);
  };
  const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const markup = value => escape(value).replace(/\n/g, '<br> ').replace(/(\d+–\d+%?)/g, '<span class="numeric-range">$1</span>');
  const mobileViewport = matchMedia('(max-width:600px)');
  // These desktop Churn values have mixed font runs in Figma; Forecast does not.
  const mixedMetricIds = new Set(['539:3025','539:3029','539:3033','539:3037',
    '539:3126','539:3131','539:3136','539:3104','539:3108','539:3116']);
  function renderMetric(element, value) {
    if (element.matches('dt') && element.closest('.case-churn :is(.metrics,.mobile-metrics)')) {
      const parts=value.match(/^(~?)(\d+(?:[.,]\d+)?)\s*(%|мес\.|mo\.)?$/u);
      if(parts){
        const number=document.createElement('span');number.className='metric-value';number.textContent=parts[2];
        element.replaceChildren(number);
        if(parts[1]){
          const prefix=document.createElement('span');prefix.className='metric-prefix';prefix.textContent=parts[1];
          element.prepend(prefix);
        }
        if(parts[3]){
          const unit=document.createElement('span');unit.className='metric-unit';unit.textContent=(parts[3]==='%'?'':' ')+parts[3];
          if(parts[3]!=='%')unit.setAttribute('data-word-unit','');
          element.append(unit);
        }
        return true;
      }
    }
    if (!element.matches('dt') || !element.closest('.case-desktop .metrics') ||
        !mixedMetricIds.has(element.dataset.i18n)) return false;
    const runs = value.match(/^(.*?)(\s*)(%|мес\.|mo\.)$/u);
    if (!runs) return false;
    const unit = document.createElement('span');
    unit.className = 'metric-unit'; unit.textContent = runs[3];
    element.replaceChildren(document.createTextNode(runs[1]));
    if (runs[2]) {
      const space = document.createElement('span');
      space.className = 'metric-space'; space.textContent = runs[2]; element.append(space);
    }
    element.append(unit);
    return true;
  }
  function setText(element, value) {
    if (renderMetric(element, value)) return;
    // Retain existing arrow/icon assets and the smaller metric suffix.
    const decoration = [...element.children].filter(child => child.matches('img, .link-arrow'));
    const suffix = element.matches('dt') && element.querySelector('span');
    if (suffix && value.endsWith(suffix.textContent)) {
      const tail = suffix.textContent;
      element.replaceChildren(document.createTextNode(value.slice(0, -tail.length)), suffix);
    } else {
      // Keep the status copy in a real text span so the hover light is clipped
      // to glyphs, not to the indicator or a duplicate accessible label.
      if(element.matches('body.portfolio-home .availability')) {
        const label=document.createElement('span');
        label.className='availability-label'; label.innerHTML=markup(value);
        element.replaceChildren(...decoration,label);
        return;
      }
      element.innerHTML = markup(value);
      if (element.matches('.availability')) element.prepend(...decoration);
      else element.append(...decoration);
    }
  }
  function renderHero() {
    const heading = document.querySelector('[data-localized-hero]');
    if (!heading) return;
    const intro = heading.querySelector('.hero-intro-line');
    const photo = heading.querySelector('.hero-photo-slot');
    photo.setAttribute('aria-label', copy('539:858'));
    const mobile = mobileViewport.matches;
    const full = copy(mobile ? '693:1507' : '539:2901');
    const lines = full.split('\n');
    const first = lines.splice(0, mobile ? 2 : 1).join(' ').trim();
    const name = language === 'ru' ? 'Рамин' : 'Ramin';
    const end = first.indexOf(name) + name.length;
    let after = first.slice(end);
    // In both languages the photograph replaces the introductory dash.
    after = after.replace(/^\s*—\s*/, ' ');
    const person = document.createElement('span');
    person.className = 'hero-person';
    // Keep revealed words in one inline flow rather than separate flex items.
    const greeting = document.createElement('span');
    greeting.className = 'hero-greeting';
    greeting.textContent = first.slice(0, end);
    person.append(greeting, document.createTextNode(' '), photo);
    const role = document.createElement('span');
    role.className = 'hero-role';
    // Desktop RU typography follows Figma1080:63543; mobile retains its copy.
    role.textContent = language === 'ru' && !mobile ? 'Продуктовый дизайнер' : after.trim();
    intro.replaceChildren(person, document.createTextNode(' '), role);
    heading.querySelector('.hero-description').textContent = ' ' + lines.join(' ').replace(/-\s+/g, '-');
  }
  function localLink(href, lang = language) {
    const url = new URL(href, location.href);
    url.searchParams.set('lang', lang);
    return url.pathname + url.search + url.hash;
  }
  function render() {
    for (const element of document.querySelectorAll('[data-i18n]')) setText(element, copy(element.dataset.i18n));
    for (const element of document.querySelectorAll('[data-ui]')) setText(element, ui(element.dataset.ui));
    renderHero();
    for (const control of document.querySelectorAll('[data-language-switch]')) {
      control.setAttribute('aria-label', ui('language'));
      for (const link of control.querySelectorAll('[data-language]')) {
        const target = link.dataset.language;
        link.href = localLink(location.href, target);
        // The accessible instruction is in the current page language.
        link.removeAttribute('lang');
        link.setAttribute('aria-label', ui(target === 'ru' ? 'chooseRussian' : 'chooseEnglish'));
        if (target === language) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    }
    const page = location.pathname.includes('monthly-forecast') ? 'forecast' : location.pathname.includes('reducing-churn') ? 'churn' : 'home';
    document.title = ui(`title-${page}`);
    document.querySelector('meta[name="description"]')?.setAttribute('content', ui(`description-${page}`));
    for (const link of document.querySelectorAll('a[href]')) {
      if (link.dataset.language) continue;
      const href = link.getAttribute('href');
      const url = new URL(href, location.href);
      if (url.origin === location.origin && !/\.[a-z0-9]+$/i.test(url.pathname)) link.href = localLink(href);
    }
    document.querySelector('.skip-link').textContent = ui('skip');
    for (const element of document.querySelectorAll('.availability')) {
      const source = matchMedia('(max-width:600px)').matches ? '693:1503' : page === 'home' ? '539:2964' : page === 'forecast' ? '539:1998' : '539:3062';
      setText(element, copy(source));
      if (element.matches('a')) element.setAttribute('aria-label', ui('home'));
    }
    for (const nav of document.querySelectorAll('.case-nav')) {
      nav.setAttribute('aria-label', ui('navigation'));
      for (const [index, id] of ['539:855', '539:856', '539:858', '539:859'].entries()) nav.children[index].textContent = copy(id);
    }
    for (const link of document.querySelectorAll('.mobile-case-controls > a')) link.textContent = copy('539:2900');
    for (const nav of document.querySelectorAll('.case-bottom')) {
      nav.setAttribute('aria-label', copy('539:855'));
      nav.children[0].textContent = '←\u00a0' + copy('539:855');
      nav.children[1].textContent = copy(page === 'forecast' ? '539:2924' : '539:2909') + '\u00a0→';
    }
    document.querySelector('#work')?.setAttribute('aria-label', copy('539:855'));
    document.querySelector('#how-i-work')?.setAttribute('aria-label', copy('539:856'));
    document.querySelector('.how-visual')?.setAttribute('aria-label', copy('539:2987'));
    for (const link of document.querySelectorAll('.forecast-card .card-link,.churn-card .card-link')) {
      link.setAttribute('aria-label', link.closest('article').querySelector('h2').textContent + ' — ' + copy('539:2907'));
    }
    for (const img of document.querySelectorAll('img[alt]:not([alt=""])')) {
      const board = img.closest('[data-source-node]')?.dataset.sourceNode;
      const caption = data.captions[board];
      if (caption) img.alt = copy(caption);
      else if (img.closest('.case-hero,.mobile-hero-visual')) img.alt = copy(page === 'forecast' ? '539:1936' : '539:3119');
      else if (img.matches('.portrait')) img.alt = language === 'ru' ? 'Рамин Шония' : 'Ramin Shoniia';
      else if (img.matches('.forecast-phone')) img.alt = copy('539:2909');
      else img.alt = copy(page === 'forecast' ? '539:1936' : '539:3119');
    }
    const dark = root.dataset.theme === 'dark';
    for (const element of document.querySelectorAll('[data-locale-asset]')) {
      const asset = data.assets[element.dataset.localeAsset];
      const light = asset?.[`${language}-light`], night = asset?.[`${language}-dark`];
      if (!light || !night) continue;
      const relative = page === 'home' ? '' : '../../';
      if (element.matches('img')) {
        element.dataset.lightSrc = relative + light.file;
        element.dataset.darkSrc = relative + night.file;
        if (!element.hasAttribute('data-deferred-source')) element.src = relative + (dark ? night.file : light.file);
        element.width = light.width;
        element.height = light.height;
      } else {
        element.dataset.lightHref = relative + light.file;
        element.dataset.darkHref = relative + night.file;
        element.href = relative + (dark ? night.file : light.file);
      }
    }
    for (const link of document.querySelectorAll('.product-board a')) {
      link.setAttribute('aria-label', link.querySelector('img').alt + ' — ' + ui('openGallery'));
    }
  }
  window.PortfolioLocale = {language, copy, ui, render};
  let changing=false,queued=null,historyEpoch=0;
  async function changeLanguage(next,push=true){
    if(!valid(next))return;
    if(changing){queued={next,push};return;}
    if(next===language)return;
    changing=true;
    const epoch=historyEpoch;
    document.dispatchEvent(new Event('portfolio:before-locale-change'));
    const targets=[...document.querySelectorAll('[data-i18n],[data-ui],[data-localized-hero],[data-locale-asset]:not(.how-source)')]
      .filter(node=>!node.parentElement.closest('[data-i18n],[data-ui],[data-localized-hero]'));
    const animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anchor=scrollY>200?[...document.querySelectorAll('main section[id]')].reverse()
      .find(node=>node.getBoundingClientRect().top<=100):null;
    const anchorTop=anchor?.getBoundingClientRect().top;
    let outgoing=[];
    try{
      if(animate){
        outgoing=targets.map(node=>node.animate([{opacity:1},{opacity:0}],{duration:150,easing:'ease-in',fill:'both'}));
        await Promise.allSettled(outgoing.map(animation=>animation.finished));
      }
      // History traversal owns the address immediately. An older click that
      // finishes fading later must not push a new entry over that traversal.
      if(epoch!==historyEpoch)return;
      language=next;root.lang=next;root.dataset.language=next;
      window.PortfolioLocale.language=next;
      try{localStorage.setItem('portfolio-language',next);}catch{}
      const url=new URL(location.href);url.searchParams.set('lang',next);
      if(push)history.pushState(null,'',url);
      render();
      document.dispatchEvent(new Event('portfolio:locale-changed'));
      if(anchor)scrollBy({top:anchor.getBoundingClientRect().top-anchorTop,behavior:'instant'});
      const images=targets.filter(node=>node.matches('img')&&node.getBoundingClientRect().bottom>0&&node.getBoundingClientRect().top<innerHeight);
      await Promise.race([Promise.allSettled(images.map(image=>image.decode())),new Promise(resolve=>setTimeout(resolve,180))]);
      outgoing.forEach(animation=>animation.cancel());
      if(animate){
        const incoming=targets.map(node=>node.animate([{opacity:0},{opacity:1}],{duration:300,easing:'cubic-bezier(.22,.68,.24,1)'}));
        await Promise.allSettled(incoming.map(animation=>animation.finished));
      }
    }finally{
      outgoing.forEach(animation=>animation.cancel());changing=false;
      if(queued){const request=queued;queued=null;changeLanguage(request.next,request.push);}
    }
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-language-switch] a[data-language]');
    if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();changeLanguage(link.dataset.language);
  });
  addEventListener('popstate',()=>{
    historyEpoch++;
    const next=new URL(location.href).searchParams.get('lang');
    changeLanguage(valid(next)?next:initialLanguage,false);
  });
  addEventListener('hashchange', () => {
    for (const link of document.querySelectorAll('[data-language-switch] [data-language]')) {
      link.href = localLink(location.href, link.dataset.language);
    }
  });
  mobileViewport.addEventListener('change', () => {
    for (const element of document.querySelectorAll('.availability')) {
      const page = location.pathname.includes('monthly-forecast') ? 'forecast' : location.pathname.includes('reducing-churn') ? 'churn' : 'home';
      setText(element, copy(mobileViewport.matches ? '693:1503' : page === 'home' ? '539:2964' : page === 'forecast' ? '539:1998' : '539:3062'));
    }
    const heading = document.querySelector('[data-localized-hero]');
    if (!heading) return;
    // Restore the entrance's captured nodes before adapting the copy, in the
    // same frame. Waiting for the cascade leaves desktop wording on mobile.
    if (heading.classList.contains('hero-reveal-pending')) {
      document.dispatchEvent(new Event('portfolio:before-locale-change'));
    }
    renderHero();
  });
})();
