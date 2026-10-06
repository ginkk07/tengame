function standardMaterial(THREE,color){
  return new THREE.MeshStandardMaterial({
    color,
    roughness:.9,
    metalness:0
  });
}

function addBox(THREE,group,size,pos,color){
  const mesh=new THREE.Mesh(
    new THREE.BoxGeometry(size[0],size[1],size[2]),
    standardMaterial(THREE,color)
  );
  mesh.position.set(pos[0],pos[1],pos[2]);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  group.add(mesh);
  return mesh;
}

function createHouse(THREE,{width=10,depth=14,height=6,wall=0xb9b1a0,roof=0x6c5548}={}){
  const group=new THREE.Group();
  addBox(THREE,group,[width,height,depth],[0,height*.5,0],wall);

  const roofGeometry=new THREE.ConeGeometry(
    Math.max(width,depth)*.72,
    3.2,
    4,
    1,
    false,
    Math.PI*.25
  );
  roofGeometry.scale(1,.72,depth/width);
  const roofMesh=new THREE.Mesh(
    roofGeometry,
    standardMaterial(THREE,roof)
  );
  roofMesh.position.y=height+1.2;
  roofMesh.rotation.y=Math.PI*.25;
  roofMesh.castShadow=true;
  roofMesh.receiveShadow=true;
  group.add(roofMesh);
  return group;
}

export function registerBuildingModels(registry){
  registry.register({
    id:'building.house.small',
    category:'building',
    mode:'unique',
    sourceUnitScale:true,
    alignToTerrain:false,
    createObject(THREE){
      return createHouse(THREE,{width:9,depth:12,height:5.6});
    }
  });

  registry.register({
    id:'building.house.large',
    category:'building',
    mode:'unique',
    sourceUnitScale:true,
    alignToTerrain:false,
    createObject(THREE){
      return createHouse(THREE,{width:13,depth:18,height:7.2,wall:0xc2b8a5,roof:0x625048});
    }
  });

  registry.register({
    id:'building.apartment',
    category:'building',
    mode:'unique',
    sourceUnitScale:true,
    alignToTerrain:false,
    createObject(THREE){
      const group=new THREE.Group();
      addBox(THREE,group,[22,14,12],[0,7,0],0xa9aaa3);
      addBox(THREE,group,[20,.9,10],[0,14.35,0],0x666761);
      return group;
    }
  });

  registry.register({
    id:'building.industrial',
    category:'building',
    mode:'unique',
    sourceUnitScale:true,
    alignToTerrain:false,
    createObject(THREE){
      const group=new THREE.Group();
      addBox(THREE,group,[28,8,18],[0,4,0],0x898c86);
      addBox(THREE,group,[30,.8,20],[0,8.35,0],0x585c59);
      return group;
    }
  });

  registry.register({
    id:'building.church',
    category:'building',
    mode:'unique',
    sourceUnitScale:true,
    alignToTerrain:false,
    createObject(THREE){
      const group=new THREE.Group();
      addBox(THREE,group,[12,9,22],[0,4.5,0],0xd0c6b1);
      addBox(THREE,group,[5,15,6],[0,7.5,-7],0xc9bea8);
      const spire=new THREE.Mesh(
        new THREE.ConeGeometry(3.5,8,6),
        standardMaterial(THREE,0x62564c)
      );
      spire.position.set(0,19,-7);
      spire.castShadow=true;
      group.add(spire);
      return group;
    }
  });
}
