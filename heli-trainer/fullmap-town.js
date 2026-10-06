import {
  FULLMAP_POIS,
  FULLMAP_RIVER_PATH,
  FULLMAP_ROAD_PATHS
} from './map-data.js?v=73';

import {
  mapPointToWorld
} from './factions.js?v=73';

import {
  placeRigidMapObject,
  addTerrainFoundation
} from './terrain-placement.js?v=73';

export function createFullMapTownLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiFullMapTown';

  scene.add(group);

  const poi=
    Object.fromEntries(
      FULLMAP_POIS.map(
        item=>[
          item.id,
          item
        ]
      )
    );

  const materials={
    asphalt:new THREE.MeshStandardMaterial({
      color:0x53544f,
      roughness:1
    }),

    roadEdge:new THREE.MeshStandardMaterial({
      color:0x7b7568,
      roughness:1
    }),

    concrete:new THREE.MeshStandardMaterial({
      color:0x8a8982,
      roughness:.97
    }),

    concreteDark:new THREE.MeshStandardMaterial({
      color:0x60625e,
      roughness:.97
    }),

    plaster:new THREE.MeshStandardMaterial({
      color:0xa5a094,
      roughness:.96
    }),

    plasterDark:new THREE.MeshStandardMaterial({
      color:0x858780,
      roughness:.96
    }),

    roof:new THREE.MeshStandardMaterial({
      color:0x565650,
      roughness:.91
    }),

    roofRust:new THREE.MeshStandardMaterial({
      color:0x735b4d,
      roughness:.93
    }),

    glass:new THREE.MeshStandardMaterial({
      color:0x5f7375,
      roughness:.34
    }),

    timber:new THREE.MeshStandardMaterial({
      color:0x71573d,
      roughness:1
    }),

    water:new THREE.MeshStandardMaterial({
      color:0x385c5b,
      roughness:.32,
      transparent:true,
      opacity:.86,
      depthWrite:false
    }),

    pool:new THREE.MeshStandardMaterial({
      color:0x4f8188,
      roughness:.25,
      transparent:true,
      opacity:.92
    }),

    grass:new THREE.MeshStandardMaterial({
      color:0x536f40,
      roughness:1
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
    w,
    d,
    h,
    material
  ){
    const hw=w*.5;
    const hd=d*.5;

    const vertices=
      new Float32Array([
        -hw,0,-hd,
         hw,0,-hd,
         hw,0, hd,
        -hw,0, hd,
        0,h,-hd,
        0,h, hd
      ]);

    const indices=[
      0,1,4,
      3,5,2,
      0,4,5,
      0,5,3,
      1,2,5,
      1,5,4
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

  function placeRigid(
    object,
    point,
    width,
    depth,
    yaw=0
  ){
    const placement=
      placeRigidMapObject({
        object,
        mapX:point.x,
        mapY:point.y,
        width,
        depth,
        yaw,
        terrainHeight,
        clearance:.18,
        samples:5
      });

    addTerrainFoundation({
      THREE,
      object,
      width,
      depth,
      terrainRange:
        placement.terrain.range,
      material:
        materials.concreteDark,
      extraDepth:.5
    });

    group.add(object);

    return object;
  }

  function buildRibbon(
    mapPath,
    width,
    material,
    yOffset=.32
  ){
    const points=
      mapPath.map(
        item=>{
          const world=
            mapPointToWorld(
              item[0],
              item[1]
            );

          return {
            x:world.x,
            z:world.z
          };
        }
      );

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

        const length=
          Math.hypot(
            tx,
            tz
          ) || 1;

        tx/=length;
        tz/=length;

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

        vertices.push(
          leftX,
          terrainHeight(
            leftX,
            leftZ
          )+
          yOffset,
          leftZ,

          rightX,
          terrainHeight(
            rightX,
            rightZ
          )+
          yOffset,
          rightZ
        );

        if(
          index<
          points.length-1
        ){
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

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh=
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.receiveShadow=true;
    mesh.renderOrder=3;

    group.add(mesh);

    return mesh;
  }

  // ----------------------------------------------------------
  // Full-map central river + primary road corridors.
  // ----------------------------------------------------------
  buildRibbon(
    FULLMAP_RIVER_PATH,
    24,
    materials.water,
    .12
  );

  FULLMAP_ROAD_PATHS.forEach(
    path=>{
      buildRibbon(
        path,
        17,
        materials.roadEdge,
        .22
      );

      buildRibbon(
        path,
        12,
        materials.asphalt,
        .32
      );
    }
  );

  // ----------------------------------------------------------
  // Central road bridge.
  // ----------------------------------------------------------
  {
    const bridge=
      new THREE.Group();

    const deck=
      box(
        42,
        1.2,
        10,
        materials.concrete
      );

    deck.position.y=1.35;
    bridge.add(deck);

    [-21,21].forEach(
      x=>{
        const abutment=
          box(
            4.2,
            4.0,
            13,
            materials.concreteDark
          );

        abutment.position.set(
          x,
          -.25,
          0
        );

        bridge.add(abutment);
      }
    );

    [-4.6,4.6].forEach(
      z=>{
        const rail=
          box(
            42,
            .75,
            .3,
            materials.plaster
          );

        rail.position.set(
          0,
          2.25,
          z
        );

        bridge.add(rail);
      }
    );

    placeRigid(
      bridge,
      poi.central_bridge,
      46,
      15,
      .07
    );
  }

  // ----------------------------------------------------------
  // Apartments + apartment garages.
  // ----------------------------------------------------------
  {
    const apartments=
      new THREE.Group();

    [
      [-25,-8,34,16,16],
      [ 11, 5,38,17,18],
      [ 37,-13,29,15,14]
    ].forEach(
      (cfg,index)=>{
        const body=
          box(
            cfg[2],
            cfg[4],
            cfg[3],
            index===1
              ? materials.plaster
              : materials.plasterDark
          );

        body.position.set(
          cfg[0],
          cfg[4]*.5,
          cfg[1]
        );

        apartments.add(body);

        const roof=
          box(
            cfg[2]+1,
            .6,
            cfg[3]+1,
            materials.roof
          );

        roof.position.set(
          cfg[0],
          cfg[4]+.3,
          cfg[1]
        );

        apartments.add(roof);

        for(let floor=1;floor<=3;floor++){
          const band=
            box(
              cfg[2]*.84,
              .4,
              .32,
              materials.glass
            );

          band.position.set(
            cfg[0],
            floor*3.5,
            cfg[1]-
            cfg[3]*.5-
            .18
          );

          apartments.add(band);
        }
      }
    );

    placeRigid(
      apartments,
      poi.apartments,
      96,
      58,
      .10
    );

    const garages=
      new THREE.Group();

    for(let i=0;i<8;i++){
      const cell=
        box(
          7.4,
          4.0,
          7.8,
          materials.concreteDark
        );

      cell.position.set(
        (
          i-
          3.5
        )*
        7.7,
        2.0,
        0
      );

      garages.add(cell);

      const door=
        box(
          5.2,
          2.5,
          .25,
          materials.roof
        );

      door.position.set(
        cell.position.x,
        1.65,
        -4.02
      );

      garages.add(door);
    }

    placeRigid(
      garages,
      poi.apartment_garages,
      68,
      18,
      .04
    );
  }

  // ----------------------------------------------------------
  // Two shop rows.
  // ----------------------------------------------------------
  function createShops(
    point,
    yaw
  ){
    const root=
      new THREE.Group();

    const body=
      box(
        54,
        7.5,
        14,
        materials.plaster
      );

    body.position.y=3.75;
    root.add(body);

    const roof=
      box(
        56,
        .65,
        16,
        materials.roof
      );

    roof.position.y=7.82;
    root.add(roof);

    for(let i=0;i<6;i++){
      const glass=
        box(
          6.3,
          2.7,
          .25,
          materials.glass
        );

      glass.position.set(
        -22+
        i*8.8,
        2.5,
        -7.12
      );

      root.add(glass);

      const awning=
        box(
          7.4,
          .32,
          2.5,
          i%2
            ? materials.roofRust
            : materials.roof
        );

      awning.position.set(
        -22+
        i*8.8,
        4.65,
        -8.0
      );

      root.add(awning);
    }

    placeRigid(
      root,
      point,
      60,
      20,
      yaw
    );
  }

  createShops(
    poi.shops_1,
    .02
  );

  createShops(
    poi.shops_2,
    -.16
  );

  // ----------------------------------------------------------
  // Pool.
  // ----------------------------------------------------------
  {
    const root=
      new THREE.Group();

    const deck=
      box(
        50,
        .45,
        34,
        materials.concrete
      );

    deck.position.y=.225;
    root.add(deck);

    const water=
      box(
        36,
        .10,
        18,
        materials.pool
      );

    water.position.y=.50;
    root.add(water);

    const service=
      box(
        22,
        5,
        9,
        materials.plaster
      );

    service.position.set(
      7,
      2.7,
      21
    );

    root.add(service);

    const serviceRoof=
      gableRoof(
        24,
        11,
        2.4,
        materials.roof
      );

    serviceRoof.position.set(
      7,
      5.2,
      21
    );

    root.add(serviceRoof);

    placeRigid(
      root,
      poi.pool,
      58,
      48,
      .05
    );
  }

  // ----------------------------------------------------------
  // Lumberyard.
  // ----------------------------------------------------------
  {
    const root=
      new THREE.Group();

    const yard=
      box(
        96,
        .40,
        64,
        materials.concrete
      );

    yard.position.y=.2;
    root.add(yard);

    const shed=
      box(
        57,
        8,
        20,
        materials.concreteDark
      );

    shed.position.set(
      10,
      4.2,
      -11
    );

    root.add(shed);

    const shedRoof=
      gableRoof(
        61,
        24,
        4.2,
        materials.roofRust
      );

    shedRoof.position.set(
      10,
      8.2,
      -11
    );

    root.add(shedRoof);

    for(let row=0;row<4;row++){
      for(let col=0;col<5;col++){
        const stack=
          box(
            10,
            2.2,
            2.7,
            materials.timber
          );

        stack.position.set(
          -34+
          col*14,
          1.45,
          15+
          row*6.5
        );

        root.add(stack);
      }
    }

    placeRigid(
      root,
      poi.lumberyard,
      105,
      72,
      1.52
    );
  }

  // ----------------------------------------------------------
  // Industrial sector.
  // ----------------------------------------------------------
  {
    const root=
      new THREE.Group();

    const yard=
      box(
        112,
        .40,
        82,
        materials.concrete
      );

    yard.position.y=.2;
    root.add(yard);

    const hall=
      box(
        69,
        10,
        26,
        materials.concreteDark
      );

    hall.position.set(
      8,
      5.2,
      -10
    );

    root.add(hall);

    const hallRoof=
      gableRoof(
        73,
        30,
        5.0,
        materials.roof
      );

    hallRoof.position.set(
      8,
      10.2,
      -10
    );

    root.add(hallRoof);

    [-31,-16].forEach(
      x=>{
        const tank=
          cylinder(
            6.2,
            13,
            materials.concrete,
            18
          );

        tank.position.set(
          x,
          6.7,
          23
        );

        root.add(tank);
      }
    );

    placeRigid(
      root,
      poi.industrial_1,
      120,
      90,
      .28
    );
  }

  // ----------------------------------------------------------
  // Residential 1–9.
  // Each POI is a block anchor; models are placed around that block,
  // not randomly across the map.
  // ----------------------------------------------------------
  function createHouse(
    width,
    depth,
    floors,
    roofVariant=0
  ){
    const root=
      new THREE.Group();

    const height=
      floors*
      3.1+
      .6;

    const body=
      box(
        width,
        height,
        depth,
        roofVariant%2
          ? materials.plasterDark
          : materials.plaster
      );

    body.position.y=
      height*.5;

    root.add(body);

    const roof=
      gableRoof(
        width+1,
        depth+1,
        2.8,
        roofVariant%2
          ? materials.roofRust
          : materials.roof
      );

    roof.position.y=
      height;

    root.add(roof);

    const frontGlass=
      box(
        width*.42,
        1.2,
        .20,
        materials.glass
      );

    frontGlass.position.set(
      0,
      Math.min(
        3.0,
        height*.5
      ),
      -depth*.5-.11
    );

    root.add(frontGlass);

    return root;
  }

  for(let blockIndex=1;blockIndex<=9;blockIndex++){
    const point=
      poi[
        'residential_'+
        blockIndex
      ];

    const world=
      mapPointToWorld(
        point.x,
        point.y
      );

    const offsets=[
      [-28,-17,.08],
      [ -5,-20,-.16],
      [ 24,-12,.14],
      [-22, 18,-.10],
      [  8, 19,.06]
    ];

    offsets.forEach(
      (offset,index)=>{
        const localMapX=
          point.x+
          offset[0];

        const localMapY=
          point.y+
          offset[1];

        const localPoint={
          x:localMapX,
          y:localMapY
        };

        const house=
          createHouse(
            15+
            (
              (
                blockIndex+
                index
              )%
              3
            )*
            2,
            11+
            (
              index%
              2
            )*
            2,
            1+
            (
              (
                blockIndex+
                index
              )%
              2
            ),
            blockIndex+
            index
          );

        placeRigid(
          house,
          localPoint,
          22,
          18,
          offset[2]+
          blockIndex*.025
        );
      }
    );
  }

  // ----------------------------------------------------------
  // Hillside church terraces + church top.
  // The six POIs form the stepped hillside around the church.
  // ----------------------------------------------------------
  {
    const churchTerraces=
      [
        poi.hillside_church_1,
        poi.hillside_church_2,
        poi.hillside_church_3,
        poi.hillside_church_4,
        poi.hillside_church_5,
        poi.hillside_church_6
      ];

    churchTerraces.forEach(
      (point,index)=>{
        const terrace=
          new THREE.Group();

        const slab=
          box(
            54-
            index*2.5,
            1.2,
            34-
            index*1.2,
            index%2
              ? materials.concrete
              : materials.concreteDark
          );

        slab.position.y=.6;
        terrace.add(slab);

        const retaining=
          box(
            58-
            index*2.0,
            3.5,
            1.4,
            materials.concreteDark
          );

        retaining.position.set(
          0,
          -1.15,
          -17+
          index*.6
        );

        terrace.add(retaining);

        placeRigid(
          terrace,
          point,
          62,
          40,
          (
            index-
            2.5
          )*.035
        );
      }
    );

    const church=
      new THREE.Group();

    const platform=
      box(
        54,
        1.0,
        38,
        materials.concreteDark
      );

    platform.position.y=.5;
    church.add(platform);

    const nave=
      box(
        32,
        10,
        15,
        materials.plaster
      );

    nave.position.set(
      3,
      6,
      0
    );

    church.add(nave);

    const naveRoof=
      gableRoof(
        35,
        18,
        5.5,
        materials.roof
      );

    naveRoof.position.set(
      3,
      11,
      0
    );

    church.add(naveRoof);

    const tower=
      box(
        9,
        18,
        9,
        materials.plaster
      );

    tower.position.set(
      -17,
      10,
      0
    );

    church.add(tower);

    const spire=
      new THREE.Mesh(
        new THREE.ConeGeometry(
          5.2,
          12,
          5
        ),
        materials.roof
      );

    spire.position.set(
      -17,
      25,
      0
    );

    spire.castShadow=true;
    church.add(spire);

    placeRigid(
      church,
      poi.church_top,
      62,
      46,
      .18
    );
  }

  // ----------------------------------------------------------
  // Stadium support zones: parking, front plaza, garages.
  // Stadium itself is created by stadium.js at its calibrated full-map POI.
  // ----------------------------------------------------------
  {
    const parking=
      new THREE.Group();

    const lot=
      box(
        142,
        .32,
        96,
        materials.asphalt
      );

    lot.position.y=.16;
    parking.add(lot);

    for(let i=0;i<7;i++){
      const stripe=
        box(
          .22,
          .02,
          76,
          materials.concrete
        );

      stripe.position.set(
        -51+
        i*17,
        .34,
        0
      );

      stripe.castShadow=false;
      parking.add(stripe);
    }

    placeRigid(
      parking,
      poi.stadium_parking,
      150,
      104,
      .03
    );

    const front=
      new THREE.Group();

    const plaza=
      box(
        84,
        .4,
        48,
        materials.concrete
      );

    plaza.position.y=.2;
    front.add(plaza);

    placeRigid(
      front,
      poi.stadium_front,
      90,
      54,
      .03
    );

    const garages=
      new THREE.Group();

    for(let i=0;i<7;i++){
      const cell=
        box(
          8.5,
          4.2,
          9,
          materials.concreteDark
        );

      cell.position.set(
        (
          i-
          3
        )*
        8.8,
        2.1,
        0
      );

      garages.add(cell);

      const door=
        box(
          6.0,
          2.7,
          .28,
          materials.roof
        );

      door.position.set(
        cell.position.x,
        1.7,
        -4.65
      );

      garages.add(door);
    }

    placeRigid(
      garages,
      poi.stadium_garages,
      68,
      22,
      .04
    );
  }

  return {
    group,
    poiCount:
      FULLMAP_POIS.length,
    roadCount:
      FULLMAP_ROAD_PATHS.length,
    residentialBlockCount:9
  };
}
