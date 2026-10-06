import {
  TERRAIN_CORE_CONFIG
} from './terrain/terrain-config.js?v=77';

import {
  createTerrainSectorIndex,
  buildVerifiedTerrainSectors
} from './terrain/terrain-sector.js?v=77';

import {
  createTerrainCoreMaterial,
  createUnverifiedBaseMaterial
} from './terrain/terrain-material.js?v=77';

import {
  loadTerrainHeightfield
} from './terrain/terrain-loader.js?v=77';

import {
  buildTerrainHeightfield
} from './terrain/terrain-heightfield.js?v=77';

export function createTerrainSystem({
  THREE,
  scene,
  statusEl
}){
  const config=TERRAIN_CORE_CONFIG;

  const sectorIndex=
    createTerrainSectorIndex(config);

  const data={
    ready:false,
    root:null,
    heightfield:null,
    sectorIndex,
    meshCount:0,
    vertexCount:0
  };

  const basePlane=
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        config.world.width,
        config.world.depth,
        1,
        1
      ),
      createUnverifiedBaseMaterial(THREE)
    );

  basePlane.name='OzetiWorldFallbackV77';
  basePlane.rotation.x=-Math.PI/2;
  basePlane.position.y=-2;
  basePlane.receiveShadow=true;
  scene.add(basePlane);

  function height(x,z){
    if(
      !data.ready ||
      !data.heightfield
    ){
      return 0;
    }

    return data.heightfield.sample(x,z);
  }

  async function load(){
    if(statusEl){
      statusEl.textContent=
        'Ozeti v77 · 等比例地形生成中…';
    }

    const payload=
      await loadTerrainHeightfield({
        assetUrl:config.source.asset,
        nx:config.source.nx,
        nz:config.source.nz,
        reliefMeters:
          config.source.rawReliefMeters
      });

    const field=
      buildTerrainHeightfield({
        payload,
        source:config.source
      });

    const material=
      createTerrainCoreMaterial(THREE);

    const generated=
      buildVerifiedTerrainSectors({
        THREE,
        sectorIndex,
        heightfield:field,
        material,
        targetSpacing:
          config.sectors.targetVertexSpacingMeters
      });

    // Successful terrain fully covers the resized world; hide the fallback.
    basePlane.visible=false;
    scene.add(generated.group);

    data.root=generated.group;
    data.heightfield=field;
    data.meshCount=generated.meshCount;
    data.vertexCount=generated.vertexCount;
    data.ready=true;

    if(statusEl){
      statusEl.textContent=
        'Ozeti v77 · Master Scale '+config.source.scale.toFixed(6)+' × · '+
        'GLB 0 / '+
        generated.meshCount+
        ' generated sectors / '+
        generated.vertexCount+
        ' vertices / '+
        'relief '+
        field.relief.toFixed(1)+
        ' m';
    }

    return true;
  }

  return {
    data,
    load,
    height,
    bounds:{
      halfX:config.world.halfX,
      halfZ:config.world.halfZ,
      width:config.world.width,
      depth:config.world.depth
    },
    terrainCrop:{
      halfX:config.source.width*.5,
      halfZ:config.source.depth*.5,
      width:config.source.width,
      depth:config.source.depth,
      worldOffset:config.source.worldOffset
    },
    sectorIndex,
    basePlane,
    boundary:null,
    worldFloor:basePlane,
    fallbackTerrain:null,
    fallbackGrid:null
  };
}
