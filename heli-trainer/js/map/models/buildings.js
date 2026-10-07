function standardMaterial(THREE,color){
  return new THREE.MeshStandardMaterial({
    color,
    roughness:.92,
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

function addFacade(THREE,group,width,depth,height){
  const parts=[];
  const pane=(size,pos)=>{
    const g=new THREE.BoxGeometry(...size).toNonIndexed();
    g.translate(...pos);parts.push(g);
  };
  for(let y=2.2;y<height-.8;y+=3.2){
    for(let x=-width/2+2.2;x<width/2-1;x+=3.8){
      for(const side of [-1,1])pane([1.2,1.5,.08],[x,y,side*(depth/2+.05)]);
    }
    for(let z=-depth/2+2.2;z<depth/2-1;z+=3.8){
      for(const side of [-1,1])pane([.08,1.5,1.2],[side*(width/2+.05),y,z]);
    }
  }
  pane([1.4,2.5,.1],[0,1.25,depth/2+.08]);
  const positions=[],normals=[];
  for(const g of parts){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  const mesh=new THREE.Mesh(g,standardMaterial(THREE,0x4e626e));
  group.add(mesh);
}

function gableRoofGeometry(THREE,width,depth,height){
  const hw=width*.5;
  const hd=depth*.5;
  const vertices=new Float32Array([
    -hw,0,-hd,  hw,0,-hd,  hw,0,hd, -hw,0,hd,
    0,height,-hd, 0,height,hd
  ]);
  const indices=[
    0,1,4,
    3,5,2,
    0,4,5, 0,5,3,
    1,2,5, 1,5,4
  ];
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createHouse(THREE,{
  width=10,
  depth=14,
  height=6,
  wall=0xbfc8cc,
  roof=0xaab6bd
}={}){
  const group=new THREE.Group();
  addBox(THREE,group,[width*1.04,2.4,depth*1.04],[0,-1.0,0],0x6f6a60);
  addBox(THREE,group,[width,height,depth],[0,height*.5,0],wall);
  addFacade(THREE,group,width,depth,height);

  const roofHeight=Math.max(2.3,Math.min(4.2,width*.26));
  const roofMesh=new THREE.Mesh(
    gableRoofGeometry(THREE,width*1.06,depth*1.06,roofHeight),
    standardMaterial(THREE,roof)
  );
  roofMesh.position.y=height;
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
      return createHouse(THREE,{
        width:13,
        depth:18,
        height:7.2,
        wall:0xbec8cd,
        roof:0xa2afb7
      });
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
      addBox(THREE,group,[22.8,2.6,12.8],[0,-1.1,0],0x66655f);
      addBox(THREE,group,[22,14,12],[0,7,0],0xa9aaa3);
      addFacade(THREE,group,22,12,14);
      addBox(THREE,group,[20,.9,10],[0,14.35,0],0xa4b1b8);
      addBox(THREE,group,[3.6,2.2,1.2],[-5,8,6.1],0x72746f);
      addBox(THREE,group,[3.6,2.2,1.2],[5,8,6.1],0x72746f);
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
      addBox(THREE,group,[29.2,2.6,19.2],[0,-1.1,0],0x62645f);
      addBox(THREE,group,[28,8,18],[0,4,0],0x898c86);
      addBox(THREE,group,[30,.8,20],[0,8.35,0],0x9daab2);
      addBox(THREE,group,[7,4,.8],[-7,3.2,9.2],0x555b58);
      addBox(THREE,group,[7,4,.8],[7,3.2,9.2],0x555b58);
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
      addBox(THREE,group,[13,2.6,23],[0,-1.1,0],0x716c63);
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
