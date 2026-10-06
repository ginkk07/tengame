import {
  mapMetersToWorld
} from '../master/coordinate-transform.js?v=91';

import {
  ROAD_CONFIG,
  ROAD_PATHS,
  ROAD_STATS
} from './road-data.js?v=91';

function classConfig(path){
  if(path.class==='local'){
    return {
      sampleSpacing:ROAD_CONFIG.localSampleSpacingMeters,
      roadbedExtra:ROAD_CONFIG.localRoadbedExtraMeters,
      shoulderExtra:0,
      shoulder:false,
      centerLine:false
    };
  }

  return {
    sampleSpacing:ROAD_CONFIG.primarySampleSpacingMeters,
    roadbedExtra:ROAD_CONFIG.primaryRoadbedExtraMeters,
    shoulderExtra:ROAD_CONFIG.primaryShoulderExtraMeters,
    shoulder:true,
    centerLine:path.centerLine!==false
  };
}

function samplePath(path){
  const cfg=classConfig(path);
  const control=path.points.map(point=>{
    const world=mapMetersToWorld(point[0],point[1]);
    return {x:world.x,z:world.z};
  });

  const samples=[];
  let measuredLength=0;

  for(let i=0;i<control.length-1;i++){
    const a=control[i];
    const b=control[i+1];
    const dx=b.x-a.x;
    const dz=b.z-a.z;
    const length=Math.hypot(dx,dz);
    measuredLength+=length;

    const steps=Math.max(
      1,
      Math.ceil(length/cfg.sampleSpacing)
    );

    for(let n=0;n<steps;n++){
      const t=n/steps;
      samples.push({
        x:a.x+dx*t,
        z:a.z+dz*t
      });
    }
  }

  samples.push(control[control.length-1]);

  for(let i=0;i<samples.length;i++){
    const prev=samples[Math.max(0,i-1)];
    const next=samples[Math.min(samples.length-1,i+1)];
    let tx=next.x-prev.x;
    let tz=next.z-prev.z;
    const len=Math.hypot(tx,tz)||1;
    tx/=len;
    tz/=len;
    samples[i].nx=-tz;
    samples[i].nz=tx;
  }

  return {samples,measuredLength,cfg};
}

function createBatch(){
  return {positions:[],uvs:[],indices:[],distanceBase:0};
}

function appendRibbon({
  batch,
  samples,
  terrainHeight,
  width,
  yOffset
}){
  const baseVertex=batch.positions.length/3;
  let distance=batch.distanceBase;

  for(let i=0;i<samples.length;i++){
    const sample=samples[i];

    if(i>0){
      const prev=samples[i-1];
      distance+=Math.hypot(
        sample.x-prev.x,
        sample.z-prev.z
      );
    }

    const half=width*.5;
    const lx=sample.x+sample.nx*half;
    const lz=sample.z+sample.nz*half;
    const rx=sample.x-sample.nx*half;
    const rz=sample.z-sample.nz*half;

    batch.positions.push(
      lx,terrainHeight(lx,lz)+yOffset,lz,
      rx,terrainHeight(rx,rz)+yOffset,rz
    );

    batch.uvs.push(
      0,distance*.02,
      1,distance*.02
    );

    if(i<samples.length-1){
      const k=baseVertex+i*2;
      batch.indices.push(
        k,k+2,k+1,
        k+1,k+2,k+3
      );
    }
  }

  batch.distanceBase=distance+4;
}

function batchGeometry(THREE,batch){
  if(batch.positions.length===0){
    return null;
  }

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(batch.positions,3)
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(batch.uvs,2)
  );
  geometry.setIndex(batch.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function material(THREE,color,renderOrder){
  return new THREE.MeshStandardMaterial({
    color,
    roughness:.96,
    metalness:0,
    side:THREE.DoubleSide,
    polygonOffset:true,
    polygonOffsetFactor:-renderOrder,
    polygonOffsetUnits:-renderOrder
  });
}

export function createRoadLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=new THREE.Group();
  group.name='OzetiRoadLayerV88';
  scene.add(group);

  const materials={
    roadbed:material(THREE,ROAD_CONFIG.roadbedColor,5),
    shoulder:material(THREE,ROAD_CONFIG.shoulderColor,6),
    surface:material(THREE,ROAD_CONFIG.surfaceColor,7),
    center:material(THREE,ROAD_CONFIG.centerLineColor,8)
  };

  const meshes=[];
  let built=false;
  let measuredLength=0;
  let sampleCount=0;
  let triangleCount=0;

  function rebuild(){
    clear();

    const batches={
      roadbed:createBatch(),
      shoulder:createBatch(),
      surface:createBatch(),
      center:createBatch()
    };

    for(const path of ROAD_PATHS){
      const sampled=samplePath(path);
      const samples=sampled.samples;
      const cfg=sampled.cfg;

      measuredLength+=sampled.measuredLength;
      sampleCount+=samples.length;

      appendRibbon({
        batch:batches.roadbed,
        samples,
        terrainHeight,
        width:path.width+cfg.roadbedExtra,
        yOffset:ROAD_CONFIG.roadbedYOffset
      });

      if(cfg.shoulder){
        appendRibbon({
          batch:batches.shoulder,
          samples,
          terrainHeight,
          width:path.width+cfg.shoulderExtra,
          yOffset:ROAD_CONFIG.shoulderYOffset
        });
      }

      appendRibbon({
        batch:batches.surface,
        samples,
        terrainHeight,
        width:path.width,
        yOffset:ROAD_CONFIG.surfaceYOffset
      });

      if(cfg.centerLine){
        appendRibbon({
          batch:batches.center,
          samples,
          terrainHeight,
          width:.55,
          yOffset:ROAD_CONFIG.centerLineYOffset
        });
      }
    }

    const definitions=[
      ['roadbed',5],
      ['shoulder',6],
      ['surface',7],
      ['center',8]
    ];

    for(const [key,renderOrder] of definitions){
      const geometry=batchGeometry(THREE,batches[key]);
      if(!geometry){
        continue;
      }

      const mesh=new THREE.Mesh(
        geometry,
        materials[key]
      );
      mesh.name=`ozeti-road-${key}-batch-v91`;
      mesh.receiveShadow=true;
      mesh.castShadow=false;
      mesh.renderOrder=renderOrder;
      group.add(mesh);
      meshes.push(mesh);
      triangleCount+=geometry.index.count/3;
    }

    built=true;
    return stats();
  }

  function clear(){
    while(meshes.length){
      const mesh=meshes.pop();
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    measuredLength=0;
    sampleCount=0;
    triangleCount=0;
    built=false;
  }

  function dispose(){
    clear();
    Object.values(materials).forEach(item=>item.dispose());
    scene.remove(group);
  }

  function stats(){
    return {
      built,
      paths:ROAD_STATS.paths,
      primaryPaths:ROAD_STATS.primaryPaths,
      localPaths:ROAD_STATS.localPaths,
      controlPoints:ROAD_STATS.controlPoints,
      sourceLengthMeters:ROAD_STATS.totalLengthMeters,
      primaryLengthMeters:ROAD_STATS.primaryLengthMeters,
      localLengthMeters:ROAD_STATS.localLengthMeters,
      measuredLengthMeters:measuredLength,
      samples:sampleCount,
      meshes:meshes.length,
      triangles:triangleCount
    };
  }

  return {group,rebuild,clear,dispose,stats};
}
