function treeParts(THREE,{trunkHeight,trunkRadius,crownHeight,crownRadius,trunkColor,crownColor,segments=7}){
  const trunkGeometry=new THREE.CylinderGeometry(
    trunkRadius*.72,
    trunkRadius,
    trunkHeight,
    7,
    1,
    false
  );
  trunkGeometry.translate(0,trunkHeight*.5,0);

  const crownGeometry=new THREE.ConeGeometry(
    crownRadius,
    crownHeight,
    segments,
    2
  );
  crownGeometry.translate(0,trunkHeight+crownHeight*.47,0);

  return [
    {
      geometry:trunkGeometry,
      material:new THREE.MeshStandardMaterial({
        color:trunkColor,
        roughness:1
      })
    },
    {
      geometry:crownGeometry,
      material:new THREE.MeshStandardMaterial({
        color:crownColor,
        roughness:1
      })
    }
  ];
}

export function registerTreeModels(registry){
  registry.register({
    id:'tree.broadleaf',
    category:'tree',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:1024,
    alignToTerrain:false,
    createParts(THREE){
      return treeParts(THREE,{
        trunkHeight:5.2,
        trunkRadius:.42,
        crownHeight:6.4,
        crownRadius:3.2,
        trunkColor:0x665343,
        crownColor:0x425b39,
        segments:8
      });
    }
  });

  registry.register({
    id:'tree.conifer',
    category:'tree',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:1024,
    alignToTerrain:false,
    createParts(THREE){
      return treeParts(THREE,{
        trunkHeight:4.4,
        trunkRadius:.36,
        crownHeight:8.8,
        crownRadius:3.1,
        trunkColor:0x5d4c3f,
        crownColor:0x344a35,
        segments:7
      });
    }
  });

  registry.register({
    id:'tree.shrub',
    category:'tree',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:1536,
    alignToTerrain:true,
    createParts(THREE){
      const geometry=new THREE.IcosahedronGeometry(1.35,1);
      geometry.scale(1.2,.72,1);
      geometry.translate(0,.8,0);
      const material=new THREE.MeshStandardMaterial({
        color:0x4a613f,
        roughness:1
      });
      return [{geometry,material}];
    }
  });
}
