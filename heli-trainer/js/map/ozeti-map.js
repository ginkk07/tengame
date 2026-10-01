import {
  WORLD_CONFIG
} from './map-data.js';

import {
  createTerrainSystem
} from './terrain.js';

import {
  buildOzetiScenery
} from './scenery.js';

import {
  createFactionWorldLayer,
  factionCenterWorld
} from './factions.js';

import {
  createTacticalMap
} from './tactical-map.js';

export function createOzetiMap({
  THREE,
  scene,
  root,
  stage,
  state,
  heli,
  orient,
  statusEl,
  clearPressed
}){
  const terrain=
    createTerrainSystem({
      THREE,
      scene,
      statusEl
    });

  const tactical=
    createTacticalMap({
      root,
      stage,
      state,
      heli,
      orient,
      terrainHeight:terrain.height,
      clearPressed
    });

  const factionLayer=
    createFactionWorldLayer({
      THREE,
      scene,
      terrainHeight:terrain.height
    });

  let scenery=null;

  async function load(){
    await terrain.load();

    if(statusEl){
      statusEl.textContent=
        'Ozeti v60 · 3D 場景建立中…';
    }

    try{
      scenery=
        buildOzetiScenery({
          THREE,
          scene,
          terrainHeight:terrain.height
        });

      factionLayer.rebuild();

      if(statusEl){
        const stats=
          scenery.stats || {};

        statusEl.textContent=
          'Ozeti v60 · '+
          '樹 '+
          (stats.trees || 0)+
          ' / 建築 '+
          (
            (stats.buildings || 0)+
            (stats.baseBuildings || 0)
          )+
          ' / 橋 '+
          (stats.bridges || 0)+
          ' / 塔 '+
          (stats.towers || 0)+
          ' · MAP座標';
      }

      return true;
    }catch(error){
      console.error(
        'Ozeti scenery build failed:',
        error
      );

      if(statusEl){
        statusEl.textContent=
          'Ozeti v60 · 3D 場景建立失敗';
      }

      throw error;
    }
  }

  return {
    load,
    terrainHeight:terrain.height,
    factionCenterWorld,
    setMapOpen:tactical.setOpen,
    toggleMap:tactical.toggle,
    moveToFaction:tactical.moveToFaction,
    updateMapMarker:tactical.updateMarker,
    isMapOpen:tactical.isOpen,
    bounds:{
      halfX:WORLD_CONFIG.width*.5,
      halfZ:WORLD_CONFIG.depth*.5,
      width:WORLD_CONFIG.width,
      depth:WORLD_CONFIG.depth
    },
    get scenery(){
      return scenery;
    },
    terrain,
    factionLayer
  };
}
