export async function loadTerrainHeightfield({
  assetUrl,
  nx,
  nz,
  reliefMeters
}){
  const response=await fetch(
    assetUrl,
    {cache:'no-store'}
  );

  if(!response.ok){
    throw new Error(
      'Ozeti heightfield HTTP '+
      response.status+' '+
      response.statusText
    );
  }

  const buffer=
    await response.arrayBuffer();

  const sampleCount=nx*nz;
  const expectedBytes=sampleCount*2;

  if(buffer.byteLength!==expectedBytes){
    throw new Error(
      'Ozeti heightfield byte length '+
      buffer.byteLength+
      ' != '+
      expectedBytes
    );
  }

  const view=new DataView(buffer);
  const heights=new Float32Array(sampleCount);

  let minHeight=Infinity;
  let maxHeight=-Infinity;

  for(let i=0;i<sampleCount;i++){
    const raw=view.getUint16(i*2,true);
    const height=(raw/65535)*reliefMeters;

    heights[i]=height;
    minHeight=Math.min(minHeight,height);
    maxHeight=Math.max(maxHeight,height);
  }

  if(
    !Number.isFinite(minHeight) ||
    !Number.isFinite(maxHeight)
  ){
    throw new Error(
      'Ozeti heightfield contains no finite samples'
    );
  }

  if(Math.abs(minHeight)>0.001){
    throw new Error(
      'Ozeti heightfield minimum '+
      minHeight+
      ' is not 0 m'
    );
  }

  if(
    Math.abs(maxHeight-reliefMeters)>
    0.01
  ){
    throw new Error(
      'Ozeti heightfield relief '+
      maxHeight+
      ' != '+
      reliefMeters+' m'
    );
  }

  return {
    heights,
    sampleCount,
    minHeight,
    maxHeight,
    relief:maxHeight-minHeight
  };
}
