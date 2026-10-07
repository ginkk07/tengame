function mat(THREE,color,{roughness=.88,metalness=.04,transparent=false,opacity=1}={}){
  return new THREE.MeshStandardMaterial({
    color,roughness,metalness,transparent,opacity
  });
}

function box(THREE,group,size,pos,color,opts={}){
  const mesh=new THREE.Mesh(
    new THREE.BoxGeometry(size[0],size[1],size[2]),
    mat(THREE,color,opts)
  );
  mesh.position.set(pos[0],pos[1],pos[2]);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  group.add(mesh);
  return mesh;
}

function cylinder(THREE,group,radius,height,pos,color,segments=10){
  const mesh=new THREE.Mesh(
    new THREE.CylinderGeometry(radius,radius,height,segments),
    mat(THREE,color,{metalness:.18,roughness:.72})
  );
  mesh.position.set(pos[0],pos[1],pos[2]);
  mesh.castShadow=true;
  group.add(mesh);
  return mesh;
}

function createTower(THREE){
  const group=new THREE.Group();
  const steel=0x6d7375;
  const dark=0x505658;
  const half=2.4;
  const height=38;
  const legH=36;

  for(const sx of [-1,1]){
    for(const sz of [-1,1]){
      const leg=cylinder(THREE,group,.18,legH,[sx*half,legH*.5,sz*half],steel,8);
      leg.rotation.z=sx*.055;
      leg.rotation.x=sz*.055;
    }
  }

  for(let y=5;y<=31;y+=6.5){
    box(THREE,group,[5.2,.18,.18],[0,y,-half],dark);
    box(THREE,group,[5.2,.18,.18],[0,y, half],dark);
    box(THREE,group,[.18,.18,5.2],[-half,y,0],dark);
    box(THREE,group,[.18,.18,5.2],[ half,y,0],dark);
  }

  cylinder(THREE,group,.24,6,[0,height+1.5,0],steel,8);
  const dish=new THREE.Mesh(
    new THREE.CylinderGeometry(1.15,1.15,.28,18),
    mat(THREE,0xb7b9b6,{roughness:.65,metalness:.15})
  );
  dish.rotation.x=Math.PI*.5;
  dish.position.set(0,height+1.3,0);
  dish.castShadow=true;
  group.add(dish);
  return group;
}

function createVendorKiosk(THREE){
  const group=new THREE.Group();
  box(THREE,group,[8,3.8,5],[0,1.9,0],0x7e837e);
  box(THREE,group,[8.6,.45,5.6],[0,4.05,0],0x5d625e);
  box(THREE,group,[5.2,1.5,.3],[0,2.1,2.65],0x33383a,{metalness:.08});
  return group;
}

function createGarageVendor(THREE){
  const group=new THREE.Group();
  box(THREE,group,[14,5.2,10],[0,2.6,0],0x84877f);
  box(THREE,group,[14.8,.55,10.8],[0,5.45,0],0x565b58);
  box(THREE,group,[9,3.4,.35],[0,2.15,5.18],0x4d5352,{metalness:.1});
  return group;
}

function createSpawnBoard(THREE){
  const group=new THREE.Group();
  cylinder(THREE,group,.12,2.8,[-1.4,1.4,0],0x515756,8);
  cylinder(THREE,group,.12,2.8,[1.4,1.4,0],0x515756,8);
  box(THREE,group,[3.6,2.0,.28],[0,2.45,0],0x777f7c);
  return group;
}

function createStadium(THREE){
  const group=new THREE.Group();
  // Proxy dimensions follow the calibrated stadium site envelope. The geometry
  // is deliberately generic: it exists for flight-scale silhouette/obstacles.
  box(THREE,group,[190,1.2,140],[0,-.5,0],0x666a62);
  box(THREE,group,[116,.22,70],[0,.18,0],0x667c58);

  const standColor=0x8e918d;
  box(THREE,group,[132,10,14],[0,5,-56],standColor);
  box(THREE,group,[132,10,14],[0,5,56],standColor);
  box(THREE,group,[14,9,86],[-76,4.5,0],standColor);
  box(THREE,group,[14,9,86],[76,4.5,0],standColor);

  const roof=0x5a5f5c;
  box(THREE,group,[136,1.0,16],[0,11,-56],roof);
  box(THREE,group,[136,1.0,16],[0,11,56],roof);
  return group;
}

function createPool(THREE){
  const group=new THREE.Group();
  box(THREE,group,[36,.7,22],[0,-.25,0],0x9a9e98);
  box(THREE,group,[31,.12,17],[0,.16,0],0x4f8fa8,{roughness:.3,metalness:.06,transparent:true,opacity:.9});
  return group;
}

function createLumberyard(THREE){
  const group=new THREE.Group();
  box(THREE,group,[46,.8,32],[0,-.3,0],0x736b5c);
  const timber=0x7a6548;
  for(let row=-1;row<=1;row++){
    for(let col=-2;col<=2;col++){
      box(THREE,group,[6,2.1,2.4],[col*7,1.05,row*7],timber);
    }
  }
  return group;
}



function gableRoof(THREE,group,width,depth,height,y,color){
  const hw=width*.5;
  const hd=depth*.5;
  const vertices=new Float32Array([
    -hw,0,-hd, hw,0,-hd, hw,0,hd, -hw,0,hd,
    0,height,-hd, 0,height,hd
  ]);
  const indices=[0,1,4, 3,5,2, 0,4,5, 0,5,3, 1,2,5, 1,5,4];
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,mat(THREE,color));
  mesh.position.y=y;
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  group.add(mesh);
  return mesh;
}

function createHangar(THREE){
  const group=new THREE.Group();
  box(THREE,group,[32,8.2,44],[0,4.1,0],0x858984);
  gableRoof(THREE,group,34,46,4.2,8.2,0x555b59);
  box(THREE,group,[22,6,.5],[0,3.2,22.1],0x4e5554,{metalness:.1});
  return group;
}

function createOperations(THREE){
  const group=new THREE.Group();
  box(THREE,group,[24,7.5,18],[0,3.75,0],0x9a9c94);
  box(THREE,group,[25,.8,19],[0,7.9,0],0x5a5f5b);
  box(THREE,group,[8,2,.6],[0,3,9.2],0x515857,{metalness:.08});
  return group;
}

function createWorkshop(THREE){
  const group=new THREE.Group();
  box(THREE,group,[24,6.2,16],[0,3.1,0],0x868a85);
  gableRoof(THREE,group,25,17,2.6,6.2,0x5b605c);
  box(THREE,group,[8,4,.5],[-6,2.4,8.1],0x4f5554,{metalness:.1});
  box(THREE,group,[8,4,.5],[6,2.4,8.1],0x4f5554,{metalness:.1});
  return group;
}

function createVehicleShelter(THREE){
  const group=new THREE.Group();
  const steel=0x5a605e;
  for(const x of [-10,10]){
    for(const z of [-5,5]) cylinder(THREE,group,.16,5,[x,2.5,z],steel,8);
  }
  box(THREE,group,[24,.7,14],[0,5.2,0],0x666d68,{metalness:.08});
  return group;
}

function createFuelTank(THREE){
  const group=new THREE.Group();
  cylinder(THREE,group,4.2,8,[0,4,0],0x898d87,18);
  cylinder(THREE,group,4.45,.45,[0,8.15,0],0x626864,18);
  return group;
}

function createFuelDepot(THREE){
  const group=new THREE.Group();
  for(const x of [-6,6]){
    cylinder(THREE,group,4.1,7.5,[x,3.75,0],0x858a84,18);
    cylinder(THREE,group,4.3,.35,[x,7.65,0],0x606662,18);
  }
  box(THREE,group,[27,.5,20],[0,.15,0],0x686a62);
  return group;
}

function createGatehouse(THREE){
  const group=new THREE.Group();
  box(THREE,group,[8,4.2,7],[0,2.1,0],0x92968e);
  box(THREE,group,[9,.55,8],[0,4.45,0],0x5b615d);
  box(THREE,group,[13,.18,.18],[8.5,1.15,0],0xd1d1c8,{metalness:.1});
  return group;
}

function createLightMast(THREE){
  const group=new THREE.Group();
  cylinder(THREE,group,.22,25,[0,12.5,0],0x5c6262,10);
  box(THREE,group,[5,.28,.35],[0,25,0],0x4f5655,{metalness:.16});
  return group;
}

function createBarn(THREE){
  const group=new THREE.Group();
  box(THREE,group,[22,7.5,32],[0,3.75,0],0x9c8f78);
  gableRoof(THREE,group,23,33,3.2,7.5,0x6a5547);
  box(THREE,group,[8,5,.4],[0,2.7,16.1],0x5c5548);
  return group;
}

function createSilo(THREE){
  const group=new THREE.Group();
  cylinder(THREE,group,4.2,11,[0,5.5,0],0x9a9b92,18);
  const roof=new THREE.Mesh(
    new THREE.ConeGeometry(4.5,3.2,18),
    mat(THREE,0x686d68,{metalness:.08})
  );
  roof.position.y=12.6;
  roof.castShadow=true;
  group.add(roof);
  return group;
}

function createStorageShed(THREE){
  const group=new THREE.Group();
  box(THREE,group,[14,5,10],[0,2.5,0],0x888b84);
  gableRoof(THREE,group,15,11,2.0,5,0x5b605b);
  return group;
}

function createFloodlight(THREE){
  const group=new THREE.Group();
  cylinder(THREE,group,.26,29,[0,14.5,0],0x5a6160,10);
  box(THREE,group,[7,.3,.45],[0,29,0],0x4f5655,{metalness:.16});
  for(const x of [-2.5,-.85,.85,2.5]){
    box(THREE,group,[1.1,.6,.45],[x,29.45,.15],0xb9b9ad,{metalness:.12});
  }
  return group;
}

export function registerInfrastructureModels(registry){
  const defs=[
    ['infrastructure.tower',createTower],
    ['facility.weapons_vendor',createVendorKiosk],
    ['facility.garage_vendor',createGarageVendor],
    ['facility.spawn_board',createSpawnBoard],
    ['landmark.stadium',createStadium],
    ['landmark.pool',createPool],
    ['landmark.lumberyard',createLumberyard],
    ['facility.hangar',createHangar],
    ['facility.operations',createOperations],
    ['facility.workshop',createWorkshop],
    ['facility.vehicle_shelter',createVehicleShelter],
    ['facility.fuel_tank',createFuelTank],
    ['facility.fuel_depot',createFuelDepot],
    ['facility.gatehouse',createGatehouse],
    ['facility.light_mast',createLightMast],
    ['facility.barn',createBarn],
    ['facility.silo',createSilo],
    ['facility.storage_shed',createStorageShed],
    ['facility.floodlight',createFloodlight]
  ];

  for(const [id,createObject] of defs){
    registry.register({
      id,
      category:id.split('.')[0],
      mode:'unique',
      sourceUnitScale:true,
      alignToTerrain:false,
      createObject
    });
  }
}
