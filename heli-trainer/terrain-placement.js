import {
  mapPointToWorld
} from './factions.js?v=73';

export function sampleTerrainFootprint({
  terrainHeight,
  worldX,
  worldZ,
  width,
  depth,
  yaw=0,
  samples=5
}){
  const count=Math.max(3,samples|0);
  const c=Math.cos(yaw);
  const s=Math.sin(yaw);

  let min=Infinity;
  let max=-Infinity;
  let sum=0;
  let total=0;

  for(let iz=0;iz<count;iz++){
    const localZ=(iz/(count-1)-.5)*depth;

    for(let ix=0;ix<count;ix++){
      const localX=(ix/(count-1)-.5)*width;

      const x=
        worldX+
        localX*c-
        localZ*s;

      const z=
        worldZ+
        localX*s+
        localZ*c;

      const y=terrainHeight(x,z);

      min=Math.min(min,y);
      max=Math.max(max,y);
      sum+=y;
      total++;
    }
  }

  return {
    min,
    max,
    average:total ? sum/total : 0,
    range:
      Number.isFinite(min)&&Number.isFinite(max)
        ? max-min
        : 0
  };
}

export function placeRigidMapObject({
  object,
  mapX,
  mapY,
  width,
  depth,
  yaw=0,
  terrainHeight,
  clearance=.18,
  samples=5
}){
  const world=mapPointToWorld(mapX,mapY);

  const terrain=
    sampleTerrainFootprint({
      terrainHeight,
      worldX:world.x,
      worldZ:world.z,
      width,
      depth,
      yaw,
      samples
    });

  const baseY=terrain.max+clearance;

  object.position.set(
    world.x,
    baseY,
    world.z
  );

  object.rotation.y=yaw;

  return {
    world,
    terrain,
    baseY
  };
}

export function addTerrainFoundation({
  THREE,
  object,
  width,
  depth,
  terrainRange,
  material,
  extraDepth=.45,
  topOffset=.04
}){
  const drop=
    Math.max(
      .45,
      terrainRange+
      extraDepth
    );

  const foundation=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        drop,
        depth
      ),
      material
    );

  foundation.position.y=
    -drop*.5-
    topOffset;

  foundation.castShadow=true;
  foundation.receiveShadow=true;

  object.add(foundation);

  return foundation;
}
