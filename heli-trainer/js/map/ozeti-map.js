import {
  TERRAIN_CONFIG
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

    scenery=
      buildOzetiScenery({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    factionLayer.rebuild();

    return true;
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
      halfX:TERRAIN_CONFIG.width*.5,
      halfZ:TERRAIN_CONFIG.depth*.5,
      width:TERRAIN_CONFIG.width,
      depth:TERRAIN_CONFIG.depth
    },
    get scenery(){
      return scenery;
    },
    terrain,
    factionLayer
  };
}
