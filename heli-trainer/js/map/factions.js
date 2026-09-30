import {
  FACTIONS,
  WORLD_CONFIG
} from './map-data.js';

const MAP_CENTER={
  x:WORLD_CONFIG.centerX,
  y:WORLD_CONFIG.centerY
};

export function mapPointToWorld(mapX,mapY){
  return {
    x:mapX-MAP_CENTER.x,
    z:MAP_CENTER.y-mapY
  };
}

export function worldPointToMapCoordinate(x,z){
  return {
    x:MAP_CENTER.x+x,
    y:MAP_CENTER.y-z
  };
}

export function worldToTacticalMapPixel(x,z){
  const map=
    worldPointToMapCoordinate(
      x,
      z
    );

  return {
    x:
      map.x*0.0482896054 +
      map.y*(-0.0088439679) -
      54.315748,
    y:
      map.x*0.0029601433 +
      map.y*(-0.0418518893) +
      519.502394
  };
}

export function factionCenterWorld(id){
  const faction=FACTIONS[id];

  if(!faction){
    return {x:0,z:0};
  }

  let sx=0;
  let sy=0;

  faction.points.forEach(
    point=>{
      sx+=point[0];
      sy+=point[1];
    }
  );

  return mapPointToWorld(
    sx/faction.points.length,
    sy/faction.points.length
  );
}

export function createFactionWorldLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  scene.add(group);

  function clear(){
    while(group.children.length){
      const child=
        group.children[
          group.children.length-1
        ];

      group.remove(child);

      child.traverse?.(
        obj=>{
          obj.geometry?.dispose?.();

          if(obj.material){
            if(Array.isArray(obj.material)){
              obj.material.forEach(
                material=>material.dispose?.()
              );
            }else{
              obj.material.dispose?.();
            }
          }
        }
      );
    }
  }

  function rebuild(){
    clear();

    Object.values(FACTIONS).forEach(
      faction=>{
        const verts=[];

        faction.points.forEach(
          point=>{
            const world=
              mapPointToWorld(
                point[0],
                point[1]
              );

            verts.push(
              world.x,
              terrainHeight(
                world.x,
                world.z
              )+2.6,
              world.z
            );
          }
        );

        const geometry=
          new THREE.BufferGeometry();

        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            verts,
            3
          )
        );

        geometry.setIndex([
          0,1,2,
          0,2,3
        ]);

        geometry.computeVertexNormals();

        const fill=
          new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
              color:faction.color,
              transparent:true,
              opacity:.18,
              side:THREE.DoubleSide,
              depthWrite:false
            })
          );

        group.add(fill);

        const outlinePoints=
          faction.points.map(
            point=>{
              const world=
                mapPointToWorld(
                  point[0],
                  point[1]
                );

              return new THREE.Vector3(
                world.x,
                terrainHeight(
                  world.x,
                  world.z
                )+3.4,
                world.z
              );
            }
          );

        const outline=
          new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(
              outlinePoints
            ),
            new THREE.LineBasicMaterial({
              color:faction.color,
              transparent:true,
              opacity:.95
            })
          );

        group.add(outline);
      }
    );
  }

  return {
    group,
    rebuild,
    clear
  };
}

export {FACTIONS};
