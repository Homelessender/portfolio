// Keep the full introduction on the first home visit in this tab.
// Storage can be unavailable in privacy modes; retain the original entrance then.
let homeEntranceScale = document.documentElement.dataset.pageArrival === 'fast' ? .5 : 1;
try {
  if (sessionStorage.getItem('portfolio:home-visited') === 'true') homeEntranceScale = .5;
  sessionStorage.setItem('portfolio:home-visited', 'true');
} catch (_) {}
document.body.style.setProperty('--home-entrance-scale', homeEntranceScale);
document.body.classList.toggle('home-return', homeEntranceScale < 1);
// One entrance per page visit; the original heading remains the no-JS fallback.
function revealHero() {
  // The shared internal-navigation entrance reveals the whole page together.
  if (document.documentElement.dataset.pageArrival === 'fast') return;
  const heading = document.querySelector('#hero-title');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!heading || reduce.matches || heading.classList.contains('hero-reveal-pending')) return;
  // Direct links to lower sections should not wait for an offscreen introduction.
  if (heading.getBoundingClientRect().bottom <= 0) return;
  const metadata = document.querySelector('.hero-meta');
  const items = [...(metadata?.querySelectorAll('.metadata-row > span') || [])];
  const work = document.querySelector('.work-grid');
  let cards = [...(work?.querySelectorAll(':scope > .corner-shell, :scope > .case-card') || [])];
  const header = document.querySelector('.site-header');
  const entranceLead = 1050;
  // The entrance runs before DOMContentLoaded hydrates themed images. Seed
  // the retained photo immediately so its first frame has the correct source.
  for (const image of heading.querySelectorAll('img[data-dark-src]')) {
    image.src = document.documentElement.dataset.theme === 'dark' ? image.dataset.darkSrc : image.dataset.lightSrc;
  }
  document.body.classList.add('home-entrance-pending');

  // Wrap text in place: never detach/clone the animated photo at entrance end.
  // Replacing the heading used to replace its decoded image and compositor layer
  // exactly when a fast scroll cancelled the introduction.
  const previousLabel = heading.getAttribute('aria-label');
  const visual = heading;
  const runs = [];
  heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());
  function wrapWords(parent) {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType !== Node.TEXT_NODE) { wrapWords(node); continue; }
      const replacements = [];
      for (const token of node.textContent.match(/\s+|[^\s-]+-?|-/g) || []) {
        if (/^\s+$/.test(token)) replacements.push(document.createTextNode(token));
        else {
          const word = document.createElement('span');
          word.className = 'hero-word';word.textContent = token;
          replacements.push(word);
        }
      }
      if (replacements.length) {
        node.replaceWith(...replacements);
        runs.push({node,replacements});
      }
    }
  }
  wrapWords(heading);
  heading.classList.add('hero-reveal-pending');
  metadata?.classList.add('hero-meta-pending');
  work?.classList.add('work-reveal-pending');
  let observer, fallback;
  let finished = false;
  function setLineTiming() {
    const lines = [];
    for (const word of visual.querySelectorAll('.hero-word')) {
      const top = word.getBoundingClientRect().top;
      let line = lines[lines.length - 1];
      if (!line || Math.abs(line.top - top) > 2) {
        line = {top, words: []};
        lines.push(line);
      }
      line.words.push(word);
    }
    let start = entranceLead + 140, end = 0;
    lines.forEach((line, lineIndex) => {
      // Actual rendered lines drive the cascade, including mobile wrapping.
      // Spread the slowdown across long mobile headings instead of compounding it.
      const pace = lineIndex * 3 / Math.max(3, lines.length - 1);
      const duration = 850 + pace * 200;
      const stagger = 45 + pace * 15;
      line.words.forEach((word, wordIndex) => {
        const delay = start + wordIndex * stagger;
        word.style.setProperty('--word-delay', `${homeEntranceScale < 1 ? 0 : delay}ms`);
        word.style.setProperty('--word-duration', `${homeEntranceScale < 1 ? 550 : duration}ms`);
        end = delay + duration;
      });
      // The next line begins while the previous one is still settling.
      start = end - duration * .78;
    });
    return end;
  }
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    observer?.disconnect();
    document.body.classList.remove('home-entrance-pending', 'home-entering');
    heading.classList.remove('hero-reveal-pending', 'hero-revealing');
    metadata?.classList.remove('hero-meta-pending', 'hero-meta-revealing');
    items.forEach(item => item.style.removeProperty('--meta-delay'));
    work?.classList.remove('work-reveal-pending', 'work-revealing');
    cards.forEach(card => card.style.removeProperty('--card-delay'));
    for (const {node,replacements} of runs) {
      replacements[0].before(node);
      replacements.forEach(part => part.remove());
    }
    if (previousLabel === null) heading.removeAttribute('aria-label');
    else heading.setAttribute('aria-label', previousLabel);
    reduce.removeEventListener('change', onPreference);
    document.removeEventListener('portfolio:before-locale-change',finish);
    document.removeEventListener('portfolio:before-theme-change',finish);
    document.removeEventListener('portfolio:before-navigation',finish);
    removeEventListener('pagehide',finish);
    work?.removeEventListener('focusin', finish);
    header?.removeEventListener('focusin', finish);
    removeEventListener('scroll', onScroll);
  }
  function onPreference() { if (reduce.matches) finish(); }
  function onScroll() {
    // Let users who immediately scroll to the cases read and use them at once.
    if (heading.getBoundingClientRect().bottom < innerHeight * .25) finish();
  }
  reduce.addEventListener('change', onPreference);
  document.addEventListener('portfolio:before-locale-change',finish);
  document.addEventListener('portfolio:before-theme-change',finish);
  document.addEventListener('portfolio:before-navigation',finish);
  addEventListener('pagehide',finish);
  work?.addEventListener('focusin', finish);
  header?.addEventListener('focusin', finish);
  addEventListener('scroll', onScroll, {passive:true});
  // Always restore readable text even if a font or an observer fails to settle.
  fallback = setTimeout(finish, 5000);
  Promise.all([document.fonts.ready, window.PortfolioPageReady]).then(() => {
    if (finished) return;
    // Smoothing wraps cards after this script runs; animate each whole shell,
    // including its stroke, with the accepted card timing.
    cards = [...(work?.querySelectorAll(':scope > .corner-shell, :scope > .case-card') || [])];
    observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || finished) return;
      observer.disconnect();
      const duration = setLineTiming();
      // The supporting facts follow the last headline line, with a soft overlap.
      const metaStart = Math.max(0, duration - 700);
      items.forEach((item, index) => item.style.setProperty('--meta-delay', `${homeEntranceScale < 1 ? 0 : metaStart + index * 80}ms`));
      const end = items.length ? metaStart + (items.length - 1) * 80 + 750 : duration;
      // Reveal the entire grid after the text, even if only its upper edge is visible.
      const cardStart = end - 180;
      cards.forEach((card, index) => card.style.setProperty('--card-delay', `${homeEntranceScale < 1 ? 0 : cardStart + index * 130}ms`));
      const totalEnd = cards.length ? cardStart + (cards.length - 1) * 130 + 1100 : end;
      clearTimeout(fallback);
      fallback = setTimeout(finish, (homeEntranceScale < 1 ? 550 : totalEnd) + 500);
      heading.classList.add('hero-revealing');
      document.body.classList.add('home-entering');
      metadata?.classList.add('hero-meta-revealing');
      work?.classList.add('work-revealing');
      const last = cards.at(-1) || items.at(-1) || visual.querySelector('.hero-word:last-child');
      last?.addEventListener('animationend', finish, {once:true});
    }, {threshold: .1});
    observer.observe(heading);
  });
}
revealHero();
// Preview-only replay makes it possible to judge the entrance without reloading.
document.addEventListener('DOMContentLoaded', () => {
  const controls = document.querySelector('.motion-preview-controls');
  if (!controls) return;
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.textContent = window.PortfolioLocale.ui('replay');
  replay.addEventListener('click', revealHero);
  controls.append(replay);
});
