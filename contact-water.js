/* Candidate 11: high-resolution colour retains the original day geometry mask.
   Animate only water interiors; the static foreground remains underneath. */
(() => {
  const host=document.querySelector('.contact-landscape');
  const flat=host?.hasAttribute('data-static-scene');
  const terrain=host?.querySelector('.contact-terrain')||host;
  const image=host?.querySelector('.contact-extended');
  // Retain the day geometry as a mask when moonlight darkens the moss/rock.
  const maskImage=new Image();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const section=host?.closest('.contact-section')||host;
  const pointer={x:0,y:0,strength:0,tx:0,ty:0,target:0};
  if(!image||new URLSearchParams(location.search).get('contact')==='still')return;
  let visible=false,ready=false,frame=0,last=0,time=0,failed=false,artworkRequest=0;
  const reflectionEnabled=new URLSearchParams(location.search).get('reflection')!=='off';
  let reflectionReady=false,lightSample=-1;
  const reflectedLayers=[],reflectionRects=[];
  const canvas=document.createElement('canvas');
  canvas.className='contact-landscape-canvas contact-extended-motion';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:flat,preserveDrawingBuffer:flat,premultipliedAlpha:!flat,antialias:false,depth:false,powerPreference:'low-power'});
  if(!gl)return;
  terrain.append(canvas);
  const vertex=`attribute vec2 position;varying vec2 uv;
    void main(){uv=vec2((position.x+1.)*.5,(1.-position.y)*.5);gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision highp float;
    uniform sampler2D artwork;uniform sampler2D skyline;uniform sampler2D geometry;
    uniform sampler2D glowA;uniform sampler2D glowB;uniform sampler2D glowC;
    uniform vec4 glowRectA;uniform vec4 glowRectB;uniform vec4 glowRectC;
    uniform vec3 glowGain;uniform float reflectionStrength;
    uniform float time;uniform float motion;uniform float night;uniform vec2 texel;uniform vec3 cursor;
    varying vec2 uv;
    float waterAt(vec2 p){
      vec3 c=texture2D(geometry,p).rgb;
      float pool=(1.-smoothstep(.12,.28,c.r))*(1.-smoothstep(.31,.48,c.g));
      return pool*smoothstep(.008,.045,c.b-c.r)*step(.565,p.y);
    }
    vec3 reflectedGlow(sampler2D field,vec2 point,vec4 bounds){
      vec2 q=(point-bounds.xy)/max(bounds.zw,vec2(.001));
      float inside=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
      vec4 a=texture2D(field,clamp(q,0.,1.));
      vec4 b=texture2D(field,clamp(q+vec2(0.,.08),0.,1.));
      vec4 c=texture2D(field,clamp(q-vec2(0.,.08),0.,1.));
      return (a.rgb*a.a*.5+b.rgb*b.a*.25+c.rgb*c.a*.25)*inside;
    }
    void main(){
      // Same registration as CSS: source y364, +35% terrain, 1.095 Y scale.
      vec2 p=vec2(uv.x,(364.+uv.y*585.)/975.655);
      vec3 base=texture2D(artwork,p).rgb;
      float water=waterAt(p);
      // Fade before the banks: neither grass nor white cliff edges may wobble.
      water*=waterAt(p+vec2(0.,texel.y*5.))*waterAt(p-vec2(0.,texel.y*5.));
      water*=waterAt(p+vec2(texel.x*5.,0.))*waterAt(p-vec2(texel.x*5.,0.));
      float waterTime=time*1.9;
      float wave=sin(p.y*420.+sin(p.x*23.+waterTime*.31)*1.5-waterTime*.72);
      float small=sin(p.y*870.+p.x*38.+waterTime*.46);
      vec2 drift=vec2(sin(p.y*550.-waterTime*.6)*.0008,(wave+small*.3)*.0032)*water*motion;
      vec3 colour=texture2D(artwork,p+drift).rgb;
      // Restrained, broad blue reflection, with no bright drawn rings.
      colour+=vec3(.005,.013,.022)*(wave*.5+.5)*water*motion;

      // Mirror the actual sky-light rasters into each pool's water plane.
      // Compressed perspective and the existing waves break up the reflection;
      // the original day geometry keeps it away from grass and stone banks.
      if(night>.5&&water>.001&&reflectionStrength>0.){
        float smallPool=step(.72,p.x)*(1.-smoothstep(.70,.75,p.y));
        float hinge=mix(.40,.16,smallPool);
        vec2 reflectionPoint=vec2(.5+(uv.x-.5)*.92,hinge-(uv.y-hinge)*2.2);
        reflectionPoint+=vec2(sin(p.y*550.-waterTime*.6)*.0035,(wave*.004+small*.001))*motion;
        vec3 reflected=reflectedGlow(glowA,reflectionPoint,glowRectA)*glowGain.x
          +reflectedGlow(glowB,reflectionPoint,glowRectB)*glowGain.y
          +reflectedGlow(glowC,reflectionPoint,glowRectC)*glowGain.z;
        colour+=reflected*water*reflectionStrength*(.90+(.018*wave+.008*small)*motion);
      }

      vec4 edge=texture2D(skyline,vec2(p.x,.5));
      float horizon=(edge.r*255.*256.+edge.g*255.)/65535.;
      float sky=1.-smoothstep(horizon-.007,horizon,p.y);
      vec2 light=vec2(uv.x-(.62+cursor.x*.36),uv.y+.24+cursor.y*.14);
      float angle=atan(light.x,light.y);
      float sway=sin(time*.24)*.013+sin(time*.41)*.004;
      // Broad daylight shafts retain the original sky mask; the mouse steers
      // their source and angle visibly. Night keeps only the animated water.
      // Two slow phases avoid a rigid fan pulsing as one repeated pattern.
      float beamAngle=angle+sway-cursor.x*.24;
      float shafts=pow(max(0.,cos(beamAngle*18.+sin(beamAngle*9.)*.65)),4.);
      float fan=exp(-pow((angle+.18)/.85,2.));
      float envelope=smoothstep(0.,.12,uv.y)*(1.-smoothstep(.16,.46,uv.y));
      float breath=.78+.12*sin(time*.31+angle*6.)+.10*sin(time*.17-angle*11.);
      float rays=0.;
      colour=mix(colour,vec3(1.,.83,.52),rays);
      gl_FragColor=vec4(colour,${flat?'water':'1.'});
    }`;
  function shader(type,source){
    const object=gl.createShader(type);gl.shaderSource(object,source);gl.compileShader(object);
    if(!gl.getShaderParameter(object,gl.COMPILE_STATUS))throw Error('Contact shader failed');
    return object;
  }
  let program,clock,amount,nightAmount,cursorAmount,lightGain,reflectAmount;
  const textures=new Map();
  // Reuse the existing glow artwork/masks once, rather than copying a live
  // canvas to the GPU every frame. Only its CSS placement/opacity is sampled.
  async function prepareReflections(){
    // A direct #contact visit can warm water before later deferred atmosphere
    // scripts have inserted their source layers.
    if(!section.querySelector('.study-aurora')&&document.readyState!=='complete'){
      await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    }
    const nodes=[...section.querySelectorAll('.study-aurora-sheet')].slice(0,3);
    for(let i=0;i<3;i++){
      const field=document.createElement('canvas');field.width=384;field.height=256;
      const ctx=field.getContext('2d'),node=nodes[i];
      if(node)try{
        const source=new Image();source.src=node.currentSrc||node.getAttribute('src')||node.dataset.atmosphereSource;
        await source.decode();
        ctx.filter=document.body.classList.contains('portfolio-home')?'blur(3px)':'saturate(1.35) blur(3px)';
        ctx.drawImage(source,0,0,384,256);ctx.filter='none';
        const mask=getComputedStyle(node).maskImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if(mask){const cutout=new Image();cutout.src=mask;await cutout.decode();ctx.globalCompositeOperation='destination-in';ctx.drawImage(cutout,0,0,384,256);}
        reflectedLayers[i]=i;
      }catch{/* A missing sky asset must not remove the original scene. */}
      texture(3+i,field);
    }
    reflectionReady=reflectedLayers.length>0;
  }
  function texture(unit,source){
    gl.activeTexture(gl.TEXTURE0+unit);
    if(!textures.has(unit))textures.set(unit,gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D,textures.get(unit));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  }
  function makeSkyline(){
    const probe=document.createElement('canvas');probe.width=887;probe.height=444;
    const context=probe.getContext('2d',{willReadFrequently:true});
    context.drawImage(maskImage,0,0,probe.width,probe.height);
    const pixels=context.getImageData(0,0,probe.width,probe.height).data;
    const map=document.createElement('canvas');map.width=probe.width;map.height=1;
    const mapContext=map.getContext('2d');const row=mapContext.createImageData(map.width,1);
    for(let x=0;x<probe.width;x++){
      let top=.56;
      for(let y=150;y<270;y++){
        const i=(y*probe.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
        if(g>r+7&&g>b+24){top=y/probe.height;break;}
      }
      const value=Math.round(top*65535);
      row.data[x*4]=value>>8;row.data[x*4+1]=value&255;row.data[x*4+3]=255;
    }
    mapContext.putImageData(row,0,0);return map;
  }
  const disabled=()=>reduce.matches||document.body.dataset.motionDisabled==='true';
  const running=()=>ready&&visible&&!document.hidden&&!disabled()&&document.body.dataset.motionPaused!=='true';
  function resize(){
    if(!ready)return;
    const dpr=devicePixelRatio||1;
    const width=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),Math.round(host.clientWidth*dpr));
    const height=Math.round(width*585/1774);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,canvas.width,canvas.height);draw();
  }
  function draw(){
    if(!ready||failed)return;
    gl.uniform1f(clock,time);gl.uniform1f(amount,disabled()?0:1);
    gl.uniform3f(cursorAmount,pointer.x,pointer.y,pointer.strength);
    if(document.documentElement.dataset.theme==='dark'&&reflectionReady){
      const now=performance.now();
      if(now-lightSample>80||disabled()||document.body.dataset.motionPaused==='true'){
        lightSample=now;
        const scene=canvas.getBoundingClientRect(),nodes=[...section.querySelectorAll('.study-aurora-sheet')];
        const arrival=parseFloat(getComputedStyle(section.querySelector('.study-aurora')).opacity)||0,gain=[];
        for(let i=0;i<3;i++){
          const node=nodes[i],b=node?.getBoundingClientRect();
          if(b&&scene.width&&scene.height&&reflectedLayers[i]!==undefined){
            gl.uniform4f(reflectionRects[i],(b.left-scene.left)/scene.width,(b.top-scene.top)/scene.height,b.width/scene.width,b.height/scene.height);
            gain[i]=(parseFloat(getComputedStyle(node).opacity)||0)*arrival;
          }else{gl.uniform4f(reflectionRects[i],0,0,1,1);gain[i]=0;}
        }
        gl.uniform3f(lightGain,...gain);
      }
    }
    gl.uniform1f(reflectAmount,reflectionEnabled ? .48 : 0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function tick(now){
    frame=0;if(!running()){last=0;return;}
    window.PortfolioEffects?.sample(now);
    if(!last)last=now;
    if(now-last>=(window.PortfolioEffects?.interval(30)??1000/30)){
      const dt=Math.min((now-last)/1000,.1),ease=1.-Math.exp(-dt/.14);
      time+=dt;last=now;
      pointer.x+=(pointer.tx-pointer.x)*ease;
      pointer.y+=(pointer.ty-pointer.y)*ease;
      pointer.strength+=(pointer.target-pointer.strength)*ease;
      draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function resetPointer(immediate=false){
    pointer.tx=pointer.ty=pointer.target=0;
    if(immediate)pointer.x=pointer.y=pointer.strength=0;
  }
  function update(){
    if(disabled()||!fine.matches||!visible||document.hidden)resetPointer(true);
    const staticReflection=reflectionReady&&document.documentElement.dataset.theme==='dark';
    canvas.classList.toggle('is-ready',ready&&!failed&&(!disabled()||staticReflection));
    if(running()){if(!frame){last=0;frame=requestAnimationFrame(tick);}}
    else{cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!document.hidden)draw();}
  }
  async function decodedArtwork(){
    // Decode the browser-selected responsive source. A new theme or density
    // invalidates the pending decode; never upload the previous theme texture.
    for(;;){
      const signature=image.src+'|'+image.srcset;
      try{await image.decode();}
      catch(error){if(signature!==image.src+'|'+image.srcset)continue;throw error;}
      if(signature===image.src+'|'+image.srcset && image.complete && image.naturalWidth)return image;
    }
  }
  async function refreshArtwork(){
    if(!ready||failed)return;
    if(document.documentElement.dataset.theme==='dark')resetPointer(true);
    const request=++artworkRequest;
    canvas.classList.remove('is-ready');
    try{
      const artwork=await decodedArtwork();
      if(request!==artworkRequest||failed)return;
      texture(0,artwork);
      gl.uniform1f(nightAmount,document.documentElement.dataset.theme==='dark'?1:0);
      canvas.dataset.artwork=image.currentSrc;
      draw();update();
    }catch{canvas.classList.remove('is-ready');}
  }
  async function init(){
    try{
      maskImage.src=image.dataset.geometrySrc||image.dataset.lightSrc||image.getAttribute('src');
      const [artwork]=await Promise.all([decodedArtwork(),maskImage.decode()]);
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Contact shader link failed');
      gl.useProgram(program);
      await prepareReflections();
      for(let i=0;i<3;i++){
        gl.uniform1i(gl.getUniformLocation(program,['glowA','glowB','glowC'][i]),3+i);
        reflectionRects[i]=gl.getUniformLocation(program,['glowRectA','glowRectB','glowRectC'][i]);
      }
      lightGain=gl.getUniformLocation(program,'glowGain');
      reflectAmount=gl.getUniformLocation(program,'reflectionStrength');
      if(reflectionReady)section.dataset.waterReflection='ready';
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      texture(0,artwork);texture(1,makeSkyline());texture(2,maskImage);
      gl.uniform1i(gl.getUniformLocation(program,'artwork'),0);gl.uniform1i(gl.getUniformLocation(program,'skyline'),1);
      gl.uniform1i(gl.getUniformLocation(program,'geometry'),2);
      gl.uniform2f(gl.getUniformLocation(program,'texel'),1/maskImage.naturalWidth,1/maskImage.naturalHeight);
      clock=gl.getUniformLocation(program,'time');amount=gl.getUniformLocation(program,'motion');
      nightAmount=gl.getUniformLocation(program,'night');
      cursorAmount=gl.getUniformLocation(program,'cursor');
      gl.uniform1f(nightAmount,document.documentElement.dataset.theme==='dark'?1:0);
      canvas.dataset.artwork=image.currentSrc;
      ready=true;resize();update();
      canvas.dataset.geometry=maskImage.currentSrc;
    }catch(error){failed=true;canvas.remove();console.warn('Contact uses its static artwork:',error.message);}
  }
  let started=false,visibilityFrame=0;
  function warmWater(){
    if(started)return;
    started=true;image.loading='eager';init();
  }
  section.addEventListener('contact:terrain-warm',warmWater,{once:true});
  if(section.dataset.terrainWarmed==='true')warmWater();
  function setVisible(value){
    visible=value;
    if(visible)warmWater();
    update();
  }
  function checkVisibility(){
    const box=host.getBoundingClientRect();
    setVisible(box.height>0&&box.bottom>0&&box.top<innerHeight);
  }
  function scheduleVisibility(){
    if(!visibilityFrame)visibilityFrame=requestAnimationFrame(()=>{visibilityFrame=0;checkVisibility();});
  }
  new IntersectionObserver(([entry])=>{if(entry.isIntersecting)warmWater();},{rootMargin:'160px'}).observe(host);
  new IntersectionObserver(([entry])=>{
    setVisible(entry.isIntersecting);
  }).observe(host);
  new ResizeObserver(resize).observe(host);
  new ResizeObserver(()=>{lightSample=-1;scheduleVisibility();queueMicrotask(draw);}).observe(section);
  addEventListener('pageshow',checkVisibility);
  document.fonts.ready.then(scheduleVisibility);
  section.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||!fine.matches||disabled()||document.documentElement.dataset.theme==='dark'){
      resetPointer();return;
    }
    const box=section.getBoundingClientRect();
    pointer.tx=Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1));
    pointer.ty=Math.max(-1,Math.min(1,(event.clientY-box.top)/box.height*2-1));
    pointer.target=1;
  },{passive:true});
  section.addEventListener('pointerleave',()=>resetPointer(),{passive:true});
  section.addEventListener('pointercancel',()=>resetPointer(),{passive:true});
  addEventListener('blur',()=>resetPointer());
  addEventListener('scroll',()=>{resetPointer();scheduleVisibility();},{passive:true});
  addEventListener('resize',()=>{resetPointer();scheduleVisibility();},{passive:true});
  fine.addEventListener('change',update);
  reduce.addEventListener('change',()=>queueMicrotask(update));
  image.addEventListener('load',refreshArtwork);
  new MutationObserver(refreshArtwork).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.addEventListener('visibilitychange',update);
  new MutationObserver(()=>queueMicrotask(update)).observe(document.body,{attributes:true,attributeFilter:['data-motion-paused','data-motion-disabled']});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();failed=true;ready=false;cancelAnimationFrame(frame);frame=0;
    canvas.classList.remove('is-ready');
  });
})();
