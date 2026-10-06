import {
  MASTER_MAP_CONFIG,
  MASTER_SOURCE_BOUNDS,
  PLAYABLE_SOURCE_BOUNDS
} from './master-map.js?v=88';

export function mapMetersToWorld(mapX,mapY){
  const c=MASTER_MAP_CONFIG;
  return {
    x:(Number(mapX)-c.centerX)*c.uniformScale,
    z:(c.centerY-Number(mapY))*c.uniformScale
  };
}

export function worldToMapMeters(worldX,worldZ){
  const c=MASTER_MAP_CONFIG;
  return {
    x:Number(worldX)/c.uniformScale+c.centerX,
    y:c.centerY-Number(worldZ)/c.uniformScale
  };
}

export function mapBoundsToWorld(bounds){
  const nw=mapMetersToWorld(bounds.minX,bounds.maxY);
  const se=mapMetersToWorld(bounds.maxX,bounds.minY);
  return {
    minX:Math.min(nw.x,se.x),
    maxX:Math.max(nw.x,se.x),
    minZ:Math.min(nw.z,se.z),
    maxZ:Math.max(nw.z,se.z)
  };
}

export function masterContainsMapPoint(mapX,mapY){
  return (
    mapX>=MASTER_SOURCE_BOUNDS.minX &&
    mapX<=MASTER_SOURCE_BOUNDS.maxX &&
    mapY>=MASTER_SOURCE_BOUNDS.minY &&
    mapY<=MASTER_SOURCE_BOUNDS.maxY
  );
}

export function masterContainsWorldPoint(worldX,worldZ){
  const halfX=MASTER_MAP_CONFIG.targetWidthMeters*0.5;
  const halfZ=MASTER_MAP_CONFIG.targetDepthMeters*0.5;
  return (
    worldX>=-halfX && worldX<=halfX &&
    worldZ>=-halfZ && worldZ<=halfZ
  );
}


export function playableBoundsToWorld(){
  return mapBoundsToWorld(PLAYABLE_SOURCE_BOUNDS);
}

export function playableContainsWorldPoint(worldX,worldZ,margin=0){
  const b=playableBoundsToWorld();
  return (
    worldX>=b.minX+margin &&
    worldX<=b.maxX-margin &&
    worldZ>=b.minZ+margin &&
    worldZ<=b.maxZ-margin
  );
}

export function clampWorldToPlayable(worldX,worldZ,margin=0){
  const b=playableBoundsToWorld();
  const minX=b.minX+margin;
  const maxX=b.maxX-margin;
  const minZ=b.minZ+margin;
  const maxZ=b.maxZ-margin;

  return {
    x:Math.min(maxX,Math.max(minX,Number(worldX))),
    z:Math.min(maxZ,Math.max(minZ,Number(worldZ)))
  };
}
