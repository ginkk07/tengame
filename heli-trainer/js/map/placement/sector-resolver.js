import {mapMetersToWorld} from '../master/coordinate-transform.js?v=87';
import {TERRAIN_CORE_CONFIG} from '../terrain/terrain-config.js?v=87';
import {sectorForWorldPoint} from '../terrain/terrain-sector.js?v=87';

export function sectorIdForWorldPoint(x,z){
  const sector=sectorForWorldPoint(
    TERRAIN_CORE_CONFIG,
    Number(x),
    Number(z)
  );

  if(!sector){
    return null;
  }

  return (
    String(sector.x).padStart(2,'0')+
    '_'+
    String(sector.z).padStart(2,'0')
  );
}

export function sectorIdForMapPoint(mapX,mapY){
  const world=mapMetersToWorld(
    Number(mapX),
    Number(mapY)
  );

  return sectorIdForWorldPoint(
    world.x,
    world.z
  );
}
