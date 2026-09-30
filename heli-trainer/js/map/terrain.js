import {
  TERRAIN_CONFIG,
  MAP_ASSETS,
  FACTIONS,
  TRIBUTARY_GULLIES
} from './map-data.js';

import {
  mapPointToWorld,
  factionCenterWorld
} from './factions.js';

export function createTerrainSystem({
  THREE,
  scene,
  statusEl
}){
  const {
    width,
    depth,
    nx,
    nz,
    verticalScale,
    reliefMeters
  }=TERRAIN_CONFIG;

  const halfX=width*.5;
  const halfZ=depth*.5;

  const data={
    ready:false,
    heights:new Float32Array(nx*nz),
    root:null
  };

  data.heights.fill(NaN);

  const fallbackTerrain=
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        width,
        depth,
        1,
        1
      ),
      new THREE.MeshStandardMaterial({
        color:0x555d58,
        roughness:1,
        metalness:0
      })
    );

  fallbackTerrain.rotation.x=-Math.PI/2;
  fallbackTerrain.position.y=-2;
  fallbackTerrain.receiveShadow=true;
  scene.add(fallbackTerrain);

  const fallbackGrid=
    new THREE.GridHelper(
      Math.min(width,depth),
      78,
      0x8f9691,
      0x676e69
    );

  fallbackGrid.position.y=-1.8;
  scene.add(fallbackGrid);

  const boundaryY=520;

  const boundaryPts=[
    new THREE.Vector3(-halfX,boundaryY,-halfZ),
    new THREE.Vector3( halfX,boundaryY,-halfZ),
    new THREE.Vector3( halfX,boundaryY, halfZ),
    new THREE.Vector3(-halfX,boundaryY, halfZ),
    new THREE.Vector3(-halfX,boundaryY,-halfZ)
  ];

  const boundary=
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        boundaryPts
      ),
      new THREE.LineBasicMaterial({
        color:0xa4a99f,
        transparent:true,
        opacity:.24
      })
    );

  scene.add(boundary);

  function height(x,z){
    if(!data.ready){
      return 0;
    }

    if(
      x<-halfX ||
      x> halfX ||
      z<-halfZ ||
      z> halfZ
    ){
      return 0;
    }

    const fx=
      (x+halfX)/
      width*
      (nx-1);

    const fz=
      (z+halfZ)/
      depth*
      (nz-1);

    const x0=
      THREE.MathUtils.clamp(
        Math.floor(fx),
        0,
        nx-1
      );

    const z0=
      THREE.MathUtils.clamp(
        Math.floor(fz),
        0,
        nz-1
      );

    const x1=
      Math.min(x0+1,nx-1);

    const z1=
      Math.min(z0+1,nz-1);

    const tx=fx-x0;
    const tz=fz-z0;

    const i00=z0*nx+x0;
    const i10=z0*nx+x1;
    const i01=z1*nx+x0;
    const i11=z1*nx+x1;

    const h00=data.heights[i00];
    const h10=data.heights[i10];
    const h01=data.heights[i01];
    const h11=data.heights[i11];

    if(
      !Number.isFinite(h00) ||
      !Number.isFinite(h10) ||
      !Number.isFinite(h01) ||
      !Number.isFinite(h11)
    ){
      return 0;
    }

    const h0=
      THREE.MathUtils.lerp(
        h00,
        h10,
        tx
      );

    const h1=
      THREE.MathUtils.lerp(
        h01,
        h11,
        tx
      );

    return THREE.MathUtils.lerp(
      h0,
      h1,
      tz
    );
  }

  function mainRiverCenterZ(x){
    return (
      .16*x+
      220*
      Math.sin(
        x/1550
      )
    );
  }

  function distanceToSegment2D(px,pz,ax,az,bx,bz){
    const vx=bx-ax;
    const vz=bz-az;
    const wx=px-ax;
    const wz=pz-az;

    const len2=
      vx*vx+
      vz*vz;

    const t=
      len2>0
        ? THREE.MathUtils.clamp(
            (wx*vx+wz*vz)/len2,
            0,
            1
          )
        : 0;

    const dx=
      px-
      (ax+vx*t);

    const dz=
      pz-
      (az+vz*t);

    return Math.hypot(dx,dz);
  }

  function drainageCut(x,z){
    const riverZ=
      mainRiverCenterZ(x);

    const riverDistance=
      Math.abs(
        z-riverZ
      );

    let cut=
      Math.exp(
        -Math.pow(
          riverDistance/185,
          2
        )
      )*1.15;

    cut+=
      Math.exp(
        -Math.pow(
          riverDistance/72,
          2
        )
      )*3.35;

    TRIBUTARY_GULLIES.forEach(
      points=>{
        for(let i=0;i<points.length-1;i++){
          const a=points[i];
          const b=points[i+1];

          const d=
            distanceToSegment2D(
              x,
              z,
              a[0],
              a[1],
              b[0],
              b[1]
            );

          cut+=
            Math.exp(
              -Math.pow(
                d/62,
                2
              )
            )*.42;
        }
      }
    );

    return cut;
  }

  function terrainDetailNoise(x,z){
    return (
      Math.sin(x*.0034+z*.0017)*1.65+
      Math.sin(x*.0087-z*.0059)*1.05+
      Math.sin((x+z)*.0155)*.55+
      Math.cos((x-z)*.0205)*.38
    );
  }

  function pointInPolygon2D(x,z,points){
    let inside=false;

    for(
      let i=0,j=points.length-1;
      i<points.length;
      j=i++
    ){
      const xi=points[i].x;
      const zi=points[i].z;
      const xj=points[j].x;
      const zj=points[j].z;

      const intersects=
        (
          (zi>z)!==(zj>z)
        ) &&
        (
          x<
          (xj-xi)*
          (z-zi)/
          Math.max(zj-zi,1e-9)+
          xi
        );

      if(intersects){
        inside=!inside;
      }
    }

    return inside;
  }

  function buildFactionTerrainAreas(){
    return Object.values(FACTIONS).map(
      faction=>{
        const points=
          faction.points.map(
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

        const center=
          factionCenterWorld(
            faction.id
          );

        let radius=0;

        points.forEach(
          p=>{
            radius=Math.max(
              radius,
              Math.hypot(
                p.x-center.x,
                p.z-center.z
              )
            );
          }
        );

        return {
          id:faction.id,
          points,
          center,
          radius,
          sum:0,
          count:0,
          targetY:0
        };
      }
    );
  }

  function enhanceTerrainMesh(root){
    const factionAreas=
      buildFactionTerrainAreas();

    const meshes=[];

    root.traverse(
      obj=>{
        if(!obj.isMesh){
          return;
        }

        const geometry=
          obj.geometry;

        const position=
          geometry?.attributes?.position;

        if(!position){
          return;
        }

        meshes.push(obj);

        for(let i=0;i<position.count;i++){
          const x=
            position.getX(i);

          const z=
            position.getZ(i);

          let y=
            position.getY(i)*
            verticalScale;

          const elevation=
            THREE.MathUtils.clamp(
              y/
              Math.max(
                reliefMeters*verticalScale,
                1
              ),
              0,
              1
            );

          const noiseStrength=
            .35+
            elevation*.65;

          y+=
            terrainDetailNoise(x,z)*
            noiseStrength;

          y-=
            drainageCut(
              x,
              z
            );

          position.setY(
            i,
            y
          );

          factionAreas.forEach(
            area=>{
              if(
                pointInPolygon2D(
                  x,
                  z,
                  area.points
                )
              ){
                area.sum+=y;
                area.count++;
              }
            }
          );
        }

        position.needsUpdate=true;
      }
    );

    factionAreas.forEach(
      area=>{
        area.targetY=
          area.count
            ? area.sum/area.count
            : 0;
      }
    );

    meshes.forEach(
      obj=>{
        const position=
          obj.geometry.attributes.position;

        for(let i=0;i<position.count;i++){
          const x=
            position.getX(i);

          const z=
            position.getZ(i);

          let y=
            position.getY(i);

          factionAreas.forEach(
            area=>{
              const distance=
                Math.hypot(
                  x-area.center.x,
                  z-area.center.z
                );

              const inner=
                area.radius*.72;

              const outer=
                area.radius*1.30;

              if(distance<outer){
                const blend=
                  1-
                  THREE.MathUtils.smoothstep(
                    distance,
                    inner,
                    outer
                  );

                y=
                  THREE.MathUtils.lerp(
                    y,
                    area.targetY,
                    blend*.92
                  );
              }
            }
          );

          position.setY(i,y);
        }

        position.needsUpdate=true;
        obj.geometry.computeVertexNormals();
      }
    );

    const lowGrass=
      new THREE.Color(0x476a42);

    const grass=
      new THREE.Color(0x5f7b4b);

    const dryGrass=
      new THREE.Color(0x7b8257);

    const soil=
      new THREE.Color(0x7f7256);

    const rock=
      new THREE.Color(0x696b67);

    const highRock=
      new THREE.Color(0x858078);

    const p=
      new THREE.Vector3();

    const normal=
      new THREE.Vector3();

    const color=
      new THREE.Color();

    meshes.forEach(
      obj=>{
        const geometry=
          obj.geometry;

        const position=
          geometry.attributes.position;

        const normals=
          geometry.attributes.normal;

        const colors=
          new Float32Array(
            position.count*3
          );

        const maxH=
          reliefMeters*
          verticalScale;

        for(let i=0;i<position.count;i++){
          p.fromBufferAttribute(
            position,
            i
          );

          normal.fromBufferAttribute(
            normals,
            i
          );

          const elevation=
            THREE.MathUtils.clamp(
              p.y/
              Math.max(maxH,1),
              0,
              1
            );

          const slope=
            THREE.MathUtils.clamp(
              1-Math.abs(normal.y),
              0,
              1
            );

          const variation=
            (
              Math.sin(p.x*.0049)+
              Math.sin(p.z*.0063)+
              Math.sin((p.x+p.z)*.0031)+
              Math.cos((p.x-p.z)*.011)
            )/4;

          if(elevation<.22){
            color.copy(lowGrass).lerp(
              grass,
              elevation/.22
            );
          }else if(elevation<.56){
            color.copy(grass).lerp(
              dryGrass,
              (elevation-.22)/.34
            );
          }else if(elevation<.80){
            color.copy(dryGrass).lerp(
              soil,
              (elevation-.56)/.24
            );
          }else{
            color.copy(soil).lerp(
              highRock,
              (elevation-.80)/.20
            );
          }

          const rockAmount=
            THREE.MathUtils.smoothstep(
              slope,
              .035,
              .20
            );

          color.lerp(
            rock,
            rockAmount*.82
          );

          if(
            elevation<.32 &&
            slope<.08
          ){
            color.lerp(
              lowGrass,
              .13
            );
          }

          /*
           * River moisture band: greener floodplain close to the main valley,
           * gradually fading into the surrounding dry grass / soil palette.
           */
          const riverDistance=
            Math.abs(
              p.z-
              mainRiverCenterZ(
                p.x
              )
            );

          const moisture=
            Math.exp(
              -Math.pow(
                riverDistance/430,
                2
              )
            )*
            (1-THREE.MathUtils.clamp(
              slope/.20,
              0,
              1
            ));

          color.lerp(
            lowGrass,
            moisture*.24
          );

          /*
           * Highland exposure: upper ridges lose some saturation and gain
           * cooler stone colour. This improves mountain silhouette and makes
           * the ridge/outcrop scenery read as part of the terrain.
           */
          const highland=
            THREE.MathUtils.smoothstep(
              elevation,
              .56,
              .92
            );

          const exposed=
            highland*
            THREE.MathUtils.smoothstep(
              slope,
              .028,
              .16
            );

          color.lerp(
            highRock,
            exposed*.30
          );

          const aspect=
            THREE.MathUtils.clamp(
              normal.x*.62-
              normal.z*.42,
              -1,
              1
            );

          const aspectStrength=
            THREE.MathUtils.smoothstep(
              slope,
              .025,
              .15
            );

          if(aspect>0){
            color.lerp(
              dryGrass,
              aspect*
              aspectStrength*
              .13
            );
          }else{
            color.lerp(
              lowGrass,
              -aspect*
              aspectStrength*
              .11
            );
          }

          color.offsetHSL(
            variation*.004,
            variation*.045,
            variation*.055
          );

          colors[i*3]=color.r;
          colors[i*3+1]=color.g;
          colors[i*3+2]=color.b;
        }

        geometry.setAttribute(
          'color',
          new THREE.BufferAttribute(
            colors,
            3
          )
        );

        obj.material?.dispose?.();

        obj.material=
          new THREE.MeshStandardMaterial({
            vertexColors:true,
            roughness:.99,
            metalness:0,
            side:THREE.DoubleSide
          });

        obj.castShadow=true;
        obj.receiveShadow=true;
      }
    );
  }

  function buildHeightField(root){
    data.heights.fill(NaN);

    const stepX=
      width/
      (nx-1);

    const stepZ=
      depth/
      (nz-1);

    const p=
      new THREE.Vector3();

    root.updateMatrixWorld(true);

    root.traverse(
      obj=>{
        if(!obj.isMesh){
          return;
        }

        obj.castShadow=true;
        obj.receiveShadow=true;

        const position=
          obj.geometry?.attributes?.position;

        if(!position){
          return;
        }

        for(let i=0;i<position.count;i++){
          p.fromBufferAttribute(
            position,
            i
          );

          p.applyMatrix4(
            obj.matrixWorld
          );

          const gx=
            Math.round(
              (p.x+halfX)/
              stepX
            );

          const gz=
            Math.round(
              (p.z+halfZ)/
              stepZ
            );

          if(
            gx<0 ||
            gx>=nx ||
            gz<0 ||
            gz>=nz
          ){
            continue;
          }

          const index=
            gz*nx+gx;

          const old=
            data.heights[index];

          if(
            !Number.isFinite(old) ||
            p.y>old
          ){
            data.heights[index]=p.y;
          }
        }
      }
    );

    for(let pass=0;pass<12;pass++){
      let changed=0;

      for(let z=0;z<nz;z++){
        for(let x=0;x<nx;x++){
          const index=
            z*nx+x;

          if(
            Number.isFinite(
              data.heights[index]
            )
          ){
            continue;
          }

          let total=0;
          let count=0;

          if(x>0){
            const h=
              data.heights[index-1];

            if(Number.isFinite(h)){
              total+=h;
              count++;
            }
          }

          if(x<nx-1){
            const h=
              data.heights[index+1];

            if(Number.isFinite(h)){
              total+=h;
              count++;
            }
          }

          if(z>0){
            const h=
              data.heights[
                index-nx
              ];

            if(Number.isFinite(h)){
              total+=h;
              count++;
            }
          }

          if(z<nz-1){
            const h=
              data.heights[
                index+nx
              ];

            if(Number.isFinite(h)){
              total+=h;
              count++;
            }
          }

          if(count){
            data.heights[index]=
              total/count;

            changed++;
          }
        }
      }

      if(!changed){
        break;
      }
    }

    let valid=0;

    for(const h of data.heights){
      if(Number.isFinite(h)){
        valid++;
      }
    }

    return {
      valid,
      total:data.heights.length
    };
  }

  async function load(){
    if(statusEl){
      statusEl.textContent=
        'Ozeti GLB 載入中…';
    }

    try{
      const loaderModule=
        await import(
          'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js/+esm'
        );

      const loader=
        new loaderModule.GLTFLoader();

      const gltf=
        await loader.loadAsync(
          MAP_ASSETS.terrain
        );

      const root=
        gltf.scene;

      root.name=
        'OzetiTerrain';

      scene.add(root);

      data.root=root;

      enhanceTerrainMesh(root);

      const field=
        buildHeightField(root);

      if(
        field.valid<
        field.total*.98
      ){
        throw new Error(
          '高度網格不完整 '+
          field.valid+
          '/'+
          field.total
        );
      }

      data.ready=true;

      fallbackTerrain.visible=false;
      fallbackGrid.visible=false;

      if(statusEl){
        statusEl.textContent=
          'Ozeti v51 · 支流地貌＋林緣＋河床細節';
      }

      return true;
    }catch(error){
      console.error(
        'Ozeti terrain load failed:',
        error
      );

      fallbackTerrain.visible=true;
      fallbackGrid.visible=true;

      if(statusEl){
        statusEl.textContent=
          'Ozeti 地形載入失敗';
      }

      throw error;
    }
  }

  return {
    data,
    load,
    height,
    bounds:{
      halfX,
      halfZ,
      width,
      depth
    },
    boundary,
    fallbackTerrain,
    fallbackGrid
  };
}
