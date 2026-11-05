// Run in <head> before styles paint; both themes share the same document/layout.
(() => {
  const key = 'portfolio-theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let activeTransition = null;
  let pageActive = true;
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
  if (!['light', 'dark'].includes(preference)) preference = null;
  const current = () => preference || (system.matches ? 'dark' : 'light');

  function render() {
    const dark = current() === 'dark';
    root.dataset.theme = current();
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-label', root.lang === 'ru' ? 'Тёмная тема' : 'Dark theme');
      button.setAttribute('aria-pressed', String(dark));
      button.removeAttribute('title');
      const hint = button.querySelector('.theme-hint');
      if (hint && !hint.childElementCount) {
        const ru = root.lang === 'ru';
        for (const [name, text] of [
          ['dark', ru ? 'Включить тёмную тему' : 'Switch to dark mode'],
          ['light', ru ? 'Включить светлую тему' : 'Switch to light mode']
        ]) {
          const line = document.createElement('span');
          line.className = `theme-hint-to-${name}`;
          line.textContent = text;
          if (name === 'dark') hint.textContent = '';
          hint.append(line);
        }
      }
      if(hint){
        hint.querySelector('.theme-hint-to-dark').textContent=root.lang==='ru'?'Включить тёмную тему':'Switch to dark mode';
        hint.querySelector('.theme-hint-to-light').textContent=root.lang==='ru'?'Включить светлую тему':'Switch to light mode';
      }
    }
    for (const image of document.querySelectorAll('img[data-dark-src]')) {
      image.dataset.lightSrc ||= image.getAttribute('src');
      const src = dark ? image.dataset.darkSrc : image.dataset.lightSrc;
      if (!image.hasAttribute('data-deferred-source') && image.getAttribute('src') !== src) image.src = src;
    }
    for (const link of document.querySelectorAll('a[data-dark-href], svg image[data-dark-href]')) {
      link.dataset.lightHref ||= link.getAttribute('href');
      link.setAttribute('href', dark ? link.dataset.darkHref : link.dataset.lightHref);
    }
  }

  function renderChange() {
    // Keep the last requested preference when the toggle is pressed repeatedly.
    if (activeTransition) { activeTransition.skipTransition(); return; }
    if (root.dataset.theme === current()) return;
    document.dispatchEvent(new Event('portfolio:before-theme-change'));
    if (!pageActive || document.hidden || root.classList.contains('page-preparing') ||
      reduce.matches || !document.startViewTransition) { render(); return; }
    // Keep the visible hint in both snapshots even if the transition overlay
    // temporarily changes :hover hit testing. Its outer slide must not restart.
    const heldButtons = [...document.querySelectorAll('[data-theme-toggle]')]
      .filter(button => button.matches(':hover, :focus-visible'));
    heldButtons.forEach(button => button.classList.add('theme-hint-held'));
    root.classList.add('theme-transition');
    const transition = document.startViewTransition(async () => {
      render();
      // Decode only visible themed images, with a bounded wait for a cold cache.
      const visibleImages = [...document.querySelectorAll('img[data-dark-src]')].filter(image => {
        const box = image.getBoundingClientRect();
        return box.width && box.height && box.bottom > 0 && box.top < innerHeight;
      });
      let timeout;
      try {
        await Promise.race([
          window.PortfolioPrepareView?.() || Promise.allSettled(visibleImages.map(image => image.decode())),
          new Promise(resolve => {timeout=setTimeout(resolve, 3000);})
        ]);
      } finally { clearTimeout(timeout); }
    });
    activeTransition = transition;
    transition.ready.catch(() => { /* A hidden document can skip the animation. */ });
    transition.finished.catch(() => {}).finally(() => {
      activeTransition = null;
      root.classList.remove('theme-transition');
      heldButtons.forEach(button => button.classList.remove('theme-hint-held'));
      // Cleanup and the queued choice must not depend on a foreground rAF.
      if(pageActive)renderChange();
    });
  }

  render();
  document.addEventListener('DOMContentLoaded', render, {once: true});
  document.addEventListener('portfolio:locale-changed',render);
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    preference = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, preference); } catch { /* Keep working in this page. */ }
    renderChange();
  });
  system.addEventListener('change', () => { if (!preference) renderChange(); });
  reduce.addEventListener('change', () => { if (reduce.matches) activeTransition?.skipTransition(); });
  addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    renderChange();
  });
  addEventListener('pageshow', () => {
    pageActive = true;
    // Back/forward cache can restore a page created before a later theme change.
    try {
      const saved = localStorage.getItem(key);
      preference = ['light', 'dark'].includes(saved) ? saved : null;
    } catch { /* Retain the in-memory choice when storage is unavailable. */ }
    render();
  });
  addEventListener('pagehide', () => {
    pageActive = false;
    activeTransition?.skipTransition();
    root.classList.remove('theme-transition');
    document.querySelectorAll('.theme-hint-held').forEach(button=>button.classList.remove('theme-hint-held'));
    render();
  });
  document.addEventListener('portfolio:before-navigation',()=>{
    activeTransition?.skipTransition();
    render();
  });
})();
