import {WORLD_CONFIG} from './map-data.js?v=88';
import {createTerrainSystem} from './terrain.js?v=88';
import {factionCenterWorld} from './factions.js?v=88';
import {createTacticalMap} from './tactical-map.js?v=88';
import {createMapObjectSystem} from './models/model-system.js?v=88';
import {verifyMasterCalibration} from './master/calibration.js?v=88';
import {OZETI_PLAYABLE_BOUNDS} from './map-data.js?v=88';
import {mapBoundsToWorld} from './master/coordinate-transform.js?v=88';
import {createRoadLayer} from './roads/road-layer.js?v=88';
import {createEnvironmentLayer} from './environment/environment-layer.js?v=88';

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

  const roads=createRoadLayer({
    THREE,scene,
    terrainHeight:terrain.height
  });

  const environment=createEnvironmentLayer({
    objects,
    terrainHeight:terrain.height
  });

  async function load(){
    await terrain.load();

    if(!terrain.data.heightfield){
      throw new Error('Ozeti v88 terrain heightfield missing after load');
    }

    const initialStats=objects.placement.stats();
    if(initialStats.instances!==0 || initialStats.uniqueObjects!==0){
      throw new Error('Ozeti v88 environment must start empty');
    }

    const environmentStats=environment.rebuild();
    const objectStats=objects.placement.stats();
    const roadStats=roads.rebuild();

    if(
      objectStats.instances!==environmentStats.trees ||
      objectStats.uniqueObjects!==environmentStats.buildings
    ){
      throw new Error(
        'Ozeti v88 environment count mismatch: '+
        objectStats.instances+' trees / '+
        objectStats.uniqueObjects+' buildings'
      );
    }

    if(statusEl){
      statusEl.textContent+=
        ' / master calibration '+
        calibration.controlPoints+' points / forest refs '+
        environmentStats.forestReferencePoints+' → trees '+
        environmentStats.trees+' / building refs '+
        environmentStats.buildingReferences+' → buildings '+
        environmentStats.buildings+' / roads '+
        roadStats.paths+' reference paths / playable '+
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
      halfX:WORLD_CONFIG.width*.5,
      halfZ:WORLD_CONFIG.depth*.5,
      width:WORLD_CONFIG.width,
      depth:WORLD_CONFIG.depth,
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
    environmentLayer:environment,
    roadLayer:roads,
    terrain,
    placeMapObject:objects.placement.place,
    placeMapObjects:objects.placement.placeMany,
    clearMapObjectSector:objects.clearSector,
    get scenery(){return environment;},
    get structures(){return environment;},
    get stadium(){return null;},
    get fullMapTown(){return environment;},
    get fullMapEnvironment(){return environment;},
    get rockLayer(){return null;},
    get riverLayer(){return null;},
    factionLayer:{group:null,rebuild(){},clear(){}}
  };
}
