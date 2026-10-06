import {
  WORLD_CONFIG
} from './map-data.js?v=75';

import {
  createTerrainSystem
} from './terrain.js?v=75';

import {
  factionCenterWorld
} from './factions.js?v=75';

import {
  createTacticalMap
} from './tactical-map.js?v=75';

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

  async function load(){
    return terrain.load();
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
      return null;
    },
    get structures(){
      return null;
    },
    get stadium(){
      return null;
    },
    get fullMapTown(){
      return null;
    },
    get fullMapEnvironment(){
      return null;
    },
    terrain,
    factionLayer:{
      group:null,
      rebuild(){},
      clear(){}
    }
  };
}
