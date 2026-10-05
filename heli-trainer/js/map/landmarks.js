// v68
// v67 large-landmark coordinates were from an incompatible coordinate frame.
// This module is intentionally disabled until those footprints are traced
// directly from the same Ozeti website reference image used by roads/buildings.
export function createLandmarkReferenceLayer(){
  return {
    group:null,
    landmarkCount:0,
    crossingCount:0
  };
}
