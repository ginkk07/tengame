export async function loadRecoveredTerrain({
  THREE,
  scene,
  assetUrl,
  worldOffset,
  material
}){
  const loaderModule=
    await import(
      'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js/+esm'
    );

  const loader=
    new loaderModule.GLTFLoader();

  const gltf=
    await loader.loadAsync(
      assetUrl
    );

  const root=gltf.scene;

  root.name='OzetiTerrainCoreV75';
  root.position.set(
    worldOffset.x,
    0,
    worldOffset.z
  );

  let meshCount=0;

  root.traverse(
    obj=>{
      if(!obj.isMesh){
        return;
      }

      meshCount++;

      const geometry=obj.geometry;

      if(
        geometry?.attributes?.position &&
        !geometry.attributes.normal
      ){
        geometry.computeVertexNormals();
      }

      obj.material=material;
      obj.castShadow=true;
      obj.receiveShadow=true;
    }
  );

  if(!meshCount){
    throw new Error(
      'Ozeti terrain GLB contains no mesh'
    );
  }

  scene.add(root);

  return {
    root,
    meshCount
  };
}
