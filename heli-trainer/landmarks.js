import {
  LANDMARK_REFERENCE_POINTS,
  CROSSING_REFERENCE_POINTS,
  RIVER_REFERENCE_PATH
} from './map-data.js';

import {
  mapPointToWorld
} from './factions.js';

export function createLandmarkReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiLandmarkReference';

  scene.add(group);

  const materials={
    concrete:new THREE.MeshStandardMaterial({
      color:0x77776f,
      roughness:.96
    }),

    asphalt:new THREE.MeshStandardMaterial({
      color:0x545650,
      roughness:.98
    }),

    paleStone:new THREE.MeshStandardMaterial({
      color:0xa6a08f,
      roughness:.95
    }),

    darkStone:new THREE.MeshStandardMaterial({
      color:0x68675f,
      roughness:.94
    }),

    roof:new THREE.MeshStandardMaterial({
      color:0x5a5b56,
      roughness:.90
    }),

    roofLight:new THREE.MeshStandardMaterial({
      color:0x777268,
      roughness:.90
    }),

    timber:new THREE.MeshStandardMaterial({
      color:0x6f5439,
      roughness:1
    }),

    field:new THREE.MeshStandardMaterial({
      color:0x596f3f,
      roughness:1
    }),

    water:new THREE.MeshStandardMaterial({
      color:0x36564f,
      roughness:.40,
      metalness:0,
      transparent:true,
      opacity:.88,
      depthWrite:false
    }),

    glass:new THREE.MeshStandardMaterial({
      color:0x6f8f91,
      roughness:.30,
      metalness:.05
    })
  };

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

  function cylinder(
    radius,
    height,
    material,
    segments=10
  ){
    const mesh=
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius,
          radius,
          height,
          segments
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
      -hw,0,-hd,  hw,0,-hd,  hw,0, hd, -hw,0, hd,
       0,h,-hd,   0,h, hd
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

  function placeAtMap(
    object,
    x,
    y,
    yaw=0
  ){
    const world=
      mapPointToWorld(
        x,
        y
      );

    const ground=
      terrainHeight(
        world.x,
        world.z
      );

    object.position.set(
      world.x,
      ground,
      world.z
    );

    object.rotation.y=yaw;

    group.add(
      object
    );

    return object;
  }

  function createStadium(){
    const root=
      new THREE.Group();

    const parking=
      box(
        152,
        .32,
        92,
        materials.asphalt
      );

    parking.position.set(
      -18,
      .16,
      72
    );

    root.add(
      parking
    );

    const field=
      box(
        105,
        .18,
        68,
        materials.field
      );

    field.position.y=.32;

    root.add(
      field
    );

    // White football pitch markings.
    const lineMaterial=
      new THREE.MeshBasicMaterial({
        color:0xd5d6ca,
        transparent:true,
        opacity:.72,
        depthWrite:false
      });

    [
      [0,.46,-34,105,.16,.40],
      [0,.46, 34,105,.16,.40],
      [-52.5,.46,0,.40,.16,68],
      [ 52.5,.46,0,.40,.16,68],
      [0,.46,0,.40,.16,68]
    ].forEach(
      item=>{
        const line=
          box(
            item[3],
            item[4],
            item[5],
            lineMaterial
          );

        line.position.set(
          item[0],
          item[1],
          item[2]
        );

        root.add(
          line
        );
      }
    );

    const standMaterial=
      materials.paleStone;

    [
      [0,5.0,-44,112,9,14],
      [0,5.0, 44,112,9,14]
    ].forEach(
      p=>{
        const stand=
          box(
            p[3],
            p[4],
            p[5],
            standMaterial
          );

        stand.position.set(
          p[0],
          p[1],
          p[2]
        );

        root.add(
          stand
        );

        const roof=
          box(
            p[3]+5,
            .55,
            p[5]+4,
            materials.roof
          );

        roof.position.set(
          p[0],
          9.85,
          p[2]
        );

        root.add(
          roof
        );
      }
    );

    [
      [-60,4.0,0,12,7,65],
      [ 60,4.0,0,12,7,65]
    ].forEach(
      p=>{
        const endStand=
          box(
            p[3],
            p[4],
            p[5],
            standMaterial
          );

        endStand.position.set(
          p[0],
          p[1],
          p[2]
        );

        root.add(
          endStand
        );
      }
    );

    // Four stadium light poles.
    [
      [-64,-45],
      [ 64,-45],
      [-64, 45],
      [ 64, 45]
    ].forEach(
      p=>{
        const pole=
          cylinder(
            .34,
            23,
            materials.darkStone,
            8
          );

        pole.position.set(
          p[0],
          11.5,
          p[1]
        );

        root.add(
          pole
        );

        const lamps=
          box(
            4.5,
            1.1,
            1.0,
            materials.glass
          );

        lamps.position.set(
          p[0],
          23.2,
          p[1]
        );

        root.add(
          lamps
        );
      }
    );

    return root;
  }

  function createPool(){
    const root=
      new THREE.Group();

    const deck=
      box(
        48,
        .30,
        31,
        materials.concrete
      );

    deck.position.y=.15;

    root.add(
      deck
    );

    const water=
      box(
        36,
        .12,
        18,
        materials.water
      );

    water.position.y=.38;

    root.add(
      water
    );

    const service=
      box(
        22,
        5.0,
        8.5,
        materials.paleStone
      );

    service.position.set(
      5,
      2.8,
      20
    );

    root.add(
      service
    );

    const roof=
      gableRoof(
        24,
        10,
        2.4,
        materials.roofLight
      );

    roof.position.set(
      5,
      5.3,
      20
    );

    root.add(
      roof
    );

    return root;
  }

  function createChurch(){
    const root=
      new THREE.Group();

    const terrace=
      box(
        50,
        1.1,
        35,
        materials.darkStone
      );

    terrace.position.y=.55;

    root.add(
      terrace
    );

    const nave=
      box(
        30,
        9.5,
        14,
        materials.paleStone
      );

    nave.position.set(
      2,
      5.85,
      0
    );

    root.add(
      nave
    );

    const naveRoof=
      gableRoof(
        33,
        17,
        5.0,
        materials.roof
      );

    naveRoof.position.set(
      2,
      10.6,
      0
    );

    root.add(
      naveRoof
    );

    const tower=
      box(
        8.5,
        17,
        8.5,
        materials.paleStone
      );

    tower.position.set(
      -16,
      9.6,
      0
    );

    root.add(
      tower
    );

    const spire=
      new THREE.Mesh(
        new THREE.ConeGeometry(
          5.2,
          11,
          5
        ),
        materials.roof
      );

    spire.position.set(
      -16,
      23.6,
      0
    );

    spire.castShadow=true;

    root.add(
      spire
    );

    return root;
  }

  function createLumberyard(){
    const root=
      new THREE.Group();

    const yard=
      box(
        95,
        .32,
        64,
        materials.concrete
      );

    yard.position.y=.16;

    root.add(
      yard
    );

    const shed=
      box(
        54,
        7.5,
        18,
        materials.darkStone
      );

    shed.position.set(
      8,
      4.05,
      -11
    );

    root.add(
      shed
    );

    const roof=
      gableRoof(
        58,
        22,
        4.0,
        materials.roofLight
      );

    roof.position.set(
      8,
      7.8,
      -11
    );

    root.add(
      roof
    );

    // Stacked timber bundles.
    for(let row=0;row<4;row++){
      for(let col=0;col<5;col++){
        const stack=
          box(
            10,
            2.3,
            2.5,
            materials.timber
          );

        stack.position.set(
          -33+
          col*14,
          1.5,
          16+
          row*6.2
        );

        root.add(
          stack
        );
      }
    }

    return root;
  }

  function createApartments(){
    const root=
      new THREE.Group();

    [
      [-26,0,34,15,15],
      [ 12,5,38,16,17],
      [ 38,-15,28,14,14]
    ].forEach(
      (p,index)=>{
        const block=
          box(
            p[2],
            p[4],
            p[3],
            index===1
              ? materials.paleStone
              : materials.darkStone
          );

        block.position.set(
          p[0],
          p[4]*.5,
          p[1]
        );

        root.add(
          block
        );

        const roof=
          box(
            p[2]+1.2,
            .65,
            p[3]+1.2,
            materials.roof
          );

        roof.position.set(
          p[0],
          p[4]+.35,
          p[1]
        );

        root.add(
          roof
        );

        // Balcony bands help the blocks read as apartments from the air.
        for(let floor=1;floor<4;floor++){
          const band=
            box(
              p[2]*.92,
              .34,
              .75,
              materials.roofLight
            );

          band.position.set(
            p[0],
            floor*3.4,
            p[1]-
            p[3]*.5-
            .35
          );

          root.add(
            band
          );
        }
      }
    );

    return root;
  }

  function createGarageRow(
    count=6
  ){
    const root=
      new THREE.Group();

    for(let i=0;i<count;i++){
      const unit=
        box(
          7.2,
          3.8,
          7.6,
          materials.darkStone
        );

      unit.position.set(
        (
          i-
          (count-1)*.5
        )*
        7.6,
        1.9,
        0
      );

      root.add(
        unit
      );

      const door=
        box(
          5.1,
          2.5,
          .25,
          materials.roofLight
        );

      door.position.set(
        unit.position.x,
        1.65,
        -3.93
      );

      root.add(
        door
      );
    }

    return root;
  }

  function createShops(){
    const root=
      new THREE.Group();

    const body=
      box(
        50,
        7.2,
        13,
        materials.paleStone
      );

    body.position.y=3.6;

    root.add(
      body
    );

    const roof=
      box(
        52,
        .55,
        15,
        materials.roof
      );

    roof.position.y=7.48;

    root.add(
      roof
    );

    for(let i=0;i<5;i++){
      const awning=
        box(
          8.2,
          .32,
          2.8,
          i%2
            ? materials.roofLight
            : materials.darkStone
        );

      awning.position.set(
        -20+
        i*10,
        4.5,
        -7.6
      );

      root.add(
        awning
      );

      const glass=
        box(
          6.2,
          2.6,
          .22,
          materials.glass
        );

      glass.position.set(
        -20+
        i*10,
        2.4,
        -6.62
      );

      root.add(
        glass
      );
    }

    return root;
  }

  function createIndustrial(){
    const root=
      new THREE.Group();

    const yard=
      box(
        105,
        .35,
        76,
        materials.concrete
      );

    yard.position.y=.175;

    root.add(
      yard
    );

    const hall=
      box(
        65,
        9,
        24,
        materials.darkStone
      );

    hall.position.set(
      7,
      4.7,
      -8
    );

    root.add(
      hall
    );

    const hallRoof=
      gableRoof(
        69,
        28,
        5,
        materials.roofLight
      );

    hallRoof.position.set(
      7,
      9.2,
      -8
    );

    root.add(
      hallRoof
    );

    [-32,-19].forEach(
      x=>{
        const tank=
          cylinder(
            6,
            12,
            materials.darkStone,
            18
          );

        tank.position.set(
          x,
          6.2,
          22
        );

        root.add(
          tank
        );
      }
    );

    return root;
  }

  function createRiver(){
    const points=
      RIVER_REFERENCE_PATH.map(
        point=>{
          const world=
            mapPointToWorld(
              point[0],
              point[1]
            );

          return {
            x:world.x,
            z:world.z
          };
        }
      );

    const width=25;
    const vertices=[];
    const indices=[];

    points.forEach(
      (point,index)=>{
        const prev=
          points[
            Math.max(
              0,
              index-1
            )
          ];

        const next=
          points[
            Math.min(
              points.length-1,
              index+1
            )
          ];

        let tx=
          next.x-
          prev.x;

        let tz=
          next.z-
          prev.z;

        const len=
          Math.hypot(
            tx,
            tz
          ) || 1;

        tx/=len;
        tz/=len;

        const nx=-tz;
        const nz=tx;

        const leftX=
          point.x+
          nx*
          width*.5;

        const leftZ=
          point.z+
          nz*
          width*.5;

        const rightX=
          point.x-
          nx*
          width*.5;

        const rightZ=
          point.z-
          nz*
          width*.5;

        const y=
          Math.min(
            terrainHeight(
              leftX,
              leftZ
            ),
            terrainHeight(
              rightX,
              rightZ
            )
          )+
          .16;

        vertices.push(
          leftX,y,leftZ,
          rightX,y,rightZ
        );

        if(index<points.length-1){
          const a=index*2;
          const b=a+1;
          const c=a+2;
          const d=a+3;

          indices.push(
            a,b,c,
            b,d,c
          );
        }
      }
    );

    const geometry=
      new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        vertices,
        3
      )
    );

    geometry.setIndex(
      indices
    );

    geometry.computeVertexNormals();

    const river=
      new THREE.Mesh(
        geometry,
        materials.water
      );

    river.renderOrder=2;

    group.add(
      river
    );
  }

  function createCrossings(){
    CROSSING_REFERENCE_POINTS.forEach(
      crossing=>{
        const world=
          mapPointToWorld(
            crossing.x,
            crossing.y
          );

        const ground=
          terrainHeight(
            world.x,
            world.z
          );

        if(
          crossing.id===
          'central_bridge'
        ){
          const root=
            new THREE.Group();

          const deck=
            box(
              46,
              1.1,
              9.5,
              materials.concrete
            );

          deck.position.y=1.45;

          root.add(
            deck
          );

          [-23,23].forEach(
            x=>{
              const abutment=
                box(
                  4.0,
                  3.5,
                  12.5,
                  materials.darkStone
                );

              abutment.position.set(
                x,
                -.2,
                0
              );

              root.add(
                abutment
              );
            }
          );

          [-4.6,4.6].forEach(
            z=>{
              const rail=
                box(
                  46,
                  .65,
                  .28,
                  materials.roofLight
                );

              rail.position.set(
                0,
                2.3,
                z
              );

              root.add(
                rail
              );
            }
          );

          root.position.set(
            world.x,
            ground+.1,
            world.z
          );

          root.rotation.y=
            crossing.angle;

          group.add(
            root
          );
        }

        if(
          crossing.id===
          'north_ford'
        ){
          const gravel=
            box(
              34,
              .18,
              18,
              new THREE.MeshStandardMaterial({
                color:0x8a8066,
                roughness:1
              })
            );

          gravel.position.set(
            world.x,
            ground+.12,
            world.z
          );

          gravel.rotation.y=
            crossing.angle;

          group.add(
            gravel
          );
        }

        if(
          crossing.id===
          'south_culvert'
        ){
          const slab=
            box(
              28,
              .9,
              7,
              materials.concrete
            );

          slab.position.set(
            world.x,
            ground+.7,
            world.z
          );

          slab.rotation.y=
            crossing.angle;

          group.add(
            slab
          );
        }
      }
    );
  }

  const lookup=
    Object.fromEntries(
      LANDMARK_REFERENCE_POINTS.map(
        item=>[
          item.id,
          item
        ]
      )
    );

  placeAtMap(
    createStadium(),
    lookup.stadium.x,
    lookup.stadium.y,
    .12
  );

  placeAtMap(
    createPool(),
    lookup.pool.x,
    lookup.pool.y,
    .08
  );

  placeAtMap(
    createChurch(),
    lookup.church.x,
    lookup.church.y,
    .24
  );

  placeAtMap(
    createLumberyard(),
    lookup.lumberyard.x,
    lookup.lumberyard.y,
    1.50
  );

  placeAtMap(
    createApartments(),
    lookup.apartments.x,
    lookup.apartments.y,
    .18
  );

  placeAtMap(
    createGarageRow(7),
    lookup.apartment_garages.x,
    lookup.apartment_garages.y,
    .22
  );

  placeAtMap(
    createGarageRow(6),
    lookup.stadium_garages.x,
    lookup.stadium_garages.y,
    .10
  );

  placeAtMap(
    createShops(),
    lookup.shops_1.x,
    lookup.shops_1.y,
    .18
  );

  placeAtMap(
    createShops(),
    lookup.shops_2.x,
    lookup.shops_2.y,
    -.12
  );

  placeAtMap(
    createIndustrial(),
    lookup.industrial.x,
    lookup.industrial.y,
    .30
  );

  createRiver();
  createCrossings();

  return {
    group,
    landmarkCount:
      LANDMARK_REFERENCE_POINTS.length,
    crossingCount:
      CROSSING_REFERENCE_POINTS.length
  };
}
