(() => {
  const root = document.documentElement;
  const query = new URLSearchParams(location.search);
  let saved;
  try { saved = localStorage.getItem('portfolio-language'); } catch {}
  const requested = query.get('lang');
  const lang = ['ru', 'en'].includes(requested) ? requested : (['ru', 'en'].includes(saved) ? saved : 'ru');
  const copy = lang === 'ru' ? {
    name:'Рамин Шония', title:'404 — Страница не найдена',
    message:'Кажется, мы немного сбились с пути', return:'Вернуться на главную'
  } : {
    name:'Ramin Shonia', title:'404 — Page not found',
    message:'Looks like we wandered off the path', return:'Back to the homepage'
  };
  root.lang = lang;
  document.title = `${copy.title} · ${copy.name}`;
  for (const [key, value] of Object.entries(copy)) document.querySelector(`[data-${key}]`).textContent = value;
  for (const link of document.querySelectorAll('.home-link')) link.href = `/?lang=${lang}`;
  document.querySelector('meta[name="theme-color"]').content = root.dataset.theme === 'dark' ? '#17171b' : '#faf8f6';
})();

// Two separate orbital halves surround the unchanged How field. Satellite depth
// crossfades at the ends instead of visibly jumping across a z-index boundary.
(() => {
  const visual = document.querySelector('.error-orb');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const satellites = [...visual.querySelectorAll('[data-satellite]')];
  let visible = false, frame = 0, last = 0, elapsed = 0, painted = 0;
  function paint(time) {
    const angle = -.72 + time * Math.PI * 2 / 26000;
    for (const satellite of satellites) {
      const t = angle + Number(satellite.dataset.satellite) * Math.PI;
      const depth = Math.sin(t);
      const blend = Math.max(0, Math.min(1, (depth + .1) / .2));
      const front = blend * blend * (3 - 2 * blend);
      const near = satellite.closest('.orbit-front');
      satellite.setAttribute('transform', `translate(${460 * Math.cos(t)} ${205 * depth})`);
      satellite.style.opacity = String(near ? front : (1 - front) * .48);
    }
  }
  function tick(now) {
    if (last) elapsed += Math.min(now - last, 64);
    last = now;window.PortfolioEffects?.sample(now);
    if(!painted||now-painted>=(window.PortfolioEffects?.interval(30)??1000/30)){paint(elapsed);painted=now;}
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0; painted = 0;
    if (visible && !document.hidden && !reduce.matches) frame = requestAnimationFrame(tick);
    else if (reduce.matches) paint(0);
  }
  new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; sync();}).observe(visual);
  reduce.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  paint(0);
})();
