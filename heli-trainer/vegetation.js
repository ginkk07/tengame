import {
  FOREST_REFERENCE_POINTS,
  SITE_CLEARINGS
} from './map-data.js?v=73';

import {
  mapPointToWorld
} from './factions.js?v=73';

export function createForestReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiForestReference';

  scene.add(group);

  const clearings=
    SITE_CLEARINGS;


  function insideClearing(point){
    return clearings.some(
      item=>
        Math.hypot(
          point[0]-
          item.x,
          point[1]-
          item.y
        )<
        (item.radius || item.clearRadius || 0)
    );
  }

  const points=
    FOREST_REFERENCE_POINTS.filter(
      point=>
        !insideClearing(
          point
        )
    );

  const trunkGeometry=
    new THREE.CylinderGeometry(
      .48,
      .82,
      5.0,
      6
    );

  trunkGeometry.translate(
    0,
    2.5,
    0
  );

  const broadGeometry=
    new THREE.IcosahedronGeometry(
      4.5,
      1
    );

  broadGeometry.scale(
    1.0,
    .92,
    .95
  );

  broadGeometry.translate(
    0,
    10.2,
    0
  );

  const broadUpperGeometry=
    new THREE.IcosahedronGeometry(
      3.2,
      1
    );

  broadUpperGeometry.scale(
    .90,
    .95,
    .90
  );

  broadUpperGeometry.translate(
    1.1,
    13.2,
    -.6
  );

  const coniferLowerGeometry=
    new THREE.ConeGeometry(
      4.0,
      10.0,
      7
    );

  coniferLowerGeometry.translate(
    0,
    8.1,
    0
  );

  const coniferUpperGeometry=
    new THREE.ConeGeometry(
      3.0,
      9.0,
      7
    );

  coniferUpperGeometry.translate(
    0,
    13.2,
    0
  );

  const shrubGeometry=
    new THREE.IcosahedronGeometry(
      2.6,
      0
    );

  shrubGeometry.scale(
    1.35,
    .55,
    1.15
  );

  shrubGeometry.translate(
    0,
    1.7,
    0
  );

  const maxCount=
    points.length*
    2;

  const trunks=
    new THREE.InstancedMesh(
      trunkGeometry,
      new THREE.MeshStandardMaterial({
        color:0x514537,
        roughness:1
      }),
      maxCount
    );

  const broad=
    new THREE.InstancedMesh(
      broadGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  const broadUpper=
    new THREE.InstancedMesh(
      broadUpperGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  const coniferLower=
    new THREE.InstancedMesh(
      coniferLowerGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  const coniferUpper=
    new THREE.InstancedMesh(
      coniferUpperGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  const shrubs=
    new THREE.InstancedMesh(
      shrubGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  const leafColors=[
    new THREE.Color(0x1f4027),
    new THREE.Color(0x274a2d),
    new THREE.Color(0x315334),
    new THREE.Color(0x3a5c38),
    new THREE.Color(0x24482b)
  ];

  const coniferColors=[
    new THREE.Color(0x183a26),
    new THREE.Color(0x1e432a),
    new THREE.Color(0x254b2e),
    new THREE.Color(0x2c5133)
  ];

  const shrubColors=[
    new THREE.Color(0x36563a),
    new THREE.Color(0x405f3e),
    new THREE.Color(0x2f4d34)
  ];

  const dummy=
    new THREE.Object3D();

  function hash01(value){
    const result=
      Math.sin(
        value*
        12.9898+
        78.233
      )*
      43758.5453;

    return result-
      Math.floor(
        result
      );
  }

  let trunkCount=0;
  let broadCount=0;
  let coniferCount=0;
  let shrubCount=0;

  points.forEach(
    (point,index)=>{
      const world=
        mapPointToWorld(
          point[0],
          point[1]
        );

      const count=
        hash01(
          index+7
        )>.42
          ? 2
          : 1;

      for(let n=0;n<count;n++){
        const angle=
          hash01(
            index*17+
            n*13+
            4
          )*
          Math.PI*
          2;

        const radius=
          n===0
            ? 0
            : 3.5+
              hash01(
                index*31+
                n*19
              )*
              8.5;

        const x=
          world.x+
          Math.cos(angle)*
          radius;

        const z=
          world.z+
          Math.sin(angle)*
          radius;

        const ground=
          terrainHeight(
            x,
            z
          );

        const scale=
          .70+
          hash01(
            index*23+
            n*29
          )*
          .62;

        dummy.position.set(
          x,
          ground,
          z
        );

        dummy.rotation.set(
          0,
          hash01(
            index*37+
            n*11
          )*
          Math.PI*
          2,
          0
        );

        dummy.scale.set(
          scale,
          scale,
          scale
        );

        dummy.updateMatrix();

        trunks.setMatrixAt(
          trunkCount,
          dummy.matrix
        );

        trunkCount++;

        const isConifer=
          hash01(
            index*43+
            n*5
          )<
          .34;

        if(isConifer){
          coniferLower.setMatrixAt(
            coniferCount,
            dummy.matrix
          );

          coniferLower.setColorAt(
            coniferCount,
            coniferColors[
              Math.floor(
                hash01(
                  index*47+
                  n*3
                )*
                coniferColors.length
              )%
              coniferColors.length
            ]
          );

          dummy.scale.set(
            scale*.86,
            scale*.94,
            scale*.86
          );

          dummy.updateMatrix();

          coniferUpper.setMatrixAt(
            coniferCount,
            dummy.matrix
          );

          coniferUpper.setColorAt(
            coniferCount,
            coniferColors[
              (
                Math.floor(
                  hash01(
                    index*53+
                    n*7
                  )*
                  coniferColors.length
                )+
                1
              )%
              coniferColors.length
            ]
          );

          coniferCount++;
        }else{
          broad.setMatrixAt(
            broadCount,
            dummy.matrix
          );

          broad.setColorAt(
            broadCount,
            leafColors[
              Math.floor(
                hash01(
                  index*59+
                  n*17
                )*
                leafColors.length
              )%
              leafColors.length
            ]
          );

          dummy.scale.set(
            scale*.88,
            scale*.92,
            scale*.88
          );

          dummy.updateMatrix();

          broadUpper.setMatrixAt(
            broadCount,
            dummy.matrix
          );

          broadUpper.setColorAt(
            broadCount,
            leafColors[
              (
                Math.floor(
                  hash01(
                    index*61+
                    n*23
                  )*
                  leafColors.length
                )+
                1
              )%
              leafColors.length
            ]
          );

          broadCount++;
        }

        if(
          hash01(
            index*67+
            n*31
          )<
          .48
        ){
          dummy.position.set(
            x+
            (
              hash01(
                index*71+
                n*37
              )-
              .5
            )*
            7,
            ground,
            z+
            (
              hash01(
                index*73+
                n*41
              )-
              .5
            )*
            7
          );

          dummy.scale.set(
            .7+
            hash01(
              index*79+
              n*43
            )*.5,
            .7+
            hash01(
              index*83+
              n*47
            )*.35,
            .7+
            hash01(
              index*89+
              n*53
            )*.5
          );

          dummy.updateMatrix();

          shrubs.setMatrixAt(
            shrubCount,
            dummy.matrix
          );

          shrubs.setColorAt(
            shrubCount,
            shrubColors[
              Math.floor(
                hash01(
                  index*97+
                  n*59
                )*
                shrubColors.length
              )%
              shrubColors.length
            ]
          );

          shrubCount++;
        }
      }
    }
  );

  trunks.count=trunkCount;
  broad.count=broadCount;
  broadUpper.count=broadCount;
  coniferLower.count=coniferCount;
  coniferUpper.count=coniferCount;
  shrubs.count=shrubCount;

  [
    trunks,
    broad,
    broadUpper,
    coniferLower,
    coniferUpper,
    shrubs
  ].forEach(
    mesh=>{
      mesh.instanceMatrix.needsUpdate=true;

      if(mesh.instanceColor){
        mesh.instanceColor.needsUpdate=true;
      }

      mesh.computeBoundingSphere();
      mesh.castShadow=true;
      mesh.receiveShadow=true;
    }
  );

  group.add(
    trunks,
    broad,
    broadUpper,
    coniferLower,
    coniferUpper,
    shrubs
  );

  return {
    group,
    anchorCount:
      points.length,
    treeCount:
      trunkCount,
    shrubCount
  };
}
