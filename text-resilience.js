/* Text-only zoom does not change viewport breakpoints. A one-line em probe
   observes that separate scale, without altering the user's font preference. */
(() => {
 const probe=document.createElement('span');probe.textContent='M';probe.setAttribute('aria-hidden','true');
 probe.style.cssText='position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;font:16px/1 sans-serif;white-space:nowrap;';
 document.body.append(probe);
 const update=()=>{document.documentElement.dataset.textEnlarged=String(probe.getBoundingClientRect().height>20);};
 new ResizeObserver(update).observe(probe);update();
})();

/* Fit translated/zoomed content against the existing geometry. No alternate
   copy or font sizes: only resolve a proven collision in the current layout. */
(() => {
 const cards=[...document.querySelectorAll('.work-grid .forecast-card,.work-grid .churn-card')];
 const boards=[...document.querySelectorAll('.case-desktop .metrics')];
 const secondary=[...document.querySelectorAll('.work-grid .small-card:has(.card-link)')];
 if(!cards.length&&!boards.length)return;
 const gap=28;
 let queued=false;
 const px=value=>parseFloat(value)||0;
 // offset geometry deliberately ignores entrance/hover transforms.
 const topWithin=(node,ancestor)=>{let top=0;for(let item=node;item&&item!==ancestor;item=item.offsetParent)top+=item.offsetTop;return top;};
 function fitCards(){
   cards.forEach(card=>{
     delete card.dataset.ctaLayout;
     ['--content-cta-top','--content-card-height','--content-cta-gap'].forEach(name=>card.style.removeProperty(name));
   });
   const visible=cards.filter(card=>card.offsetWidth&&card.offsetHeight);
   const paired=visible.length===2&&Math.abs((visible[0].closest('.corner-shell')||visible[0]).offsetTop-(visible[1].closest('.corner-shell')||visible[1]).offsetTop)<2;
   const groups=paired?[visible]:visible.map(card=>[card]);
   for(const group of groups){
     const rows=group.map(card=>{
       const description=card.querySelector(':scope > p'),link=card.querySelector(':scope > .card-link'),label=link?.querySelector('.text-link');
       if(!description||!label)return null;
       const descriptionEnd=topWithin(description,card)+description.offsetHeight;
       const top=topWithin(label,card);
       return {card,link,label,descriptionEnd,top,absolute:getComputedStyle(label).position==='absolute'};
     }).filter(Boolean);
     if(!rows.length)continue;
     const target=Math.max(...rows.map(row=>Math.max(row.top,row.descriptionEnd+gap)));
     let requiredHeight=0;
     for(const row of rows){
       if(target-row.top<.5)continue;
       if(row.absolute){
         row.card.dataset.ctaLayout='absolute';
         row.card.style.setProperty('--content-cta-top',`${target}px`);
         const tags=row.card.querySelector('.case-tags');
         const clearance=tags?topWithin(tags,row.card)-(target+row.label.offsetHeight):Infinity;
         if(clearance<gap)requiredHeight=Math.max(requiredHeight,row.card.offsetHeight+gap-clearance);
       }else{
         const margin=px(getComputedStyle(row.link).marginTop);
         row.card.dataset.ctaLayout='flow';
         row.card.style.setProperty('--content-cta-gap',`${margin+target-row.top}px`);
       }
     }
     if(requiredHeight)rows.filter(row=>row.absolute).forEach(row=>{
       row.card.dataset.ctaLayout='absolute';
       row.card.style.setProperty('--content-cta-top',`${target}px`);
       row.card.style.setProperty('--content-card-height',`${requiredHeight}px`);
     });
   }
 }
 function intrinsicWidth(node,fullLines){
   const copy=node.cloneNode(true);
   copy.removeAttribute('id');copy.removeAttribute('data-i18n');
   copy.setAttribute('aria-hidden','true');
   // Keep the same ancestor/font context, including text-only zoom and units.
   copy.style.cssText+=';position:absolute!important;visibility:hidden!important;pointer-events:none!important;inset:0 auto auto 0!important;width:max-content!important;max-width:none!important;min-width:0!important;white-space:nowrap!important;display:block!important;transform:none!important;';
   if(!fullLines){
     const words=node.textContent.trim().split(/\s+/);
     copy.replaceChildren();
     words.forEach((word,index)=>{if(index)copy.append(document.createElement('br'));copy.append(document.createTextNode(word));});
   }
   node.parentElement.append(copy);
   const width=copy.offsetWidth;copy.remove();return width;
 }
 function fitMetrics(){
   for(const board of boards){
     delete board.dataset.contentColumns;board.style.removeProperty('--content-columns');
     if(!board.offsetWidth)continue;
     const style=getComputedStyle(board),count=style.gridTemplateColumns.trim().split(/\s+/).length;
     if(count<=1)continue;
     const captions=[...board.querySelectorAll(':scope > div > dd')];
     // Explicit breaks are part of the source; ordinary prose may wrap freely.
     const need=Math.max(0,...captions.map(node=>intrinsicWidth(node,!!node.querySelector('br'))));
     const available=board.clientWidth-px(style.paddingLeft)-px(style.paddingRight),columnGap=px(style.columnGap);
     const options=[...new Set([count,Math.min(2,count),1])];
     const columns=options.find(n=>(available-columnGap*(n-1))/n>=need+1)||1;
     if(columns<count){board.dataset.contentColumns=String(columns);board.style.setProperty('--content-columns',columns);}
   }
 }
 function fitSecondary(){
   for(const card of secondary){
     delete card.dataset.contentHeight;card.style.removeProperty('--secondary-card-height');
     if(!card.offsetWidth)continue;
     const description=card.querySelector(':scope > p'),label=card.querySelector('.card-link .text-link');
     if(!description||!label)continue;
     const style=getComputedStyle(label);
     // The reference small-card action is bottom anchored; increase only its
     // container when a wrapped heading consumes its reserved breathing room.
     if(style.position!=='absolute'||style.bottom==='auto')continue;
     const clearance=topWithin(label,card)-topWithin(description,card)-description.offsetHeight;
     if(clearance<gap){card.dataset.contentHeight='true';card.style.setProperty('--secondary-card-height',`${card.offsetHeight+gap-clearance}px`);}
   }
 }
 const update=()=>{queued=false;fitCards();fitSecondary();fitMetrics();};
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
 const observer=new ResizeObserver(schedule);
 [...cards,...secondary,...boards].forEach(node=>observer.observe(node));
 // Text height can change without a card-width change (font/text zoom).
 [...cards,...secondary].forEach(card=>{for(const node of card.querySelectorAll(':scope > p,:scope > h2'))observer.observe(node);});
 boards.forEach(board=>board.querySelectorAll('dd').forEach(node=>observer.observe(node)));
 addEventListener('resize',schedule,{passive:true});
 document.addEventListener('portfolio:locale-changed',schedule);
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-text-enlarged']});
 document.fonts.ready.then(schedule);schedule();
})();
