import {NATIVE_SCALE,NATIVE_OFFSET} from './coordinates.js';
export function createNativeCollisions(){
  const grid=new Map();let count=0;
  function add(box){
    const w=box.max.x-box.min.x,h=box.max.y-box.min.y,d=box.max.z-box.min.z;
    // Structural parts only. Keep courtyards open instead of enclosing a whole block.
    if(h<1 || Math.max(w,d)<1 || w*d<.15 || w>300 || d>300)return;
    const a={minX:box.min.x*NATIVE_SCALE+NATIVE_OFFSET.x,maxX:box.max.x*NATIVE_SCALE+NATIVE_OFFSET.x,minZ:box.min.z*NATIVE_SCALE+NATIVE_OFFSET.z,maxZ:box.max.z*NATIVE_SCALE+NATIVE_OFFSET.z,minY:box.min.y*NATIVE_SCALE+NATIVE_OFFSET.y,maxY:box.max.y*NATIVE_SCALE+NATIVE_OFFSET.y};
    for(let z=Math.floor(a.minZ/64);z<=Math.floor(a.maxZ/64);z++)for(let x=Math.floor(a.minX/64);x<=Math.floor(a.maxX/64);x++){const key=x+'_'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(a);}count++;
  }
  function resolveMovement(previous,current,clearance=2.2){
    for(const a of grid.get(Math.floor(current.x/64)+'_'+Math.floor(current.z/64))||[]){
      if(current.x<a.minX-clearance || current.x>a.maxX+clearance || current.z<a.minZ-clearance || current.z>a.maxZ+clearance || current.y>a.maxY+clearance || current.y<a.minY-clearance)continue;
      if(previous.y>=a.maxY+clearance-.1){current.y=a.maxY+clearance;return {kind:'structure',mode:'vertical',topY:a.maxY};}
      current.x=previous.x;current.z=previous.z;return {kind:'structure',mode:'horizontal',topY:a.maxY};
    }
    return null;
  }
  return {add,resolveMovement,stats:()=>({parts:count})};
}
