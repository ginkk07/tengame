import {MASTER_MAP_CONFIG} from './master-map.js?v=93';
import {
  mapMetersToWorld,
  worldToMapMeters,
  masterContainsMapPoint
} from './coordinate-transform.js?v=93';

export const MASTER_CONTROL_POINTS=Object.freeze([
  Object.freeze({id:'tower-1',x:9580,y:6282}),
  Object.freeze({id:'tower-2',x:10037,y:5923}),
  Object.freeze({id:'tower-3',x:10449,y:6371}),
  Object.freeze({id:'tower-4',x:10062,y:6764})
]);

export function verifyMasterCalibration(){
  const c=MASTER_MAP_CONFIG;

  if(!Number.isFinite(c.uniformScale) || c.uniformScale<=0){
    throw new Error('Ozeti v91 master scale is invalid');
  }

  const aspectSource=c.sourceWidthMeters/c.sourceDepthMeters;
  const aspectTarget=c.targetWidthMeters/c.targetDepthMeters;

  if(Math.abs(aspectSource-aspectTarget)>1e-12){
    throw new Error('Ozeti v91 master frame is stretched');
  }

  let maxRoundTripError=0;

  for(const point of MASTER_CONTROL_POINTS){
    if(!masterContainsMapPoint(point.x,point.y)){
      throw new Error(`Ozeti v91 control point outside master bounds: ${point.id}`);
    }

    const world=mapMetersToWorld(point.x,point.y);
    const map=worldToMapMeters(world.x,world.z);
    const error=Math.hypot(map.x-point.x,map.y-point.y);
    maxRoundTripError=Math.max(maxRoundTripError,error);
  }

  if(maxRoundTripError>1e-7){
    throw new Error(
      'Ozeti v91 master transform round-trip error '+
      maxRoundTripError
    );
  }

  return {
    valid:true,
    controlPoints:MASTER_CONTROL_POINTS.length,
    maxRoundTripError,
    sourceAspect:aspectSource,
    targetAspect:aspectTarget
  };
}
