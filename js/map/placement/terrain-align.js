export function sampleTerrainNormal({
  THREE,
  terrainHeight,
  x,
  z,
  sampleDistance=2
}){
  const d=Math.max(.25,sampleDistance);
  const left=terrainHeight(x-d,z);
  const right=terrainHeight(x+d,z);
  const back=terrainHeight(x,z-d);
  const front=terrainHeight(x,z+d);

  const normal=new THREE.Vector3(
    left-right,
    d*2,
    back-front
  );

  if(normal.lengthSq()<1e-8){
    normal.set(0,1,0);
  }else{
    normal.normalize();
  }

  return normal;
}

export function terrainQuaternion({
  THREE,
  terrainHeight,
  x,
  z,
  yaw=0,
  alignToTerrain=false,
  sampleDistance=2
}){
  const yawQ=new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0,1,0),
    yaw
  );

  if(!alignToTerrain){
    return yawQ;
  }

  const normal=sampleTerrainNormal({
    THREE,
    terrainHeight,
    x,
    z,
    sampleDistance
  });

  const tiltQ=new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0,1,0),
    normal
  );

  return tiltQ.multiply(yawQ);
}
