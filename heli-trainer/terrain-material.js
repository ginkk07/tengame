export function createTerrainCoreMaterial(
  THREE
){
  return new THREE.MeshStandardMaterial({
    color:0x6b735f,
    roughness:1,
    metalness:0,
    side:THREE.DoubleSide
  });
}

export function createUnverifiedBaseMaterial(
  THREE
){
  return new THREE.MeshStandardMaterial({
    color:0x4d5149,
    roughness:1,
    metalness:0
  });
}
