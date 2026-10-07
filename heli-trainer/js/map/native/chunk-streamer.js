import {fetchPack} from './pack.js';
import {createBatchStore} from './batches.js';
import {NATIVE_SCALE} from './coordinates.js';
import {createDistanceFade} from './distance-fade.js';
import {yieldToBrowser} from './yield.js';

export function distanceToChunk(chunk,p){
  const [lo,hi]=chunk.bounds;
  return Math.hypot(Math.max(lo[0]-p.x,0,p.x-hi[0]),Math.max(lo[2]-p.z,0,p.z-hi[2]));
}
export function chunkKey(family,x,z,span){return family+':'+Math.floor(x/span)+':'+Math.floor(z/span);}

export async function buildChunkStore({THREE,group,baseUrl,catalog,chunk,signal,geometryBank}){
  if(!geometryBank&&chunk.geometryFile)geometryBank=await fetchPack(baseUrl+chunk.geometryFile,{signal});
  const pack=await fetchPack(baseUrl+chunk.file,{signal}),refs=new Map(),keys=[...new Set(pack.meta.groups.map(g=>g.geometry))];
  // Keep at most six geometry downloads in flight. Raw packs are released after copying.
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(6,keys.length)},async()=>{
    while(cursor<keys.length){
      const key=keys[cursor++];
      const geometryPack=geometryBank||await fetchPack(baseUrl+catalog.geometries[key].file,{signal});
      const meta=geometryBank?geometryBank.meta.geometries[key]:geometryPack.meta.geometry;
      for(const g of pack.meta.groups.filter(g=>g.geometry===key))refs.set(key+(g.mirror?':mirror':''),{pack:geometryPack,meta,mirror:g.mirror});
    }
  }));
  if(signal?.aborted)throw new DOMException('Cancelled map chunk','AbortError');
  const store=createBatchStore(THREE,group,refs,pack.meta.count),matrix=new THREE.Matrix4();
  try{
    store.mesh.visible=false;store.mesh.name='streamed '+chunk.id;store.mesh.castShadow=chunk.family.endsWith('-hq');
    store.mesh.frustumCulled=false;
    let placed=0;
    for(const g of pack.meta.groups){
      const a=pack.view(g.matrices),c=g.colors?pack.view(g.colors):null,key=g.geometry+(g.mirror?':mirror':'');
      for(let i=0;i<g.count;i++){
        if(signal?.aborted)throw new DOMException('Cancelled map chunk','AbortError');
        store.add(key,matrix.fromArray(a,i*16),c?c.subarray(i*3,i*3+3):[1,1,1],(g.layer==='props'?1:0)|(g.sourceCity?2:0));
        if(++placed%1500===0)await yieldToBrowser();
      }
    }
    store.mesh.computeBoundingBox();store.mesh.computeBoundingSphere();return store;
  }catch(error){store.dispose();throw error;}finally{refs.clear();}
}

export function createChunkStreamer({THREE,group,catalog,baseUrl,onError=()=>{},build=buildChunkStore}){
  const chunks=catalog.chunks.filter(c=>c.family!=='structures-lq'),resident=new Map(),failures=new Map();
  let focus={x:0,z:0},ahead=focus,far=false,ranges={},wanted=new Set(),queue=[],pending=null,running=false,disposed=false,version=0,released=0,loaded=0;
  const fades={'structures-hq':100/NATIVE_SCALE,'vegetation-hq':50/NATIVE_SCALE,'vegetation-mid':100/NATIVE_SCALE,'city-structures-hq':100/NATIVE_SCALE,'city-vegetation-hq':50/NATIVE_SCALE,'city-vegetation-mid':100/NATIVE_SCALE};
  const budget=160*1024*1024;
  function bytes(){let n=0;for(const item of resident.values())n+=item.store.bufferBytes();return n;}
  function release(id){const item=resident.get(id);if(!item)return;item.store.dispose();resident.delete(id);released++;}
  function visibility(){
    for(const item of resident.values()){
      const family=item.chunk.family,r=ranges[family]||0,f=fades[family]||0;
      item.store.mesh.visible=true;item.fade?.update(focus,r,f);
      item.store.setVisibility(a=>!far&&Math.hypot(a.x-focus.x,a.z-focus.z)<r+f+a.r&&(!family.endsWith('vegetation-mid')||!covered('vegetation-hq',a)));
    }
  }
  function covered(family,a){
    if(a.tag&2)family='city-'+family;
    const range=ranges[family]||0;
    if(far||Math.hypot(a.x-focus.x,a.z-focus.z)+a.r>=range-(fades[family]||0))return false;
    return resident.has(family.startsWith('city-')?family+':0:0':chunkKey(family,a.x,a.z,catalog.spanNativeM));
  }
  async function pump(){
    if(running||disposed)return;running=true;
    try{
      while(queue.length&&!disposed){
        const chunk=queue.shift();if(!wanted.has(chunk.id)||resident.has(chunk.id))continue;
        const range=ranges[chunk.family]+(fades[chunk.family]||0),essential=distanceToChunk(chunk,focus)<=range;
        if(bytes()+chunk.bufferBytes>budget){
          const candidates=[...resident.values()].filter(i=>distanceToChunk(i.chunk,focus)>(ranges[i.chunk.family]||0)+(fades[i.chunk.family]||0)&&(essential||!wanted.has(i.chunk.id))).sort((a,b)=>distanceToChunk(b.chunk,focus)-distanceToChunk(a.chunk,focus));
          for(const i of candidates){release(i.chunk.id);if(bytes()+chunk.bufferBytes<=budget)break;}
          // Visible content has priority; reduce optional preloading under pressure.
          if(bytes()+chunk.bufferBytes>budget&&!essential)continue;
        }
        const controller=new AbortController();pending={chunk,controller};
        try{
          const store=await build({THREE,group,baseUrl,catalog,chunk,signal:controller.signal});
          if(disposed||controller.signal.aborted||!wanted.has(chunk.id)){store.dispose();released++;}
          else{const fade=createDistanceFade(THREE,store.mesh.material);resident.set(chunk.id,{chunk,store,fade});loaded++;failures.delete(chunk.id);visibility();version++;}
        }catch(error){if(error.name!=='AbortError'){failures.set(chunk.id,Date.now());onError(error);}}
        finally{pending=null;}
        await yieldToBrowser();
      }
    }finally{running=false;}
  }
  function update(next,quality='detail',isFar=false,predicted=next){
    if(disposed)return;focus=next;ahead=predicted;far=isFar;
    const distances=quality==='smooth'?[400,150,650]:quality==='balanced'?[500,190,800]:[600,230,1000];
    ranges={'structures-hq':distances[0]/NATIVE_SCALE,'vegetation-hq':distances[1]/NATIVE_SCALE,'vegetation-mid':distances[2]/NATIVE_SCALE};
    for(const [key,value] of Object.entries(ranges))ranges['city-'+key]=value;
    wanted=new Set();queue=[];
    if(!far)for(const c of chunks){
      const range=ranges[c.family]+(fades[c.family]||0),d=distanceToChunk(c,focus),forward=distanceToChunk(c,ahead);
      if(d<=range+200/NATIVE_SCALE||forward<=range+150/NATIVE_SCALE){
        wanted.add(c.id);
        if(!resident.has(c.id)&&Date.now()-(failures.get(c.id)||0)>3000)queue.push(c);
      }
    }
    for(const [id,item] of resident)if(far||distanceToChunk(item.chunk,focus)>(ranges[item.chunk.family]||0)+400/NATIVE_SCALE&&!wanted.has(id))release(id);
    if(pending&&!wanted.has(pending.chunk.id))pending.controller.abort();
    queue.sort((a,b)=>{
      const score=c=>Math.max(0,distanceToChunk(c,focus)-(ranges[c.family]||0))*4+distanceToChunk(c,ahead)+(c.family==='vegetation-mid'?30:0);
      return score(a)-score(b);
    });visibility();version++;void pump();
  }
  function stats(){const essential=c=>distanceToChunk(c,focus)<=(ranges[c.family]||0)+(fades[c.family]||0);return {residentChunks:resident.size,bufferBytes:bytes(),loaded,released,pending:queue.filter(essential).length+(pending&&essential(pending.chunk)?1:0),preloading:queue.length+(pending?1:0),errors:[...failures.keys()].filter(id=>wanted.has(id)).length,version,budgetBytes:budget};}
  async function idle(){while(running||queue.length)await new Promise(r=>setTimeout(r,5));}
  function dispose(){disposed=true;wanted.clear();queue=[];pending?.controller.abort();for(const id of [...resident.keys()])release(id);}
  return {update,covered,stats,idle,dispose,resident,get ranges(){return ranges;},get fades(){return fades;}};
}
