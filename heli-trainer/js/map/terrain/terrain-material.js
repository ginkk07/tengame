const BASE=[0.96,0.99,0.94];
const HIGH=[1.00,0.95,0.86];
const ROCK=[0.91,0.90,0.86];

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function mix(a,b,t){
  return a+(b-a)*t;
}

export function terrainVertexColor({normalY,height,maxHeight}){
  const altitude=maxHeight>0 ? clamp(height/maxHeight,0,1) : 0;
  const slope=clamp(1-Number(normalY||1),0,1);
  const highT=altitude*.34;
  const steepT=clamp((slope-.045)/.18,0,1)*.14;

  const base=[
    mix(BASE[0],HIGH[0],highT),
    mix(BASE[1],HIGH[1],highT),
    mix(BASE[2],HIGH[2],highT)
  ];

  return [
    mix(base[0],ROCK[0],steepT),
    mix(base[1],ROCK[1],steepT),
    mix(base[2],ROCK[2],steepT)
  ];
}

async function loadTexture({THREE,assetUrl,name}){
  if(!assetUrl){
    throw new Error(`Ozeti v88 ${name} URL is missing`);
  }

  const loader=new THREE.TextureLoader();
  const texture=await loader.loadAsync(assetUrl);
  texture.name=name;
  texture.wrapS=THREE.ClampToEdgeWrapping;
  texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;

  if('colorSpace' in texture && THREE.SRGBColorSpace){
    texture.colorSpace=THREE.SRGBColorSpace;
  }

  texture.needsUpdate=true;
  return texture;
}

export async function loadTerrainSurfaceTextures({
  THREE,
  macroAssetUrl
}){
  const macroTexture=await loadTexture({
    THREE,
    assetUrl:macroAssetUrl,
    name:'OzetiTerrainMacroV88'
  });

  return {macroTexture};
}

export function createTerrainCoreMaterial(
  THREE,
  {macroTexture}
){
  if(!macroTexture){
    throw new Error('Ozeti v88 terrain macro texture was not loaded');
  }

  return new THREE.MeshStandardMaterial({
    map:macroTexture,
    vertexColors:true,
    roughness:.98,
    metalness:0,
    side:THREE.FrontSide
  });
}

export function createUnverifiedBaseMaterial(THREE){
  return new THREE.MeshStandardMaterial({
    color:0x50584b,
    roughness:1,
    metalness:0,
    side:THREE.FrontSide
  });
}
