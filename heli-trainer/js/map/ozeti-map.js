import {WORLD_CONFIG} from './map-data.js?v=87';
import {createTerrainSystem} from './terrain.js?v=87';
import {factionCenterWorld} from './factions.js?v=87';
import {createTacticalMap} from './tactical-map.js?v=87';
import {createMapObjectSystem} from './models/model-system.js?v=87';
import {verifyMasterCalibration} from './master/calibration.js?v=87';
import {OZETI_PLAYABLE_BOUNDS} from './map-data.js?v=87';
import {mapBoundsToWorld} from './master/coordinate-transform.js?v=87';
import {createRiverLayer} from './water/river-layer.js?v=87';
import {createRoadLayer} from './roads/road-layer.js?v=87';

export function createOzetiMap({
  THREE,scene,root,stage,state,heli,orient,statusEl,clearPressed
}){
  const calibration=verifyMasterCalibration();
  const playableWorld=mapBoundsToWorld(OZETI_PLAYABLE_BOUNDS);

  const terrain=createTerrainSystem({THREE,scene,statusEl});

  const tactical=createTacticalMap({
    root,stage,state,heli,orient,
    terrainHeight:terrain.height,
    clearPressed
  });

  const objects=createMapObjectSystem({
    THREE,scene,
    terrainHeight:terrain.height,
    masterScale:WORLD_CONFIG.scale
  });

  const river=createRiverLayer({
    THREE,scene,
    terrainHeight:terrain.height
  });

  const roads=createRoadLayer({
    THREE,scene,
    terrainHeight:terrain.height
  });

  async function load(){
    await terrain.load();

    if(!terrain.data.heightfield){
      throw new Error('Ozeti v87 terrain heightfield missing after load');
    }

    const initialStats=objects.placement.stats();
    if(initialStats.instances!==0 || initialStats.uniqueObjects!==0){
      throw new Error('Ozeti v87 map objects must start empty before rock loading');
    }

    const rockLoad=objects.loadAllActiveSectors();
    const objectStats=objects.placement.stats();
    const riverStats=river.rebuild();
    const roadStats=roads.rebuild();

    if(
      objectStats.instances!==rockLoad.expected.total ||
      objectStats.uniqueObjects!==0 ||
      rockLoad.placements!==rockLoad.expected.total ||
      rockLoad.sectors!==rockLoad.expected.sectors
    ){
      throw new Error(
        'Ozeti v87 rock placement count mismatch: '+
        objectStats.instances+' / expected '+rockLoad.expected.total
      );
    }

    if(statusEl){
      statusEl.textContent+=
        ' / master calibration '+
        calibration.controlPoints+' points / rocks '+
        objectStats.instances+' / river '+
        riverStats.paths+' paths / '+
        Math.round(riverStats.measuredLengthMeters)+' m / roads '+
        roadStats.paths+' paths ('+
        roadStats.primaryPaths+' primary + '+
        roadStats.localPaths+' local) / '+
        Math.round(roadStats.measuredLengthMeters)+' m / playable '+
        Math.round(playableWorld.maxX-playableWorld.minX)+'×'+
        Math.round(playableWorld.maxZ-playableWorld.minZ)+' m';
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
      // Full terrain/rendering world.
      halfX:WORLD_CONFIG.width*.5,
      halfZ:WORLD_CONFIG.depth*.5,
      width:WORLD_CONFIG.width,
      depth:WORLD_CONFIG.depth,
      // Flight/player movement boundary.
      playable:{
        minX:playableWorld.minX,
        maxX:playableWorld.maxX,
        minZ:playableWorld.minZ,
        maxZ:playableWorld.maxZ,
        width:playableWorld.maxX-playableWorld.minX,
        depth:playableWorld.maxZ-playableWorld.minZ
      }
    },
    masterCalibration:calibration,
    objects,
    placeMapObject:objects.placement.place,
    placeMapObjects:objects.placement.placeMany,
    clearMapObjectSector:objects.clearSector,
    get scenery(){return null;},
    get structures(){return null;},
    get stadium(){return null;},
    get fullMapTown(){return null;},
    get fullMapEnvironment(){return null;},
    get rockLayer(){return objects.expectedPlacementStats;},
    riverLayer:river,
    roadLayer:roads,
    terrain,
    factionLayer:{group:null,rebuild(){},clear(){}}
  };
}
