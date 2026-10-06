import {
  TERRAIN_CONFIG,
  MAP_ASSETS
} from '../map-data.js?v=87';

import {MASTER_MAP_CONFIG} from '../master/master-map.js?v=87';
import {
  mapBoundsToWorld,
  mapMetersToWorld,
  worldToMapMeters
} from '../master/coordinate-transform.js?v=87';

const SECTOR_SIZE=MASTER_MAP_CONFIG.sectorSizeMeters;
const sourceWorld=mapBoundsToWorld(TERRAIN_CONFIG.sourceBounds);

export const TERRAIN_CORE_CONFIG={
  version:85,
  metersPerWorldUnit:MASTER_MAP_CONFIG.metersPerWorldUnit,
  world:{
    width:MASTER_MAP_CONFIG.targetWidthMeters,
    depth:MASTER_MAP_CONFIG.targetDepthMeters,
    centerX:MASTER_MAP_CONFIG.centerX,
    centerY:MASTER_MAP_CONFIG.centerY,
    halfX:MASTER_MAP_CONFIG.targetWidthMeters*.5,
    halfZ:MASTER_MAP_CONFIG.targetDepthMeters*.5
  },
  sectors:{
    size:SECTOR_SIZE,
    countX:MASTER_MAP_CONFIG.sectorCountX,
    countZ:MASTER_MAP_CONFIG.sectorCountZ,
    targetVertexSpacingMeters:32
  },
  source:{
    id:'ozeti-heightfield-u16-v76',
    asset:MAP_ASSETS.terrainHeightfield,
    groundTexture:MAP_ASSETS.groundTexture,
    geologyMask:MAP_ASSETS.geologyMask,
    width:TERRAIN_CONFIG.width,
    depth:TERRAIN_CONFIG.depth,
    scale:MASTER_MAP_CONFIG.uniformScale,
    rawReliefMeters:TERRAIN_CONFIG.rawReliefMeters,
    nx:TERRAIN_CONFIG.nx,
    nz:TERRAIN_CONFIG.nz,
    reliefMeters:TERRAIN_CONFIG.reliefMeters,
    mapBounds:{...TERRAIN_CONFIG.sourceBounds},
    worldOffset:{
      x:(sourceWorld.minX+sourceWorld.maxX)*.5,
      z:(sourceWorld.minZ+sourceWorld.maxZ)*.5
    }
  }
};

export {mapMetersToWorld,worldToMapMeters};

export function sourceWorldBounds(){
  return {...sourceWorld};
}
