import {geometryFromPack} from './pack.js';

export function createBatchStore(THREE,group,references,maxInstances){
  const converted=new Map();let vertices=0,indices=0;
  for(const [key,ref] of references){
    const g=geometryFromPack(THREE,ref.pack,ref.meta,{mirror:ref.mirror});g.deleteAttribute('uv');
    converted.set(key,g);vertices+=g.attributes.position.count;indices+=g.index.count;
  }
  if(!converted.size)return null;
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:.04});
  const mesh=new THREE.BatchedMesh(Math.max(1,maxInstances),vertices,indices,material);
  mesh.sortObjects=false;mesh.perObjectFrustumCulled=true;mesh.receiveShadow=true;
  const geometryIds=new Map(),bounds=new Map();
  for(const [key,g] of converted){bounds.set(key,g.boundingBox.clone());geometryIds.set(key,mesh.addGeometry(g));g.dispose();}
  // BatchedMesh owns its copies. Retain only tiny bounds for subsequent placements.
  converted.clear();
  group.add(mesh);
  const center=new THREE.Vector3(),box=new THREE.Box3(),matrix=new THREE.Matrix4();
  const actors=[];
  function add(key,input,color=[1,1,1],tag=0,collide){
    const geometryBounds=bounds.get(key);matrix.copy(input);
    if(matrix.determinant()<0)for(let k=0;k<4;k++)matrix.elements[k]*=-1;
    const id=mesh.addInstance(geometryIds.get(key));mesh.setMatrixAt(id,matrix);
    mesh.setColorAt(id,new THREE.Color().setRGB(...color));
    box.copy(geometryBounds).applyMatrix4(matrix);box.getCenter(center);
    const actor={id,x:center.x,y:center.y,z:center.z,r:box.getSize(new THREE.Vector3()).length()/2,tag,visible:true};
    actors.push(actor);
    if(collide)collide(box,actor);
    return actor;
  }
  function setVisibility(predicate){
    let visible=0;
    for(const a of actors){const v=!!predicate(a);if(a.visible!==v){mesh.setVisibleAt(a.id,v);a.visible=v;}if(v)visible++;}
    return visible;
  }
  let disposed=false;
  function bufferBytes(){
    if(disposed)return 0;
    let total=mesh.geometry.index?.array.byteLength||0;
    for(const a of Object.values(mesh.geometry.attributes))total+=a.array.byteLength;
    const matrixSide=Math.max(4,Math.ceil(Math.sqrt(maxInstances*4)/4)*4),side=Math.ceil(Math.sqrt(maxInstances));
    return total+matrixSide*matrixSide*16+side*side*20+maxInstances*8;
  }
  function dispose(){
    if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();material.dispose();
    mesh.geometry=new THREE.BufferGeometry();actors.length=0;bounds.clear();geometryIds.clear();
  }
  return {mesh,add,actors,geometryIds,setVisibility,geometryCount:bounds.size,vertices,indices,bufferBytes,dispose};
}

export function sceneReferences(packs,shared){
  const refs=new Map();
  for(const pack of packs)for(const m of pack.meta.meshes){
    const owner=pack.meta.geometries[m.geometry]?pack:shared.find(p=>p.meta.geometries[m.geometry]);
    if(!owner)throw new Error('Missing native scene geometry '+m.geometry);
    // Reflected variants make negative determinant placements safe for BatchedMesh.
    for(const mirror of [false,true])refs.set(m.geometry+(mirror?':mirror':''),{pack:owner,meta:owner.meta.geometries[m.geometry],mirror});
  }
  return refs;
}
export function addSceneActors(THREE,store,pack,{collide}={}){
  const matrix=new THREE.Matrix4(),base=new THREE.Matrix4();
  for(const m of pack.meta.meshes){
    base.fromArray(m.matrix);
    const instances=pack.view(m.instances),colors=m.colors?pack.view(m.colors):null,material=pack.meta.materials[m.material]?.values?.color?.color||[1,1,1];
    for(let i=0;i<m.count;i++){
      matrix.fromArray(instances,i*16).premultiply(base);
      if(Math.abs(matrix.determinant())<1e-12)continue;
      const mirror=matrix.determinant()<0;
      store.add(m.geometry+(mirror?':mirror':''),matrix,colors?Array.from(colors.subarray(i*3,i*3+3)):material,m.layer==='buildings'?1:0,m.layer==='buildings'?collide:null);
    }
  }
  store.mesh.computeBoundingBox();store.mesh.computeBoundingSphere();
}
export function worldReferences(library,layers){
  const refs=new Map();
  for(const model of Object.values(library.meta.models))if(layers.includes(model.layer)){
    const key=model.geometry;
    refs.set(key,{pack:library,meta:library.meta.geometries[key],mirror:false});
    refs.set(key+':mirror',{pack:library,meta:library.meta.geometries[key],mirror:true});
  }
  return refs;
}
export function addWorldActors(THREE,store,pack,library,{layers=['buildings','props'],cells=pack.meta.cells,collide,collect}={}){
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  for(const cell of cells)for(const g of cell.groups){
    if(!layers.includes(g.layer))continue;
    const model=library.meta.models[g.model];
    if(!model)continue;
    const a=pack.view(g.placements);
    for(let i=0;i<a.length;i+=10){
      if(a[i+7]===0 && a[i+8]===0 && a[i+9]===0)continue;
      p.fromArray(a,i);q.fromArray(a,i+3);s.fromArray(a,i+7);matrix.compose(p,q,s);
      const key=model.geometry+(matrix.determinant()<0?':mirror':'');
      const actor=store.add(key,matrix,[1,1,1],cell.z*16+cell.x,g.layer==='buildings'?collide:null);
      if(collect)collect.push(actor.id);
    }
  }
  store.mesh.computeBoundingBox();store.mesh.computeBoundingSphere();
}

export async function streamWorldVegetation(THREE,store,pack,library,cells,collect,isCurrent,onCellReady,filter){
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();let count=0;
  for(const cell of cells){
    for(const g of cell.groups){
      if(g.layer!=='vegetation')continue;
      const model=library.meta.models[g.model];if(!model)continue;
      const a=pack.view(g.placements);
      for(let i=0;i<a.length;i+=10){
        if(!isCurrent())return;
        if(a[i+7]===0&&a[i+8]===0&&a[i+9]===0)continue;
        if(filter&&!filter(a,i,model))continue;
        p.fromArray(a,i);q.fromArray(a,i+3);s.fromArray(a,i+7);matrix.compose(p,q,s);
        const key=model.geometry+(matrix.determinant()<0?':mirror':'');
        collect.push(store.add(key,matrix,[1,1,1],cell.z*16+cell.x).id);
        if(++count%2000===0)await new Promise(r=>setTimeout(r,0));
      }
    }
    if(isCurrent())onCellReady(cell);
  }
}
