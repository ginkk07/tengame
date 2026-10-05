import {
  FOREST_REFERENCE_POINTS
} from './map-data.js';

import {
  mapPointToWorld
} from './factions.js';

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

  const trunkGeometry=
    new THREE.CylinderGeometry(
      .55,
      .9,
      5.5,
      6
    );

  trunkGeometry.translate(
    0,
    2.75,
    0
  );

  const lowerCrownGeometry=
    new THREE.ConeGeometry(
      4.4,
      12,
      7
    );

  lowerCrownGeometry.translate(
    0,
    8.0,
    0
  );

  const upperCrownGeometry=
    new THREE.ConeGeometry(
      3.2,
      10,
      7
    );

  upperCrownGeometry.translate(
    0,
    14.0,
    0
  );

  const maxCount=
    FOREST_REFERENCE_POINTS.length*
    2;

  const trunks=
    new THREE.InstancedMesh(
      trunkGeometry,
      new THREE.MeshStandardMaterial({
        color:0x554839,
        roughness:1
      }),
      maxCount
    );

  const lowerCrowns=
    new THREE.InstancedMesh(
      lowerCrownGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  const upperCrowns=
    new THREE.InstancedMesh(
      upperCrownGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:1
      }),
      maxCount
    );

  trunks.castShadow=true;

  lowerCrowns.castShadow=true;
  lowerCrowns.receiveShadow=true;

  upperCrowns.castShadow=true;
  upperCrowns.receiveShadow=true;

  const dummy=
    new THREE.Object3D();

  function hash01(value){
    const x=
      Math.sin(
        value*
        12.9898+
        78.233
      )*
      43758.5453;

    return x-
      Math.floor(x);
  }

  const colors=[
    0x23452b,
    0x2a5030,
    0x315936,
    0x3a613d,
    0x1f4027
  ].map(
    value=>
      new THREE.Color(
        value
      )
  );

  let instanceIndex=0;

  FOREST_REFERENCE_POINTS.forEach(
    (point,index)=>{
      const world=
        mapPointToWorld(
          point[0],
          point[1]
        );

      /*
       * One map sample becomes one main tree plus an occasional nearby tree.
       * The scatter radius stays under ~12 m, so woodland location still
       * follows the tactical map rather than becoming an invented forest patch.
       */
      const count=
        hash01(
          index+11
        )>.34
          ? 2
          : 1;

      for(let n=0;n<count;n++){
        const angle=
          hash01(
            index*17+
            n*31+
            5
          )*
          Math.PI*
          2;

        const radius=
          n===0
            ? 0
            : 4+
              hash01(
                index*23+
                n*47
              )*
              8;

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
          .72+
          hash01(
            index*29+
            n*13+
            9
          )*
          .65;

        dummy.position.set(
          x,
          ground,
          z
        );

        dummy.rotation.set(
          0,
          hash01(
            index*37+
            n*19
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
          instanceIndex,
          dummy.matrix
        );

        lowerCrowns.setMatrixAt(
          instanceIndex,
          dummy.matrix
        );

        lowerCrowns.setColorAt(
          instanceIndex,
          colors[
            Math.floor(
              hash01(
                index*41+
                n*7
              )*
              colors.length
            )%
            colors.length
          ]
        );

        dummy.scale.set(
          scale*.88,
          scale*.90,
          scale*.88
        );

        dummy.updateMatrix();

        upperCrowns.setMatrixAt(
          instanceIndex,
          dummy.matrix
        );

        upperCrowns.setColorAt(
          instanceIndex,
          colors[
            (
              Math.floor(
                hash01(
                  index*43+
                  n*11
                )*
                colors.length
              )+
              1
            )%
            colors.length
          ]
        );

        instanceIndex++;
      }
    }
  );

  trunks.count=
    instanceIndex;

  lowerCrowns.count=
    instanceIndex;

  upperCrowns.count=
    instanceIndex;

  trunks.instanceMatrix.needsUpdate=true;
  lowerCrowns.instanceMatrix.needsUpdate=true;
  upperCrowns.instanceMatrix.needsUpdate=true;

  if(lowerCrowns.instanceColor){
    lowerCrowns.instanceColor.needsUpdate=true;
  }

  if(upperCrowns.instanceColor){
    upperCrowns.instanceColor.needsUpdate=true;
  }

  trunks.computeBoundingSphere();
  lowerCrowns.computeBoundingSphere();
  upperCrowns.computeBoundingSphere();

  group.add(
    trunks,
    lowerCrowns,
    upperCrowns
  );

  return {
    group,
    anchorCount:
      FOREST_REFERENCE_POINTS.length,
    treeCount:
      instanceIndex
  };
}
