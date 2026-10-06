import {
  FULLMAP_ENVIRONMENT_POIS
} from './map-data.js?v=74';

import {
  mapPointToWorld
} from './factions.js?v=74';

import {
  placeRigidMapObject,
  addTerrainFoundation
} from './terrain-placement.js?v=74';

export function createFullMapEnvironmentLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=new THREE.Group();
  group.name='OzetiFullMapEnvironment';
  scene.add(group);

  const byId=Object.fromEntries(
    FULLMAP_ENVIRONMENT_POIS.map(
      item=>[item.id,item]
    )
  );

  const fieldMaterials=[
    new THREE.MeshStandardMaterial({color:0x766d45,roughness:1}),
    new THREE.MeshStandardMaterial({color:0x657348,roughness:1}),
    new THREE.MeshStandardMaterial({color:0x806f46,roughness:1}),
    new THREE.MeshStandardMaterial({color:0x596d42,roughness:1})
  ];

  const grassMaterial=
    new THREE.MeshStandardMaterial({color:0x5d774b,roughness:1});

  const deforestedMaterial=
    new THREE.MeshStandardMaterial({color:0x766849,roughness:1});

  const wallMaterial=
    new THREE.MeshStandardMaterial({color:0x918979,roughness:.98});

  const roofMaterial=
    new THREE.MeshStandardMaterial({color:0x66584d,roughness:.94});

  const barnMaterial=
    new THREE.MeshStandardMaterial({color:0x75634f,roughness:.98});

  const trunkMaterial=
    new THREE.MeshStandardMaterial({color:0x4f4438,roughness:1});

  const foliageMaterial=
    new THREE.MeshStandardMaterial({color:0x2b5131,roughness:1});

  const coniferMaterial=
    new THREE.MeshStandardMaterial({color:0x1f4027,roughness:1});

  function box(w,h,d,material){
    const mesh=new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d),
      material
    );
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    return mesh;
  }

  function gableRoof(w,d,h,material){
    const hw=w*.5;
    const hd=d*.5;
    const vertices=new Float32Array([
      -hw,0,-hd, hw,0,-hd, hw,0,hd, -hw,0,hd,
      0,h,-hd, 0,h,hd
    ]);
    const indices=[
      0,1,4, 3,5,2,
      0,4,5, 0,5,3,
      1,2,5, 1,5,4
    ];
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(vertices,3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    return mesh;
  }

  function hash01(value){
    const n=Math.sin(value*12.9898+78.233)*43758.5453;
    return n-Math.floor(n);
  }



  function addFarm(point,index){
    const yaw=(index*.31)%Math.PI;

    const yard=new THREE.Group();

    const barn=box(30,7.5,15,barnMaterial);
    barn.position.y=3.75;
    yard.add(barn);

    const barnRoof=gableRoof(32,17,4,roofMaterial);
    barnRoof.position.y=7.5;
    yard.add(barnRoof);

    const house=box(16,6.5,12,wallMaterial);
    house.position.set(-27,3.25,6);
    yard.add(house);

    const houseRoof=gableRoof(18,14,3,roofMaterial);
    houseRoof.position.set(-27,6.5,6);
    yard.add(houseRoof);

    const placement=
      placeRigidMapObject({
        object:yard,
        mapX:point.x,
        mapY:point.y,
        width:72,
        depth:48,
        yaw,
        terrainHeight,
        clearance:.16,
        samples:5
      });

    addTerrainFoundation({
      THREE,
      object:yard,
      width:72,
      depth:48,
      terrainRange:placement.terrain.range,
      material:wallMaterial,
      extraDepth:.45
    });

    group.add(yard);
  }

  for(let i=1;i<=9;i++){
    addFarm(byId['farm_'+i],i);
  }

  {
    const center=
      mapPointToWorld(
        byId.deforested_1.x,
        byId.deforested_1.y
      );

    for(let i=0;i<34;i++){
      const a=hash01(i*11+3)*Math.PI*2;
      const r=25+hash01(i*19+7)*150;
      const x=center.x+Math.cos(a)*r;
      const z=center.z+Math.sin(a)*r;

      const stump=new THREE.Mesh(
        new THREE.CylinderGeometry(1,1.25,1,7),
        trunkMaterial
      );

      stump.position.set(
        x,
        terrainHeight(x,z)+.5,
        z
      );

      stump.castShadow=true;
      group.add(stump);
    }
  }

  const trunkGeometry=
    new THREE.CylinderGeometry(.48,.82,5.4,6);
  trunkGeometry.translate(0,2.7,0);

  const broadGeometry=
    new THREE.IcosahedronGeometry(4.6,1);
  broadGeometry.scale(1.05,.90,.98);
  broadGeometry.translate(0,10.4,0);

  const coniferGeometry=
    new THREE.ConeGeometry(4,13.5,8);
  coniferGeometry.translate(0,9.5,0);

  const maxTrees=13*84;

  const trunks=
    new THREE.InstancedMesh(
      trunkGeometry,
      trunkMaterial,
      maxTrees
    );

  const broad=
    new THREE.InstancedMesh(
      broadGeometry,
      foliageMaterial,
      maxTrees
    );

  const conifer=
    new THREE.InstancedMesh(
      coniferGeometry,
      coniferMaterial,
      maxTrees
    );

  const dummy=new THREE.Object3D();

  let trunkCount=0;
  let broadCount=0;
  let coniferCount=0;

  for(let zone=1;zone<=13;zone++){
    const point=byId['forest_'+zone];
    const center=mapPointToWorld(point.x,point.y);
    const radius=180+(zone%4)*35;
    const count=58+(zone%5)*6;

    for(let i=0;i<count;i++){
      const a=
        hash01(zone*101+i*17)*
        Math.PI*
        2;

      const radial=
        Math.sqrt(
          hash01(zone*127+i*23)
        )*
        radius;

      const x=center.x+Math.cos(a)*radial;
      const z=center.z+Math.sin(a)*radial;
      const y=terrainHeight(x,z);
      const scale=.72+hash01(zone*149+i*29)*.68;

      dummy.position.set(x,y,z);
      dummy.rotation.set(
        0,
        hash01(zone*173+i*31)*Math.PI*2,
        0
      );
      dummy.scale.set(scale,scale,scale);
      dummy.updateMatrix();

      trunks.setMatrixAt(trunkCount,dummy.matrix);
      trunkCount++;

      if(hash01(zone*191+i*37)<.36){
        conifer.setMatrixAt(coniferCount,dummy.matrix);
        coniferCount++;
      }else{
        broad.setMatrixAt(broadCount,dummy.matrix);
        broadCount++;
      }
    }
  }

  trunks.count=trunkCount;
  broad.count=broadCount;
  conifer.count=coniferCount;

  [trunks,broad,conifer].forEach(
    mesh=>{
      mesh.instanceMatrix.needsUpdate=true;
      mesh.castShadow=true;
      mesh.receiveShadow=true;
      mesh.computeBoundingSphere();
    }
  );

  group.add(trunks,broad,conifer);

  return {
    group,
    farmCount:9,
    grasslandCount:1,
    forestZoneCount:13,
    treeCount:trunkCount,
    deforestedCount:1
  };
}
