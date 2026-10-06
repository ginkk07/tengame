import {ModelRegistry} from './model-registry.js';
import {registerRockModels} from './rocks.js';
import {registerTreeModels} from './trees.js';
import {registerBuildingModels} from './buildings.js';
import {createPlacementEngine} from '../placement/placement-engine.js?v=79';
import {placementsForSector} from '../placement/sectors/index.js?v=79';
import {createTerrainRockLayer} from '../placement/rock-layer.js?v=79';

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

  const placement=createPlacementEngine({
    THREE,
    scene,
    registry,
    terrainHeight,
    masterScale
  });

  function loadSector(sectorId){
    return placement.placeMany(
      placementsForSector(sectorId),
      {sectorId}
    );
  }

  function loadTerrainRockLayer({terrainBounds,worldHalfX,worldHalfZ,sectorSize}){
    return createTerrainRockLayer({
      placement,
      terrainHeight,
      terrainBounds,
      worldHalfX,
      worldHalfZ,
      sectorSize
    });
  }

  return {
    registry,
    placement,
    loadTerrainRockLayer,
    loadSector,
    clearSector:placement.clearSector,
    clear:placement.clear
  };
}
