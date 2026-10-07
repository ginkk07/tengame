import {
  FACILITY_REFERENCE_POINTS,
  FACTION_REFERENCE_POINTS
} from './map-data.js?v=73';

import {
  placeRigidMapObject,
  addTerrainFoundation
} from './terrain-placement.js?v=73';

export function createFacilityReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiOfficialFacilities';

  scene.add(group);

  const factionColors={
    valkyra:new THREE.Color(0xd86666),
    manticore:new THREE.Color(0x82c596),
    lonestar:new THREE.Color(0x5fa8d3)
  };

  const concreteMaterial=
    new THREE.MeshStandardMaterial({
      color:0x7a7c77,
      roughness:.96,
      metalness:0
    });

  const darkMetal=
    new THREE.MeshStandardMaterial({
      color:0x3f4646,
      roughness:.78,
      metalness:.28
    });

  const lightMetal=
    new THREE.MeshStandardMaterial({
      color:0x737b79,
      roughness:.76,
      metalness:.18
    });

  const panelMaterial=
    new THREE.MeshStandardMaterial({
      color:0xc6c2b3,
      roughness:.82,
      metalness:0
    });

  function box(width,height,depth,material){
    const mesh=
      new THREE.Mesh(
        new THREE.BoxGeometry(width,height,depth),
        material
      );
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    return mesh;
  }

  function cylinder(radius,height,material,segments=8){
    const mesh=
      new THREE.Mesh(
        new THREE.CylinderGeometry(radius,radius,height,segments),
        material
      );
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    return mesh;
  }

  function makeFactionAccent(faction){
    const color=
      factionColors[faction] ||
      new THREE.Color(0x888888);
    return new THREE.MeshStandardMaterial({
      color,
      roughness:.78,
      metalness:.08
    });
  }

  function createWeaponsVendor(faction){
    const root=new THREE.Group();
    const accent=makeFactionAccent(faction);

    const pad=box(13,.7,9,concreteMaterial);
    pad.position.y=.35;
    root.add(pad);

    const kiosk=box(8.2,4.4,5.6,darkMetal);
    kiosk.position.set(0,2.9,0);
    root.add(kiosk);

    const counter=box(7.2,1.0,1.3,lightMetal);
    counter.position.set(0,2.05,-3.15);
    root.add(counter);

    const canopy=box(10.4,.45,7.2,accent);
    canopy.position.set(0,5.35,-.35);
    root.add(canopy);

    [-4.2,4.2].forEach(x=>{
      const post=cylinder(.18,4.5,lightMetal,6);
      post.position.set(x,2.65,-2.6);
      root.add(post);
    });

    const rearPanel=box(4.6,2.3,.35,accent);
    rearPanel.position.set(0,3.45,2.95);
    root.add(rearPanel);

    return root;
  }

  function createGarageVendor(faction){
    const root=new THREE.Group();
    const accent=makeFactionAccent(faction);

    const pad=box(18,.75,15,concreteMaterial);
    pad.position.y=.375;
    root.add(pad);

    const serviceBay=box(11.5,5.5,8.6,darkMetal);
    serviceBay.position.set(0,3.15,2.0);
    root.add(serviceBay);

    const roof=box(14.8,.5,11.6,accent);
    roof.position.set(0,6.1,1.1);
    root.add(roof);

    const frontCutout=box(8.0,3.5,.55,panelMaterial);
    frontCutout.position.set(0,2.65,-2.55);
    root.add(frontCutout);

    const serviceRamp=box(7.5,.35,5.5,lightMetal);
    serviceRamp.position.set(0,.95,-5.0);
    root.add(serviceRamp);

    [-5.1,5.1].forEach(x=>{
      const post=cylinder(.22,5.4,lightMetal,6);
      post.position.set(x,3.05,-3.5);
      root.add(post);
    });

    return root;
  }

  function createSpawnBoard(faction){
    const root=new THREE.Group();
    const accent=makeFactionAccent(faction);

    const pad=box(7.5,.6,5.5,concreteMaterial);
    pad.position.y=.3;
    root.add(pad);

    [-2.15,2.15].forEach(x=>{
      const post=cylinder(.18,4.8,darkMetal,6);
      post.position.set(x,2.8,0);
      root.add(post);
    });

    const board=box(5.5,3.0,.45,panelMaterial);
    board.position.set(0,4.0,0);
    root.add(board);

    const header=box(5.8,.65,.58,accent);
    header.position.set(0,5.45,0);
    root.add(header);

    return root;
  }

  function createFactionMarkerProp(faction){
    const root=new THREE.Group();
    const accent=makeFactionAccent(faction);

    const disc=new THREE.Mesh(
      new THREE.CylinderGeometry(8.5,8.5,.55,32),
      new THREE.MeshStandardMaterial({color:0x646964,roughness:.96})
    );
    disc.position.y=.275;
    disc.receiveShadow=true;
    root.add(disc);

    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(6.0,.32,8,36),
      accent
    );
    ring.rotation.x=Math.PI/2;
    ring.position.y=.72;
    ring.castShadow=true;
    root.add(ring);

    const pole=cylinder(.20,7.0,darkMetal,6);
    pole.position.set(0,4.0,0);
    root.add(pole);

    const flag=box(2.8,1.8,.18,accent);
    flag.position.set(1.45,6.5,0);
    root.add(flag);

    return root;
  }

  function facilityFootprint(type){
    if(type==='garage_vendor'){
      return {width:20,depth:18};
    }

    if(type==='weapons_vendor'){
      return {width:15,depth:11};
    }

    return {width:9,depth:7};
  }

  let facilityCount=0;

  FACILITY_REFERENCE_POINTS.forEach(point=>{
    let object=null;
    if(point.type==='weapons_vendor'){
      object=createWeaponsVendor(point.faction);
    }else if(point.type==='garage_vendor'){
      object=createGarageVendor(point.faction);
    }else if(point.type==='spawn_board'){
      object=createSpawnBoard(point.faction);
    }
    if(!object){return;}

    const footprint=facilityFootprint(point.type);

    const placement=
      placeRigidMapObject({
        object,
        mapX:point.x,
        mapY:point.y,
        width:footprint.width,
        depth:footprint.depth,
        terrainHeight,
        clearance:.16,
        samples:5
      });

    addTerrainFoundation({
      THREE,
      object,
      width:footprint.width,
      depth:footprint.depth,
      terrainRange:placement.terrain.range,
      material:concreteMaterial,
      extraDepth:.45
    });

    object.userData.mapCoordinate={
      x:point.x,y:point.y,type:point.type,faction:point.faction
    };
    group.add(object);
    facilityCount++;
  });

  let factionMarkerCount=0;
  FACTION_REFERENCE_POINTS.forEach(point=>{
    const object=createFactionMarkerProp(point.id);

    const placement=
      placeRigidMapObject({
        object,
        mapX:point.x,
        mapY:point.y,
        width:18,
        depth:18,
        terrainHeight,
        clearance:.14,
        samples:5
      });

    addTerrainFoundation({
      THREE,
      object,
      width:17,
      depth:17,
      terrainRange:placement.terrain.range,
      material:concreteMaterial,
      extraDepth:.40
    });

    object.userData.mapCoordinate={x:point.x,y:point.y,faction:point.id};
    group.add(object);
    factionMarkerCount++;
  });

  return {group,facilityCount,factionMarkerCount};
}
