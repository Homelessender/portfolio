/* Shared copy operation. Call directly from the user gesture: local HTTP previews
   do not expose navigator.clipboard, even though native copy may still work. */
(() => {
 window.PortfolioCopyText = async text => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const active=document.activeElement,selection=window.getSelection();
  const ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
  const field=document.createElement('textarea');
  field.value=text;field.readOnly=true;field.tabIndex=-1;
  field.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none';
  let delivered=false,accepted=false;
  const copy=event=>{
   if(!event.clipboardData||!event.isTrusted)return;
   event.clipboardData.setData('text/plain',text);event.preventDefault();delivered=true;
  };
  document.body.append(field);
  document.addEventListener('copy',copy);
  try {
   field.focus({preventScroll:true});field.select();field.setSelectionRange(0,text.length);
   accepted=document.execCommand('copy');
  } finally {
   document.removeEventListener('copy',copy);field.remove();
   active?.focus({preventScroll:true});
   if(selection){selection.removeAllRanges();for(const range of ranges)selection.addRange(range);}
  }
  // A truthy command result alone is insufficient: require the native copy event.
  if(!accepted||!delivered)throw new Error('Clipboard unavailable');
 };
})();
