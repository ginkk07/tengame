/*
 * v78 placement manifest.
 * Keep this empty until each Ozeti sector is reconstructed from verified
 * visual references. Future sector files should only contain placement data;
 * model geometry stays under js/map/models/.
 */
const SECTOR_PLACEMENTS=Object.freeze({});

export function placementsForSector(sectorId){
  return SECTOR_PLACEMENTS[sectorId] || [];
}

export {SECTOR_PLACEMENTS};
