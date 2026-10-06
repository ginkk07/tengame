function material(THREE,color){
  return new THREE.MeshStandardMaterial({
    color,
    roughness:1,
    metalness:0
  });
}

function trunkPart(THREE,height,radius,color){
  const geometry=new THREE.CylinderGeometry(
    radius*.72,
    radius,
    height,
    7,
    1,
    false
  );
  geometry.translate(0,height*.5,0);
  return {
    geometry,
    material:material(THREE,color)
  };
}

function broadleafParts(THREE){
  const parts=[
    trunkPart(THREE,5.4,.43,0x665343)
  ];

  const crownMaterial=material(THREE,0x425b39);
  const crownSpecs=[
    [0,8.7,0,3.0,2.25,2.7],
    [-1.6,8.1,.5,2.25,1.85,2.15],
    [1.45,8.15,-.35,2.2,1.8,2.1],
    [.2,10.05,.15,2.25,1.75,2.15]
  ];

  for(const [x,y,z,sx,sy,sz] of crownSpecs){
    const geometry=new THREE.IcosahedronGeometry(1,1);
    geometry.scale(sx,sy,sz);
    geometry.translate(x,y,z);
    parts.push({geometry,material:crownMaterial});
  }

  return parts;
}

function coniferParts(THREE){
  const parts=[
    trunkPart(THREE,4.6,.36,0x5d4c3f)
  ];

  const crownMaterial=material(THREE,0x344a35);
  const tiers=[
    [3.4,6.0,7.0],
    [2.75,5.4,9.1],
    [2.0,4.6,11.0]
  ];

  for(const [radius,height,y] of tiers){
    const geometry=new THREE.ConeGeometry(
      radius,
      height,
      8,
      1,
      false
    );
    geometry.translate(0,y,0);
    parts.push({geometry,material:crownMaterial});
  }

  return parts;
}

export function registerTreeModels(registry){
  registry.register({
    id:'tree.broadleaf',
    category:'tree',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:4096,
    alignToTerrain:false,
    createParts(THREE){
      return broadleafParts(THREE);
    }
  });

  registry.register({
    id:'tree.conifer',
    category:'tree',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:2048,
    alignToTerrain:false,
    createParts(THREE){
      return coniferParts(THREE);
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
      return [{
        geometry,
        material:material(THREE,0x4a613f)
      }];
    }
  });
}
