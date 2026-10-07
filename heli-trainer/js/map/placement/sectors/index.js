// v85: static geology-derived rock placements only.
// River water is a separate continuous geometry layer.
// Vegetation, buildings and roads remain inactive.
import {
  ROCK_PLACEMENT_STATS,
  rockPlacementsForSector,
  activeRockSectorIds
} from './rock-v84.js?v=87';

export const PLACEMENT_STATS=ROCK_PLACEMENT_STATS;

export function placementsForSector(sectorId){
  return rockPlacementsForSector(sectorId);
}

export function activePlacementSectorIds(){
  return activeRockSectorIds();
}
