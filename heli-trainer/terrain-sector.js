import {
  sourceWorldBounds
} from './terrain-config.js?v=75';

function intersects(
  a,
  b
){
  return !(
    a.maxX<=b.minX ||
    a.minX>=b.maxX ||
    a.maxZ<=b.minZ ||
    a.minZ>=b.maxZ
  );
}

export function createTerrainSectorIndex(
  config
){
  const sectors=[];
  const sourceBounds=
    sourceWorldBounds();

  const worldMinX=-config.world.halfX;
  const worldMinZ=-config.world.halfZ;
  const size=config.sectors.size;

  for(
    let z=0;
    z<config.sectors.countZ;
    z++
  ){
    for(
      let x=0;
      x<config.sectors.countX;
      x++
    ){
      const minX=
        worldMinX+x*size;

      const minZ=
        worldMinZ+z*size;

      const bounds={
        minX,
        maxX:minX+size,
        minZ,
        maxZ:minZ+size
      };

      sectors.push({
        id:
          String(x).padStart(2,'0')+
          '_'+
          String(z).padStart(2,'0'),
        x,
        z,
        bounds,
        intersectsVerifiedSource:
          intersects(
            bounds,
            sourceBounds
          )
      });
    }
  }

  return {
    sectors,
    count:sectors.length,
    sourceBounds,
    size,
    countX:config.sectors.countX,
    countZ:config.sectors.countZ
  };
}

export function sectorForWorldPoint(
  config,
  x,
  z
){
  const localX=x+config.world.halfX;
  const localZ=z+config.world.halfZ;

  if(
    localX<0 ||
    localZ<0 ||
    localX>=config.world.width ||
    localZ>=config.world.depth
  ){
    return null;
  }

  return {
    x:Math.floor(
      localX/config.sectors.size
    ),
    z:Math.floor(
      localZ/config.sectors.size
    )
  };
}
