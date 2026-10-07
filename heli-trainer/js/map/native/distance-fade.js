import {NATIVE_SCALE,NATIVE_OFFSET} from './coordinates.js';

// An opaque screen-door transition keeps depth writes and avoids transparent sorting.
export function createDistanceFade(THREE,material){
  const uniforms={uLodFocus:{value:new THREE.Vector2()},uLodRange:{value:1e8},uLodFade:{value:1}};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec2 vLodWorldXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 lodWorld=vec4(transformed,1.0);
      #ifdef USE_BATCHING
        lodWorld=batchingMatrix*lodWorld;
      #endif
      lodWorld=modelMatrix*lodWorld;
      vLodWorldXZ=lodWorld.xz;
    `);
    shader.fragmentShader='varying vec2 vLodWorldXZ;\nuniform vec2 uLodFocus;\nuniform float uLodRange;\nuniform float uLodFade;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      float lodCoverage=1.0-smoothstep(uLodRange-uLodFade,uLodRange+uLodFade,distance(vLodWorldXZ,uLodFocus));
      float lodThreshold=fract(dot(floor(gl_FragCoord.xy),vec2(.754877666,.569840296)));
      if(lodThreshold>=lodCoverage)discard;
    `);
  };
  material.customProgramCacheKey=()=> 'native-distance-fade-v97';
  return {update(focus,range,fade){uniforms.uLodFocus.value.set(focus.x*NATIVE_SCALE+NATIVE_OFFSET.x,focus.z*NATIVE_SCALE+NATIVE_OFFSET.z);uniforms.uLodRange.value=range*NATIVE_SCALE;uniforms.uLodFade.value=fade*NATIVE_SCALE;}};
}
