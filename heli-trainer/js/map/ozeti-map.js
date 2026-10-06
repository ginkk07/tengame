import {
  WORLD_CONFIG
} from './map-data.js?v=78';

import {
  createTerrainSystem
} from './terrain.js?v=78';

import {
  factionCenterWorld
} from './factions.js?v=78';

import {
  createTacticalMap
} from './tactical-map.js?v=78';

import {
  createMapObjectSystem
} from './models/model-system.js?v=78';

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
  const terrain=createTerrainSystem({
    THREE,
    scene,
    statusEl
  });

  const tactical=createTacticalMap({
    root,
    stage,
    state,
    heli,
    orient,
    terrainHeight:terrain.height,
    clearPressed
  });

  const objects=createMapObjectSystem({
    THREE,
    scene,
    terrainHeight:terrain.height,
    masterScale:WORLD_CONFIG.scale
  });

  async function load(){
    await terrain.load();
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
      halfX:WORLD_CONFIG.width*.5,
      halfZ:WORLD_CONFIG.depth*.5,
      width:WORLD_CONFIG.width,
      depth:WORLD_CONFIG.depth
    },
    objects,
    placeMapObject:objects.placement.place,
    placeMapObjects:objects.placement.placeMany,
    clearMapObjectSector:objects.clearSector,
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
