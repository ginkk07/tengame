import {
  BUILDING_REFERENCE_FEATURES
} from './map-data.js';

import {
  mapPointToWorld
} from './factions.js';

export function createBuildingReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiBuildingReference';

  scene.add(group);

  const bodyGeometry=
    new THREE.BoxGeometry(
      1,
      1,
      1
    );

  bodyGeometry.translate(
    0,
    .5,
    0
  );

  const roofGeometry=
    new THREE.BoxGeometry(
      1,
      1,
      1
    );

  roofGeometry.translate(
    0,
    .5,
    0
  );

  const bodies=
    new THREE.InstancedMesh(
      bodyGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:.92,
        metalness:0
      }),
      BUILDING_REFERENCE_FEATURES.length
    );

  const roofs=
    new THREE.InstancedMesh(
      roofGeometry,
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        roughness:.90,
        metalness:0
      }),
      BUILDING_REFERENCE_FEATURES.length
    );

  bodies.castShadow=true;
  bodies.receiveShadow=true;

  roofs.castShadow=true;
  roofs.receiveShadow=true;

  const wallColors=[
    new THREE.Color(0x96958c),
    new THREE.Color(0xa6a095),
    new THREE.Color(0x858b86),
    new THREE.Color(0xb0a999)
  ];

  const roofColors=[
    new THREE.Color(0x5e625e),
    new THREE.Color(0x6b665f),
    new THREE.Color(0x555b59),
    new THREE.Color(0x746b62)
  ];

  const dummy=
    new THREE.Object3D();

  BUILDING_REFERENCE_FEATURES.forEach(
    (feature,index)=>{
      const world=
        mapPointToWorld(
          feature.x,
          feature.y
        );

      const ground=
        terrainHeight(
          world.x,
          world.z
        );

      dummy.position.set(
        world.x,
        ground,
        world.z
      );

      dummy.rotation.set(
        0,
        feature.angle,
        0
      );

      dummy.scale.set(
        feature.w,
        feature.h,
        feature.d
      );

      dummy.updateMatrix();

      bodies.setMatrixAt(
        index,
        dummy.matrix
      );

      bodies.setColorAt(
        index,
        wallColors[
          index%
          wallColors.length
        ]
      );

      dummy.position.y=
        ground+
        feature.h;

      dummy.scale.set(
        feature.w*1.035,
        .75,
        feature.d*1.035
      );

      dummy.updateMatrix();

      roofs.setMatrixAt(
        index,
        dummy.matrix
      );

      roofs.setColorAt(
        index,
        roofColors[
          index%
          roofColors.length
        ]
      );
    }
  );

  bodies.instanceMatrix.needsUpdate=true;
  roofs.instanceMatrix.needsUpdate=true;

  if(bodies.instanceColor){
    bodies.instanceColor.needsUpdate=true;
  }

  if(roofs.instanceColor){
    roofs.instanceColor.needsUpdate=true;
  }

  bodies.computeBoundingSphere();
  roofs.computeBoundingSphere();

  group.add(
    bodies,
    roofs
  );

  return {
    group,
    buildingCount:
      BUILDING_REFERENCE_FEATURES.length
  };
}
