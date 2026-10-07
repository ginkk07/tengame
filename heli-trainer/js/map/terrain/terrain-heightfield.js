function clamp(value,min,max){
  return Math.min(
    max,
    Math.max(min,value)
  );
}

function lerp(a,b,t){
  return a+(b-a)*t;
}

export function buildTerrainHeightfield({
  payload,
  source
}){
  const nx=source.nx;
  const nz=source.nz;
  const width=source.width;
  const depth=source.depth;
  const halfX=width*.5;
  const halfZ=depth*.5;
  if(!Number.isFinite(source.scale) || source.scale<=0){
    throw new Error('Ozeti master scale must be positive and finite');
  }

  // Scale X, Z, AND height by the same multiplier.
  const heights=Float32Array.from(
    payload.heights,
    value=>value*source.scale
  );

  if(
    !heights ||
    heights.length!==nx*nz
  ){
    throw new Error(
      'Ozeti v76 heightfield sample count mismatch'
    );
  }

  const minWorldX=
    source.worldOffset.x-halfX;
  const maxWorldX=
    source.worldOffset.x+halfX;
  const minWorldZ=
    source.worldOffset.z-halfZ;
  const maxWorldZ=
    source.worldOffset.z+halfZ;

  function inside(worldX,worldZ){
    return (
      worldX>=minWorldX &&
      worldX<=maxWorldX &&
      worldZ>=minWorldZ &&
      worldZ<=maxWorldZ
    );
  }

  function sampleInternal(
    worldX,
    worldZ,
    clampToBounds
  ){
    if(!clampToBounds && !inside(worldX,worldZ)){
      return 0;
    }

    const x=clamp(
      worldX,
      minWorldX,
      maxWorldX
    );

    const z=clamp(
      worldZ,
      minWorldZ,
      maxWorldZ
    );

    const fx=(
      (x-minWorldX)/width
    )*(nx-1);

    const fz=(
      (z-minWorldZ)/depth
    )*(nz-1);

    const x0=clamp(
      Math.floor(fx),
      0,
      nx-1
    );

    const z0=clamp(
      Math.floor(fz),
      0,
      nz-1
    );

    const x1=Math.min(x0+1,nx-1);
    const z1=Math.min(z0+1,nz-1);

    const h00=heights[z0*nx+x0];
    const h10=heights[z0*nx+x1];
    const h01=heights[z1*nx+x0];
    const h11=heights[z1*nx+x1];

    const tx=fx-x0;
    const tz=fz-z0;

    return lerp(
      lerp(h00,h10,tx),
      lerp(h01,h11,tx),
      tz
    );
  }

  function sample(worldX,worldZ){
    return sampleInternal(
      worldX,
      worldZ,
      false
    );
  }

  function sampleClamped(worldX,worldZ){
    return sampleInternal(
      worldX,
      worldZ,
      true
    );
  }

  function normalAt(
    worldX,
    worldZ,
    epsilon=16
  ){
    const hL=sampleClamped(
      worldX-epsilon,
      worldZ
    );
    const hR=sampleClamped(
      worldX+epsilon,
      worldZ
    );
    const hD=sampleClamped(
      worldX,
      worldZ-epsilon
    );
    const hU=sampleClamped(
      worldX,
      worldZ+epsilon
    );

    let nx=hL-hR;
    let ny=epsilon*2;
    let nz=hD-hU;

    const length=Math.hypot(nx,ny,nz)||1;

    nx/=length;
    ny/=length;
    nz/=length;

    return {x:nx,y:ny,z:nz};
  }

  return {
    heights,
    nx,
    nz,
    width,
    depth,
    minHeight:payload.minHeight*source.scale,
    maxHeight:payload.maxHeight*source.scale,
    relief:payload.relief*source.scale,
    bounds:{
      minX:minWorldX,
      maxX:maxWorldX,
      minZ:minWorldZ,
      maxZ:maxWorldZ
    },
    sample,
    sampleClamped,
    normalAt,
    inside
  };
}
