import {GEOLOGY_CONFIG} from './geology-config.js?v=87';

export function attachGeologyBlend(material,geologyTexture){
  if(!material){
    throw new Error('Ozeti v85 geology material target is missing');
  }

  if(!geologyTexture){
    throw new Error('Ozeti v85 geology mask texture is missing');
  }

  const soil=GEOLOGY_CONFIG.soilTint;
  const rock=GEOLOGY_CONFIG.rockTint;
  const soilStrength=GEOLOGY_CONFIG.soilStrength;
  const rockStrength=GEOLOGY_CONFIG.rockStrength;

  material.onBeforeCompile=shader=>{
    shader.uniforms.ozetiGeologyMap={value:geologyTexture};

    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <map_pars_fragment>',
      `#include <map_pars_fragment>\nuniform sampler2D ozetiGeologyMap;`
    );

    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>\n`+
      `vec4 ozetiGeology = texture2D( ozetiGeologyMap, vMapUv );\n`+
      `float ozetiSoil = clamp( ozetiGeology.r, 0.0, 1.0 );\n`+
      `float ozetiRock = clamp( ozetiGeology.g, 0.0, 1.0 );\n`+
      `vec3 ozetiSoilTint = vec3(${soil[0]},${soil[1]},${soil[2]});\n`+
      `vec3 ozetiRockTint = vec3(${rock[0]},${rock[1]},${rock[2]});\n`+
      `diffuseColor.rgb = mix(diffuseColor.rgb, ozetiSoilTint, ozetiSoil * ${soilStrength});\n`+
      `diffuseColor.rgb = mix(diffuseColor.rgb, ozetiRockTint, ozetiRock * ${rockStrength});`
    );

    material.userData.ozetiShader=shader;
  };

  material.customProgramCacheKey=()=>
    'ozeti-v84-geology-r-soil-g-rock';

  material.needsUpdate=true;
  return material;
}
