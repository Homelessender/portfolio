// Source parameters live on the element, not in a global guessed squircle style.
// A separate SVG carries the original shadows/stroke so clipping never cuts them off.
(() => {
  const geometry = window.FigmaSquircle;
  if (!geometry || !CSS.supports('clip-path', 'path("M0 0H1V1H0Z")')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const records = new Map();
  let serial = 0;
  const svgNode = (name, attrs = {}) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  function shadowParts(value) {
    return (value.match(/(?:rgba?\([^)]*\)|[^,])+/g) || []).flatMap(part => {
      if (part.includes('inset') || part === 'none') return [];
      const color = part.match(/rgba?\([^)]*\)/)?.[0];
      const lengths = [...part.replace(color || '', '').matchAll(/(-?[\d.]+)px/g)].map(m => +m[1]);
      // The mapped Figma surfaces use outset shadows with zero spread.
      if (!color || lengths.length < 2 || lengths[3]) return [];
      return [{color, x: lengths[0], y: lengths[1], blur: (lengths[2] || 0) / 2}];
    });
  }
  function paint(record, style, width, height) {
    const {shadow, defs, shadowPath, strokePath, element,hoverPath,hoverDefs} = record;
    defs.replaceChildren();
    hoverDefs?.replaceChildren();
    const parts = shadowParts(style.boxShadow);
    if (parts.length) {
      const id = `smooth-shadow-${record.id}`;
      const filter = svgNode('filter', {id, x: -100, y: -100, width: width + 200, height: height + 200, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB'});
      const merge = svgNode('feMerge', {result: 'combined-shadows'});
      parts.forEach((part, index) => {
        const result = `shadow-${index}`;
        filter.append(svgNode('feGaussianBlur', {in: 'SourceAlpha', stdDeviation: part.blur, result: `${result}-blur`}), svgNode('feOffset', {in: `${result}-blur`, dx: part.x, dy: part.y, result: `${result}-offset`}), svgNode('feFlood', {'flood-color': part.color, result: `${result}-color`}), svgNode('feComposite', {in: `${result}-color`, in2: `${result}-offset`, operator: 'in', result}));
        merge.append(svgNode('feMergeNode', {in: result}));
      });
      filter.append(merge, svgNode('feComposite', {in: 'combined-shadows', in2: 'SourceAlpha', operator: 'out'})); defs.append(filter);
      shadowPath.setAttribute('filter', `url(#${id})`);
      shadow.style.display = '';
    } else shadow.style.display = 'none';
    if(hoverPath){
      const id=`smooth-hover-${record.id}`;
      const filter=svgNode('filter',{id,x:-100,y:-100,width:width+200,height:height+200,filterUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'});
      filter.append(svgNode('feGaussianBlur',{in:'SourceAlpha',stdDeviation:12,result:'soft'}),
        svgNode('feOffset',{in:'soft',dx:0,dy:12,result:'offset'}),
        svgNode('feFlood',{class:'corner-hover-tint',result:'tint'}),
        svgNode('feComposite',{in:'tint',in2:'offset',operator:'in',result:'shade'}),
        svgNode('feComposite',{in:'shade',in2:'SourceAlpha',operator:'out'}));
      hoverDefs.append(filter);hoverPath.setAttribute('filter',`url(#${id})`);
      shadow.style.display='';
    }
    const border = parseFloat(style.borderTopWidth);
    strokePath.setAttribute('stroke', style.borderTopColor);
    strokePath.setAttribute('stroke-width', border);
    strokePath.style.display = border ? '' : 'none';
    element.dataset.cornerApplied = 'true';
  }
  function cacheShadow(record, svg, width, height) {
    if (!svg || !record.element.matches('.work-grid .case-card')) return;
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns',ns);
    clone.setAttribute('width',width+200);clone.setAttribute('height',height+200);
    clone.setAttribute('viewBox',`-100 -100 ${width+200} ${height+200}`);
    clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('data-cache-key');
    clone.querySelectorAll('.corner-hover-tint').forEach(n=>{const tint=getComputedStyle(svg.querySelector('.corner-hover-tint'));n.setAttribute('flood-color',tint.floodColor);n.setAttribute('flood-opacity',tint.floodOpacity);});
    const key=new XMLSerializer().serializeToString(clone);
    if(svg._cacheKey===key)return;svg._cacheKey=key;
    const image=new Image();
    image.onload=()=>{
      if(svg._cacheKey!==key)return;
      const canvas=svg._cacheCanvas||document.createElement('canvas');
      // Bound each soft-shadow bitmap to 4MP; preserve native density below that.
      const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(4_000_000/((width+200)*(height+200))));
      canvas.width=Math.ceil((width+200)*ratio);canvas.height=Math.ceil((height+200)*ratio);
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      canvas.setAttribute('aria-hidden','true');
      canvas.className=svg.getAttribute('class');
      canvas.style.cssText=`position:absolute;left:-100px;top:-100px;width:${width+200}px;height:${height+200}px;max-width:none;pointer-events:none;will-change:opacity`;
      if(!svg._cacheCanvas){svg.after(canvas);svg._cacheCanvas=canvas;}
      svg.style.visibility='hidden';
    };
    image.onerror=()=>{if(svg._cacheKey===key){svg._cacheKey=null;svg.style.visibility='';svg._cacheCanvas?.remove();svg._cacheCanvas=null;}};
    image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(key);
  }
  function update(record) {
    const {element, shadow, stroke, shadowPath, strokePath} = record;
    // offset dimensions ignore entrance transforms; fractional computed sizes avoid rounding.
    element.classList.remove('smooth-shape');
    const style = getComputedStyle(element);
    const width = parseFloat(style.width), height = parseFloat(style.height);
    if (!(width > 0 && height > 0) || style.display === 'none') return;
    const sourceWidth = +element.dataset.cornerWidth;
    const sourceRadius = +element.dataset.cornerRadius;
    const mobile = matchMedia(`(max-width:${element.dataset.cornerMobileBreakpoint || 700}px)`).matches && element.dataset.cornerMobileRadius;
    const radius = mobile ? +element.dataset.cornerMobileRadius * width / +element.dataset.cornerMobileWidth : sourceWidth ? sourceRadius * width / sourceWidth : parseFloat(style.borderTopLeftRadius);
    const smoothing = +element.dataset.cornerSmoothing;
    const params = {width, height, cornerRadius: radius, cornerSmoothing: smoothing};
    const path = geometry.getSvgPath(params).replace(/\s+/g, ' ').trim();
    const embedded = element.dataset.cornerClip === 'mobile' && !mobile;
    element.style.clipPath = embedded ? '' : `path('${path}')`;
    element.dataset.cornerRendering = embedded ? 'embedded' : 'generated';
    for (const svg of [shadow, stroke, record.hoverShadow].filter(Boolean)) {
      svg.setAttribute('width', width); svg.setAttribute('height', height);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    shadowPath.setAttribute('d', path);
    record.hoverPath?.setAttribute('d',path);
    const inset = parseFloat(style.borderTopWidth) / 2;
    strokePath.setAttribute('d', geometry.getSvgPath({...params, width: width - inset * 2, height: height - inset * 2, cornerRadius: Math.max(0, radius - inset)}));
    strokePath.setAttribute('transform', `translate(${inset} ${inset})`);
    paint(record, style, width, height);
    element.classList.add('smooth-shape');
    element.dataset.cornerResolvedRadius = radius.toFixed(4);
    cacheShadow(record,shadow,width,height);cacheShadow(record,record.hoverShadow,width,height);
  }
  document.querySelectorAll('[data-corner-smoothing]').forEach(element => {
    if (+element.dataset.cornerSmoothing === 0) return;
    const shell = document.createElement('div');
    shell.className = 'corner-shell';
    element.before(shell); shell.append(element);
    const shadow = svgNode('svg', {class: 'corner-shadow', 'aria-hidden': 'true', focusable: 'false'});
    const defs = svgNode('defs'), shadowPath = svgNode('path', {fill: '#000'});
    shadow.append(defs, shadowPath);
    const hoverPath=element.matches('.work-grid .case-card')?svgNode('path',{fill:'#000'}):null;
    const hoverShadow=hoverPath?svgNode('svg',{class:'corner-shadow corner-hover-path','aria-hidden':'true',focusable:'false'}):null;
    const hoverDefs=hoverPath?svgNode('defs'):null;
    if(hoverShadow)hoverShadow.append(hoverDefs,hoverPath);
    const stroke = svgNode('svg', {class: 'corner-stroke', 'aria-hidden': 'true', focusable: 'false'});
    const strokePath = svgNode('path', {fill: 'none'}); stroke.append(strokePath);
    shell.prepend(shadow); if(hoverShadow)shell.append(hoverShadow); shell.append(stroke);
    const record = {id: ++serial, element, shell, shadow, defs, shadowPath, stroke, strokePath,hoverPath,hoverShadow,hoverDefs};
    records.set(element, record); update(record);
  });
  const resize = new ResizeObserver(entries => entries.forEach(entry => update(records.get(entry.target))));
  records.forEach(record => resize.observe(record.element));
  // Theme changes affect stroke and shadow colors, not the geometry or animation clock.
  new MutationObserver(() => records.forEach(update)).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
})();
