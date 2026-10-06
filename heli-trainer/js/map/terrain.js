import {
  WORLD_CONFIG,
  TERRAIN_CONFIG,
  MAP_ASSETS,
  STADIUM_REFERENCE
} from './map-data.js?v=74';

import {
  mapPointToWorld
} from './factions.js?v=74';

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
   * v73 renders the complete 16.384 km world.
   * The GLB still represents the central/searchable 8.549 × 7.775 km crop,
   * so this crop is positioned at its true offset inside the full world.
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

  const worldFloorMaterial=
    new THREE.MeshStandardMaterial({
      color:0x5d7c4a,
      roughness:1,
      metalness:0
    });

  const worldFloor=
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        WORLD_CONFIG.width,
        WORLD_CONFIG.depth,
        1,
        1
      ),
      worldFloorMaterial
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



  let groundTexture=null;

  async function loadGroundTexture(){
    try{
      const texture=
        await new THREE.TextureLoader().loadAsync(
          MAP_ASSETS.groundTexture
        );

      texture.colorSpace=
        THREE.SRGBColorSpace;

      texture.wrapS=
        THREE.ClampToEdgeWrapping;

      texture.wrapT=
        THREE.ClampToEdgeWrapping;

      texture.minFilter=
        THREE.LinearMipmapLinearFilter;

      texture.magFilter=
        THREE.LinearFilter;

      texture.anisotropy=8;

      return texture;
    }catch(error){
      console.warn(
        'Ozeti ground texture failed:',
        error
      );

      return null;
    }
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

  const stadiumWorldCenter={
    x:
      (
        STADIUM_REFERENCE.x-
        WORLD_CONFIG.centerX
      )-
      worldOffset.x,

    z:
      (
        WORLD_CONFIG.centerY-
        STADIUM_REFERENCE.y
      )-
      worldOffset.z
  };

  function stadiumTerraceBlend(
    x,
    z
  ){
    const dx=
      x-
      stadiumWorldCenter.x;

    const dz=
      z-
      stadiumWorldCenter.z;

    const yaw=
      -STADIUM_REFERENCE.yaw;

    const c=
      Math.cos(
        yaw
      );

    const s=
      Math.sin(
        yaw
      );

    const localX=
      dx*c-
      dz*s;

    const localZ=
      dx*s+
      dz*c;

    const halfW=
      STADIUM_REFERENCE.siteWidth*.5;

    const halfD=
      STADIUM_REFERENCE.siteDepth*.5;

    const margin=
      STADIUM_REFERENCE.terraceMargin;

    const outsideX=
      Math.max(
        0,
        Math.abs(localX)-
        halfW
      );

    const outsideZ=
      Math.max(
        0,
        Math.abs(localZ)-
        halfD
      );

    const outside=
      Math.hypot(
        outsideX,
        outsideZ
      );

    if(
      outside>=margin
    ){
      return 0;
    }

    if(
      outside<=.001
    ){
      return 1;
    }

    const p=
      THREE.MathUtils.clamp(
        outside/
        margin,
        0,
        1
      );

    const smooth=
      p*p*
      (
        3-
        2*p
      );

    return 1-smooth;
  }

  function applyVerifiedSiteTerraces(
    x,
    z,
    y
  ){
    const blend=
      stadiumTerraceBlend(
        x,
        z
      );

    if(
      blend<=0
    ){
      return y;
    }

    return THREE.MathUtils.lerp(
      y,
      STADIUM_REFERENCE.targetElevation,
      blend
    );
  }

  function enhanceTerrainMesh(root){
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

        // v74 reset:
        // keep the recovered terrain geometry as the terrain source.
        // Do not carve synthetic rivers, faction pads, tactical labels,
        // screenshot colours or procedural "detail" into the ground.
        for(let i=0;i<position.count;i++){
          const x=
            position.getX(i);

          const z=
            position.getZ(i);

          let y=
            position.getY(i)*
            verticalScale;

          y=
            applyVerifiedSiteTerraces(
              x,
              z,
              y
            );

          position.setY(
            i,
            y
          );
        }

        position.needsUpdate=true;

        geometry.computeVertexNormals();

        // Full-world planar UV.
        // Geometry x/z is GLB-local, so add root worldOffset before converting
        // to the 16.384km world texture coordinates.
        const uv=
          new Float32Array(
            position.count*
            2
          );

        for(let i=0;i<position.count;i++){
          const worldX=
            position.getX(i)+
            worldOffset.x;

          const worldZ=
            position.getZ(i)+
            worldOffset.z;

          uv[i*2]=
            THREE.MathUtils.clamp(
              (
                worldX+
                worldHalfX
              )/
              WORLD_CONFIG.width,
              0,
              1
            );

          uv[i*2+1]=
            THREE.MathUtils.clamp(
              (
                worldZ+
                worldHalfZ
              )/
              WORLD_CONFIG.depth,
              0,
              1
            );
        }

        geometry.setAttribute(
          'uv',
          new THREE.BufferAttribute(
            uv,
            2
          )
        );

        obj.material?.dispose?.();

        obj.material=
          new THREE.MeshStandardMaterial({
            color:0xffffff,
            map:groundTexture,
            roughness:.98,
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
      groundTexture=
        await loadGroundTexture();

      if(groundTexture){
        worldFloorMaterial.map=
          groundTexture;

        worldFloorMaterial.color.set(
          0xffffff
        );

        worldFloorMaterial.needsUpdate=true;
      }

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
          'Ozeti v70 · 地形已載入，準備建立3D場景';
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
