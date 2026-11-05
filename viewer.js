/* Read slides at viewport width. Zoom/pan belongs to the modal, not the page. */
(() => {
  const ui = (id, count) => window.PortfolioLocale.ui(id, count);
  const triggers = [...document.querySelectorAll('.product-board a')];
  if (!triggers.length || typeof HTMLDialogElement === 'undefined') return;
  const dataURL = new URL('gallery-data.json', document.currentScript.src);
  let dataReady;
  function getData() {
    if (!dataReady) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      dataReady = fetch(dataURL, {signal:controller.signal}).then(response => {
        if (!response.ok) throw new Error('Gallery metadata unavailable');
        return response.json();
      }).catch(() => {
        // Retain the primary slide on failure; allow the next opening to
        // recover additional slides after a transient connection problem.
        dataReady = null;
        return {};
      }).finally(() => clearTimeout(timeout));
    }
    return dataReady;
  }
  getData();
  const copy = () => document.documentElement.lang === 'ru' ? {
    zoomIn:'Увеличить', zoomOut:'Уменьшить', width:'По ширине', whole:'Целиком',
    reset:'Вернуть размер по ширине', resetVisible:'Сброс', zoom:'Масштаб изображения',
    close:'закрыть', loading:'Загрузка изображения…', retry:'Повторить загрузку', slides:'слайды', details:'Масштаб: жест или + / −',
    touch:'Разведите пальцы для увеличения · Потяните для перемещения',
    single:'Разведите пальцы для увеличения · Потяните для перемещения',
  } : {
    zoomIn:'Zoom in', zoomOut:'Zoom out', width:'Fit width', whole:'Fit slide',
    reset:'Reset to fit width', resetVisible:'Reset', zoom:'Image zoom',
    close:'close', loading:'Loading image…', retry:'Try again', slides:'slides', details:'Zoom: pinch or + / −',
    touch:'Pinch to zoom · Drag to move', single:'Pinch to zoom · Drag to move',
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'visual-viewer';
  dialog.innerHTML = `<header class="viewer-header"><span class="viewer-counter" aria-live="polite" aria-atomic="true"></span><div class="viewer-tools"><button type="button" class="viewer-button viewer-zoom-out">−</button><button type="button" class="viewer-button viewer-reset">100%</button><button type="button" class="viewer-button viewer-zoom-in">+</button><button type="button" class="viewer-button viewer-fit"></button></div><button type="button" class="viewer-button viewer-close">×</button></header><div class="viewer-viewport" tabindex="0"><div class="viewer-surface"><img class="viewer-image" alt="" draggable="false"></div><p class="viewer-loading" role="status" hidden></p><div class="viewer-error" role="status" hidden><p class="viewer-error-message"></p><button type="button" class="viewer-button viewer-retry"></button></div></div><footer class="viewer-footer"><div class="viewer-navigation"><button type="button" class="viewer-button viewer-prev">←</button><button type="button" class="viewer-button viewer-next">→</button></div><div class="viewer-hints"><p class="viewer-hint-desktop"></p><p class="viewer-hint-mobile"></p></div></footer>`;
  document.body.append(dialog);
  let image = dialog.querySelector('.viewer-image');
  const surface = dialog.querySelector('.viewer-surface');
  const counter = dialog.querySelector('.viewer-counter');
  const previous = dialog.querySelector('.viewer-prev');
  const next = dialog.querySelector('.viewer-next');
  const close = dialog.querySelector('.viewer-close');
  const viewport = dialog.querySelector('.viewer-viewport');
  const error = dialog.querySelector('.viewer-error');
  const loading = dialog.querySelector('.viewer-loading');
  const retry = dialog.querySelector('.viewer-retry');
  const plus = dialog.querySelector('.viewer-zoom-in');
  const minus = dialog.querySelector('.viewer-zoom-out');
  const reset = dialog.querySelector('.viewer-reset');
  const fit = dialog.querySelector('.viewer-fit');
  const pointers = new Map();
  let slides = [], index = 0, opener, originalOverflow, originalScroll, request = 0, loadSerial = 0;
  let zoom = 1, baseWidth = 0, mode = 'width', loaded = false, pinch, safariGesture, tap;
  let resizeFrame = 0;
  let hintTimer = 0, hintStarted = false;
  const mobileHint = dialog.querySelector('.viewer-hint-mobile');
  const dismissHint = () => {
    clearTimeout(hintTimer); hintTimer = 0;
    mobileHint.dataset.dismissed = 'true';
    mobileHint.setAttribute('aria-hidden', 'true');
  };
  const startHint = () => {
    if (hintStarted) return;
    hintStarted = true;
    hintTimer = setTimeout(dismissHint, 4000);
  };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const center = () => {
    const b = viewport.getBoundingClientRect();
    return {x:b.left + viewport.clientWidth / 2, y:b.top + viewport.clientHeight / 2};
  };
  const chromeInsets = () => ({
    top:dialog.querySelector('.viewer-header').getBoundingClientRect().height,
    bottom:dialog.querySelector('.viewer-footer').getBoundingClientRect().height,
  });
  const readingHeight = () => {
    const inset = chromeInsets();
    return Math.max(1, viewport.clientHeight - inset.top - inset.bottom);
  };
  const limits = () => ({
    min:Math.min(1, viewport.clientWidth / baseWidth, readingHeight() / (baseWidth * image.naturalHeight / image.naturalWidth)),
    max:Math.max(4, image.naturalWidth / baseWidth),
  });
  // Some source boards extend slightly beyond the case's mobile viewport.
  // Opening must not shrink those either; their full width stays scrollable.
  const readingWidth = () => Math.max(viewport.clientWidth,
    opener?.getClientRects().length ? opener.querySelector('img').getBoundingClientRect().width : 0);
  const pointAt = point => {
    const b = image.getBoundingClientRect();
    return {x:(point.x-b.left)/b.width, y:(point.y-b.top)/b.height};
  };
  function paint(point, sourcePoint) {
    if (!loaded || !baseWidth) return;
    const w = baseWidth * zoom, h = w * image.naturalHeight / image.naturalWidth;
    surface.style.width = Math.max(viewport.clientWidth, w) + 'px';
    const inset = chromeInsets();
    // Extra travel lets the first/last detail move clear of the floating controls.
    surface.style.paddingTop = inset.top + 'px';
    surface.style.paddingBottom = inset.bottom + 'px';
    surface.style.height = Math.max(viewport.clientHeight, h + inset.top + inset.bottom) + 'px';
    image.style.width = w + 'px';
    image.style.height = h + 'px';
    if (point && sourcePoint) {
      const b = image.getBoundingClientRect();
      panTo(viewport.scrollLeft + b.left + sourcePoint.x * b.width - point.x,
        viewport.scrollTop + b.top + sourcePoint.y * b.height - point.y);
    } else panTo(viewport.scrollLeft, viewport.scrollTop);
    const range = limits();
    reset.textContent = copy().resetVisible + ' ' + Math.round(zoom * 100) + '%';
    minus.disabled = zoom <= range.min + .001;
    plus.disabled = zoom >= range.max - .001;
    fit.textContent = mode === 'whole' ? copy().width : copy().whole;
    fit.setAttribute('aria-label', fit.textContent);
    dialog.dataset.zoom = zoom.toFixed(4);
    viewport.classList.toggle('can-pan', viewport.scrollWidth > viewport.clientWidth + 1 || viewport.scrollHeight > viewport.clientHeight + 1);
  }
  // Clamp explicitly as well as using a scroll container: Safari may otherwise
  // expose negative/beyond-edge positions during rubber-band overscroll.
  function panTo(x, y) {
    viewport.scrollLeft = clamp(x, 0, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
    viewport.scrollTop = clamp(y, 0, Math.max(0, viewport.scrollHeight - viewport.clientHeight));
  }
  function startPinch() {
    if (pointers.size < 2) { pinch = null; return; }
    safariGesture = null;
    const [a,b] = [...pointers.values()];
    const midpoint = {x:(a.x+b.x)/2, y:(a.y+b.y)/2};
    pinch = {distance:Math.hypot(a.x-b.x,a.y-b.y), zoom, source:pointAt(midpoint)};
    for (const point of pointers.values()) { point.moved = true; point.multi = true; }
  }
  function setZoom(value, point = center(), sourcePoint = pointAt(point)) {
    if (!loaded) return;
    dismissHint();
    mode = 'custom';
    const range = limits();
    zoom = clamp(value, range.min, range.max);
    paint(point, sourcePoint);
  }
  function fitImage(kind = 'width') {
    if (!loaded) return;
    mode = kind;
    baseWidth = readingWidth();
    zoom = kind === 'whole' ? limits().min : 1;
    paint();
    viewport.scrollLeft = 0;
    viewport.scrollTop = kind === 'whole' ? 0 : chromeInsets().top;
  }
  const clearPointers = () => {
    for (const id of pointers.keys()) if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    pointers.clear(); pinch = safariGesture = null;
    viewport.classList.remove('is-dragging');
  };
  const busy = value => {
    viewport.setAttribute('aria-busy', String(value));
    surface.hidden = value; loading.hidden = !value;
    for (const button of [plus, minus, reset, fit]) button.disabled = value;
  };
  function hints() {
    const text = copy();
    dialog.querySelector('.viewer-hint-desktop').innerHTML = `<span><kbd>Esc</kbd> ${text.close}</span>${slides.length > 1 ? `<span><kbd>←</kbd><kbd>→</kbd> ${text.slides}</span>` : ''}<span>${text.details}</span>`;
    const mobile = dialog.querySelector('.viewer-hint-mobile');
    mobile.replaceChildren(...(slides.length > 1 ? text.touch : text.single).split(' · ').map(line => {
      const span = document.createElement('span'); span.textContent = line; return span;
    }));
  }
  function show(newIndex) {
    clearPointers(); tap = null; loaded = false; mode = 'width'; zoom = 1;
    busy(true);
    index = clamp(newIndex, 0, slides.length - 1);
    const slide = slides[index];
    error.hidden = true;
    // A fresh Image owns each request. Late events from another slide/retry
    // never change the currently selected slide or reopen a closed dialog.
    const serial = ++loadSerial;
    const pending = new Image();
    pending.className = 'viewer-image'; pending.alt = slide.alt; pending.draggable = false;
    pending.addEventListener('load', () => {
      if (serial !== loadSerial || !dialog.open || !pending.naturalWidth) return;
      image.replaceWith(pending); image = pending;
      loaded = true; error.hidden = true; busy(false); fitImage('width'); startHint();
    }, {once:true});
    pending.addEventListener('error', () => {
      if (serial !== loadSerial || !dialog.open) return;
      loaded = false; busy(true); loading.hidden = true;
      viewport.setAttribute('aria-busy', 'false'); error.hidden = false;
    }, {once:true});
    pending.src = slide.src;
    counter.textContent = `${index + 1} / ${slides.length}`;
    previous.disabled = index === 0; next.disabled = index === slides.length - 1;
    previous.hidden = next.hidden = slides.length < 2;
    hints();
    const preload = slides[index + 1];
    if (preload) { const img = new Image(); img.src = preload.src; }
  }
  for (const trigger of triggers) {
    trigger.dataset.viewer = '';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', `${trigger.querySelector('img').alt} — ${ui('openGallery')}`);
    trigger.addEventListener('click', async event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const token = ++request, data = await getData();
      if (token !== request || dialog.open) return;
      const node = trigger.closest('[data-source-node]')?.dataset.sourceNode;
      const label = trigger.querySelector('img').alt, supplied = data[node];
      slides = [{src:trigger.href, alt:label}, ...(supplied || []).map((slide, i) => ({
        src:new URL(slide.src, document.baseURI).href,
        alt:`${label} — ${ui('screen')} ${i + 1} / ${supplied.length}`,
      }))];
      opener = trigger; originalOverflow = document.body.style.overflow;
      originalScroll = {left:scrollX, top:scrollY, behavior:'instant'};
      document.body.style.overflow = 'hidden';
      clearTimeout(hintTimer); hintTimer = 0; hintStarted = false;
      delete mobileHint.dataset.dismissed; mobileHint.removeAttribute('aria-hidden');
      dialog.showModal(); show(0); close.focus({preventScroll:true});
    });
  }
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  retry.addEventListener('click', () => { close.focus({preventScroll:true}); show(index); });
  close.addEventListener('click', dismiss);
  plus.addEventListener('click', () => setZoom(zoom * 1.25));
  minus.addEventListener('click', () => setZoom(zoom / 1.25));
  reset.addEventListener('click', () => fitImage('width'));
  fit.addEventListener('click', () => fitImage(mode === 'whole' ? 'width' : 'whole'));
  function restoreCase() {
    dismissHint();
    clearPointers(); loaded = false; ++request; ++loadSerial;
    document.body.style.overflow = originalOverflow ?? '';
    const focusTarget = opener?.getClientRects().length ? opener : document.querySelector('main');
    if (focusTarget) {
      if (focusTarget !== opener && !focusTarget.hasAttribute('tabindex')) focusTarget.tabIndex = -1;
      focusTarget.focus({preventScroll:true});
    }
    if (originalScroll) window.scrollTo(originalScroll);
    originalScroll = null;
  }
  function dismiss() {
    dialog.close(); restoreCase();
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', () => { if (!dialog.open && originalScroll) restoreCase(); });
  // Cancel an opening request still awaiting metadata, and never cache a page
  // with an orphaned modal/scroll lock when leaving it.
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!dialog.open)++request;
  });
  const leave=()=>{if(dialog.open)dismiss();else ++request;};
  addEventListener('pagehide',leave);
  document.addEventListener('portfolio:before-navigation',leave);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const stops = [...dialog.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(node => !node.hidden && node.getClientRects().length);
      const first = stops[0], last = stops.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    // Preserve native Space activation on buttons; Space pans only when the
    // image viewport itself owns focus. Otherwise keyboard Close/Reset fail.
    } else if (event.key === ' ' && event.target !== viewport) {
      return;
    } else if (['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault();
      if (event.shiftKey) panTo(viewport.scrollLeft + (event.key === 'ArrowRight' ? 100 : -100), viewport.scrollTop);
      else show(index + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (['+','=','-','0'].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0') fitImage('width');
      else setZoom(zoom * (event.key === '-' ? 1/1.25 : 1.25));
    } else if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') panTo(viewport.scrollLeft, 0);
      else if (event.key === 'End') panTo(viewport.scrollLeft, viewport.scrollHeight);
      else panTo(viewport.scrollLeft, viewport.scrollTop + (['ArrowUp','PageUp'].includes(event.key) ? -1 : 1) * (event.key.startsWith('Arrow') ? 80 : viewport.clientHeight*.85));
    }
  });
  // Trackpad pinch arrives as ctrl+wheel in Chromium. Ordinary wheel keeps
  // native two-axis scrolling inside the image viewport.
  dialog.addEventListener('wheel', event => {
    if (loaded && (event.deltaX || event.deltaY)) dismissHint();
    if (!event.ctrlKey) return;
    event.preventDefault();
    if (safariGesture || !loaded) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    setZoom(zoom * Math.exp(-clamp(event.deltaY*unit,-200,200)*.003), {x:event.clientX,y:event.clientY});
  }, {passive:false});
  // Safari's native trackpad gesture is separate from Pointer Events.
  dialog.addEventListener('gesturestart', event => {
    event.preventDefault();
    if (!loaded || pointers.size > 1) return;
    const point = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) ? {x:event.clientX,y:event.clientY} : center();
    safariGesture = {zoom, point, source:pointAt(point)};
  }, {passive:false});
  dialog.addEventListener('gesturechange', event => {
    event.preventDefault();
    if (safariGesture && Number.isFinite(event.scale)) {
      const point = Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? {x:event.clientX,y:event.clientY} : safariGesture.point;
      setZoom(safariGesture.zoom*event.scale, point, safariGesture.source);
    }
  }, {passive:false});
  dialog.addEventListener('gestureend', event => { event.preventDefault(); safariGesture = null; }, {passive:false});
  viewport.addEventListener('dblclick', event => {
    event.preventDefault();
    setZoom(zoom > 1.5 ? 1 : 2, {x:event.clientX,y:event.clientY});
  });
  viewport.addEventListener('pointerdown', event => {
    if (!loaded || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    const point = {x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,time:performance.now(),type:event.pointerType,moved:false};
    pointers.set(event.pointerId, point); viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
    if (pointers.size >= 2) startPinch();
  });
  viewport.addEventListener('pointermove', event => {
    const point = pointers.get(event.pointerId); if (!point) return;
    const dx = event.clientX-point.x, dy = event.clientY-point.y;
    point.x = event.clientX; point.y = event.clientY;
    if (Math.hypot(point.x-point.startX,point.y-point.startY)>8) { point.moved = true; dismissHint(); }
    if (pointers.size >= 2 && pinch) {
      const [a,b] = [...pointers.values()];
      setZoom(pinch.zoom * Math.hypot(a.x-b.x,a.y-b.y) / Math.max(1,pinch.distance), {x:(a.x+b.x)/2,y:(a.y+b.y)/2}, pinch.source);
    } else if (pointers.size === 1) {
      panTo(viewport.scrollLeft - dx, viewport.scrollTop - dy);
    }
  });
  function endPointer(event) {
    const point = pointers.get(event.pointerId); if (!point) return;
    const wasPinch = !!pinch;
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    startPinch();
    if (pointers.size) {
      const remaining = [...pointers.values()][0]; remaining.startX = remaining.x; remaining.startY = remaining.y; remaining.moved = true;
    } else viewport.classList.remove('is-dragging');
    if (event.type !== 'pointerup' || wasPinch || point.multi || point.type === 'mouse') return;
    const dx = point.x-point.startX, dy = point.y-point.startY;
    if (!point.moved) {
      const now = performance.now();
      if (tap && now-tap.time<300 && Math.hypot(point.x-tap.x,point.y-tap.y)<30) { setZoom(zoom>1.5?1:2,point); tap = null; }
      else tap = {x:point.x,y:point.y,time:now};
    } else if (!viewport.classList.contains('can-pan') && Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3 && performance.now()-point.time<1200) show(index+(dx<0?1:-1));
  }
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('lostpointercapture', event => { if (pointers.has(event.pointerId)) endPointer(event); });
  const layoutObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (!dialog.open || !loaded) return;
      if (mode !== 'custom') fitImage(mode);
      else { const point = center(), source = pointAt(point); baseWidth = readingWidth(); paint(point,source); }
    });
  });
  for (const element of [viewport, dialog.querySelector('.viewer-header'), dialog.querySelector('.viewer-footer')]) layoutObserver.observe(element);
  function localize() {
    const text = copy();
    for (const trigger of triggers) trigger.setAttribute('aria-label', `${trigger.querySelector('img').alt} — ${ui('openGallery')}`);
    dialog.setAttribute('aria-label',ui('viewerTitle'));
    close.setAttribute('aria-label',ui('close'));
    previous.setAttribute('aria-label',ui('previous')); next.setAttribute('aria-label',ui('next'));
    plus.setAttribute('aria-label',text.zoomIn); minus.setAttribute('aria-label',text.zoomOut);
    reset.setAttribute('aria-label',text.reset); reset.title = text.reset;
    viewport.setAttribute('aria-label',text.zoom); error.querySelector('.viewer-error-message').textContent = ui('loadError');
    loading.textContent = text.loading; retry.textContent = text.retry;
    hints();
    if (dialog.open && opener) {
      const label = opener.querySelector('img').alt;
      slides[0].src = opener.href;
      slides.forEach((slide,i) => { slide.alt = i ? `${label} — ${ui('screen')} ${i} / ${slides.length-1}` : label; });
      show(index);
    } else fit.textContent = text.whole;
  }
  document.addEventListener('portfolio:locale-changed',localize);
  new MutationObserver(() => { if (dialog.open) localize(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  localize();
})();
