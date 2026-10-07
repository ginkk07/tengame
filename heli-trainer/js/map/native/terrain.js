import {geometryFromPack} from './pack.js';
import {CALIBRATION,NATIVE_SCALE,NATIVE_OFFSET,worldToNative} from './coordinates.js';
import {createFineHeightCache,buildGroundTile} from './fine-height.js';
import {createOuterGroundMaterial} from './ground-material.js';
import {yieldToBrowser} from './yield.js';
function bilinear(a,size,u,v,decode){
  const x=Math.max(0,Math.min(size-1,u)),z=Math.max(0,Math.min(size-1,v)),ix=Math.min(size-2,Math.floor(x)),iz=Math.min(size-2,Math.floor(z)),fx=x-ix,fz=z-iz;
  const aa=decode(a[iz*size+ix]),b=decode(a[iz*size+ix+1]),c=decode(a[(iz+1)*size+ix]),d=decode(a[(iz+1)*size+ix+1]);
  if(![aa,b,c,d].every(Number.isFinite))return NaN;return aa*(1-fx)*(1-fz)+b*fx*(1-fz)+c*(1-fx)*fz+d*fx*fz;
}
export async function createNativeTerrain({THREE,group,pack,bundle,baseUrl}){
  const [hb,rb]=await Promise.all(['world-heights-1025.u16','surround-heights-2048.u16'].map(async f=>{const r=await fetch(baseUrl+f);if(!r.ok)throw new Error('Missing native raster '+f);return r.arrayBuffer();}));
  const heights=new Uint16Array(hb),surround=new Uint16Array(rb),size=bundle.height.size,{worldM,offset}=bundle.world;
  const startX=-worldM/2-offset[0]+bundle.height.halfPixelM,startZ=-worldM/2-offset[1]+bundle.height.halfPixelM,cell=bundle.height.cellM;
  const decode=n=>n?bundle.height.minM+(n-1)*bundle.height.stepM-bundle.height.refElevM:NaN;
  const fine=createFineHeightCache(bundle,baseUrl);
  function uv(x,z){return [(CALIBRATION.originX+x*CALIBRATION.unitsPerMetre)/163.84,1-(CALIBRATION.originY-z*CALIBRATION.unitsPerMetre)/163.84];}
  function coarseHeight(x,z){let y=bilinear(heights,size,(x-startX)/cell,(z-startZ)/cell,decode);if(!Number.isFinite(y)){const [u,v]=uv(x,z);y=bilinear(surround,2048,u*2048-.5,v*2048-.5,decode);}return Number.isFinite(y)?y:0;}
  const terrainMeta=structuredClone(Object.values(pack.meta.geometries)[0]),cityData=new Map();delete terrainMeta.attributes.color;
  const descriptorKey=d=>d.type+':'+d.offset+':'+d.length;
  function copyViews(value){
    if(!value||typeof value!=='object')return;
    if('offset'in value&&'length'in value&&'type'in value){const a=pack.view(value);cityData.set(descriptorKey(value),new a.constructor(a));return;}
    for(const v of Object.values(value))copyViews(v);
  }
  copyViews(terrainMeta);const cityPack={view:d=>cityData.get(descriptorKey(d))};
  const cityY=cityPack.view(terrainMeta.attributes.position.grid.y),cityX=cityPack.view(terrainMeta.attributes.position.grid.x),cityZ=cityPack.view(terrainMeta.attributes.position.grid.z);
  function nativeHeight(x,z){
    if(x>=cityX[0]&&x<=cityX.at(-1)&&z>=cityZ[0]&&z<=cityZ.at(-1)){
      const s=cityX.length,xx=(x-cityX[0])/(cityX.at(-1)-cityX[0])*(s-1),zz=(z-cityZ[0])/(cityZ.at(-1)-cityZ[0])*(s-1),ix=Math.min(s-2,Math.floor(xx)),iz=Math.min(s-2,Math.floor(zz)),tx=xx-ix,tz=zz-iz,i=iz*s+ix,a=cityY[i],b=cityY[i+1],c=cityY[i+s],d=cityY[i+s+1];
      return tx+tz<=1?a+(b-a)*tx+(c-a)*tz:d+(c-d)*(1-tx)+(b-d)*(1-tz);
    }
    const y=fine.sample(x,z);return Number.isFinite(y)?y:coarseHeight(x,z);
  }
  const t=pack.meta.textures[0],url=URL.createObjectURL(new Blob([pack.view(t.bytes)],{type:t.mimeType}));let texture;
  try{texture=await new THREE.TextureLoader().loadAsync(url);}finally{URL.revokeObjectURL(url);}
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const surfaceTexture=await new THREE.TextureLoader().loadAsync(baseUrl+'world-surface.png');surfaceTexture.colorSpace=THREE.SRGBColorSpace;surfaceTexture.anisotropy=8;
  const material=createOuterGroundMaterial(THREE,surfaceTexture,texture,bundle.groundDetail),coarseTiles=new Map(),fineTiles=new Map(),outer=new THREE.Group();outer.name='world-2m-detail-terrain';group.add(outer);
  for(let z=0;z<16;z++)for(let x=0;x<16;x++){
    const g=buildGroundTile(THREE,{x,z,intervals:32,cellM:bundle.fineHeight.cellM,startX:fine.startX,startZ:fine.startZ,height:nativeHeight,uv}),mesh=new THREE.Mesh(g,material);mesh.name='world terrain distant '+x+','+z;mesh.receiveShadow=true;outer.add(mesh);coarseTiles.set(z*16+x,mesh);
  }
  function makeCityGeometry(step){
    if(step===1){const g=geometryFromPack(THREE,cityPack,terrainMeta);g.deleteAttribute('color');return g;}
    const xs=cityX.filter((_,i)=>i%step===0),zs=cityZ.filter((_,i)=>i%step===0),ys=new Float32Array(xs.length*zs.length);
    for(let z=0;z<zs.length;z++)for(let x=0;x<xs.length;x++)ys[z*xs.length+x]=cityY[z*step*cityX.length+x*step];
    const u=cityPack.view(terrainMeta.attributes.uv.grid.u).filter((_,i)=>i%step===0),v=cityPack.view(terrainMeta.attributes.uv.grid.v).filter((_,i)=>i%step===0);
    const g=geometryFromPack(THREE,{view:d=>d},{attributes:{position:{grid:{x:xs,y:ys,z:zs}},uv:{grid:{u,v}}},index:{grid:{columns:xs.length,rows:zs.length}}});g.deleteAttribute('color');return g;
  }
  let cityFine=false;
  const city=new THREE.Mesh(makeCityGeometry(8),new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));city.name='original-city-terrain-and-texture';city.receiveShadow=true;group.add(city);
  // Height queries need only the small sample arrays, not the embedded texture pack.
  pack=null;
  let request=0,activeKey='',error=null,pendingCount=0;const listeners=[];
  function remove(key){const item=fineTiles.get(key);if(item){outer.remove(item.mesh);item.mesh.geometry.dispose();fineTiles.delete(key);}coarseTiles.get(key).visible=true;}
  async function updateView(n,quality,far){
    if(far)fine.clear();
    const nearCity=!far&&Math.hypot(Math.max(cityX[0]-n.x,0,n.x-cityX.at(-1)),Math.max(cityZ[0]-n.z,0,n.z-cityZ.at(-1)))<450/NATIVE_SCALE;
    if(cityFine!==nearCity){city.geometry.dispose();city.geometry=makeCityGeometry(nearCity?1:8);cityFine=nearCity;}
    const tx=Math.min(15,Math.max(0,Math.floor((n.x-fine.startX)/1020))),tz=Math.min(15,Math.max(0,Math.floor((n.z-fine.startZ)/1020))),targets=[];
    if(!far)for(let z=tz-1;z<=tz+1;z++)for(let x=tx-1;x<=tx+1;x++)if(x>=0&&x<16&&z>=0&&z<16){
      const ox=fine.startX+x*1020,oz=fine.startZ+z*1020,d=Math.hypot(Math.max(ox-n.x,0,n.x-ox-1020),Math.max(oz-n.z,0,n.z-oz-1020));
      const intervals=d<600/NATIVE_SCALE?(quality==='smooth'?256:512):128;
      targets.push({x,z,key:z*16+x,d,intervals});
    }
    targets.sort((a,b)=>a.d-b.d);const key=targets.map(t=>t.key+':'+t.intervals).sort().join(',');if(activeKey===key)return;activeKey=key;const epoch=++request,keep=new Set(targets.map(t=>t.key));
    for(const [k,item] of fineTiles){const target=targets.find(t=>t.key===k);if(!target||item.intervals!==target.intervals)remove(k);}
    pendingCount=targets.filter(t=>!fineTiles.has(t.key)).length;fine.trim(keep,far?0:12);
    try{
      for(const tile of targets){
        if(epoch!==request)return;if(fineTiles.has(tile.key))continue;await fine.load(tile.x,tile.z);if(epoch!==request)return;fine.trim(keep,12);
        const intervals=tile.intervals,g=buildGroundTile(THREE,{x:tile.x,z:tile.z,intervals,cellM:fine.config.cellM,startX:fine.startX,startZ:fine.startZ,height:nativeHeight,coarseHeight,uv,skirts:true});
        const mesh=new THREE.Mesh(g,material);mesh.name='world terrain 2m '+tile.x+','+tile.z;mesh.receiveShadow=true;outer.add(mesh);fineTiles.set(tile.key,{mesh,intervals});coarseTiles.get(tile.key).visible=false;pendingCount--;
        for(const listener of listeners)listener();await yieldToBrowser();
      }
      fine.trim(keep,far?0:12);error=null;
    }catch(e){if(epoch===request){error=e.message;console.error('Fine terrain loading failed',e);}}
  }
  function bufferBytes(){let total=heights.byteLength+surround.byteLength;for(const a of cityData.values())total+=a.byteLength;for(const a of fine.data.values())total+=a.byteLength;for(const mesh of [city,...outer.children]){total+=mesh.geometry.index?.array.byteLength||0;for(const a of Object.values(mesh.geometry.attributes))total+=a.array.byteLength;}return total;}
  return {height(x,z){const n=worldToNative(x,0,z);return nativeHeight(n.x,n.z)*NATIVE_SCALE+NATIVE_OFFSET.y;},nativeHeight,outerHeight:nativeHeight,coarseHeight,city,outer,fine,coarseTiles,fineTiles,gridSize:cityX.length,updateView,onFineHeights(fn){listeners.push(fn);},stats(){return {readyTiles:fineTiles.size,pendingTiles:pendingCount,spacingM:2,error,bufferBytes:bufferBytes(),cityFine};}};
}
