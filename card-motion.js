(() => {
  const cards = [...document.querySelectorAll('.work-grid .case-card')];
  if (!cards.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const bubbles = [
    {value:50,x:13.1641,y:58.8513,size:68.1436,order:2},
    {value:55,x:47.2359,y:13.9385,size:73.5641,order:0},
    {value:60,x:70.4667,y:68.9180,size:78.2103,order:3},
    {value:65,x:107.6359,y:6.1949,size:89.8256,order:1},
    {value:70,x:134.7385,y:67.3692,size:101.4410,order:4},
    {value:75,x:62.7231,y:124.6718,size:99.1180,order:5},
    {value:80,x:139.3846,y:134.7385,size:116.7012,order:6},
  ];
  // Uniform registration of Figma 722:4119 into the existing phone raster.
  // Each exported bubble includes the original percentage and category text.
  const chart = {x:135.5,y:220.5,scale:1.312};
  // Keep one chart representation in idle, motion and re-entry. The original
  // PNG groups stay composed over the unchanged phone instead of crossfading
  // between sharp layers and the softer, flattened screenshot.
  const forecastFinish = 1.48;
  const objects = [
    {name:'pin',x:439,y:247,w:96,h:114,dx:6,dy:-9,angle:3,phase:.2},
    {name:'heart',x:301,y:320,w:109,h:101,dx:-7,dy:-7,angle:-4,phase:1.1},
    {name:'star',x:416,y:366,w:112,h:108,dx:7,dy:-5,angle:5,phase:2},
    {name:'plus',x:298,y:457,w:115,h:112,dx:-5,dy:7,angle:-4,phase:2.8},
    {name:'bag',x:424,y:488,w:112,h:111,dx:5,dy:8,angle:3,phase:3.6},
  ];
  const states = cards.map(card => ({card,pointer:false,focus:false,attention:false,visible:true,
    weight:0,clock:0,cascade:Infinity,overlay:0,ready:false}));
  let frame = 0, previous = 0, lastScroll = -Infinity;
  const ease = value => 1 - (1 - value) ** 3;
  const clamp = value => Math.max(0,Math.min(1,value));
  const disabled = () => reduced.matches || document.body.dataset.motionDisabled === 'true';
  const paused = () => document.hidden || document.body.dataset.motionPaused === 'true';
  const desired = state => state.visible && (state.focus || (!hover.matches && state.attention) ||
    (hover.matches && state.pointer && state.card.matches(':hover')));
  function start() {
    if (!frame && !disabled() && !paused()) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function setInterest(state) {
    const active = desired(state) && !disabled();
    if (active && (!state.active || (state.ready && state.card.matches('.forecast-card') && !state.forecastStarted)) && !paused()) {
      beginEntry(state);
    }
    if (!paused() || !active) state.active = active;
    start();
  }
  function beginEntry(state) {
    if (state.card.matches('.forecast-card')) {
      // Replay after a completed exit. A quick return continues the current
      // chart rather than shrinking it suddenly halfway through a transition.
      if (!state.ready || (state.forecastStarted && (state.cascade < forecastFinish || state.overlay > .01))) return;
      state.cascade = 0;
      state.forecastStarted = true;
      return;
    }
    // Churn keeps one continuously rendered canvas, like the Auto stack.
    // Preserve its phase when reversing a partially completed hover exit.
    if (state.card.matches('.churn-card')) return;
    state.clock = state.cascade = 0;
  }
  function surface(state, image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.className = `${image.className} card-motion-canvas`;
    canvas.setAttribute('aria-hidden','true');
    image.classList.add('card-motion-source');
    if (state.card.matches('.forecast-card')) {
      // Fade the composed phone once. Masking source and overlay separately
      // doubled their alpha near the lower edge, especially in dark mode.
      const shell = document.createElement('div');
      shell.className = 'forecast-phone forecast-surface';
      shell.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
      image.before(shell);
      shell.append(image,canvas);
    } else image.after(canvas);
    state.canvas = canvas;
    state.context = canvas.getContext('2d');
    state.image = image;
    state.ready = true;
    if (state.card.matches('.forecast-card')) {
      drawForecast(state);
      state.canvas.style.opacity = disabled() ? '0' : '1';
    }
    setInterest(state);
  }
  async function prepare(state) {
    const image = state.card.querySelector('img.forecast-phone, img.churn-art, img.auto-cards');
    if (!image) return;
    try {
      await image.decode();
      if (state.card.matches('.forecast-card')) {
        state.layers = await Promise.all(bubbles.map(async bubble => {
          const sprite = new Image();
          sprite.src = `assets/motion/cards/forecast-${bubble.value}.png`;
          await sprite.decode();
          return {...bubble,sprite};
        }));
      } else if (state.card.matches('.auto-card')) {
        const source = await fetch('assets/motion/cards/auto-layers.json').then(response => {
          if (!response.ok) throw Error('Stack layers unavailable');
          return response.json();
        });
        state.stack = source.bounds;
        state.layers = await Promise.all(source.layers.map(async (layer,index) => {
          const sprite = new Image();
          sprite.src = `assets/motion/cards/${layer.file}?v=fan-2`;
          await sprite.decode();
          return {...layer,sprite,group:index === 0 ? 0 : index < 4 ? 1 : 2};
        }));
      } else {
        // The expanded adaptive card uses all seven exact Figma vectors.
        const response = await fetch('assets/motion/cards/churn-full.svg');
        if (!response.ok) throw Error('Churn SVG unavailable');
        const documentSvg = new DOMParser().parseFromString(await response.text(),'image/svg+xml');
        const svg = documentSvg.documentElement;
        if (svg.localName !== 'svg' || documentSvg.querySelector('parsererror,script,foreignObject')) throw Error('Invalid churn SVG');
        const vector = document.importNode(svg,true);
        vector.setAttribute('aria-hidden','true');
        state.card.querySelector('.churn-expanded').append(vector);
        const phases = {heart:1.1,bag:3.6,card:4.3,message:1.7,star:2,plus:2.8,pin:.2};
        state.vectors = [...vector.querySelectorAll('[data-churn-object]')].map(node => ({node,phase:phases[node.dataset.churnObject]}));
        if (state.vectors.length !== 7) throw Error('Incomplete churn SVG');
        state.card.classList.add('churn-svg-ready');
        // Copy the five original raster objects; no redrawing or recolouring.
        state.layers = objects.map(object => {
          const sprite = document.createElement('canvas');
          sprite.width = object.w;
          sprite.height = object.h;
          sprite.getContext('2d').drawImage(image,object.x,object.y,object.w,object.h,0,0,object.w,object.h);
          return {...object,sprite};
        });
        const base = document.createElement('canvas');
        base.width = image.naturalWidth;
        base.height = image.naturalHeight;
        const context = base.getContext('2d');
        context.drawImage(image,0,0);
        objects.forEach(object => context.clearRect(object.x,object.y,object.w,object.h));
        state.base = base;
      }
      surface(state,image);
      if (state.card.matches('.auto-card')) {
        // Extra transparent margins let the original back cards fan out.
        state.canvas.width = Math.round(image.naturalWidth * 1.2);
        state.canvas.height = Math.round(image.naturalHeight * 1.2);
        drawAuto(state);
        state.card.classList.add('card-motion-auto-ready');
      } else if (state.card.matches('.churn-card')) {
        drawChurn(state);
        state.card.classList.add('card-motion-churn-ready');
      }
    } catch {
      // A missing/undecodable asset leaves the original accessible image intact.
      state.ready = false;
    }
  }
  function drawForecast(state, force = false) {
    // All bubble pixels are unchanged after the cascade reaches its final pose.
    // Re-entry and preference changes can explicitly refresh retained backing.
    const pose = Math.min(state.cascade, forecastFinish);
    if (!force && state.forecastPaintedPose === pose) return;
    state.forecastPaintedPose = pose;
    const context = state.context;
    context.clearRect(0,0,state.canvas.width,state.canvas.height);
    // One complete frame: Safari can discard an offscreen image backing layer
    // while retaining the chart canvas. Compose both atomically on return.
    context.drawImage(state.image,0,0);
    // Only the chart moves; the source phone geometry is unchanged.
    context.fillStyle = '#fff';
    context.fillRect(148,226,327,327);
    for (const bubble of state.layers) {
      const progress = ease(clamp((state.cascade - bubble.order * .12) / .76));
      const size = bubble.size * chart.scale;
      context.save();
      context.translate(chart.x + (bubble.x + bubble.size / 2) * chart.scale,
        chart.y + (bubble.y + bubble.size / 2) * chart.scale);
      context.scale(.015 + .985 * progress,.015 + .985 * progress);
      context.globalAlpha = clamp(progress * 1.6);
      context.drawImage(bubble.sprite,-size/2,-size/2,size,size);
      context.restore();
    }
  }
  function drawAuto(state) {
    const {context,canvas,image,stack} = state;
    context.clearRect(0,0,canvas.width,canvas.height);
    const sx = image.naturalWidth / stack.width, sy = image.naturalHeight / stack.height;
    const px = (canvas.width-image.naturalWidth)/2, py = (canvas.height-image.naturalHeight)/2;
    // One pivot per physical card keeps its body, artwork and shadow together.
    const pivots = [[stack.width*.75,stack.height*.84],[stack.width*.60,stack.height*.82],[stack.width*.34,stack.height*.84]];
    const fan = state.weight * (1 + Math.sin(state.clock*.65)*.08);
    for (const layer of state.layers) {
      const [cx,cy] = pivots[layer.group];
      const angle = [7,3,-1][layer.group] * fan * Math.PI/180;
      const shift = [7,3,-2][layer.group] * fan;
      context.save();
      context.translate(px+cx*sx+shift*sx,py+cy*sy);
      context.rotate(angle);
      context.drawImage(layer.sprite,(layer.bounds.x-stack.x-cx)*sx,
        (layer.bounds.y-stack.y-cy)*sy,layer.bounds.width*sx,layer.bounds.height*sy);
      context.restore();
    }
  }
  function drawChurn(state) {
    for (const {node,phase} of state.vectors || []) {
      const sway = (Math.sin(state.clock * .8 + phase) - Math.sin(phase)) * state.weight;
      const lift = (Math.sin(state.clock * .65 + phase) - Math.sin(phase)) * state.weight;
      node.style.translate = `${sway * 2}px ${lift * 2}px`;
      node.style.rotate = `${sway * 2}deg`;
    }
    const context = state.context;
    context.clearRect(0,0,state.canvas.width,state.canvas.height);
    if (!state.weight) { context.drawImage(state.image,0,0); return; }
    context.drawImage(state.base,0,0);
    for (const object of state.layers) {
      const sway = Math.sin(state.clock * .8 + object.phase) - Math.sin(object.phase);
      const lift = Math.sin(state.clock * .65 + object.phase) - Math.sin(object.phase);
      context.save();
      context.translate(object.x + object.w/2 + object.dx * sway * state.weight,
        object.y + object.h/2 + object.dy * lift * state.weight);
      context.rotate(object.angle * Math.PI/180 * sway * state.weight);
      context.drawImage(object.sprite,-object.w/2,-object.h/2);
      context.restore();
    }
  }
  function tick(now) {
    frame = 0;
    if (disabled()) { reset(); return; }
    if (paused()) return;
    window.PortfolioEffects?.sample(now);
    const delta = Math.max(0,Math.min((now - previous)/1000,.05));
    previous = now;
    let moving = false;
    for (const state of states) {
      if (!state.visible) continue;
      const active = desired(state);
      // Layout/scroll can move a card out from under a stationary pointer.
      // Reconcile the real hover state before the next entry or replay.
      if (active && !state.active) beginEntry(state);
      state.active = active;
      if (!active && state.weight < .001 && state.overlay < .001) continue;
      moving = true;
      state.clock += delta;
      state.cascade += delta;
      state.weight += ((active ? 1 : 0) - state.weight) * (1 - Math.exp(-delta/(active ? .35 : .55)));
      if (!active && state.weight < .001) state.weight = 0;
      state.card.classList.toggle('card-motion-active',active || state.weight > .001);
      const wave = state.clock;
      state.card.style.setProperty('--card-glow-x',`${Math.sin(wave * .58) * 26 * state.weight}px`);
      state.card.style.setProperty('--card-glow-y',`${(Math.sin(wave * .43 + .2)-Math.sin(.2)) * 18 * state.weight}px`);
      state.card.style.setProperty('--card-glow-scale',String(1 + Math.sin(wave * .7) ** 2 * .085 * state.weight));
      state.card.style.setProperty('--card-arrow-x',`${6 * state.weight}px`);
      state.card.style.setProperty('--card-art-y',`${-7 * Math.sin(wave * .7) * state.weight}px`);
      state.card.style.setProperty('--card-art-angle',`${-1.8 * Math.sin(wave * .5) * state.weight}deg`);
      if (state.card.matches('.auto-card')) {
        state.card.querySelectorAll('.auto-star').forEach((star,index) => {
          const phase = index * .72;
          star.style.translate = `${(Math.sin(wave*.8+phase)-Math.sin(phase))*3*state.weight}px ${(Math.sin(wave*.6+phase)-Math.sin(phase))*5*state.weight}px`;
          star.style.rotate = `${(Math.sin(wave*.7+phase)-Math.sin(phase))*5*state.weight}deg`;
        });
      }
      if (!state.ready) continue;
      if (state.card.matches('.auto-card')) { drawAuto(state); continue; }
      if (state.card.matches('.churn-card')) { drawChurn(state); continue; }
      // Preserve the existing quick-return / completed-exit replay gate, but
      // use it only as interaction state, never to crossfade chart quality.
      const show = active || (state.forecastStarted && state.cascade < forecastFinish);
      state.overlay += ((show ? 1 : 0) - state.overlay) * (1 - Math.exp(-delta/(show ? .07 : .11)));
      if (!show && state.overlay < .001) state.overlay = 0;
      // Forecast keeps its completed PNG chart when idle. Leaving changes only
      // the surrounding card motion; it cannot swap the chart raster quality.
      if (state.card.matches('.forecast-card')) {
        state.canvas.style.opacity = '1';
        drawForecast(state);
        continue;
      }
    }
    if (moving) frame = requestAnimationFrame(tick);
  }
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const state of states) {
      state.weight = state.overlay = 0;
      state.active = false;
      state.card.classList.remove('card-motion-active');
      ['--card-glow-x','--card-glow-y','--card-glow-scale','--card-arrow-x','--card-art-y','--card-art-angle'].forEach(name => state.card.style.removeProperty(name));
      state.card.querySelectorAll('.auto-star').forEach(star => {star.style.removeProperty('translate');star.style.removeProperty('rotate');});
      if (state.canvas) state.canvas.style.opacity = '0';
      if (state.card.matches('.forecast-card')) {
        state.cascade = Infinity;
        state.forecastStarted = false;
        if (state.ready) drawForecast(state);
      }
      if (state.image) state.image.style.removeProperty('opacity');
      if (state.card.matches('.auto-card') && state.ready) drawAuto(state);
      if (state.card.matches('.churn-card') && state.ready) drawChurn(state);
    }
  }
  for (const state of states) {
    // Scrolling a card beneath a stationary cursor is not a new hover intent.
    const pointerInterest = event => {
      if (event.pointerType !== 'mouse' || performance.now() - lastScroll < 160) return;
      if (!state.pointer) { state.pointer = true; setInterest(state); }
    };
    state.card.addEventListener('pointerenter',pointerInterest);
    state.card.addEventListener('pointermove',pointerInterest);
    state.card.addEventListener('pointerleave',() => {state.pointer = false;setInterest(state);});
    state.card.addEventListener('focusin',() => {state.focus = !!state.card.querySelector(':focus-visible');setInterest(state);});
    state.card.addEventListener('focusout',event => {if (state.card.contains(event.relatedTarget)) return;state.focus = false;setInterest(state);});
    const preparation=state.preparation=prepare(state);
    const box=state.card.getBoundingClientRect();
    if(box.bottom>0&&box.top<innerHeight+100)window.PortfolioPaintTasks?.push(preparation);
  }
  window.PortfolioVisiblePaintTasks=()=>states.filter(({card})=>{
    const box=card.getBoundingClientRect();return box.bottom>0&&box.top<innerHeight+100;
  }).map(state=>state.preparation);
  addEventListener('scroll',() => {
    lastScroll = performance.now();
    for (const state of states) {
      if (!state.pointer) continue;
      state.pointer = false;setInterest(state);
    }
  },{passive:true});
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.find(item => item.card === entry.target);
      state.visible = entry.isIntersecting;
      // Repaint the retained canvas before it enters view, without replaying
      // its entrance or resetting its pose after an offscreen pause.
      if (state.visible && state.ready) {
        if (state.card.matches('.forecast-card')) drawForecast(state, true);
        else if (state.card.matches('.auto-card')) drawAuto(state);
        else if (state.card.matches('.churn-card')) drawChurn(state);
      }
      state.card.classList.toggle('card-motion-visible',state.visible&&!document.hidden);
      if (!state.visible) state.pointer = false;
      setInterest(state);
    }
  });
  states.forEach(state => observer.observe(state.card));
  // Touch has no hover intent. Use the existing motion while the artwork is
  // in the reading band, not while only the card heading is on screen.
  let attentionObserver;
  function observeAttention(){
    attentionObserver?.disconnect();
    if(hover.matches){
      states.forEach(state=>{state.attention=false;setInterest(state);});
      return;
    }
    const inset=Math.round(innerHeight*.3);
    attentionObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        const state=states.find(item=>item.attentionTarget===entry.target);
        state.attention=entry.isIntersecting;setInterest(state);
      }
    },{rootMargin:`-${inset}px 0px -${inset}px 0px`,threshold:0});
    for(const state of states){
      state.attentionTarget=state.card.querySelector('.case-art-stage,.auto-art')||state.card;
      attentionObserver.observe(state.attentionTarget);
    }
  }
  observeAttention();
  let attentionResize=0;
  addEventListener('resize',()=>{
    cancelAnimationFrame(attentionResize);
    attentionResize=requestAnimationFrame(observeAttention);
  },{passive:true});
  hover.addEventListener('change',observeAttention);
  function preferences() {
    states.forEach(state=>state.card.classList.toggle('card-motion-visible',state.visible&&!document.hidden));
    if (disabled()) reset();
    else if (paused()) {cancelAnimationFrame(frame);frame = 0;}
    else {
      for (const state of states) {
        if (state.card.matches('.forecast-card') && state.ready) {
          state.canvas.style.opacity = '1';
          drawForecast(state, true);
        }
        setInterest(state);
      }
    }
  }
  reduced.addEventListener('change',preferences);
  hover.addEventListener('change',preferences);
  document.addEventListener('visibilitychange',preferences);
  new MutationObserver(preferences).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused','data-motion-disabled']});
})();
