import {
  TOWER_REFERENCE_POINTS
} from './map-data.js';

import {
  mapPointToWorld
} from './factions.js';

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

    const height=44;
    const baseHalf=5.0;
    const topHalf=1.6;

    const corners=[
      [-1,-1],
      [ 1,-1],
      [ 1, 1],
      [-1, 1]
    ];

    corners.forEach(
      corner=>{
        tower.add(
          makeBeam(
            corner[0]*baseHalf,
            0,
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
      7,
      14,
      21,
      28,
      35,
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

        // horizontal frame
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
                .18
              )
            );
          }
        );

        // diagonal bracing on all 4 faces.
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

          tower.add(
            makeBeam(
              -half,
              level,
              -half,
               nextHalf,
              next,
              -nextHalf,
              .13,
              darkSteelMaterial
            )
          );

          tower.add(
            makeBeam(
               half,
              level,
               half,
              -nextHalf,
              next,
               nextHalf,
              .13,
              darkSteelMaterial
            )
          );

          tower.add(
            makeBeam(
              -half,
              level,
               half,
               nextHalf,
              next,
               nextHalf,
              .13,
              darkSteelMaterial
            )
          );

          tower.add(
            makeBeam(
               half,
              level,
              -half,
              -nextHalf,
              next,
              -nextHalf,
              .13,
              darkSteelMaterial
            )
          );
        }
      }
    );

    const deck=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          6.2,
          .55,
          6.2
        ),
        platformMaterial
      );

    deck.position.y=35.4;
    deck.castShadow=true;
    deck.receiveShadow=true;
    tower.add(deck);

    const mast=
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          .18,
          .28,
          13,
          7
        ),
        steelMaterial
      );

    mast.position.y=50.5;
    mast.castShadow=true;
    tower.add(mast);

    // Two simple antenna panels.
    [-1,1].forEach(
      side=>{
        const panel=
          new THREE.Mesh(
            new THREE.BoxGeometry(
              1.1,
              4.8,
              .28
            ),
            new THREE.MeshStandardMaterial({
              color:0xaaa997,
              roughness:.68,
              metalness:.08
            })
          );

        panel.position.set(
          side*1.25,
          47,
          0
        );

        panel.castShadow=true;
        tower.add(panel);
      }
    );

    return tower;
  }

  TOWER_REFERENCE_POINTS.forEach(
    point=>{
      const world=
        mapPointToWorld(
          point.x,
          point.y
        );

      const ground=
        terrainHeight(
          world.x,
          world.z
        );

      const tower=
        createTower();

      tower.position.set(
        world.x,
        ground,
        world.z
      );

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
