import {mapPointToWorld} from '../factions.js?v=85';
import {terrainQuaternion} from './terrain-align.js';

function normalizeScale(specScale){
  if(Array.isArray(specScale)){
    return {
      x:Number(specScale[0])||1,
      y:Number(specScale[1])||1,
      z:Number(specScale[2])||1
    };
  }
  const scalar=Number(specScale);
  const v=Number.isFinite(scalar) && scalar>0 ? scalar : 1;
  return {x:v,y:v,z:v};
}

function worldPosition(spec){
  if(
    Number.isFinite(Number(spec.mapX)) &&
    Number.isFinite(Number(spec.mapY))
  ){
    return mapPointToWorld(
      Number(spec.mapX),
      Number(spec.mapY)
    );
  }

  if(
    Number.isFinite(Number(spec.x)) &&
    Number.isFinite(Number(spec.z))
  ){
    return {
      x:Number(spec.x),
      z:Number(spec.z)
    };
  }

  throw new Error('Placement requires mapX/mapY or world x/z');
}

export function createPlacementEngine({
  THREE,
  scene,
  registry,
  terrainHeight,
  masterScale=1
}){
  const root=new THREE.Group();
  root.name='OzetiMapObjectsV80';
  scene.add(root);

  const batches=new Map();
  const uniqueObjects=[];
  const sectorRecords=new Map();

  function getBatch(definition){
    if(batches.has(definition.id)){
      return batches.get(definition.id);
    }

    const parts=definition.createParts(THREE);
    const capacity=Math.max(1,definition.defaultCapacity||128);

    const meshes=parts.map((part,index)=>{
      const mesh=new THREE.InstancedMesh(
        part.geometry,
        part.material,
        capacity
      );
      mesh.name=`${definition.id}#${index}`;
      mesh.count=0;
      mesh.castShadow=true;
      mesh.receiveShadow=true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(mesh);
      return {mesh,part};
    });

    const batch={
      definition,
      capacity,
      count:0,
      meshes,
      placements:[]
    };

    batches.set(definition.id,batch);
    return batch;
  }

  function growBatch(batch){
    const nextCapacity=batch.capacity*2;

    for(const entry of batch.meshes){
      const oldMesh=entry.mesh;
      const nextMesh=new THREE.InstancedMesh(
        oldMesh.geometry,
        oldMesh.material,
        nextCapacity
      );
      nextMesh.name=oldMesh.name;
      nextMesh.castShadow=oldMesh.castShadow;
      nextMesh.receiveShadow=oldMesh.receiveShadow;
      nextMesh.count=batch.count;
      nextMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const matrix=new THREE.Matrix4();
      for(let i=0;i<batch.count;i++){
        oldMesh.getMatrixAt(i,matrix);
        nextMesh.setMatrixAt(i,matrix);
      }
      nextMesh.instanceMatrix.needsUpdate=true;

      root.remove(oldMesh);
      root.add(nextMesh);
      entry.mesh=nextMesh;
    }

    batch.capacity=nextCapacity;
  }

  function composePlacement(spec,definition){
    const pos=worldPosition(spec);
    const y=terrainHeight(pos.x,pos.z)+Number(spec.yOffset||0)*masterScale;

    const modelScale=normalizeScale(spec.scale);
    const unitScale=definition.sourceUnitScale===false ? 1 : masterScale;

    const scale=new THREE.Vector3(
      modelScale.x*unitScale,
      modelScale.y*unitScale,
      modelScale.z*unitScale
    );

    const quaternion=terrainQuaternion({
      THREE,
      terrainHeight,
      x:pos.x,
      z:pos.z,
      yaw:Number(spec.rotationY||0),
      alignToTerrain:
        spec.alignToTerrain ?? definition.alignToTerrain ?? false,
      sampleDistance:Number(spec.normalSampleDistance||2)*masterScale
    });

    const position=new THREE.Vector3(pos.x,y,pos.z);
    const matrix=new THREE.Matrix4().compose(
      position,
      quaternion,
      scale
    );

    return {position,quaternion,scale,matrix};
  }

  function recordSector(sectorId,record){
    if(!sectorId){
      return;
    }
    if(!sectorRecords.has(sectorId)){
      sectorRecords.set(sectorId,[]);
    }
    sectorRecords.get(sectorId).push(record);
  }

  function place(spec,options={}){
    if(!spec || !spec.model){
      throw new Error('Placement requires model id');
    }

    const definition=registry.get(spec.model);
    const transform=composePlacement(spec,definition);
    const sectorId=options.sectorId || spec.sectorId || null;

    if(definition.mode==='instanced'){
      const batch=getBatch(definition);
      if(batch.count>=batch.capacity){
        growBatch(batch);
      }

      const index=batch.count++;
      batch.placements.push({spec,sectorId});

      for(const entry of batch.meshes){
        entry.mesh.setMatrixAt(index,transform.matrix);
        entry.mesh.count=batch.count;
        entry.mesh.instanceMatrix.needsUpdate=true;
      }

      const record={type:'instanced',model:definition.id,index};
      recordSector(sectorId,record);
      return record;
    }

    if(definition.mode==='unique'){
      const object=definition.createObject(THREE);
      object.name=spec.name || definition.id;
      object.position.copy(transform.position);
      object.quaternion.copy(transform.quaternion);
      object.scale.copy(transform.scale);
      object.userData.mapModel=definition.id;
      object.userData.sectorId=sectorId;
      root.add(object);
      uniqueObjects.push(object);
      const record={type:'unique',model:definition.id,object};
      recordSector(sectorId,record);
      return record;
    }

    throw new Error(`Unsupported placement mode: ${definition.mode}`);
  }

  function placeMany(specs=[],options={}){
    return specs.map(spec=>place(spec,options));
  }

  function rebuildInstanceBatch(batch){
    batch.count=batch.placements.length;

    for(let index=0;index<batch.placements.length;index++){
      const placement=batch.placements[index];
      const transform=composePlacement(
        placement.spec,
        batch.definition
      );

      for(const entry of batch.meshes){
        entry.mesh.setMatrixAt(index,transform.matrix);
      }
    }

    for(const entry of batch.meshes){
      entry.mesh.count=batch.count;
      entry.mesh.instanceMatrix.needsUpdate=true;
    }
  }

  function clearSector(sectorId){
    const records=sectorRecords.get(sectorId) || [];

    for(const record of records){
      if(record.type==='unique' && record.object){
        root.remove(record.object);
        const index=uniqueObjects.indexOf(record.object);
        if(index>=0){
          uniqueObjects.splice(index,1);
        }
      }
    }

    for(const batch of batches.values()){
      const before=batch.placements.length;
      batch.placements=batch.placements.filter(
        placement=>placement.sectorId!==sectorId
      );
      if(batch.placements.length!==before){
        rebuildInstanceBatch(batch);
      }
    }

    sectorRecords.delete(sectorId);
  }

  function clear(){
    for(const object of uniqueObjects){
      root.remove(object);
    }
    uniqueObjects.length=0;

    for(const batch of batches.values()){
      for(const entry of batch.meshes){
        root.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        if(Array.isArray(entry.mesh.material)){
          entry.mesh.material.forEach(material=>material.dispose());
        }else{
          entry.mesh.material.dispose();
        }
      }
    }

    batches.clear();
    sectorRecords.clear();
  }

  return {
    root,
    place,
    placeMany,
    clearSector,
    clear,
    stats(){
      return {
        modelTypes:registry.ids().length,
        instancedTypes:batches.size,
        uniqueObjects:uniqueObjects.length,
        instances:[...batches.values()].reduce((sum,batch)=>sum+batch.count,0)
      };
    }
  };
}
