/* Native Safari can move the asynchronous scroll surface ahead of its paint.
   A non-passive wheel observer keeps that path coordinated with the main thread.
   Intentionally empty: do not cancel the gesture or replace native scrolling.
   Verified against recorded trusted-wheel input, not only programmatic scroll. */
(()=>{
 if(window.PortfolioWheelPaintSync)return;
 const ua=navigator.userAgent;
 if(!/Version\/[\d.]+.*Safari\//.test(ua)||/(?:Chrome|Chromium|CriOS|FxiOS|Edg|OPR)\//.test(ua))return;
 if(!matchMedia('(any-pointer:fine)').matches)return;
 addEventListener('wheel',()=>{}, {capture:true,passive:false});
 window.PortfolioWheelPaintSync=true;
})();
