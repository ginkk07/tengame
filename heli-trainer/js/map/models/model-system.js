import {ModelRegistry} from './model-registry.js';
import {registerRockModels} from './rocks.js';
import {registerTreeModels} from './trees.js';
import {registerBuildingModels} from './buildings.js';
import {createPlacementEngine} from '../placement/placement-engine.js?v=85';
import {placementsForSector,activePlacementSectorIds,PLACEMENT_STATS} from '../placement/sectors/index.js?v=85';

export function createDefaultModelRegistry(){
  const registry=new ModelRegistry();
  registerRockModels(registry);
  registerTreeModels(registry);
  registerBuildingModels(registry);
  return registry;
}

export function createMapObjectSystem({
  THREE,
  scene,
  terrainHeight,
  masterScale
}){
  const registry=createDefaultModelRegistry();
  const loadedSectors=new Set();

  const placement=createPlacementEngine({
    THREE,
    scene,
    registry,
    terrainHeight,
    masterScale
  });

  function loadSector(sectorId){
    if(loadedSectors.has(sectorId)){
      return [];
    }

    const records=placement.placeMany(
      placementsForSector(sectorId),
      {sectorId}
    );

    loadedSectors.add(sectorId);
    return records;
  }

  function loadAllActiveSectors(){
    let placements=0;
    for(const sectorId of activePlacementSectorIds()){
      placements+=loadSector(sectorId).length;
    }
    return {
      sectors:loadedSectors.size,
      placements,
      expected:PLACEMENT_STATS
    };
  }

  function clearSector(sectorId){
    placement.clearSector(sectorId);
    loadedSectors.delete(sectorId);
  }

  function clear(){
    placement.clear();
    loadedSectors.clear();
  }

  return {
    registry,
    placement,
    loadSector,
    loadAllActiveSectors,
    activeSectorIds:activePlacementSectorIds,
    expectedPlacementStats:PLACEMENT_STATS,
    clearSector,
    clear
  };
}
