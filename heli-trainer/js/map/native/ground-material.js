// Reuse an unchanged region of the city texture through shader UVs.
export function createOuterGroundMaterial(THREE,surfaceTexture,cityTexture,detail){
  const material=new THREE.MeshStandardMaterial({map:surfaceTexture,color:new THREE.Color().setRGB(.72,.72,.72),roughness:1,metalness:0,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uCityGroundDetail={value:cityTexture};shader.uniforms.uGroundDetailRect={value:new THREE.Vector4(...detail.rect)};shader.uniforms.uGroundDetailMean={value:detail.meanLinearLuma};shader.uniforms.uGroundRepeat={value:detail.repeatNativeM};
    shader.vertexShader='varying vec2 vGroundNativeXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundNativeXZ=position.xz;');
    shader.fragmentShader='varying vec2 vGroundNativeXZ;\nuniform sampler2D uCityGroundDetail;\nuniform vec4 uGroundDetailRect;\nuniform float uGroundDetailMean;\nuniform float uGroundRepeat;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec2 grassUV=uGroundDetailRect.xy+fract(vGroundNativeXZ/uGroundRepeat)*uGroundDetailRect.zw;
      float grassLuma=dot(texture2D(uCityGroundDetail,grassUV).rgb,vec3(.2126,.7152,.0722));
      float cityGrain=clamp((grassLuma+.02)/(uGroundDetailMean+.02),.75,1.32);
      float grainFade=1.0-smoothstep(400.0,1800.0,length(vViewPosition));
      diffuseColor.rgb*=mix(1.0,cityGrain,grainFade);
    `);
  };
  material.customProgramCacheKey=()=> 'ozeti-world-city-material-v95';return material;
}
