import {
  WORLD_CONFIG
} from './map-data.js?v=74';

import {
  createTerrainSystem
} from './terrain.js?v=74';



import {
  createTowerReferenceLayer
} from './structures.js?v=74';




import {
  createStadiumReferenceLayer
} from './stadium.js?v=74';

import {
  createFullMapTownLayer
} from './fullmap-town.js?v=74';

import {
  createFullMapEnvironmentLayer
} from './fullmap-environment.js?v=74';


import {
  factionCenterWorld
} from './factions.js?v=74';

import {
  createTacticalMap
} from './tactical-map.js?v=74';

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

  // v74: tactical/faction graphics belong to UI only.
  const factionLayer={
    group:null,
    rebuild(){},
    clear(){}
  };

  let scenery=null;
  let structures=null;
  let stadium=null;
  let fullMapTown=null;
  let fullMapEnvironment=null;

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

    structures=
      safeBuild(
        'official towers',
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
        'full-map stadium',
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

    fullMapTown=
      safeBuild(
        'full-map central town',
        ()=>
          createFullMapTownLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          poiCount:0,
          roadCount:0,
          residentialBlockCount:0,
          group:null
        }
      );

    fullMapEnvironment=
      safeBuild(
        'full-map farms / grassland / forests',
        ()=>
          createFullMapEnvironmentLayer({
            THREE,
            scene,
            terrainHeight:terrain.height
          }),
        {
          farmCount:0,
          grasslandCount:0,
          forestZoneCount:0,
          treeCount:0,
          deforestedCount:0,
          group:null
        }
      );

    if(statusEl){
      statusEl.textContent=
        'Ozeti v74 · '+
        (
          terrainReady
            ? 'Full-map terrain'
            : 'Fallback terrain'
        )+
        ' / Tower '+
        structures.towerCount+
        ' / Stadium '+
        stadium.stadiumCount+
        ' / Full-map POI '+
        fullMapTown.poiCount+
        ' / Residential '+
        fullMapTown.residentialBlockCount+
        ' / Farm '+
        fullMapEnvironment.farmCount+
        ' / Forest zones '+
        fullMapEnvironment.forestZoneCount;
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
      return null;
    },
    get structures(){
      return structures;
    },
    get stadium(){
      return stadium;
    },
    get fullMapTown(){
      return fullMapTown;
    },
    get fullMapEnvironment(){
      return fullMapEnvironment;
    },
    terrain,
    factionLayer
  };
}
