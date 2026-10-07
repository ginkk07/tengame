import {registerCapturedModels} from './captured-models.js?v=93';
import {ModelRegistry} from './model-registry.js';
import {registerTreeModels} from './trees.js';
import {registerBuildingModels} from './buildings.js';
import {registerInfrastructureModels} from './infrastructure.js';
import {createPlacementEngine} from '../placement/placement-engine.js?v=93';

export function createDefaultModelRegistry(){
  const registry=new ModelRegistry();
  registerTreeModels(registry);
  registerBuildingModels(registry);
  registerInfrastructureModels(registry);
  registerCapturedModels(registry);
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

  function clearSector(sectorId){
    placement.clearSector(sectorId);
  }

  function clear(){
    placement.clear();
  }

  return {
    registry,
    placement,
    clearSector,
    clear
  };
}
