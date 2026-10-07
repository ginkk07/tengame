function material(THREE,color){
  return new THREE.MeshLambertMaterial({color});
}

function combineCrowns(THREE,parts){
  const crowns=parts.slice(1),positions=[],normals=[];
  for(const part of crowns){
    const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry;
    positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);
    if(g!==part.geometry)g.dispose();part.geometry.dispose();
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  return [parts[0],{geometry,material:crowns[0].material}];
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

  const crownMaterial=material(THREE,0x4e7747);
  const crownSpecs=[
    [0,10.9,0,4.5,5.5,4.3],
    [1.4,13.6,.6,3.2,3.7,3.0]
  ];

  for(const [x,y,z,sx,sy,sz] of crownSpecs){
    const geometry=new THREE.IcosahedronGeometry(1,0);
    geometry.scale(sx,sy,sz);
    geometry.translate(x,y,z);
    parts.push({geometry,material:crownMaterial});
  }

  return combineCrowns(THREE,parts);
}

function coniferParts(THREE){
  const parts=[
    trunkPart(THREE,4.6,.36,0x5d4c3f)
  ];

  const crownMaterial=material(THREE,0x3f6944);
  const tiers=[
    [3.4,7.0,6.0],
    [2.75,6.4,10.0],
    [2.0,5.4,14.0]
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

  return combineCrowns(THREE,parts);
}

export function registerTreeModels(registry){
  registry.register({
    id:'tree.broadleaf',
    category:'tree',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:256,
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
    defaultCapacity:256,
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
