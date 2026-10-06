import {
  TERRAIN_CORE_CONFIG
} from './terrain/terrain-config.js?v=75';

import {
  createTerrainSectorIndex
} from './terrain/terrain-sector.js?v=75';

import {
  createTerrainCoreMaterial,
  createUnverifiedBaseMaterial
} from './terrain/terrain-material.js?v=75';

import {
  loadRecoveredTerrain
} from './terrain/terrain-loader.js?v=75';

import {
  buildTerrainHeightfield
} from './terrain/terrain-heightfield.js?v=75';

export function createTerrainSystem({
  THREE,
  scene,
  statusEl
}){
  const config=TERRAIN_CORE_CONFIG;

  const sectorIndex=
    createTerrainSectorIndex(
      config
    );

  const data={
    ready:false,
    root:null,
    heightfield:null,
    sectorIndex
  };

  const basePlane=
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        config.world.width,
        config.world.depth,
        1,
        1
      ),
      createUnverifiedBaseMaterial(
        THREE
      )
    );

  basePlane.name=
    'OzetiUnverifiedWorldBaseV75';
  basePlane.rotation.x=-Math.PI/2;
  basePlane.position.y=-.5;
  basePlane.receiveShadow=true;
  scene.add(basePlane);

  function height(
    x,
    z
  ){
    if(
      !data.ready ||
      !data.heightfield
    ){
      return 0;
    }

    return data.heightfield.sample(
      x,
      z
    );
  }

  async function load(){
    if(statusEl){
      statusEl.textContent=
        'Ozeti v75 · Terrain Core 載入中…';
    }

    const material=
      createTerrainCoreMaterial(
        THREE
      );

    const loaded=
      await loadRecoveredTerrain({
        THREE,
        scene,
        assetUrl:config.source.asset,
        worldOffset:
          config.source.worldOffset,
        material
      });

    const field=
      buildTerrainHeightfield({
        THREE,
        root:loaded.root,
        source:config.source
      });

    if(field.validRatio<.98){
      throw new Error(
        'Ozeti v75 heightfield incomplete: '+
        field.valid+
        '/'+
        field.total+
        ' ('+
        (field.validRatio*100).toFixed(2)+
        '%)'
      );
    }

    data.root=loaded.root;
    data.heightfield=field;
    data.ready=true;

    if(statusEl){
      statusEl.textContent=
        'Ozeti v75 · Terrain Core · '+
        '純基礎地形 / '+
        config.sectors.countX+
        '×'+
        config.sectors.countZ+
        ' sectors / '+
        '已驗證地形 '+
        (config.source.width/1000).toFixed(3)+
        '×'+
        (config.source.depth/1000).toFixed(3)+
        ' km';
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
      worldOffset:
        config.source.worldOffset
    },
    sectorIndex,
    basePlane,
    boundary:null,
    worldFloor:basePlane,
    fallbackTerrain:null,
    fallbackGrid:null
  };
}
