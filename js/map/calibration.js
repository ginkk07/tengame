import {
  CALIBRATION_POINTS,
  OZETI_MAP_BOUNDS
} from './map-data.js';

import {
  mapPointToWorld
} from './factions.js';

export function createCoordinateCalibrationLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiCoordinateCalibration';

  scene.add(group);

  const poleGeometry=
    new THREE.CylinderGeometry(
      1.6,
      1.6,
      72,
      8
    );

  const capGeometry=
    new THREE.SphereGeometry(
      6,
      12,
      8
    );

  const ringGeometry=
    new THREE.RingGeometry(
      10,
      13,
      32
    );

  function addBeacon(point){
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

    const material=
      new THREE.MeshBasicMaterial({
        color:point.color,
        transparent:true,
        opacity:.94,
        depthTest:true
      });

    const pole=
      new THREE.Mesh(
        poleGeometry,
        material
      );

    pole.position.set(
      world.x,
      ground+36,
      world.z
    );

    const cap=
      new THREE.Mesh(
        capGeometry,
        material.clone()
      );

    cap.position.set(
      world.x,
      ground+75,
      world.z
    );

    const ring=
      new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color:point.color,
          transparent:true,
          opacity:.82,
          side:THREE.DoubleSide,
          depthWrite:false
        })
      );

    ring.rotation.x=
      -Math.PI/2;

    ring.position.set(
      world.x,
      ground+1.2,
      world.z
    );

    group.add(
      pole,
      cap,
      ring
    );
  }

  CALIBRATION_POINTS
    .filter(
      point=>
        point.kind!=='tower'
    )
    .forEach(
      addBeacon
    );

  // Four white corner beacons define the exact playable map.bounds rectangle.
  [
    [OZETI_MAP_BOUNDS.minX,OZETI_MAP_BOUNDS.minY],
    [OZETI_MAP_BOUNDS.maxX,OZETI_MAP_BOUNDS.minY],
    [OZETI_MAP_BOUNDS.maxX,OZETI_MAP_BOUNDS.maxY],
    [OZETI_MAP_BOUNDS.minX,OZETI_MAP_BOUNDS.maxY]
  ].forEach(
    point=>{
      const world=
        mapPointToWorld(
          point[0],
          point[1]
        );

      const ground=
        terrainHeight(
          world.x,
          world.z
        );

      const marker=
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            2.2,
            2.2,
            110,
            8
          ),
          new THREE.MeshBasicMaterial({
            color:0xf4f4f0,
            transparent:true,
            opacity:.8
          })
        );

      marker.position.set(
        world.x,
        ground+55,
        world.z
      );

      group.add(marker);
    }
  );

  return {
    group,
    count:
      CALIBRATION_POINTS.filter(
        point=>
          point.kind!=='tower'
      ).length
  };
}
