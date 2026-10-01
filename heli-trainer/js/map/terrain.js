import {
  WORLD_CONFIG,
  TERRAIN_CONFIG,
  MAP_ASSETS,
  FACTIONS,
  TRIBUTARY_GULLIES
} from './map-data.js';

import {
  mapPointToWorld,
  factionCenterWorld,
  worldToTacticalMapPixel
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

  const terrainSourceCenter={
    x:
      (
        TERRAIN_CONFIG.sourceBounds.minX+
        TERRAIN_CONFIG.sourceBounds.maxX
      )*.5,
    y:
      (
        TERRAIN_CONFIG.sourceBounds.minY+
        TERRAIN_CONFIG.sourceBounds.maxY
      )*.5
  };

  /*
   * Website view() fits map.bounds. WORLD_CONFIG and sourceBounds now
   * describe the same playable extent, so worldOffset must resolve to zero.
   */
  const worldOffset={
    x:
      terrainSourceCenter.x-
      WORLD_CONFIG.centerX,
    z:
      WORLD_CONFIG.centerY-
      terrainSourceCenter.y
  };

  const worldHalfX=
    WORLD_CONFIG.width*.5;

  const worldHalfZ=
    WORLD_CONFIG.depth*.5;

  const data={
    ready:false,
    heights:new Float32Array(nx*nz),
    root:null
  };

  data.heights.fill(NaN);

  const worldFloor=
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        WORLD_CONFIG.width,
        WORLD_CONFIG.depth,
        1,
        1
      ),
      new THREE.MeshStandardMaterial({
        color:0x4d6747,
        roughness:1,
        metalness:0
      })
    );

  worldFloor.rotation.x=-Math.PI/2;
  worldFloor.position.y=-.35;
  worldFloor.receiveShadow=true;
  scene.add(worldFloor);

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
  fallbackTerrain.position.set(
    worldOffset.x,
    -2,
    worldOffset.z
  );
  fallbackTerrain.receiveShadow=true;
  scene.add(fallbackTerrain);

  const fallbackGrid=
    new THREE.GridHelper(
      Math.min(width,depth),
      78,
      0x8f9691,
      0x676e69
    );

  fallbackGrid.position.set(
    worldOffset.x,
    -1.8,
    worldOffset.z
  );
  scene.add(fallbackGrid);

  const boundaryY=520;

  const boundaryPts=[
    new THREE.Vector3(-worldHalfX,boundaryY,-worldHalfZ),
    new THREE.Vector3( worldHalfX,boundaryY,-worldHalfZ),
    new THREE.Vector3( worldHalfX,boundaryY, worldHalfZ),
    new THREE.Vector3(-worldHalfX,boundaryY, worldHalfZ),
    new THREE.Vector3(-worldHalfX,boundaryY,-worldHalfZ)
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


  let tacticalColorSampler=null;

  async function loadTacticalColorSampler(){
    return new Promise(
      resolve=>{
        const image=new Image();

        image.onload=()=>{
          const canvas=
            document.createElement('canvas');

          canvas.width=image.naturalWidth;
          canvas.height=image.naturalHeight;

          const context=
            canvas.getContext(
              '2d',
              {
                willReadFrequently:true
              }
            );

          context.drawImage(
            image,
            0,
            0
          );

          const pixels=
            context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            ).data;

          resolve({
            width:canvas.width,
            height:canvas.height,
            sample(worldX,worldZ,target){
              const pixel=
                worldToTacticalMapPixel(
                  worldX,
                  worldZ
                );

              const px=
                THREE.MathUtils.clamp(
                  Math.round(
                    pixel.x/
                    670*
                    canvas.width
                  ),
                  0,
                  canvas.width-1
                );

              const py=
                THREE.MathUtils.clamp(
                  Math.round(
                    pixel.y/
                    625*
                    canvas.height
                  ),
                  0,
                  canvas.height-1
                );

              let r=0;
              let g=0;
              let b=0;
              let count=0;

              for(let oy=-1;oy<=1;oy++){
                for(let ox=-1;ox<=1;ox++){
                  const sx=
                    THREE.MathUtils.clamp(
                      px+ox,
                      0,
                      canvas.width-1
                    );

                  const sy=
                    THREE.MathUtils.clamp(
                      py+oy,
                      0,
                      canvas.height-1
                    );

                  const index=
                    (sy*canvas.width+sx)*4;

                  const alpha=
                    pixels[index+3];

                  if(alpha<12){
                    continue;
                  }

                  r+=pixels[index];
                  g+=pixels[index+1];
                  b+=pixels[index+2];
                  count++;
                }
              }

              if(!count){
                return false;
              }

              r/=count;
              g/=count;
              b/=count;

              const max=Math.max(r,g,b);
              const min=Math.min(r,g,b);
              const luminance=(r+g+b)/765;

              /*
               * Ignore near-black labels/roads and near-white text overlays;
               * use the painted land/water colours as the terrain tint source.
               */
              if(luminance<.08 || luminance>.95){
                return false;
              }

              target.setRGB(
                r/255,
                g/255,
                b/255
              );

              return true;
            }
          });
        };

        image.onerror=()=>resolve(null);
        image.src=MAP_ASSETS.tacticalMap;
      }
    );
  }

  function height(x,z){
    if(!data.ready){
      return 0;
    }

    const localX=
      x-
      worldOffset.x;

    const localZ=
      z-
      worldOffset.z;

    if(
      localX<-halfX ||
      localX> halfX ||
      localZ<-halfZ ||
      localZ> halfZ
    ){
      return 0;
    }

    const fx=
      (localX+halfX)/
      width*
      (nx-1);

    const fz=
      (localZ+halfZ)/
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
                x:
                  world.x-
                  worldOffset.x,
                z:
                  world.z-
                  worldOffset.z
              };
            }
          );

        const centerWorld=
          factionCenterWorld(
            faction.id
          );

        const center={
          x:
            centerWorld.x-
            worldOffset.x,
          z:
            centerWorld.z-
            worldOffset.z
        };

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
      new THREE.Color(0x5f873f);

    const grass=
      new THREE.Color(0x74944a);

    const dryGrass=
      new THREE.Color(0x858456);

    const soil=
      new THREE.Color(0x896d4e);

    const rock=
      new THREE.Color(0x67685f);

    const highRock=
      new THREE.Color(0x887a68);

    const p=
      new THREE.Vector3();

    const normal=
      new THREE.Vector3();

    const color=
      new THREE.Color();

    const mapTint=
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


          if(
            tacticalColorSampler &&
            tacticalColorSampler.sample(
              p.x+
              worldOffset.x,
              p.z+
              worldOffset.z,
              mapTint
            )
          ){
            /*
             * Paint the ground closer to the tactical map look while still
             * preserving physically readable slope / elevation shading.
             */
            const tintStrength=
              .16+
              (1-slope)*.24+
              (1-elevation)*.04;

            color.lerp(
              mapTint,
              THREE.MathUtils.clamp(
                tintStrength,
                .14,
                .42
              )
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

          /*
           * Directional terrain shading is intentionally stronger than the
           * tactical-map tint. This keeps ridges, valleys and slopes readable
           * even when the ground colour follows the 2D map.
           */
          const reliefLight=
            THREE.MathUtils.clamp(
              normal.y*.76+
              normal.x*.20-
              normal.z*.15,
              .28,
              1
            );

          const reliefOffset=
            (reliefLight-.72)*
            (.16+
             THREE.MathUtils.smoothstep(
               slope,
               .015,
               .18
             )*.13);

          color.offsetHSL(
            variation*.004,
            variation*.035,
            variation*.035+
            reliefOffset
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
              (
                p.x-
                worldOffset.x+
                halfX
              )/
              stepX
            );

          const gz=
            Math.round(
              (
                p.z-
                worldOffset.z+
                halfZ
              )/
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
        'Ozeti 地圖與配色載入中…';
    }

    try{
      tacticalColorSampler=
        await loadTacticalColorSampler();

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

      root.position.set(
        worldOffset.x,
        0,
        worldOffset.z
      );

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
          'Ozeti v65 · 地形已載入，準備建立3D場景';
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
      halfX:worldHalfX,
      halfZ:worldHalfZ,
      width:WORLD_CONFIG.width,
      depth:WORLD_CONFIG.depth
    },
    terrainCrop:{
      halfX,
      halfZ,
      width,
      depth,
      worldOffset
    },
    boundary,
    worldFloor,
    fallbackTerrain,
    fallbackGrid
  };
}
