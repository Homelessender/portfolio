(() => {
  const hero = document.querySelector('.case-desktop .case-hero');
  const heading = hero?.querySelector('h1');
  const meta = hero?.querySelector('.project-meta');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Retry a failed cover request once, never retry the retry URL itself.
  // A later theme/pageshow render may select the original URL again.
  const cover = hero?.querySelector('.case-hero-image');
  const recoverCover = () => {
    if (!cover) return;
    const source = document.documentElement.dataset.theme === 'dark'
      ? cover.dataset.darkSrc : cover.dataset.lightSrc;
    if (!source) return;
    const retry = new URL(source, document.baseURI);
    retry.searchParams.set('image-retry', '1');
    if (cover.src === retry.href) return;
    cover.src = retry.href;
  };
  cover?.addEventListener('error', recoverCover);
  if (cover?.getAttribute('src') && cover.complete && !cover.naturalWidth) recoverCover();

  // A separator belongs only between labels that remain on the same line.
  function updateSeparator() {
    const [role, year] = meta?.querySelectorAll('p') || [];
    if (!role || !year) return;
    const lastRoleLine = [...role.getClientRects()].at(-1);
    const yearLine = year.getBoundingClientRect();
    year.classList.toggle('meta-separated', !!lastRoleLine &&
      Math.abs(lastRoleLine.top - yearLine.top) < 2);
  }
  if (meta) {
    new ResizeObserver(updateSeparator).observe(meta);
    document.fonts.ready.then(updateSeparator);
    document.addEventListener('portfolio:locale-changed', updateSeparator);
    updateSeparator();
  }

  if (!hero || !heading || reduce.matches) return;
  const original = [...heading.childNodes];
  const label = heading.getAttribute('aria-label');
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  let index = 0;
  for (const node of original) {
    if (node.nodeType !== Node.TEXT_NODE) {
      visual.append(node.cloneNode(true));
      continue;
    }
    for (const token of node.textContent.match(/\s+|\S+/g) || []) {
      if (/^\s+$/.test(token)) visual.append(document.createTextNode(token));
      else {
        const word = document.createElement('span');
        word.className = 'case-intro-word';
        word.textContent = token;
        word.style.setProperty('--intro-delay', `${140 + index++ * 65}ms`);
        word.style.setProperty('--intro-duration', '850ms');
        visual.append(word);
      }
    }
  }
  heading.setAttribute('aria-label', heading.textContent.trim());
  heading.replaceChildren(visual);
  hero.classList.add('case-intro-pending');
  const copy = [...hero.querySelectorAll('.project-meta>p,.result-summary>p')];
  copy.forEach((item, position) => {
    item.style.setProperty('--intro-delay', `${820 + position * 220}ms`);
  });
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    observer.disconnect();
    clearTimeout(fallback);
    hero.classList.remove('case-intro-pending', 'case-intro-active');
    copy.forEach(item => item.style.removeProperty('--intro-delay'));
    heading.replaceChildren(...original);
    const currentCopy=window.PortfolioLocale?.copy(heading.dataset.i18n);
    if(currentCopy)heading.textContent=currentCopy;
    if (label === null) heading.removeAttribute('aria-label');
    else heading.setAttribute('aria-label', label);
    reduce.removeEventListener('change', onPreference);
    document.removeEventListener('portfolio:locale-changed',finish);
    document.removeEventListener('portfolio:before-theme-change',finish);
    document.removeEventListener('portfolio:before-navigation',finish);
    removeEventListener('pagehide',finish);
    removeEventListener('scroll',onScroll);
    document.querySelector('.case-desktop')?.removeEventListener('focusin',finish);
  }
  function onPreference() { if (reduce.matches) finish(); }
  reduce.addEventListener('change', onPreference);
  document.addEventListener('portfolio:locale-changed',finish);
  document.addEventListener('portfolio:before-theme-change',finish);
  document.addEventListener('portfolio:before-navigation',finish);
  addEventListener('pagehide',finish);
  function onScroll(){if(hero.getBoundingClientRect().bottom<innerHeight*.25)finish();}
  addEventListener('scroll',onScroll,{passive:true});
  document.querySelector('.case-desktop')?.addEventListener('focusin',finish);
  let fallback=setTimeout(finish,6000);
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || done) return;
    observer.disconnect();
    // Begin the accepted word entrance with the prepared destination.
    // The outgoing snapshot fades over it, so it never exposes a pending hero.
    requestAnimationFrame(() => {
      Promise.allSettled([window.PortfolioPageReady]).then(() => {
        if (done) return;
        hero.classList.add('case-intro-active');
        clearTimeout(fallback);fallback = setTimeout(finish, 4200);
      });
    });
    const last = copy.at(-1) || visual.querySelector('.case-intro-word:last-child');
    last?.addEventListener('animationend', event => {
      if (event.target === last) finish();
    }, {once:true});
  }, {threshold:.1});
  observer.observe(hero);
  onScroll();
})();
