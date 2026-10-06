// v83: one authoritative Ozeti master coordinate frame with separate playable bounds.
// Source coordinates are map metres derived from the published full tile extent.
// The master frame is deliberately independent from the recovered terrain crop.

export const MASTER_SOURCE_BOUNDS=Object.freeze({
  minX:-3,
  maxX:16381,
  minY:-1,
  maxY:16383
});

// Player-accessible bright region shown by the Ozeti map.
// The full terrain outside this rectangle still exists and may be rendered,
// but simulator movement must remain inside this area.
export const PLAYABLE_SOURCE_BOUNDS=Object.freeze({
  minX:5758,
  maxX:14307,
  minY:2181,
  maxY:9956
});

const sourceWidthMeters=
  MASTER_SOURCE_BOUNDS.maxX-MASTER_SOURCE_BOUNDS.minX;
const sourceDepthMeters=
  MASTER_SOURCE_BOUNDS.maxY-MASTER_SOURCE_BOUNDS.minY;

const targetWidthMeters=16384;
const uniformScale=targetWidthMeters/sourceWidthMeters;
const targetDepthMeters=sourceDepthMeters*uniformScale;

export const MASTER_MAP_CONFIG=Object.freeze({
  version:85,
  source:'published-full-map-tile-bounds',
  sourceWidthMeters,
  sourceDepthMeters,
  targetWidthMeters,
  targetDepthMeters,
  uniformScale,
  metersPerWorldUnit:1,
  centerX:(MASTER_SOURCE_BOUNDS.minX+MASTER_SOURCE_BOUNDS.maxX)*0.5,
  centerY:(MASTER_SOURCE_BOUNDS.minY+MASTER_SOURCE_BOUNDS.maxY)*0.5,
  sectorSizeMeters:512,
  sectorCountX:Math.ceil(targetWidthMeters/512),
  sectorCountZ:Math.ceil(targetDepthMeters/512)
});
