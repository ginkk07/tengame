import {
  TOWER_REFERENCE_POINTS
} from './map-data.js';

import {
  placeRigidMapObject,
  addTerrainFoundation
} from './terrain-placement.js';

export function createTowerReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiTowerStructures';

  scene.add(group);

  const steelMaterial=
    new THREE.MeshStandardMaterial({
      color:0x626967,
      roughness:.72,
      metalness:.18
    });

  const darkSteelMaterial=
    new THREE.MeshStandardMaterial({
      color:0x454b4a,
      roughness:.76,
      metalness:.20
    });

  const platformMaterial=
    new THREE.MeshStandardMaterial({
      color:0x737a76,
      roughness:.82,
      metalness:.12
    });

  function makeBeam(
    ax,ay,az,
    bx,by,bz,
    radius=.22,
    material=steelMaterial
  ){
    const a=
      new THREE.Vector3(
        ax,
        ay,
        az
      );

    const b=
      new THREE.Vector3(
        bx,
        by,
        bz
      );

    const delta=
      b.clone().sub(a);

    const length=
      delta.length();

    const mesh=
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius,
          radius,
          length,
          6
        ),
        material
      );

    mesh.position.copy(
      a.clone().add(b).multiplyScalar(.5)
    );

    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(
        0,
        1,
        0
      ),
      delta.clone().normalize()
    );

    mesh.castShadow=true;
    mesh.receiveShadow=true;

    return mesh;
  }

  function createTower(){
    const tower=
      new THREE.Group();

    const height=45;
    const baseHalf=5.4;
    const topHalf=1.7;

    const footingMaterial=
      new THREE.MeshStandardMaterial({
        color:0x7e807a,
        roughness:.96
      });

    const corners=[
      [-1,-1],
      [ 1,-1],
      [ 1, 1],
      [-1, 1]
    ];

    corners.forEach(
      corner=>{
        const footing=
          new THREE.Mesh(
            new THREE.BoxGeometry(
              2.2,
              .9,
              2.2
            ),
            footingMaterial
          );

        footing.position.set(
          corner[0]*baseHalf,
          .45,
          corner[1]*baseHalf
        );

        footing.castShadow=true;
        footing.receiveShadow=true;

        tower.add(
          footing
        );

        tower.add(
          makeBeam(
            corner[0]*baseHalf,
            .8,
            corner[1]*baseHalf,

            corner[0]*topHalf,
            height,
            corner[1]*topHalf,

            .34
          )
        );
      }
    );

    const levels=[
      6,
      12,
      18,
      24,
      30,
      36,
      42
    ];

    levels.forEach(
      (level,index)=>{
        const t=
          level/
          height;

        const half=
          THREE.MathUtils.lerp(
            baseHalf,
            topHalf,
            t
          );

        [
          [-half,-half, half,-half],
          [ half,-half, half, half],
          [ half, half,-half, half],
          [-half, half,-half,-half]
        ].forEach(
          edge=>{
            tower.add(
              makeBeam(
                edge[0],
                level,
                edge[1],
                edge[2],
                level,
                edge[3],
                .17
              )
            );
          }
        );

        if(index<levels.length-1){
          const next=
            levels[index+1];

          const nt=
            next/
            height;

          const nextHalf=
            THREE.MathUtils.lerp(
              baseHalf,
              topHalf,
              nt
            );

          const facePairs=[
            [
              [-half,-half],
              [ half,-half],
              [-nextHalf,-nextHalf],
              [ nextHalf,-nextHalf]
            ],
            [
              [half,-half],
              [half, half],
              [nextHalf,-nextHalf],
              [nextHalf, nextHalf]
            ],
            [
              [half,half],
              [-half,half],
              [nextHalf,nextHalf],
              [-nextHalf,nextHalf]
            ],
            [
              [-half,half],
              [-half,-half],
              [-nextHalf,nextHalf],
              [-nextHalf,-nextHalf]
            ]
          ];

          facePairs.forEach(
            face=>{
              tower.add(
                makeBeam(
                  face[0][0],
                  level,
                  face[0][1],
                  face[3][0],
                  next,
                  face[3][1],
                  .12,
                  darkSteelMaterial
                )
              );

              tower.add(
                makeBeam(
                  face[1][0],
                  level,
                  face[1][1],
                  face[2][0],
                  next,
                  face[2][1],
                  .12,
                  darkSteelMaterial
                )
              );
            }
          );
        }
      }
    );

    const deck=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          7.2,
          .55,
          7.2
        ),
        platformMaterial
      );

    deck.position.y=36.3;
    deck.castShadow=true;
    deck.receiveShadow=true;

    tower.add(
      deck
    );

    const mast=
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          .17,
          .26,
          14,
          7
        ),
        steelMaterial
      );

    mast.position.y=51.5;
    mast.castShadow=true;

    tower.add(
      mast
    );

    const panelMaterial=
      new THREE.MeshStandardMaterial({
        color:0xb2b09d,
        roughness:.70,
        metalness:.08
      });

    [-1.35,1.35].forEach(
      x=>{
        const panel=
          new THREE.Mesh(
            new THREE.BoxGeometry(
              1.0,
              4.8,
              .28
            ),
            panelMaterial
          );

        panel.position.set(
          x,
          47,
          0
        );

        panel.castShadow=true;

        tower.add(
          panel
        );
      }
    );

    const dish=
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          1.65,
          .45,
          .55,
          18
        ),
        panelMaterial
      );

    dish.rotation.z=
      Math.PI*.5;

    dish.position.set(
      0,
      39.5,
      2.4
    );

    dish.castShadow=true;

    tower.add(
      dish
    );

    return tower;
  }

  TOWER_REFERENCE_POINTS.forEach(
    point=>{
      const tower=
        createTower();

      const placement=
        placeRigidMapObject({
          object:tower,
          mapX:point.x,
          mapY:point.y,
          width:13,
          depth:13,
          terrainHeight,
          clearance:.12,
          samples:5
        });

      addTerrainFoundation({
        THREE,
        object:tower,
        width:13,
        depth:13,
        terrainRange:placement.terrain.range,
        material:platformMaterial,
        extraDepth:.55
      });

      tower.userData.mapCoordinate={
        x:point.x,
        y:point.y,
        id:point.id
      };

      group.add(
        tower
      );
    }
  );

  return {
    group,
    towerCount:
      TOWER_REFERENCE_POINTS.length
  };
}
