// Geometry reconstructed from mapinfo's close-up images, in source map metres.
// Object heights and secondary offsets are visual approximations.
function merge(THREE,geometries){
  const p=[],n=[];
  for(const original of geometries){
    const g=original.index?original.toNonIndexed():original;
    p.push(...g.attributes.position.array);n.push(...g.attributes.normal.array);
    if(g!==original)g.dispose();original.dispose();
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));
  g.computeBoundingBox();g.computeBoundingSphere();return g;
}

function builder(THREE){
  const colors=new Map();
  const add=(g,color)=>{if(!colors.has(color))colors.set(color,[]);colors.get(color).push(g);};
  return {
    box(size,pos,color,rotation=0){const g=new THREE.BoxGeometry(...size);if(rotation)g.rotateZ(rotation);g.translate(...pos);add(g,color);},
    cylinder(radius,height,pos,color,rotationZ=0,segments=8){const g=new THREE.CylinderGeometry(radius,radius,height,segments);if(rotationZ)g.rotateZ(rotationZ);g.translate(...pos);add(g,color);},
    beam(a,b,width,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);const g=new THREE.BoxGeometry(width,d.length(),width);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,color);},
    rock(radius,pos,color){const g=new THREE.IcosahedronGeometry(radius,0);g.scale(1,.6,.9);g.translate(...pos);add(g,color);},
    finish(){return [...colors].map(([color,gs])=>({geometry:merge(THREE,gs),material:new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0,flatShading:true})}));}
  };
}

function car(THREE,bus=false){
  const b=builder(THREE),length=bus?10.4:4.4,width=bus?2.6:1.8;
  b.box([width,bus?2.7:.9,length],[0,bus?1.9:.9,0],bus?0x347da5:0xc4cdd0);
  b.box([width*.86,bus?.95:.6,bus?length*.84:2.1],[0,bus?2.45:1.6,bus?0:-.25],0x3e525d);
  if(bus)b.box([width,.28,length],[0,3.35,0],0xa5bac6);
  for(const x of [-1,1])for(const z of [-1,1])b.cylinder(bus?.52:.35,bus?.32:.24,[x*width*.48,bus?.55:.38,z*length*.31],0x30363b,Math.PI/2);
  b.box([width*.8,.18,.12],[0,bus?1.05:.74,-length*.51],0xdde5cd);
  return b.finish();
}

function logs(THREE){
  const b=builder(THREE);
  for(let layer=0;layer<4;layer++)for(let row=0;row<8-layer;row++)b.cylinder(.3,14,[0,.3+layer*.52,(row-(7-layer)/2)*.62],0x836044,Math.PI/2,7);
  return b.finish();
}

function excavator(THREE){
  const b=builder(THREE);
  for(const x of [-1.1,1.1])b.box([.65,.7,3.8],[x,.45,0],0x454b47);
  b.box([2.5,.7,3],[0,1.02,0],0xb9674b);
  b.box([1.4,1.6,1.4],[-.6,2,.2],0x8ba883);
  b.box([1.2,.9,1.25],[-.6,2.35,.2],0x3b5153);
  b.beam([.55,1.45,-.6],[.55,4.9,-2.8],.34,0x5c895b);
  b.beam([.55,4.9,-2.8],[.55,2.1,-4.9],.29,0x659767);
  b.box([1.25,.65,.9],[.55,1.72,-4.95],0x575847);
  return b.finish();
}

function lamp(THREE){
  const b=builder(THREE);b.box([2,.35,2],[0,.17,0],0xb1b6b3);
  b.cylinder(.18,22,[0,11,0],0xbfc5c7);
  b.box([3.2,.2,.35],[0,22,0],0xb0b9bc);
  for(const x of [-1.1,0,1.1])b.box([.7,.6,.45],[x,22.35,-.1],0xe1e0d4);
  return b.finish();
}

function pylon(THREE){
  const b=builder(THREE);
  for(const x of [-1,1])for(const z of [-1,1])b.beam([x*3.2,0,z*3.2],[x*.9,26,z*.9],.17,0x929f9d);
  for(let y=2;y<24;y+=4){const h=3.2-y/26*2.3;for(const z of [-1,1]){b.beam([-h,y,z*h],[h,y+4,z*h],.1,0x9ca9a8);b.beam([h,y,z*h],[-h,y+4,z*h],.1,0x9ca9a8);}for(const x of [-1,1])b.beam([x*h,y,-h],[x*h,y+4,h],.1,0x9ca9a8);}
  b.box([13,.23,.4],[0,24,0],0x929f9d);b.box([9,.23,.4],[0,28,0],0x929f9d);
  return b.finish();
}

function ruin(THREE){
  const b=builder(THREE),wall=0xb3bcc0,slab=0x9eabad;
  b.box([30,1,36],[0,.5,0],0x8d9697);
  for(const y of [1.1,6.4,11.7,17]){
    b.box([30,.55,8],[0,y,-14],slab);b.box([12,.55,28],[-9,y,4],slab);
    b.box([12,.55,15],[9,y,10.5],slab);
  }
  for(let floor=0;floor<3;floor++){
    const y=3.7+floor*5.3;
    for(const x of [-14.4,14.4]){
      b.box([.7,1.8,36],[x,y-1.6,0],wall);
      for(let z=-16;z<=16;z+=5.4)b.box([.7,5,1.3],[x,y,z],wall);
    }
    for(const z of [-17.4,17.4]){
      b.box([30,1.5,.7],[0,y-1.7,z],wall);
      for(let x=-13;x<=13;x+=5.2)b.box([1.1,4.5,.7],[x,y,z],wall);
    }
  }
  b.box([7,2.6,11],[10,17.7,-7],0x939fa2);
  b.box([4,.25,13],[-9,4,-10],0x838f91,-.42);
  const group=new THREE.Group();
  for(const p of b.finish()){const m=new THREE.Mesh(p.geometry,p.material);m.castShadow=true;m.receiveShadow=true;group.add(m);}
  return group;
}

export function registerCapturedModels(registry){
  registry.register({id:'building.timber_shed',category:'building',mode:'unique',sourceUnitScale:true,alignToTerrain:false,createObject(THREE){
    const b=builder(THREE);
    b.box([16,.4,32],[0,7.8,0],0xb3bec4);
    b.box([16,.2,32],[0,.1,0],0xa6a397);
    for(const x of [-7.7,7.7])for(const z of [-15,-5,5,15])b.box([.32,7.6,.32],[x,3.8,z],0x8a9697);
    b.box([.25,3.5,32],[-7.8,1.75,0],0x9aa9ad);
    const g=new THREE.Group();for(const part of b.finish()){const m=new THREE.Mesh(part.geometry,part.material);m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;
  }});
  const defs={
    'prop.car':T=>car(T), 'prop.bus':T=>car(T,true), 'prop.logs':logs,
    'prop.excavator':excavator,'prop.lamp':lamp,'prop.pylon':pylon,
    'prop.crates':T=>{const b=builder(T);for(const [x,y,z] of [[-.6,.65,0],[.7,.65,0],[0,1.7,0]])b.box([1.2,1.2,1.1],[x,y,z],0xa88a61);return b.finish();},
    'prop.fence':T=>{const b=builder(T);for(const x of [-4,0,4])b.box([.13,1.9,.13],[x,.95,0],0x806246);b.box([8,1.2,.1],[0,.8,0],0x97794f);return b.finish();},
    'prop.barrier':T=>{const b=builder(T);b.box([4,.75,.45],[0,.38,0],0xc0c4b9);return b.finish();},
    'prop.rock':T=>{const b=builder(T);b.rock(1.5,[0,.6,0],0xaca79a);return b.finish();}
  };
  for(const [id,fn] of Object.entries(defs))registry.register({id,category:'prop',mode:'instanced',sourceUnitScale:true,alignToTerrain:false,defaultCapacity:128,createParts:fn});
  registry.register({id:'landmark.control_ruin',category:'building',mode:'unique',sourceUnitScale:true,alignToTerrain:false,createObject:ruin});
}
