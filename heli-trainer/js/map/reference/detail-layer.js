import {CAPTURE_RIVERS} from './capture-data.js?v=93';
import {WORLD_CONFIG} from '../map-data.js?v=93';
import {mapMetersToWorld} from '../master/coordinate-transform.js?v=93';

const SCALE=WORLD_CONFIG.scale;
const SECTOR='capture-details-v93';
const modelBounds={
 'prop.car':[1,2.3,2], 'prop.bus':[1.5,5.4,3.6], 'prop.logs':[7,2.8,2.5],
 'prop.crates':[1.4,.8,2.3], 'prop.excavator':[2,5,5.2],
 'prop.lamp':[.5,.5,22.8], 'prop.pylon':[3.5,3.5,28.3],
 'prop.fence':[4,.25,1.9], 'prop.barrier':[2,.4,.75], 'prop.rock':[1.5,1.5,1.8]
};
const hash=(n)=>{const v=Math.sin(n*12.9898+78.233)*43758.5453;return v-Math.floor(v);};

export function capturedPropPlacements(){
 const a=[];
 const put=(model,mapX,mapY,rotationY=0,scale=1)=>a.push({model,mapX,mapY,rotationY,scale,alignToTerrain:false});
 for(const [cx,cy,name] of [[6890,8805,'manticore'],[13760,6700,'valkyra'],[8390,3150,'lonestar']]){
   for(let i=0;i<12;i++){
     const x=cx-120+(i%4)*75,y=cy+70+Math.floor(i/4)*65;
     put('prop.crates',x+13,y-15,.1+i*.13);
     if(name==='manticore' || i<4)put('prop.logs',x,y,.15,1+.2*hash(i+cx));
     if(i%3===0)put('prop.car',x+30,y-35,Math.PI*.5);
   }
   for(const [x,y] of [[-150,-100],[-150,150],[140,-70],[150,140]])put('prop.lamp',cx+x,cy+y);
   if(name==='manticore')for(const [x,y] of [[-110,145],[140,110],[170,-100]])put('prop.excavator',cx+x,cy+y,.4);
 }
 // Stadium parking and roadside groups visible in the recorded tower-1 views.
 for(let row=0;row<3;row++)for(let col=0;col<12;col++)put('prop.car',9605+col*7,6530+row*10,row%2?Math.PI:0);
 for(let i=0;i<8;i++)put('prop.bus',9630+i*16,6420,Math.PI/2);
 for(let i=0;i<24;i++)put('prop.car',9640+i*18,6370+i*.15,Math.PI/2);
 for(const [x,y] of [[9440,6520],[9900,6440],[10190,6200],[6880,8940]])put('prop.pylon',x,y,.05);
 for(let i=0;i<14;i++){put('prop.logs',10080+(i%5)*13,5800+Math.floor(i/5)*11,.25);if(i%4===0)put('prop.excavator',10160,5790+i*9,.3);}
 const fences=[[[6740,8660],[6740,8910],[6890,8960]],[[13420,6700],[13600,6700],[13600,6820],[13420,6820]],[[8190,3070],[8500,3070],[8500,3310]],[[9490,6250],[9490,6130],[9640,6130]],[[9790,6370],[9950,6370]]];
 for(const line of fences)for(let i=1;i<line.length;i++){
   const [ax,ay]=line[i-1],[bx,by]=line[i],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),n=Math.ceil(L/8);
   for(let j=0;j<n;j++){const t=(j+.5)/n;put('prop.fence',ax+dx*t,ay+dy*t,Math.atan2(dy,dx),[L/n/8,1,1]);}
 }
 for(let i=0;i<26;i++)put('prop.barrier',9690+i*5,6400,.03);
 for(const river of CAPTURE_RIVERS)for(let i=1;i<river.points.length;i++){
   const [ax,ay]=river.points[i-1],[bx,by]=river.points[i],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),n=Math.ceil(L/145);
   for(let j=0;j<n;j++){const t=(j+.3)/n,side=(hash(i*100+j)-.5)*river.width*.6;put('prop.rock',ax+dx*t-dy/L*side,ay+dy*t+dx/L*side,hash(i+j)*6.28,.5+hash(j+700)*1.2);}
 }
 return a;
}

export function createCapturedDetailLayer({THREE,scene,objects,terrainHeight}){
 const group=new THREE.Group();group.name='CapturedRiverAndBridgesV93';scene.add(group);
 const collisions=[],grid=new Map();let loaded=false,props=0,bridges=0;
 const gravelBytes=new Uint8Array(64*64*4);
 for(let i=0;i<64*64;i++){const v=Math.round(175+hash(i+913)*80);gravelBytes.set([v,v,v,255],i*4);}
 const gravelTexture=new THREE.DataTexture(gravelBytes,64,64,THREE.RGBAFormat);
 gravelTexture.wrapS=gravelTexture.wrapT=THREE.RepeatWrapping;gravelTexture.generateMipmaps=true;gravelTexture.minFilter=THREE.LinearMipmapLinearFilter;gravelTexture.needsUpdate=true;
 const materials=[new THREE.MeshStandardMaterial({color:0xc3c2b6,map:gravelTexture,roughness:1}),new THREE.MeshStandardMaterial({color:0x667477,roughness:.9})];
 function addCollision(r){collisions.push(r);const k=`${Math.floor(r.x/128)}_${Math.floor(r.z/128)}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(r);}
 function riverMesh(river){
   const positions=[],colors=[],uvs=[],indices=[];let previous=null;
   for(let seg=1;seg<river.points.length;seg++){
     const [ax,ay]=river.points[seg-1],[bx,by]=river.points[seg],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),steps=Math.ceil(L/30);
     for(let j=0;j<steps+(seg===river.points.length-1?1:0);j++){
       const t=j/steps,x=ax+dx*t,y=ay+dy*t,index=positions.length/3;
       for(const side of [-1,1]){
         const p=mapMetersToWorld(x-dy/L*river.width*.5*side,y+dx/L*river.width*.5*side);
         positions.push(p.x,terrainHeight(p.x,p.z)+.22,p.z);uvs.push(p.x/(12*SCALE),p.z/(12*SCALE));const k=.91+hash(index+seg)*.16;colors.push(k,k,k*.96);
       }
       if(previous!==null)indices.push(previous,index,previous+1,previous+1,index,index+1);
       previous=index;
     }
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
   const m=materials[0].clone();m.vertexColors=true;const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;mesh.name='Dry gravel channel '+river.id;group.add(mesh);
 }
 function bridge(a,b,width){
   const p=mapMetersToWorld(...a),q=mapMetersToWorld(...b),dx=q.x-p.x,dz=q.z-p.z,L=Math.hypot(dx,dz),x=(p.x+q.x)/2,z=(p.z+q.z)/2;
   const y=Math.max(terrainHeight(p.x,p.z),terrainHeight(q.x,q.z))+3.2*SCALE;
   const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(dx,dz);
   const deck=new THREE.Mesh(new THREE.BoxGeometry(width*SCALE,1.1*SCALE,L),materials[1]);deck.receiveShadow=true;deck.castShadow=true;g.add(deck);
   for(const localZ of [-L*.3,0,L*.3]){
     const wx=x+Math.sin(g.rotation.y)*localZ,wz=z+Math.cos(g.rotation.y)*localZ;
     const height=Math.max(.5,y-.55*SCALE-terrainHeight(wx,wz));
     const pier=new THREE.Mesh(new THREE.CylinderGeometry(.8*SCALE,1.05*SCALE,height,6),materials[1]);
     pier.position.set(0,-height*.5-.55*SCALE,localZ);pier.castShadow=true;g.add(pier);
   }
   for(const s of [-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.25*SCALE,.7*SCALE,L),materials[1]);rail.position.set(s*width*SCALE*.49,.9*SCALE,0);g.add(rail);}
   scene.add(g);bridges++;
   addCollision({kind:'bridge',x,z,yaw:g.rotation.y,groundY:y-1,topY:y+.55*SCALE,halfW:width*SCALE*.5,halfD:L*.5});
 }
 function rebuild(){
   if(loaded)return stats();
   const placements=capturedPropPlacements();objects.placement.placeMany(placements,{sectorId:SECTOR});props=placements.length;
   for(const spec of placements){const p=mapMetersToWorld(spec.mapX,spec.mapY),b=modelBounds[spec.model],s=Array.isArray(spec.scale)?spec.scale:[spec.scale,spec.scale,spec.scale],groundY=terrainHeight(p.x,p.z);addCollision({kind:'prop',model:spec.model,x:p.x,z:p.z,yaw:spec.rotationY,groundY,topY:groundY+b[2]*s[1]*SCALE,halfW:b[0]*s[0]*SCALE,halfD:b[1]*s[2]*SCALE});}
   CAPTURE_RIVERS.forEach(riverMesh);
   bridge([9875,6160],[9875,5980],14);bridge([9380,6100],[9480,5940],14);
   loaded=true;return stats();
 }
 function hitTest(x,y,z,clearance=0){
   const ix=Math.floor(x/128),iz=Math.floor(z/128);
   for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)for(const r of grid.get(`${ix+dx}_${iz+dz}`)||[]){
     if(y>r.topY+clearance)continue;
     const c=Math.cos(r.yaw),s=Math.sin(r.yaw),ox=x-r.x,oz=z-r.z;
     if(Math.abs(ox*c-oz*s)<=r.halfW+clearance && Math.abs(ox*s+oz*c)<=r.halfD+clearance)return r;
   }
   return null;
 }
 function resolveMovement(previous,current,clearance=2.2){
   const hit=hitTest(current.x,current.y,current.z,clearance);if(!hit)return null;
   if(previous.y>hit.topY+clearance){current.y=hit.topY+clearance;return {kind:hit.kind,mode:'vertical',topY:hit.topY};}
   current.x=previous.x;current.z=previous.z;return {kind:hit.kind,mode:'horizontal',topY:hit.topY};
 }
 function stats(){return {loaded,props,bridges,riverPaths:CAPTURE_RIVERS.length,collisionObjects:collisions.length};}
 return {rebuild,stats,hitTest,resolveMovement,group};
}
