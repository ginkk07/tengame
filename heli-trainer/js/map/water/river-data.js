import {
  OZETI_PLAYABLE_BOUNDS
} from '../map-data.js?v=87';

/*
 * v85 river network.
 * Coordinates are authoritative Ozeti master-map metres, never spawn-relative
 * and never relative to the old recovered terrain crop.
 *
 * main: reconstructed from the earlier crop-local river trace, converted once
 *       into master-map metres so it cannot drift when terrain modules change.
 * central: independently calibrated full-map north/south branch.
 */

const MAIN_POINTS=Object.freeze([
  [6332.5,6812.5],[6632.5,6791.5],[6932.5,6764.5],[7232.5,6730.5],
  [7532.5,6687.5],[7832.5,6636.5],[8132.5,6578.5],[8432.5,6513.5],
  [8732.5,6439.5],[9032.5,6360.5],[9332.5,6276.5],[9632.5,6188.5],
  [9932.5,6098.5],[10232.5,6008.5],[10532.5,5918.5],[10832.5,5831.5],
  [11132.5,5749.5],[11432.5,5673.5],[11732.5,5600.5],[12032.5,5537.5],
  [12332.5,5481.5],[12632.5,5435.5],[12932.5,5398.5],[13232.5,5362.5],
  [13532.5,5337.5],[13782.5,5320.5]
]);

const MAIN_WIDTHS=Object.freeze([
  88,90,94,96,100,104,108,112,118,124,130,136,142,
  148,154,160,166,168,166,160,154,148,138,128,116,108
]);

const CENTRAL_POINTS=Object.freeze([
  [9618.2,5730.2],[9656.3,6107.7],[9744.2,6166.6],[9778.4,6242.8],
  [9732.9,6369.5],[9679.4,6492.2],[9646.3,6694.1],[9625.1,6886.8]
]);

const CENTRAL_WIDTHS=Object.freeze([
  44,48,52,58,62,68,74,78
]);

export const RIVER_CONFIG=Object.freeze({
  sampleSpacingMeters:24,
  waterYOffset:.22,
  innerBankYOffset:.12,
  outerBankYOffset:.07,
  floodplainYOffset:.035,
  innerBankExtraMeters:18,
  outerBankExtraMeters:42,
  floodplainExtraMeters:150,
  waterColor:0x4f7f93,
  innerBankColor:0x68705b,
  outerBankColor:0x756d58,
  floodplainColor:0x4f674a,
  waterOpacity:.88,
  floodplainOpacity:.18
});

export const RIVER_PATHS=Object.freeze([
  Object.freeze({
    id:'ozeti-main-river',
    points:MAIN_POINTS,
    widths:MAIN_WIDTHS
  }),
  Object.freeze({
    id:'ozeti-central-branch',
    points:CENTRAL_POINTS,
    widths:CENTRAL_WIDTHS
  })
]);

function pathLength(points){
  let length=0;
  for(let i=1;i<points.length;i++){
    length+=Math.hypot(
      points[i][0]-points[i-1][0],
      points[i][1]-points[i-1][1]
    );
  }
  return length;
}

function insidePlayable(point){
  return (
    point[0]>=OZETI_PLAYABLE_BOUNDS.minX &&
    point[0]<=OZETI_PLAYABLE_BOUNDS.maxX &&
    point[1]>=OZETI_PLAYABLE_BOUNDS.minY &&
    point[1]<=OZETI_PLAYABLE_BOUNDS.maxY
  );
}

for(const path of RIVER_PATHS){
  if(path.points.length<2 || path.points.length!==path.widths.length){
    throw new Error(`Ozeti v85 invalid river path: ${path.id}`);
  }
  for(const point of path.points){
    if(!insidePlayable(point)){
      throw new Error(
        `Ozeti v85 river point outside playable bounds: ${path.id} ${point[0]},${point[1]}`
      );
    }
  }
}

export const RIVER_STATS=Object.freeze({
  paths:RIVER_PATHS.length,
  controlPoints:RIVER_PATHS.reduce((sum,path)=>sum+path.points.length,0),
  totalLengthMeters:RIVER_PATHS.reduce((sum,path)=>sum+pathLength(path.points),0)
});
