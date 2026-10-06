import {
  sourceWorldBounds
} from './terrain-config.js?v=88';

import {
  terrainVertexColor
} from './terrain-material.js?v=88';

function intersects(a,b){
  return !(
    a.maxX<=b.minX ||
    a.minX>=b.maxX ||
    a.maxZ<=b.minZ ||
    a.minZ>=b.maxZ
  );
}

function intersection(a,b){
  if(!intersects(a,b)){
    return null;
  }

  return {
    minX:Math.max(a.minX,b.minX),
    maxX:Math.min(a.maxX,b.maxX),
    minZ:Math.max(a.minZ,b.minZ),
    maxZ:Math.min(a.maxZ,b.maxZ)
  };
}

export function createTerrainSectorIndex(config){
  const sectors=[];
  const sourceBounds=sourceWorldBounds();

  const worldMinX=-config.world.halfX;
  const worldMinZ=-config.world.halfZ;
  const worldMaxX=config.world.halfX;
  const worldMaxZ=config.world.halfZ;
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
      const minX=worldMinX+x*size;
      const minZ=worldMinZ+z*size;

      const bounds={
        minX,
        maxX:Math.min(minX+size,worldMaxX),
        minZ,
        maxZ:Math.min(minZ+size,worldMaxZ)
      };

      const verifiedBounds=
        intersection(bounds,sourceBounds);

      sectors.push({
        id:
          String(x).padStart(2,'0')+
          '_'+
          String(z).padStart(2,'0'),
        x,
        z,
        bounds,
        verifiedBounds,
        intersectsVerifiedSource:
          Boolean(verifiedBounds)
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

function createSectorGeometry({
  THREE,
  bounds,
  heightfield,
  targetSpacing
}){
  const width=bounds.maxX-bounds.minX;
  const depth=bounds.maxZ-bounds.minZ;

  const segX=Math.max(
    1,
    Math.ceil(width/targetSpacing)
  );

  const segZ=Math.max(
    1,
    Math.ceil(depth/targetSpacing)
  );

  const cols=segX+1;
  const rows=segZ+1;
  const vertexCount=cols*rows;

  const positions=
    new Float32Array(vertexCount*3);
  const normals=
    new Float32Array(vertexCount*3);
  const uvs=
    new Float32Array(vertexCount*2);
  const colors=
    new Float32Array(vertexCount*3);

  let p=0;
  let n=0;
  let u=0;
  let c=0;

  for(let z=0;z<=segZ;z++){
    const tz=z/segZ;
    const worldZ=
      bounds.minZ+depth*tz;

    for(let x=0;x<=segX;x++){
      const tx=x/segX;
      const worldX=
        bounds.minX+width*tx;
      const y=heightfield.sampleClamped(
        worldX,
        worldZ
      );
      const normal=heightfield.normalAt(
        worldX,
        worldZ
      );

      positions[p++]=worldX;
      positions[p++]=y;
      positions[p++]=worldZ;

      normals[n++]=normal.x;
      normals[n++]=normal.y;
      normals[n++]=normal.z;

      const textureBounds=heightfield.bounds;
      const textureWidth=textureBounds.maxX-textureBounds.minX;
      const textureDepth=textureBounds.maxZ-textureBounds.minZ;
      uvs[u++]=(worldX-textureBounds.minX)/textureWidth;
      uvs[u++]=(worldZ-textureBounds.minZ)/textureDepth;

      const color=terrainVertexColor({
        normalY:normal.y,
        height:y,
        maxHeight:heightfield.maxHeight
      });
      colors[c++]=color[0];
      colors[c++]=color[1];
      colors[c++]=color[2];
    }
  }

  const indices=[];

  for(let z=0;z<segZ;z++){
    for(let x=0;x<segX;x++){
      const a=z*cols+x;
      const b=a+1;
      const c=a+cols;
      const d=c+1;

      indices.push(a,c,b,b,c,d);
    }
  }

  const geometry=
    new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(
      normals,
      3
    )
  );

  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(
      uvs,
      2
    )
  );

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(
      colors,
      3
    )
  );

  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export function buildVerifiedTerrainSectors({
  THREE,
  sectorIndex,
  heightfield,
  material,
  targetSpacing
}){
  const group=new THREE.Group();
  group.name='OzetiTerrainSectorsV88';

  let meshCount=0;
  let vertexCount=0;

  for(const sector of sectorIndex.sectors){
    if(!sector.verifiedBounds){
      continue;
    }

    const geometry=createSectorGeometry({
      THREE,
      bounds:sector.verifiedBounds,
      heightfield,
      targetSpacing
    });

    const mesh=new THREE.Mesh(
      geometry,
      material
    );

    mesh.name='OzetiTerrainSector_'+sector.id;
    mesh.receiveShadow=true;
    mesh.castShadow=false;
    mesh.userData.terrainSector=sector.id;

    group.add(mesh);
    meshCount++;
    vertexCount+=
      geometry.attributes.position.count;
  }

  if(!meshCount){
    throw new Error(
      'Ozeti v88 generated zero terrain sectors'
    );
  }

  return {
    group,
    meshCount,
    vertexCount
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
