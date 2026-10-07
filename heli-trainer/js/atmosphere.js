const DENSITY=.00019;
export function atmosphereOpacity(distance,cameraY,groundY,strength=1){
  const height=Math.max(0,(cameraY+groundY)*.5-220);
  return 1-Math.exp(-Math.max(0,distance-100)*DENSITY*Math.max(0,strength)*Math.exp(-height/2200));
}
export function createAtmosphere(THREE,scene){
  // Common fog chunks also cover streamed, instanced and distance-faded objects.
  // Camera-space position already contains skinning, batching and instancing.
  if(!THREE.ShaderChunk.fog_vertex.includes('vAtmospherePath')){
    THREE.ShaderChunk.fog_pars_vertex+='\n#ifdef USE_FOG\nvarying vec2 vAtmospherePath;\n#endif';
    THREE.ShaderChunk.fog_pars_fragment+='\n#ifdef USE_FOG\nvarying vec2 vAtmospherePath;\n#endif';
    THREE.ShaderChunk.fog_vertex+='\n#ifdef USE_FOG\nvAtmospherePath=vec2(length(mvPosition.xyz),dot(mvPosition.xyz,viewMatrix[1].xyz)+cameraPosition.y);\n#endif';
    THREE.ShaderChunk.fog_fragment=THREE.ShaderChunk.fog_fragment.replace(
      'float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
      `float airHeight=max(0.0,(cameraPosition.y+vAtmospherePath.y)*.5-220.0);
       float airPath=max(0.0,vAtmospherePath.x-100.0);
       float fogFactor=1.0-exp(-airPath*fogDensity*exp(-airHeight/2200.0));`
    );
  }
  const fog=new THREE.FogExp2(0xc0d0df,DENSITY);scene.fog=fog;
  let sky=null;const horizonStrength={value:.75};
  function setSkyTexture(texture){
    const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
      uniforms:{uSky:{value:texture},uHorizonColour:{value:fog.color},uHorizonStrength:horizonStrength},
      vertexShader:'varying vec3 vSkyDirection; void main(){vSkyDirection=mat3(modelMatrix)*position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`#include <common>
        uniform sampler2D uSky; uniform vec3 uHorizonColour; uniform float uHorizonStrength;
        varying vec3 vSkyDirection;
        void main(){
          vec3 direction=normalize(vSkyDirection);
          gl_FragColor=texture2D(uSky,equirectUv(direction));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          float horizon=(1.0-smoothstep(0.0,.16,abs(direction.y)))*uHorizonStrength;
          gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(uHorizonColour,1.0)).rgb,horizon);
        }`});
    sky=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),material);sky.name='original-sky-with-horizon-haze';sky.frustumCulled=false;sky.renderOrder=-1000;scene.add(sky);
  }
  function update(camera,strength=1,overviewDistance=0){
    const overview=THREE.MathUtils.smoothstep(overviewDistance,9000,22000);
    fog.density=DENSITY*Math.max(0,strength)*(1-.94*overview);
    horizonStrength.value=.75*Math.min(1,Math.max(0,strength))*(1-.7*overview);
    if(sky){sky.position.copy(camera.position);sky.scale.setScalar(camera.far*.9);}
  }
  return {fog,setSkyTexture,update};
}
