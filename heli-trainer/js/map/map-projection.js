// North-up projection of the same 20.48 km world used by the 3D map.
export const TACTICAL_SIZE=1024;
export const TACTICAL_HALF_WORLD=10240;
export function worldToTacticalPixel(x,z){return {x:(x+TACTICAL_HALF_WORLD)/(TACTICAL_HALF_WORLD*2)*TACTICAL_SIZE,y:(z+TACTICAL_HALF_WORLD)/(TACTICAL_HALF_WORLD*2)*TACTICAL_SIZE};}
export function tacticalPixelToWorld(x,y){return {x:x/TACTICAL_SIZE*TACTICAL_HALF_WORLD*2-TACTICAL_HALF_WORLD,z:y/TACTICAL_SIZE*TACTICAL_HALF_WORLD*2-TACTICAL_HALF_WORLD};}
export function tacticalHeadingDegrees(yaw){return 90-yaw*180/Math.PI;}
