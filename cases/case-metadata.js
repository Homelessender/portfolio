// Locale rendering replaces paragraph children; rebuild on every replacement.
(() => {
  const ids=['539:3017','539:3018','539:3019','833:21634','833:21635','833:21636'];
  const paragraphs=ids.flatMap(id=>[...document.querySelectorAll(`[data-i18n="${id}"]`)]);
  const rows=new Map();
  const inline=new Map();
  const characterBox=(node,last)=>{
    const value=node?.nodeType===Node.TEXT_NODE?node.data:'';
    const at=last?value.search(/\S\s*$/):value.search(/\S/);
    if(at<0)return null;
    const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+1);
    return range.getBoundingClientRect();
  };
  function update(){
    for(const list of rows.values()) for(const row of list){
      let previous;
      for(const item of row.children){
        const top=item.offsetTop;
        item.classList.toggle('line-start',previous===undefined||Math.abs(top-previous)>1);
        previous=top;
      }
    }
    for(const separators of inline.values())for(const separator of separators){
      const before=characterBox(separator.previousSibling,true);
      const after=characterBox(separator.nextSibling,false);
      const box=separator.getBoundingClientRect();
      // Reserve the original glyph and spacing: hiding an orphan must not
      // change wrapping, including Safari's native text-only enlargement.
      const sameLine=before&&after&&Math.abs(before.top-box.top)<1&&Math.abs(after.top-box.top)<1;
      separator.style.visibility=sameLine?'visible':'hidden';
    }
  }
  const resize=new ResizeObserver(update);
  function rebuild(paragraph){
    if(paragraph.closest('.case-desktop')){
      if(paragraph.querySelector('[data-inline-separator]'))return;
      const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT),nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      const separators=[];
      for(const node of nodes){
        const parts=node.data.split(/([·•])/);
        if(parts.length===1)continue;
        const fragment=document.createDocumentFragment();
        parts.forEach((part,index)=>{
          if(index%2){
            const separator=document.createElement('span');separator.dataset.inlineSeparator='';
            separator.setAttribute('aria-hidden','true');separator.textContent=part;
            fragment.append(separator);separators.push(separator);
          }else fragment.append(document.createTextNode(part));
        });
        node.replaceWith(fragment);
      }
      inline.set(paragraph,separators);resize.observe(paragraph);update();return;
    }
    if(paragraph.querySelector('.case-meta-row'))return;
    (rows.get(paragraph)||[]).forEach(row=>resize.unobserve(row));
    const fragment=document.createDocumentFragment(),list=[];
    for(const line of paragraph.innerHTML.split(/<br\s*\/?\s*>/i)){
      const text=document.createElement('span');text.innerHTML=line;
      const row=document.createElement('span');row.className='case-meta-row';
      for(const item of text.textContent.split(/\s*[·•]\s*/)){
        if(!item.trim())continue;
        const span=document.createElement('span');span.className='case-meta-item';
        span.textContent=item.trim();row.append(span);
      }
      fragment.append(row);list.push(row);
    }
    paragraph.classList.add('case-meta-list');paragraph.replaceChildren(fragment);
    rows.set(paragraph,list);list.forEach(row=>resize.observe(row));update();
  }
  const changes=new MutationObserver(records=>{
    for(const paragraph of new Set(records.map(record=>record.target)))rebuild(paragraph);
  });
  for(const paragraph of paragraphs){rebuild(paragraph);changes.observe(paragraph,{childList:true});}
  document.fonts.ready.then(update);
})();
