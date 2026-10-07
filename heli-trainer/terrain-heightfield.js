export function buildTerrainHeightfield({
  THREE,
  root,
  source
}){
  const nx=source.nx;
  const nz=source.nz;
  const width=source.width;
  const depth=source.depth;
  const halfX=width*.5;
  const halfZ=depth*.5;

  const heights=
    new Float32Array(
      nx*nz
    );

  heights.fill(NaN);

  const stepX=width/(nx-1);
  const stepZ=depth/(nz-1);
  const p=new THREE.Vector3();

  root.updateMatrixWorld(true);

  root.traverse(
    obj=>{
      if(!obj.isMesh){
        return;
      }

      const position=
        obj.geometry?.attributes?.position;

      if(!position){
        return;
      }

      for(
        let i=0;
        i<position.count;
        i++
      ){
        p.fromBufferAttribute(
          position,
          i
        );

        p.applyMatrix4(
          obj.matrixWorld
        );

        const localX=
          p.x-source.worldOffset.x;

        const localZ=
          p.z-source.worldOffset.z;

        const gx=Math.round(
          (localX+halfX)/stepX
        );

        const gz=Math.round(
          (localZ+halfZ)/stepZ
        );

        if(
          gx<0 ||
          gx>=nx ||
          gz<0 ||
          gz>=nz
        ){
          continue;
        }

        const index=gz*nx+gx;
        const old=heights[index];

        if(
          !Number.isFinite(old) ||
          p.y>old
        ){
          heights[index]=p.y;
        }
      }
    }
  );

  let valid=0;
  let minHeight=Infinity;
  let maxHeight=-Infinity;

  for(const value of heights){
    if(!Number.isFinite(value)){
      continue;
    }

    valid++;
    minHeight=Math.min(
      minHeight,
      value
    );
    maxHeight=Math.max(
      maxHeight,
      value
    );
  }

  const total=heights.length;
  const validRatio=valid/total;

  function sample(
    worldX,
    worldZ
  ){
    const localX=
      worldX-source.worldOffset.x;

    const localZ=
      worldZ-source.worldOffset.z;

    if(
      localX<-halfX ||
      localX>halfX ||
      localZ<-halfZ ||
      localZ>halfZ
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

    const x0=THREE.MathUtils.clamp(
      Math.floor(fx),
      0,
      nx-1
    );

    const z0=THREE.MathUtils.clamp(
      Math.floor(fz),
      0,
      nz-1
    );

    const x1=Math.min(
      x0+1,
      nx-1
    );

    const z1=Math.min(
      z0+1,
      nz-1
    );

    const h00=heights[z0*nx+x0];
    const h10=heights[z0*nx+x1];
    const h01=heights[z1*nx+x0];
    const h11=heights[z1*nx+x1];

    if(
      ![
        h00,
        h10,
        h01,
        h11
      ].every(Number.isFinite)
    ){
      return 0;
    }

    const tx=fx-x0;
    const tz=fz-z0;

    const h0=THREE.MathUtils.lerp(
      h00,
      h10,
      tx
    );

    const h1=THREE.MathUtils.lerp(
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

  return {
    heights,
    valid,
    total,
    validRatio,
    minHeight,
    maxHeight,
    relief:
      maxHeight-minHeight,
    sample
  };
}
