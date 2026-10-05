import {
  STADIUM_REFERENCE
} from './map-data.js?v=71';

import {
  mapPointToWorld
} from './factions.js?v=71';

export function createStadiumReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'DinamoOzetiStadium';

  scene.add(group);

  const concrete=
    new THREE.MeshStandardMaterial({
      color:0x797a74,
      roughness:.97
    });

  const concreteLight=
    new THREE.MeshStandardMaterial({
      color:0x96958e,
      roughness:.96
    });

  const concreteDark=
    new THREE.MeshStandardMaterial({
      color:0x5d605c,
      roughness:.96
    });

  const roofMaterial=
    new THREE.MeshStandardMaterial({
      color:0x4c504d,
      roughness:.86,
      metalness:.10
    });

  const steel=
    new THREE.MeshStandardMaterial({
      color:0x4b5352,
      roughness:.72,
      metalness:.28
    });

  const glass=
    new THREE.MeshStandardMaterial({
      color:0x52696c,
      roughness:.28,
      metalness:.04
    });

  const fieldMaterial=
    new THREE.MeshStandardMaterial({
      color:0x4d6c3c,
      roughness:1
    });

  const fieldWorn=
    new THREE.MeshStandardMaterial({
      color:0x696547,
      roughness:1
    });

  const asphalt=
    new THREE.MeshStandardMaterial({
      color:0x4d504c,
      roughness:1
    });

  const lineMaterial=
    new THREE.MeshBasicMaterial({
      color:0xd5d5c8,
      transparent:true,
      opacity:.72,
      depthWrite:false
    });

  function box(w,h,d,material){
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

  function floodlight(){
    const root=
      new THREE.Group();

    const pole=
      box(
        1.8,
        31,
        1.8,
        concreteDark
      );

    pole.position.y=15.5;
    root.add(pole);

    for(let row=0;row<3;row++){
      for(let col=0;col<7;col++){
        const lamp=
          box(
            1.12,
            .76,
            .34,
            glass
          );

        lamp.position.set(
          (
            col-3
          )*1.34,
          31.4+
          row*.93,
          0
        );

        root.add(lamp);
      }
    }

    return root;
  }

  function mainStand(){
    const root=
      new THREE.Group();

    const facade=
      box(
        78,
        15,
        18,
        concreteLight
      );

    facade.position.y=7.5;
    root.add(facade);

    const endBlock=
      box(
        17,
        20,
        21,
        concreteLight
      );

    endBlock.position.set(
      -47,
      10,
      -1
    );

    root.add(endBlock);

    const upper=
      box(
        62,
        6.5,
        12,
        concrete
      );

    upper.position.set(
      -4,
      18,
      1
    );

    root.add(upper);

    const canopy=
      box(
        94,
        1.2,
        25,
        roofMaterial
      );

    canopy.position.set(
      3,
      22,
      -6
    );

    root.add(canopy);

    const concourse=
      box(
        91,
        1.0,
        12,
        concreteDark
      );

    concourse.position.set(
      3,
      7.4,
      -14
    );

    root.add(concourse);

    for(let i=0;i<10;i++){
      const column=
        box(
          1.15,
          7.1,
          1.15,
          concreteDark
        );

      column.position.set(
        -39+
        i*8.7,
        3.55,
        -17
      );

      root.add(column);
    }

    for(let floor=0;floor<2;floor++){
      for(let i=0;i<8;i++){
        const window=
          box(
            5.1,
            1.55,
            .24,
            glass
          );

        window.position.set(
          -30+
          i*8.5,
          6.6+
          floor*4.0,
          9.1
        );

        root.add(window);
      }
    }

    // Exterior loading gallery visible in the game stadium reference.
    const gallery=
      box(
        72,
        2.2,
        4.8,
        concreteDark
      );

    gallery.position.set(
      6,
      5.2,
      -20
    );

    root.add(gallery);

    return root;
  }

  function coveredStand(
    length,
    depth,
    tiers
  ){
    const root=
      new THREE.Group();

    for(let tier=0;tier<tiers;tier++){
      const step=
        box(
          length-tier*1.8,
          1.25,
          depth/tiers+.6,
          tier%2
            ? concrete
            : concreteLight
        );

      step.position.set(
        0,
        .63+
        tier*1.18,
        -depth*.5+
        (
          tier+.5
        )*
        depth/tiers
      );

      root.add(step);
    }

    const roof=
      box(
        length+7,
        .7,
        depth+8,
        roofMaterial
      );

    roof.position.set(
      0,
      tiers*1.18+
      3.2,
      1.8
    );

    roof.rotation.x=-.055;
    root.add(roof);

    for(let i=0;i<7;i++){
      const post=
        box(
          .7,
          tiers*1.18+
          3.1,
          .7,
          steel
        );

      post.position.set(
        -length*.42+
        i*
        length*.84/6,
        (
          tiers*1.18+
          3.1
        )*.5,
        depth*.43
      );

      root.add(post);
    }

    return root;
  }

  function endTerrace(
    width,
    depth
  ){
    const root=
      new THREE.Group();

    for(let tier=0;tier<5;tier++){
      const step=
        box(
          width-tier*.7,
          1.0,
          depth/5+.5,
          concrete
        );

      step.position.set(
        0,
        .5+
        tier*.88,
        -depth*.5+
        (
          tier+.5
        )*
        depth/5
      );

      root.add(step);
    }

    return root;
  }

  function pitch(){
    const root=
      new THREE.Group();

    const turf=
      box(
        104,
        .18,
        68,
        fieldMaterial
      );

    turf.position.y=.1;
    root.add(turf);

    const worn=
      box(
        16,
        .03,
        48,
        fieldWorn
      );

    worn.position.y=.205;
    root.add(worn);

    [-43,43].forEach(
      x=>{
        const wornGoal=
          box(
            12,
            .025,
            18,
            fieldWorn
          );

        wornGoal.position.set(
          x,
          .205,
          0
        );

        root.add(wornGoal);
      }
    );

    [
      [0,.225,-34,104,.02,.28],
      [0,.225, 34,104,.02,.28],
      [-52,.225,0,.28,.02,68],
      [ 52,.225,0,.28,.02,68],
      [0,.225,0,.28,.02,68]
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

        line.castShadow=false;
        root.add(line);
      }
    );

    return root;
  }

  const world=
    mapPointToWorld(
      STADIUM_REFERENCE.x,
      STADIUM_REFERENCE.y
    );

  const siteY=
    Math.max(
      terrainHeight(
        world.x,
        world.z
      ),
      STADIUM_REFERENCE.targetElevation
    )+
    .12;

  group.position.set(
    world.x,
    siteY,
    world.z
  );

  group.rotation.y=
    STADIUM_REFERENCE.yaw;

  const site=
    box(
      198,
      .55,
      143,
      asphalt
    );

  site.position.y=.275;
  group.add(site);

  const field=
    pitch();

  field.position.set(
    5,
    .58,
    0
  );

  group.add(field);

  const north=
    mainStand();

  north.position.set(
    -4,
    .58,
    -58
  );

  north.rotation.y=Math.PI;
  group.add(north);

  const south=
    coveredStand(
      111,
      20,
      6
    );

  south.position.set(
    5,
    .58,
    52
  );

  group.add(south);

  const west=
    endTerrace(
      64,
      18
    );

  west.position.set(
    -67,
    .58,
    0
  );

  west.rotation.y=
    Math.PI*.5;

  group.add(west);

  const east=
    endTerrace(
      64,
      18
    );

  east.position.set(
    76,
    .58,
    0
  );

  east.rotation.y=
    -Math.PI*.5;

  group.add(east);

  [
    [-76,-57],
    [ 78,-57],
    [-76, 58],
    [ 78, 58]
  ].forEach(
    position=>{
      const light=floodlight();

      light.position.set(
        position[0],
        .58,
        position[1]
      );

      group.add(light);
    }
  );

  const serviceApron=
    box(
      98,
      .22,
      25,
      concreteDark
    );

  serviceApron.position.set(
    -3,
    .68,
    -74
  );

  group.add(serviceApron);

  for(let i=0;i<5;i++){
    const bay=
      box(
        10.5,
        3.5,
        5.5,
        concrete
      );

    bay.position.set(
      -29+
      i*14,
      2.4,
      -74
    );

    group.add(bay);
  }

  [
    [0,2.0,-71,198,3.0,1],
    [-98,2.0,0,1,3.0,143],
    [ 98,2.0,0,1,3.0,143],
    [-59,2.0,71,78,3.0,1],
    [ 60,2.0,71,76,3.0,1]
  ].forEach(
    item=>{
      const wall=
        box(
          item[3],
          item[4],
          item[5],
          concreteDark
        );

      wall.position.set(
        item[0],
        item[1],
        item[2]
      );

      group.add(wall);
    }
  );

  group.userData.mapCoordinate={
    x:STADIUM_REFERENCE.x,
    y:STADIUM_REFERENCE.y,
    source:'same-tactical-reference-v69'
  };

  return {
    group,
    stadiumCount:1
  };
}
