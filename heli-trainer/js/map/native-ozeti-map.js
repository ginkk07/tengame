import {fetchPack,geometryFromPack} from './native/pack.js';
import {NATIVE_SCALE,NATIVE_OFFSET,worldToNative} from './native/coordinates.js';
import {createNativeTerrain} from './native/terrain.js';
import {createBatchStore,sceneReferences,addSceneActors} from './native/batches.js';
import {createChunkStreamer,buildChunkStore} from './native/chunk-streamer.js';
import {createPackedCollisions} from './native/packed-collisions.js';
import {createForestFallbackMaterial} from './native/forest-fallback.js';
import {createNativeRoads} from './native/roads.js';
import {createTacticalMap} from './tactical-map.js';
import {factionCenterWorld} from './factions.js';
import {yieldToBrowser} from './native/yield.js';
const BASE='./assets/native/',STREAM=BASE+'streaming/';
const tick=yieldToBrowser;
async function gzipBytes(url){const r=await fetch(url);if(!r.ok)throw new Error('Map data '+r.status+': '+url);return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
function geometryBytes(g){return Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,g.index?.array.byteLength||0);}

export function createOzetiMap({THREE,scene,root,stage,state,heli,orient,statusEl,clearPressed,onTeleport,onMapOpen}){
  const group=new THREE.Group();group.name='Ozeti original geometry with regional streaming';group.scale.setScalar(NATIVE_SCALE);group.position.set(NATIVE_OFFSET.x,NATIVE_OFFSET.y,NATIVE_OFFSET.z);scene.add(group);
  let terrain,bundle,catalog,lowStructures,cityTrees,streamer,collisions,roads,forestMaterial,forestBytes=0;
  let ready=false,lastFocus=null,lastTime=0,lastFar=false,memoryBytes=0;
  const progress=s=>{if(statusEl)statusEl.textContent=s;};
  const tactical=createTacticalMap({root,stage,state,heli,orient,terrainHeight:(x,z)=>terrain?.height(x,z)||0,clearPressed,onTeleport,onMapOpen});
  async function load(){
    progress('載入地形與遠景輪廓…');
    bundle=await (await fetch(BASE+'bundle.json')).json();catalog=await (await fetch(STREAM+'catalog.json')).json();
    let [terrainPack,roadPack,vegetationPack,sharedVegetation,geometryBank,collisionBytes]=await Promise.all([
      fetchPack(BASE+bundle.files['ozeti-terrain']),fetchPack(BASE+bundle.files['ozeti-roads']),
      fetchPack(BASE+bundle.files['ozeti-vegetation-lq']),fetchPack(BASE+bundle.files['shared-vegetation-lq']),
      fetchPack(STREAM+catalog.residentGeometryFile),gzipBytes(STREAM+catalog.collisionFile)
    ]);
    terrain=await createNativeTerrain({THREE,group,pack:terrainPack,bundle,baseUrl:BASE});terrainPack=null;
    roads=createNativeRoads(THREE,group,roadPack,terrain);roadPack=null;terrain.onFineHeights(()=>roads.updateHeights());
    collisions=createPackedCollisions(new Float32Array(collisionBytes));collisionBytes=null;await tick();
    progress('建立全圖簡化建築與森林輪廓…');
    lowStructures=await buildChunkStore({THREE,group,baseUrl:STREAM,catalog,chunk:catalog.chunks.find(c=>c.family==='structures-lq'),geometryBank});geometryBank=null;lowStructures.mesh.visible=true;
    const refs=sceneReferences([vegetationPack],[sharedVegetation]);
    cityTrees=createBatchStore(THREE,group,refs,vegetationPack.meta.stats.instances);addSceneActors(THREE,cityTrees,vegetationPack);for(const a of cityTrees.actors)a.tag|=2;refs.clear();vegetationPack=null;
    const proxy=geometryFromPack(THREE,sharedVegetation,Object.values(sharedVegetation.meta.geometries)[0],{white:true});proxy.deleteAttribute('uv');sharedVegetation=null;
    forestMaterial=createForestFallbackMaterial(THREE);
    const response=await fetch(BASE+'world-forest-lod.f32');if(!response.ok)throw new Error('Forest outlines missing');
    const rows=new Float32Array(await response.arrayBuffer()),mat=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),local=new THREE.Matrix4(),center=new THREE.Vector3(),extent=new THREE.Vector3(),color=new THREE.Color();
    forestBytes=geometryBytes(proxy);
    for(const c of bundle.forestCells){
      if(!c.count)continue;
      const mesh=new THREE.InstancedMesh(proxy,forestMaterial.material,c.count);mesh.name='forest far cell '+c.x+','+c.z;
      for(let j=0;j<c.count;j++){
        const i=(c.start+j)*19;p.fromArray(rows,i);q.fromArray(rows,i+3);s.fromArray(rows,i+7);mat.compose(p,q,s);
        center.set((rows[i+10]+rows[i+13])*.5,(rows[i+11]+rows[i+14])*.5,(rows[i+12]+rows[i+15])*.5);
        extent.set(Math.max(.05,rows[i+13]-rows[i+10]),Math.max(.05,rows[i+14]-rows[i+11]),Math.max(.05,rows[i+15]-rows[i+12]));
        local.makeScale(extent.x,extent.y,extent.z);local.setPosition(center);mat.multiply(local);
        if(mat.determinant()<0)for(let k=0;k<4;k++)mat.elements[k]*=-1;
        mesh.setMatrixAt(j,mat);mesh.setColorAt(j,color.setRGB(rows[i+16],rows[i+17],rows[i+18]));
      }
      mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);forestBytes+=mesh.instanceMatrix.array.byteLength+mesh.instanceColor.array.byteLength;
      await tick();
    }
    streamer=createChunkStreamer({THREE,group,catalog,baseUrl:STREAM,onError:error=>console.error('Regional map detail failed',error)});
    ready=true;updateView(null,'detail',0,state.pos,true);
    progress('Ozeti 全圖區域載入 · 原始建築與高細節枝葉 · 中景保留模型輪廓');return true;
  }
  function updateView(camera,quality='detail',dt=0,focus,force=false){
    if(!ready)return;const now=performance.now();if(!force&&now-lastTime<250)return;
    const source=focus||camera?.position||state.pos,n=worldToNative(source.x,source.y,source.z);
    const far=!!(camera&&focus&&camera.position.distanceTo(new THREE.Vector3(source.x,source.y,source.z))>3500);
    const elapsed=(now-lastTime)/1000,travel=lastFocus?Math.hypot(n.x-lastFocus.x,n.z-lastFocus.z):0;
    const ahead={x:n.x,z:n.z};
    if(lastFocus&&elapsed>.01&&travel<400){const lead=Math.min(250/NATIVE_SCALE,travel/elapsed*2);if(travel>.1){ahead.x+=(n.x-lastFocus.x)/travel*lead;ahead.z+=(n.z-lastFocus.z)/travel*lead;}}
    lastTime=now;lastFocus=n;lastFar=far;
    void terrain.updateView(n,quality,far);streamer.update(n,quality,far,ahead);
    lowStructures.setVisibility(a=>!streamer.covered('structures-hq',a));
    cityTrees.setVisibility(a=>!streamer.covered('vegetation-mid',a));forestMaterial.update(streamer,n);
    const stats=streamer.stats(),ground=terrain.stats(),label=document.getElementById('nativeDetailVal');
    if(label)label.textContent=far?'全圖遠景':ground.error?'地形資料載入失敗':stats.errors?'區域細節載入失敗':ground.pendingTiles||stats.pending?'近景細節載入中…':'近景細節已就緒';
    memoryBytes=stats.bufferBytes+lowStructures.bufferBytes()+cityTrees.bufferBytes()+forestBytes+geometryBytes(roads.geometry)+ground.bufferBytes+collisions.stats().bufferBytes;
    const memory=document.getElementById('nativeMemoryVal'),regions=document.getElementById('nativeRegionsVal');
    if(memory)memory.textContent=(memoryBytes/1048576).toFixed(0)+' MB';
    if(regions)regions.textContent=stats.residentChunks+' 區 · 已釋放 '+stats.released+' 區';
  }
  return {load,updateView,terrainHeight:(x,z)=>terrain?.height(x,z)||0,factionCenterWorld,
    setMapOpen:tactical.setOpen,toggleMap:tactical.toggle,moveToFaction:tactical.moveToFaction,updateMapMarker:tactical.updateMarker,isMapOpen:tactical.isOpen,
    bounds:{halfX:10240,halfZ:10240,width:20480,depth:20480},get environmentLayer(){return collisions;},
    get terrain(){return terrain;},get streamer(){return streamer;},group,
    stats(){return {sourceCityHQ:catalog?.coverage.cityHQ,sourceWorldHQ:catalog?.coverage.worldHQ,streaming:streamer?.stats(),sceneBufferBytes:memoryBytes,far:lastFar,collisionParts:collisions?.stats().parts,terrain:terrain?.stats()};}
  };
}
