import {
  WORLD_CONFIG
} from './map-data.js?v=71';

import {
  createTerrainSystem
} from './terrain.js?v=71';

import {
  createCoordinateCalibrationLayer
} from './calibration.js?v=71';

import {
  createRoadReferenceLayer
} from './roads.js?v=71';

import {
  createTowerReferenceLayer
} from './structures.js?v=71';

import {
  createForestReferenceLayer
} from './vegetation.js?v=71';

import {
  createBuildingReferenceLayer
} from './buildings.js?v=71';

import {
  createFacilityReferenceLayer
} from './facilities.js?v=71';

import {
  createStadiumReferenceLayer
} from './stadium.js?v=71';


import {
  createFactionWorldLayer,
  factionCenterWorld
} from './factions.js?v=71';

import {
  createTacticalMap
} from './tactical-map.js?v=71';

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
  let stadium=null;

  function safeBuild(
    label,
    build,
    fallback
  ){
    try{
      return build();
    }catch(error){
      console.error(
        'Ozeti layer failed: '+label,
        error
      );

      return fallback;
    }
  }

  async function load(){
    let terrainReady=false;

    try{
      await terrain.load();
      terrainReady=true;
    }catch(error){
      console.error(
        'Ozeti terrain fallback active:',
        error
      );
    }

    try{
      factionLayer.rebuild();
    }catch(error){
      console.error(
        'Ozeti faction layer failed:',
        error
      );
    }

    calibration=
      safeBuild(
        'calibration',
        ()=>
          createCoordinateCalibrationLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          count:0,
          group:null
        }
      );

    roads=
      safeBuild(
        'roads',
        ()=>
          createRoadReferenceLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          routeCount:0,
          group:null
        }
      );

    structures=
      safeBuild(
        'towers',
        ()=>
          createTowerReferenceLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          towerCount:0,
          group:null
        }
      );

    stadium=
      safeBuild(
        'stadium',
        ()=>
          createStadiumReferenceLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          stadiumCount:0,
          group:null
        }
      );

    vegetation=
      safeBuild(
        'vegetation',
        ()=>
          createForestReferenceLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          treeCount:0,
          shrubCount:0,
          group:null
        }
      );

    buildings=
      safeBuild(
        'buildings',
        ()=>
          createBuildingReferenceLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          buildingCount:0,
          group:null
        }
      );

    facilities=
      safeBuild(
        'facilities',
        ()=>
          createFacilityReferenceLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          facilityCount:0,
          group:null
        }
      );

    if(statusEl){
      statusEl.textContent=
        'Ozeti v71 · '+
        (
          terrainReady
            ? '地形OK'
            : 'Fallback地形'
        )+
        ' / Road '+
        roads.routeCount+
        ' / Tower '+
        structures.towerCount+
        ' / Stadium '+
        stadium.stadiumCount+
        ' / Tree '+
        vegetation.treeCount+
        ' / Building '+
        buildings.buildingCount;
    }

    return terrainReady;
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
    get stadium(){
      return stadium;
    },
    terrain,
    factionLayer
  };
}
