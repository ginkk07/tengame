import {
  ROAD_REFERENCE_ROUTES
} from './map-data.js?v=74';

import {
  mapPointToWorld
} from './factions.js?v=74';

export function createRoadReferenceLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=
    new THREE.Group();

  group.name=
    'OzetiRoadReference';

  scene.add(group);

  function sampleRoute(route,step=22){
    const out=[];

    for(let i=0;i<route.length-1;i++){
      const a=route[i];
      const b=route[i+1];

      const aw=
        mapPointToWorld(
          a[0],
          a[1]
        );

      const bw=
        mapPointToWorld(
          b[0],
          b[1]
        );

      const length=
        Math.hypot(
          bw.x-aw.x,
          bw.z-aw.z
        );

      const count=
        Math.max(
          1,
          Math.ceil(
            length/step
          )
        );

      for(let n=0;n<count;n++){
        const t=n/count;

        out.push({
          x:
            THREE.MathUtils.lerp(
              aw.x,
              bw.x,
              t
            ),
          z:
            THREE.MathUtils.lerp(
              aw.z,
              bw.z,
              t
            )
        });
      }
    }

    const last=
      route[
        route.length-1
      ];

    const lastWorld=
      mapPointToWorld(
        last[0],
        last[1]
      );

    out.push({
      x:lastWorld.x,
      z:lastWorld.z
    });

    return out;
  }

  function buildRibbon(
    route,
    width,
    yOffset,
    material
  ){
    const points=
      sampleRoute(
        route
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

        const len=
          Math.hypot(
            tx,
            tz
          ) || 1;

        tx/=len;
        tz/=len;

        const nx=-tz;
        const nz=tx;

        const half=
          width*.5;

        const lx=
          point.x+
          nx*
          half;

        const lz=
          point.z+
          nz*
          half;

        const rx=
          point.x-
          nx*
          half;

        const rz=
          point.z-
          nz*
          half;

        vertices.push(
          lx,
          terrainHeight(
            lx,
            lz
          )+
          yOffset,
          lz,

          rx,
          terrainHeight(
            rx,
            rz
          )+
          yOffset,
          rz
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

    const mesh=
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.receiveShadow=true;
    mesh.renderOrder=3;

    return mesh;
  }

  const roadbedMaterial=
    new THREE.MeshStandardMaterial({
      color:0xa79b80,
      roughness:1,
      metalness:0,
      polygonOffset:true,
      polygonOffsetFactor:-1,
      polygonOffsetUnits:-1
    });

  const roadMaterial=
    new THREE.MeshStandardMaterial({
      color:0xc7c0a7,
      roughness:.98,
      metalness:0,
      polygonOffset:true,
      polygonOffsetFactor:-2,
      polygonOffsetUnits:-2
    });

  ROAD_REFERENCE_ROUTES.forEach(
    route=>{
      group.add(
        buildRibbon(
          route,
          34,
          .50,
          roadbedMaterial
        )
      );

      group.add(
        buildRibbon(
          route,
          22,
          .78,
          roadMaterial
        )
      );
    }
  );

  return {
    group,
    routeCount:
      ROAD_REFERENCE_ROUTES.length
  };
}
