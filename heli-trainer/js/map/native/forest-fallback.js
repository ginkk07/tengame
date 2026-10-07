import {NATIVE_SCALE} from './coordinates.js';

export function createForestFallbackMaterial(THREE){
  const ready=new Uint8Array(128*128),mask=new THREE.DataTexture(ready,128,128,THREE.RedFormat);
  mask.magFilter=THREE.NearestFilter;mask.minFilter=THREE.NearestFilter;mask.generateMipmaps=false;mask.needsUpdate=true;
  const uniforms={uForestReady:{value:mask},uForestFocus:{value:new THREE.Vector2()},uForestRange:{value:0},uForestFade:{value:100/NATIVE_SCALE}};
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec2 vForestCentre;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvForestCentre=instanceMatrix[3].xz;');
    shader.fragmentShader='varying vec2 vForestCentre;\nuniform sampler2D uForestReady;\nuniform vec2 uForestFocus;\nuniform float uForestRange;\nuniform float uForestFade;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      vec2 readyUV=(floor(vForestCentre/256.0)+vec2(64.5))/128.0;
      float detailed=texture2D(uForestReady,readyUV).r;
      float forestCoverage=smoothstep(uForestRange-uForestFade,uForestRange+uForestFade,distance(vForestCentre,uForestFocus));
      float forestThreshold=fract(dot(floor(gl_FragCoord.xy),vec2(.754877666,.569840296)));
      if(detailed>.5&&forestThreshold<1.0-forestCoverage)discard;
    `);
  };
  material.customProgramCacheKey=()=> 'streamed-forest-fallback-v97';
  return {material,mask,update(streamer,focus){
    ready.fill(0);
    for(const {chunk} of streamer.resident.values())if(chunk.family==='vegetation-mid'){
      const x=chunk.x+64,z=chunk.z+64;if(x>=0&&x<128&&z>=0&&z<128)ready[z*128+x]=255;
    }
    mask.needsUpdate=true;uniforms.uForestFocus.value.set(focus.x,focus.z);uniforms.uForestRange.value=streamer.ranges['vegetation-mid']||0;
  }};
}
