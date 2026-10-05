import {
  WORLD_CONFIG
} from './map-data.js';

import {
  createTerrainSystem
} from './terrain.js';

import {
  createCoordinateCalibrationLayer
} from './calibration.js';

import {
  createRoadReferenceLayer
} from './roads.js';

import {
  createTowerReferenceLayer
} from './structures.js';

import {
  createForestReferenceLayer
} from './vegetation.js';

import {
  createBuildingReferenceLayer
} from './buildings.js';

import {
  createFacilityReferenceLayer
} from './facilities.js';

import {
  createLandmarkReferenceLayer
} from './landmarks.js';

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
  let calibration=null;
  let roads=null;
  let structures=null;
  let vegetation=null;
  let buildings=null;
  let facilities=null;
  let landmarks=null;

  async function load(){
    await terrain.load();

    factionLayer.rebuild();

    calibration=
      createCoordinateCalibrationLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    roads=
      createRoadReferenceLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    structures=
      createTowerReferenceLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    vegetation=
      createForestReferenceLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    buildings=
      createBuildingReferenceLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    facilities=
      createFacilityReferenceLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    landmarks=
      createLandmarkReferenceLayer({
        THREE,
        scene,
        terrainHeight:terrain.height
      });

    if(statusEl){
      statusEl.textContent=
        'Ozeti v67 · 道路 '+
        roads.routeCount+
        ' / Tower '+
        structures.towerCount+
        ' / 樹 '+
        vegetation.treeCount+
        ' / 建築 '+
        buildings.buildingCount+
        ' / 地標 '+
        landmarks.landmarkCount+
        ' / Crossing '+
        landmarks.crossingCount;
    }

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
    get scenery(){
      return scenery;
    },
    get calibration(){
      return calibration;
    },
    get roads(){
      return roads;
    },
    get structures(){
      return structures;
    },
    get vegetation(){
      return vegetation;
    },
    get buildings(){
      return buildings;
    },
    get facilities(){
      return facilities;
    },
    get landmarks(){
      return landmarks;
    },
    terrain,
    factionLayer
  };
}
