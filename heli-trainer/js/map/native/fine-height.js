// Remove isolated source spikes while retaining contiguous cliff faces and raw assets.
export function suppressIsolatedHeightSpikes(raw,size=513,threshold=64){
  const out=new Uint16Array(raw);let corrected=0;
  for(let z=1;z<size-1;z++)for(let x=1;x<size-1;x++){
    const i=z*size+x,c=raw[i];if(!c)continue;let lower=0,upper=0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz){const n=raw[i+dz*size+dx];if(n){if(c-n>threshold)lower++;if(n-c>threshold)upper++;}}
    if(lower>=5||upper>=5){const a=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const n=raw[i+dz*size+dx];if(n)a.push(n);}a.sort((a,b)=>a-b);out[i]=a[Math.floor(a.length/2)];corrected++;}
  }
  return {samples:out,corrected};
}
export function createFineHeightCache(bundle,baseUrl){
  const config=bundle.fineHeight,offset=bundle.world.offset;
  const startX=-config.worldM/2-offset[0]+config.cellM/2,startZ=-config.worldM/2-offset[1]+config.cellM/2;
  const tiles=new Map(config.tiles.map(t=>[t.z*16+t.x,t])),data=new Map(),pending=new Map(),controllers=new Map();let epoch=0;
  const decode=n=>n?config.minM+(n-1)*config.stepM-config.refElevM:NaN;
  async function load(x,z){
    const key=z*16+x;if(data.has(key))return data.get(key);if(pending.has(key))return pending.get(key);
    const tile=tiles.get(key);if(!tile||x<0||x>15||z<0||z>15)return null;
    const generation=epoch,controller=new AbortController();controllers.set(key,controller);
    const promise=(async()=>{
      const res=await fetch(baseUrl+tile.file,{signal:controller.signal});if(!res.ok)throw new Error('Fine height tile '+res.status+': '+tile.file);
      const raw=await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if(raw.byteLength!==513*513*2)throw new Error('Fine height tile size mismatch '+tile.file);
      const a=suppressIsolatedHeightSpikes(new Uint16Array(raw)).samples;if(generation===epoch)data.set(key,a);return a;
    })();
    pending.set(key,promise);try{return await promise;}finally{if(pending.get(key)===promise)pending.delete(key);if(controllers.get(key)===controller)controllers.delete(key);}
  }
  function sample(x,z){
    const gx=(x-startX)/config.cellM,gz=(z-startZ)/config.cellM;
    if(gx<0||gz<0||gx>8192||gz>8192)return NaN;
    let tx=Math.min(15,Math.floor(gx/512)),tz=Math.min(15,Math.floor(gz/512)),a=data.get(tz*16+tx);
    if(!a){const xs=[tx],zs=[tz];if(Math.abs(gx-tx*512)<1e-6&&tx>0)xs.push(tx-1);if(Math.abs(gz-tz*512)<1e-6&&tz>0)zs.push(tz-1);for(const z of zs)for(const x of xs)if(!a&&data.has(z*16+x)){a=data.get(z*16+x);tx=x;tz=z;}}
    if(!a)return NaN;
    const lx=gx-tx*512,lz=gz-tz*512,ix=Math.min(511,Math.floor(lx)),iz=Math.min(511,Math.floor(lz)),fx=lx-ix,fz=lz-iz,i=iz*513+ix;
    const h00=decode(a[i]),h10=decode(a[i+1]),h01=decode(a[i+513]),h11=decode(a[i+514]);
    if(![h00,h10,h01,h11].every(Number.isFinite))return NaN;
    return fx+fz<=1?h00+(h10-h00)*fx+(h01-h00)*fz:h11+(h01-h11)*(1-fx)+(h10-h11)*(1-fz);
  }
  function trim(keep,max=24){for(const key of data.keys()){if(data.size<=max)break;if(!keep.has(key))data.delete(key);}}
  function clear(){epoch++;data.clear();pending.clear();for(const c of controllers.values())c.abort();controllers.clear();}
  return {load,sample,trim,clear,decode,data,config,startX,startZ};
}
export function buildGroundTile(THREE,{x,z,intervals,cellM,startX,startZ,height,coarseHeight,uv,skirts=false}){
  const size=intervals+1,span=512*cellM,step=span/intervals,positions=[],uvs=[],indices=[];
  const ox=startX+x*span,oz=startZ+z*span;
  function add(px,y,pz){positions.push(px,y,pz);const [u,v]=uv(px,pz);uvs.push(u,1-v);return positions.length/3-1;}
  for(let row=0;row<size;row++)for(let col=0;col<size;col++)add(ox+col*step,height(ox+col*step,oz+row*step),oz+row*step);
  for(let row=0;row<intervals;row++)for(let col=0;col<intervals;col++){
    const px=ox+col*step,pz=oz+row*step;if(px>=-698&&px+step<=698&&pz>=-698&&pz+step<=698)continue;
    const i=row*size+col;indices.push(i,i+size,i+1,i+1,i+size,i+size+1);
  }
  if(skirts){
    const edges=[Array.from({length:size},(_,i)=>i),Array.from({length:size},(_,i)=>i*size+intervals),Array.from({length:size},(_,i)=>intervals*size+intervals-i),Array.from({length:size},(_,i)=>(intervals-i)*size)];
    for(const edge of edges){let previous=null;for(const top of edge){const i=top*3,px=positions[i],pz=positions[i+2],bottom=add(px,Math.min(positions[i+1],coarseHeight(px,pz))-3,pz);if(previous)indices.push(previous.top,previous.bottom,top,top,previous.bottom,bottom);previous={top,bottom};}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
