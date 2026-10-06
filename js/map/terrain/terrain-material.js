const GRASS=[0.42,0.45,0.37];
const DRY=[0.46,0.44,0.35];
const ROCK=[0.36,0.35,0.32];
const STEEP=[0.30,0.295,0.28];

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function mix(a,b,t){
  return a+(b-a)*t;
}

function mixColor(a,b,t){
  return [
    mix(a[0],b[0],t),
    mix(a[1],b[1],t),
    mix(a[2],b[2],t)
  ];
}

export function terrainVertexColor({
  normalY,
  height,
  maxHeight
}){
  const slope=
    Math.acos(clamp(normalY,-1,1))*180/Math.PI;

  const altitude=maxHeight>0
    ? clamp(height/maxHeight,0,1)
    : 0;

  let color=mixColor(GRASS,DRY,altitude*.34);

  if(slope>8.5){
    const t=clamp((slope-8.5)/3.2,0,1);
    color=mixColor(color,ROCK,t);
  }

  if(slope>11.4){
    const t=clamp((slope-11.4)/1.8,0,1);
    color=mixColor(color,STEEP,t);
  }

  return color;
}

export function createTerrainCoreMaterial(THREE){
  return new THREE.MeshStandardMaterial({
    vertexColors:true,
    roughness:1,
    metalness:0,
    side:THREE.FrontSide
  });
}

export function createUnverifiedBaseMaterial(THREE){
  return new THREE.MeshStandardMaterial({
    color:0x484d46,
    roughness:1,
    metalness:0,
    side:THREE.FrontSide
  });
}
