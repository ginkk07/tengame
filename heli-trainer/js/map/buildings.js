import {
  BUILDING_REFERENCE_FEATURES
} from './map-data.js';

import {
  placeRigidMapObject,
  addTerrainFoundation
} from './terrain-placement.js';

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

  const wallMaterials=[
    new THREE.MeshStandardMaterial({
      color:0x989486,
      roughness:.96
    }),
    new THREE.MeshStandardMaterial({
      color:0x85887f,
      roughness:.96
    }),
    new THREE.MeshStandardMaterial({
      color:0xa6a08f,
      roughness:.95
    }),
    new THREE.MeshStandardMaterial({
      color:0x747a74,
      roughness:.95
    })
  ];

  const roofMaterials=[
    new THREE.MeshStandardMaterial({
      color:0x5b5c56,
      roughness:.92
    }),
    new THREE.MeshStandardMaterial({
      color:0x6e665d,
      roughness:.92
    }),
    new THREE.MeshStandardMaterial({
      color:0x73736b,
      roughness:.91
    })
  ];

  const glassMaterial=
    new THREE.MeshStandardMaterial({
      color:0x65797a,
      roughness:.34
    });

  function box(
    w,h,d,material
  ){
    const mesh=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          w,h,d
        ),
        material
      );

    mesh.castShadow=true;
    mesh.receiveShadow=true;

    return mesh;
  }

  function gableRoof(
    w,d,h,material
  ){
    const hw=w*.5;
    const hd=d*.5;

    const vertices=new Float32Array([
      -hw,0,-hd,  hw,0,-hd,  hw,0,hd, -hw,0,hd,
       0,h,-hd,   0,h,hd
    ]);

    const indices=[
      0,1,4,
      3,5,2,
      0,4,5, 0,5,3,
      1,2,5, 1,5,4
    ];

    const geometry=
      new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        vertices,
        3
      )
    );

    geometry.setIndex(
      indices
    );

    geometry.computeVertexNormals();

    const mesh=
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.castShadow=true;
    mesh.receiveShadow=true;

    return mesh;
  }

  const features=BUILDING_REFERENCE_FEATURES;

  features.forEach(
    (feature,index)=>{
      const root=
        new THREE.Group();

      const placement=
        placeRigidMapObject({
          object:root,
          mapX:feature.x,
          mapY:feature.y,
          width:feature.w+2.4,
          depth:feature.d+2.4,
          yaw:feature.angle,
          terrainHeight,
          clearance:.20,
          samples:5
        });

      addTerrainFoundation({
        THREE,
        object:root,
        width:feature.w+1.8,
        depth:feature.d+1.8,
        terrainRange:placement.terrain.range,
        material:wallMaterials[3],
        extraDepth:.55
      });

      const aspect=
        Math.max(
          feature.w,
          feature.d
        )/
        Math.max(
          1,
          Math.min(
            feature.w,
            feature.d
          )
        );

      const isLong=
        aspect>
        1.75 ||
        feature.w>
        30 ||
        feature.d>
        26;

      const isTiny=
        feature.w<
        18 &&
        feature.d<
        17;

      const wall=
        wallMaterials[
          index%
          wallMaterials.length
        ];

      const roof=
        roofMaterials[
          index%
          roofMaterials.length
        ];

      const slab=
        box(
          feature.w+1.0,
          .28,
          feature.d+1.0,
          wallMaterials[3]
        );

      slab.position.y=.14;

      root.add(
        slab
      );

      const bodyHeight=
        isLong
          ? Math.max(
              5.8,
              feature.h*.86
            )
          : feature.h;

      const body=
        box(
          feature.w,
          bodyHeight,
          feature.d,
          wall
        );

      body.position.y=
        .28+
        bodyHeight*.5;

      root.add(
        body
      );

      if(isLong){
        const roofMesh=
          gableRoof(
            feature.w+1.3,
            feature.d+1.3,
            Math.max(
              2.2,
              feature.d*.12
            ),
            roof
          );

        roofMesh.position.y=
          .28+
          bodyHeight;

        root.add(
          roofMesh
        );

        const door=
          box(
            Math.min(
              7.5,
              feature.w*.32
            ),
            Math.min(
              4.5,
              bodyHeight*.72
            ),
            .25,
            roofMaterials[2]
          );

        door.position.set(
          0,
          2.4,
          -feature.d*.5-.13
        );

        root.add(
          door
        );
      }else if(isTiny){
        const roofMesh=
          gableRoof(
            feature.w+1.1,
            feature.d+1.1,
            2.3,
            roof
          );

        roofMesh.position.y=
          .28+
          bodyHeight;

        root.add(
          roofMesh
        );

        const chimney=
          box(
            .9,
            2.0,
            .9,
            roofMaterials[1]
          );

        chimney.position.set(
          feature.w*.22,
          bodyHeight+2.0,
          feature.d*.16
        );

        root.add(
          chimney
        );
      }else{
        const flatRoof=
          box(
            feature.w+1.0,
            .55,
            feature.d+1.0,
            roof
          );

        flatRoof.position.y=
          .28+
          bodyHeight+
          .28;

        root.add(
          flatRoof
        );

        // Window band helps medium footprints read as multi-storey blocks.
        const band=
          box(
            feature.w*.78,
            .55,
            .20,
            glassMaterial
          );

        band.position.set(
          0,
          Math.min(
            bodyHeight*.64,
            5.5
          ),
          -feature.d*.5-.11
        );

        root.add(
          band
        );
      }

      group.add(
        root
      );
    }
  );

  return {
    group,
    buildingCount:
      features.length
  };
}
