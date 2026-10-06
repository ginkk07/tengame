import {
  WORLD_CONFIG,
  TERRAIN_CONFIG,
  MAP_ASSETS
} from '../map-data.js?v=75';

const SECTOR_SIZE=512;

const sourceCenter={
  x:(
    TERRAIN_CONFIG.sourceBounds.minX+
    TERRAIN_CONFIG.sourceBounds.maxX
  )*.5,
  y:(
    TERRAIN_CONFIG.sourceBounds.minY+
    TERRAIN_CONFIG.sourceBounds.maxY
  )*.5
};

export const TERRAIN_CORE_CONFIG={
  version:75,
  metersPerWorldUnit:1,
  world:{
    width:WORLD_CONFIG.width,
    depth:WORLD_CONFIG.depth,
    centerX:WORLD_CONFIG.centerX,
    centerY:WORLD_CONFIG.centerY,
    halfX:WORLD_CONFIG.width*.5,
    halfZ:WORLD_CONFIG.depth*.5
  },
  sectors:{
    size:SECTOR_SIZE,
    countX:Math.ceil(
      WORLD_CONFIG.width/
      SECTOR_SIZE
    ),
    countZ:Math.ceil(
      WORLD_CONFIG.depth/
      SECTOR_SIZE
    )
  },
  source:{
    id:'ozeti-recovered-terrain-v1',
    asset:MAP_ASSETS.terrain,
    width:TERRAIN_CONFIG.width,
    depth:TERRAIN_CONFIG.depth,
    nx:TERRAIN_CONFIG.nx,
    nz:TERRAIN_CONFIG.nz,
    reliefMeters:TERRAIN_CONFIG.reliefMeters,
    verticalScale:1,
    mapBounds:{
      ...TERRAIN_CONFIG.sourceBounds
    },
    worldOffset:{
      x:sourceCenter.x-WORLD_CONFIG.centerX,
      z:WORLD_CONFIG.centerY-sourceCenter.y
    }
  }
};

export function mapMetersToWorld(
  mapX,
  mapY
){
  return {
    x:mapX-WORLD_CONFIG.centerX,
    z:WORLD_CONFIG.centerY-mapY
  };
}

export function sourceWorldBounds(){
  const a=mapMetersToWorld(
    TERRAIN_CONFIG.sourceBounds.minX,
    TERRAIN_CONFIG.sourceBounds.maxY
  );

  const b=mapMetersToWorld(
    TERRAIN_CONFIG.sourceBounds.maxX,
    TERRAIN_CONFIG.sourceBounds.minY
  );

  return {
    minX:Math.min(a.x,b.x),
    maxX:Math.max(a.x,b.x),
    minZ:Math.min(a.z,b.z),
    maxZ:Math.max(a.z,b.z)
  };
}
