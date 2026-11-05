// Study only. Reuse each original raster, deforming its light inside a fixed
// envelope. At zero input the shader samples the source without displacement.
(() => {
  const vertex=`attribute vec2 position;varying vec2 uv;
    void main(){uv=vec2((position.x+1.)*.5,(1.-position.y)*.5);gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision mediump float;
    varying vec2 uv;uniform sampler2D artwork;
    uniform vec2 bend,lag,focus;uniform float presence,kind,layer;
    float pool(vec2 p,vec2 c){vec2 d=(p-c)/vec2(.24,.38);return exp(-dot(d,d)*1.5);}
    void main(){
      vec2 sampleUV=uv;
      // The upper source of daylight stays anchored. Deflection increases
      // along its path; foreground and diffuse light have different response.
      if(kind<.5){
        float reach=smoothstep(.02,.96,uv.y);
        float edge=sin(clamp(uv.x,0.,1.)*3.141593);
        sampleUV.x-=edge*(bend.x*.070*reach*reach+(bend.x-lag.x)*.025*sin(reach*3.141593));
        sampleUV.y-=bend.y*.025*reach*(1.-reach)+lag.y*.012*reach;
      }else{
        // Broad nonuniform flex of the auroral veil, without ray geometry.
        vec2 edge=sin(clamp(uv,0.,1.)*3.141593);
        sampleUV.x-=edge.x*(bend.x*.032*sin(uv.y*4.2+layer*.9)+(bend.x-lag.x)*.025);
        sampleUV.y-=edge.y*(bend.y*.035*sin(uv.x*4.8+layer)+(bend.x-lag.x)*.045*sin(uv.x*3.141593));
      }
      vec4 source=texture2D(artwork,clamp(sampleUV,0.,1.));
      float scatter=(pool(uv,focus)-pool(uv,vec2(.5,.5)))*presence;
      if(kind<.5){
        // White remains neutral under multiply. Change the density of the
        // existing warm light, rather than painting a spotlight over it.
        source.rgb=1.-(1.-source.rgb)*(1.+scatter*.26);
      }else source.a*=1.+scatter*.22;
      gl_FragColor=vec4(source.rgb*source.a,source.a);
    }`;

  function create(image,kind,layer,onFallback){
    if(!image.naturalWidth)return null;
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});
    if(!gl)return null;
    const compile=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;
    };
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    if(!vs||!fs)return null;
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
    gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    const uniforms=Object.fromEntries(['bend','lag','focus','presence','kind','layer'].map(name=>[name,gl.getUniformLocation(program,name)]));
    for(const attribute of image.attributes)if(!['src','alt'].includes(attribute.name))canvas.setAttribute(attribute.name,attribute.value);
    canvas.setAttribute('aria-hidden','true');canvas.dataset.atmosphereSource=image.getAttribute('src');canvas.dataset.depthKind=kind;
    canvas.width=Math.min(1536,image.naturalWidth);canvas.height=Math.round(canvas.width*image.naturalHeight/image.naturalWidth);
    gl.viewport(0,0,canvas.width,canvas.height);
    let lost=false,lastUniforms;
    const draw=(bend,lag,focus,presence)=>{
      if(lost)return;
      // Uniforms enter WebGL as float32. Identical inputs produce the same
      // pixels; CSS continues animating the existing canvas independently.
      const values=[bend.x,bend.y,lag.x,lag.y,focus.x,focus.y,presence].map(Math.fround);
      if(lastUniforms&&values.every((value,index)=>value===lastUniforms[index]))return;
      lastUniforms=values;
      gl.uniform2f(uniforms.bend,bend.x,bend.y);gl.uniform2f(uniforms.lag,lag.x,lag.y);
      gl.uniform2f(uniforms.focus,focus.x,focus.y);gl.uniform1f(uniforms.presence,presence);
      gl.uniform1f(uniforms.kind,kind==='day'?0:1);gl.uniform1f(uniforms.layer,layer);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.dataset.bend=`${bend.x.toFixed(3)},${bend.y.toFixed(3)}`;
    };
    draw({x:0,y:0},{x:0,y:0},{x:.5,y:.5},0);
    image.replaceWith(canvas);
    canvas.addEventListener('webglcontextlost',()=>{lost=true;canvas.replaceWith(image);onFallback(image);},{once:true});
    return {canvas,draw,kind,layer};
  }
  window.ContactDepthLight={create};
})();
