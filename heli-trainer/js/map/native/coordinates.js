// The source viewer's published four-anchor affine calibration (max residual 0.88 m).
export const CALIBRATION={originX:100.3476529503742,originY:63.35692800000001,unitsPerMetre:0.010041985032368313};
export const NATIVE_SCALE=1.25*100*CALIBRATION.unitsPerMetre;
export const NATIVE_OFFSET={x:(CALIBRATION.originX*100-8189)*1.25,z:(8191-CALIBRATION.originY*100)*1.25,y:100*NATIVE_SCALE};
export function nativeToWorld(x,y,z){return {x:x*NATIVE_SCALE+NATIVE_OFFSET.x,y:y*NATIVE_SCALE+NATIVE_OFFSET.y,z:z*NATIVE_SCALE+NATIVE_OFFSET.z};}
export function worldToNative(x,y,z){return {x:(x-NATIVE_OFFSET.x)/NATIVE_SCALE,y:(y-NATIVE_OFFSET.y)/NATIVE_SCALE,z:(z-NATIVE_OFFSET.z)/NATIVE_SCALE};}
