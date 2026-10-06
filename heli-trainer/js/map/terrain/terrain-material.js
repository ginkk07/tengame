export function createTerrainCoreMaterial(THREE){
  return new THREE.MeshStandardMaterial({
    color:0x6b735f,
    roughness:1,
    metalness:0,
    side:THREE.FrontSide
  });
}

export function createUnverifiedBaseMaterial(THREE){
  return new THREE.MeshStandardMaterial({
    color:0x484d46,
    roughness:1,
    metalness:0,
    side:THREE.FrontSide
  });
}
