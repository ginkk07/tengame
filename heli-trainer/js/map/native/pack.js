// Data-only decoder for the public N4 Lab WDGP v1 asset format.
const TYPES={Float32Array,Uint32Array,Uint16Array,Uint8Array,Int8Array};
export function decodePack(buffer){
  const head=new DataView(buffer);
  if(buffer.byteLength<16 || head.getUint32(0,true)!==0x50474457 || head.getUint32(4,true)!==1)throw new Error('Unsupported WDGP asset');
  const length=head.getUint32(8,true),payload=head.getUint32(12,true);
  if(payload<16+length || payload>buffer.byteLength)throw new Error('Invalid WDGP header bounds');
  const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,16,length)));
  function view(v){
    const Type=TYPES[v.type];
    if(!Type || !Number.isInteger(v.offset) || !Number.isInteger(v.length) || v.offset<0 || v.length<0 || payload+v.offset+v.length*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw new Error('Invalid WDGP typed view');
    return new Type(buffer,payload+v.offset,v.length);
  }
  return {meta,view,buffer};
}
export async function fetchPack(url,{signal}={}){
  const res=await fetch(url,{signal});
  if(!res.ok)throw new Error('Map asset '+res.status+': '+url);
  const bytes=url.endsWith('.gz')?await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await res.arrayBuffer();
  if(signal?.aborted)throw new DOMException('Cancelled map chunk','AbortError');
  return decodePack(bytes);
}
export function geometryFromPack(THREE,pack,meta,{mirror=false,white=false}={}){
  const g=new THREE.BufferGeometry(),pos=meta.attributes.position;
  let positions,normals;
  if(pos.grid){
    const xs=pack.view(pos.grid.x),zs=pack.view(pos.grid.z),ys=pack.view(pos.grid.y);
    positions=new Float32Array(xs.length*zs.length*3);
    for(let z=0;z<zs.length;z++)for(let x=0;x<xs.length;x++){
      const i=z*xs.length+x;positions[i*3]=xs[x];positions[i*3+1]=ys[i];positions[i*3+2]=zs[z];
    }
  }else positions=new Float32Array(pack.view(pos.view));
  const n=meta.attributes.normal;
  if(n){
    const a=pack.view(n.view);normals=new Float32Array(positions.length);
    for(let i=0;i<positions.length/3;i++)for(let k=0;k<3;k++)normals[i*3+k]=n.normalized?Math.max(-1,a[i*n.itemSize+k]/127):a[i*n.itemSize+k];
  }
  if(mirror)for(let i=0;i<positions.length;i+=3){positions[i]*=-1;if(normals)normals[i]*=-1;}
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  if(normals)g.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  let indices;
  if(meta.index?.grid){
    const {columns,rows}=meta.index.grid;indices=new Uint32Array((columns-1)*(rows-1)*6);let k=0;
    for(let z=0;z<rows-1;z++)for(let x=0;x<columns-1;x++){
      const i=z*columns+x;indices[k++]=i;indices[k++]=i+columns;indices[k++]=i+1;
      indices[k++]=i+1;indices[k++]=i+columns;indices[k++]=i+columns+1;
    }
  }else if(meta.index)indices=new Uint32Array(pack.view(meta.index.view));
  else indices=Uint32Array.from({length:positions.length/3},(_,i)=>i);
  if(mirror)for(let i=0;i<indices.length;i+=3){const a=indices[i];indices[i]=indices[i+2];indices[i+2]=a;}
  g.setIndex(new THREE.BufferAttribute(indices,1));
  if(!normals)g.computeVertexNormals();
  const c=meta.attributes.color;
  let colors=new Uint8Array(positions.length);
  if(c && !white){
    const a=pack.view(c.view);
    for(let i=0;i<positions.length/3;i++)for(let k=0;k<3;k++)colors[i*3+k]=c.normalized?a[i*c.itemSize+k]:Math.round(a[i*c.itemSize+k]*255);
  }else colors.fill(255);
  g.setAttribute('color',new THREE.BufferAttribute(colors,3,true));
  const uv=meta.attributes.uv;
  if(uv){
    let a;
    if(uv.grid){const u=pack.view(uv.grid.u),v=pack.view(uv.grid.v);a=new Float32Array(u.length*v.length*2);for(let z=0;z<v.length;z++)for(let x=0;x<u.length;x++){const i=(z*u.length+x)*2;a[i]=u[x];a[i+1]=v[z];}}
    else a=new Float32Array(pack.view(uv.view));
    g.setAttribute('uv',new THREE.BufferAttribute(a,2));
  }
  g.computeBoundingBox();g.computeBoundingSphere();return g;
}
