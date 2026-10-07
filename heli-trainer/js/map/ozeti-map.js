import {createCapturedDetailLayer} from './reference/detail-layer.js?v=93';
import {WORLD_CONFIG} from './map-data.js?v=93';
import {createTerrainSystem} from './terrain.js?v=93';
import {factionCenterWorld} from './factions.js?v=93';
import {createTacticalMap} from './tactical-map.js?v=93';
import {createMapObjectSystem} from './models/model-system.js?v=93';
import {verifyMasterCalibration} from './master/calibration.js?v=93';
import {OZETI_PLAYABLE_BOUNDS} from './map-data.js?v=93';
import {mapBoundsToWorld} from './master/coordinate-transform.js?v=93';
import {createRoadLayer} from './roads/road-layer.js?v=93';
import {createEnvironmentLayer} from './environment/environment-layer.js?v=93';
import {createComponentLayer} from './components/component-layer.js?v=93';

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

  const components=createComponentLayer({
    objects,
    terrainHeight:terrain.height
  });

  const capturedDetails=createCapturedDetailLayer({THREE,scene,objects,terrainHeight:terrain.height});

  async function load(){
    await terrain.load();

    if(!terrain.data.heightfield){
      throw new Error('Ozeti v93 terrain heightfield missing after load');
    }

    const initialStats=objects.placement.stats();
    if(initialStats.instances!==0 || initialStats.uniqueObjects!==0){
      throw new Error('Ozeti v93 environment must start empty');
    }

    const environmentStats=environment.rebuild();
    const componentStats=components.rebuild();
    const objectStats=objects.placement.stats();
    const roadStats=roads.rebuild();
    const detailStats=capturedDetails.rebuild();

    if(objectStats.instances!==environmentStats.trees){
      throw new Error(
        'Ozeti v93 tree count mismatch: '+
        objectStats.instances+' / '+environmentStats.trees
      );
    }

    if(statusEl){
      statusEl.textContent+=
        ' / master calibration '+
        calibration.controlPoints+' points / forest density cells '+
        environmentStats.forestDensityCells+' → trees '+
        environmentStats.trees+' / building refs '+
        environmentStats.buildingReferences+' → buildings '+
        environmentStats.buildings+' / components '+
        componentStats.placements+' ('+
        componentStats.towers+' towers / '+
        componentStats.facilities+' official facility anchors / '+
        componentStats.supportFacilities+' support proxies: '+
        componentStats.baseSupport+' base + '+
        componentStats.farmSupport+' farm + '+
        componentStats.townSupport+' town / '+
        componentStats.landmarks+' landmarks) / roads '+
        roadStats.paths+' reference paths / playable '+
        Math.round(playableWorld.maxX-playableWorld.minX)+'×'+
        Math.round(playableWorld.maxZ-playableWorld.minZ)+' m';
    }

    if(statusEl) statusEl.textContent=`Ozeti 全圖重建 · ${Math.round(WORLD_CONFIG.width/100)/10} km · 場景 1.25 倍 · 樹木 ${environmentStats.trees.toLocaleString()} · 建築 ${environmentStats.buildings} · 場景物件 ${detailStats.props}`;
    return true;
  }

  return {
    load,
    terrainHeight:terrain.height,
    capturedDetails,
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
    componentLayer:components,
    roadLayer:roads,
    terrain,
    placeMapObject:objects.placement.place,
    placeMapObjects:objects.placement.placeMany,
    clearMapObjectSector:objects.clearSector,
    get scenery(){return environment;},
    get structures(){return environment;},
    get stadium(){return components;},
    get fullMapTown(){return environment;},
    get fullMapEnvironment(){return environment;},
    get rockLayer(){return null;},
    get riverLayer(){return null;},
    factionLayer:{group:null,rebuild(){},clear(){}}
  };
}
