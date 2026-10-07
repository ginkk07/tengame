import {NATIVE_SCALE,NATIVE_OFFSET,worldToNative} from './coordinates.js';

// Collision data remains available before any visual detail chunk is loaded.
export function createPackedCollisions(data){
  if(data.length%6)throw new Error('Invalid collision bounds');
  const lists=new Map();
  for(let i=0;i<data.length;i+=6){
    const minX=data[i]*NATIVE_SCALE+NATIVE_OFFSET.x,minZ=data[i+2]*NATIVE_SCALE+NATIVE_OFFSET.z;
    const maxX=data[i+3]*NATIVE_SCALE+NATIVE_OFFSET.x,maxZ=data[i+5]*NATIVE_SCALE+NATIVE_OFFSET.z;
    for(let z=Math.floor(minZ/64);z<=Math.floor(maxZ/64);z++)for(let x=Math.floor(minX/64);x<=Math.floor(maxX/64);x++){
      const key=x+'_'+z;if(!lists.has(key))lists.set(key,[]);lists.get(key).push(i);
    }
  }
  const grid=new Map([...lists].map(([key,indices])=>[key,Uint32Array.from(indices)]));lists.clear();
  const indexBytes=[...grid.values()].reduce((s,a)=>s+a.byteLength,0);
  function resolveMovement(previous,current,clearance=2.2){
    const c=worldToNative(current.x,current.y,current.z),p=worldToNative(previous.x,previous.y,previous.z),r=clearance/NATIVE_SCALE;
    for(const i of grid.get(Math.floor(current.x/64)+'_'+Math.floor(current.z/64))||[]){
      if(c.x<data[i]-r||c.x>data[i+3]+r||c.z<data[i+2]-r||c.z>data[i+5]+r||c.y>data[i+4]+r||c.y<data[i+1]-r)continue;
      const topY=data[i+4]*NATIVE_SCALE+NATIVE_OFFSET.y;
      if(p.y>=data[i+4]+r-.1/NATIVE_SCALE){current.y=topY+clearance;return {kind:'structure',mode:'vertical',topY};}
      current.x=previous.x;current.z=previous.z;return {kind:'structure',mode:'horizontal',topY};
    }
    return null;
  }
  return {resolveMovement,stats:()=>({parts:data.length/6,bufferBytes:data.byteLength+indexBytes})};
}
