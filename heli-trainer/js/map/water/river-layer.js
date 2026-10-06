import {
  mapMetersToWorld
} from '../master/coordinate-transform.js?v=87';

import {
  RIVER_CONFIG,
  RIVER_PATHS,
  RIVER_STATS
} from './river-data.js?v=87';

function interpolateWidths(widths,t){
  if(widths.length===1){
    return widths[0];
  }
  const scaled=t*(widths.length-1);
  const i=Math.min(widths.length-2,Math.floor(scaled));
  const f=scaled-i;
  return widths[i]+(widths[i+1]-widths[i])*f;
}

function buildCurveSamples(THREE,path){
  const control=path.points.map(point=>{
    const w=mapMetersToWorld(point[0],point[1]);
    return new THREE.Vector3(w.x,0,w.z);
  });

  const curve=new THREE.CatmullRomCurve3(
    control,
    false,
    'centripetal',
    .5
  );

  const approxLength=curve.getLength();
  const segments=Math.max(
    4,
    Math.ceil(approxLength/RIVER_CONFIG.sampleSpacingMeters)
  );

  const samples=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments;
    const p=curve.getPoint(t);
    const tangent=curve.getTangent(t).normalize();
    samples.push({
      t,
      x:p.x,
      z:p.z,
      nx:-tangent.z,
      nz:tangent.x,
      width:interpolateWidths(path.widths,t)
    });
  }

  return {samples,length:approxLength};
}

function createRibbonGeometry({
  THREE,
  samples,
  terrainHeight,
  widthExtra=0,
  yOffset=0
}){
  const positions=[];
  const uvs=[];
  const indices=[];

  let distance=0;
  let last=null;

  samples.forEach((sample,index)=>{
    if(last){
      distance+=Math.hypot(sample.x-last.x,sample.z-last.z);
    }
    last=sample;

    const half=Math.max(1,(sample.width+widthExtra)*.5);
    const lx=sample.x+sample.nx*half;
    const lz=sample.z+sample.nz*half;
    const rx=sample.x-sample.nx*half;
    const rz=sample.z-sample.nz*half;

    /*
     * Drape each edge independently over the recovered heightfield. This keeps
     * the water/banks attached to the terrain while preserving the river trace.
     */
    positions.push(
      lx,terrainHeight(lx,lz)+yOffset,lz,
      rx,terrainHeight(rx,rz)+yOffset,rz
    );

    uvs.push(0,distance*.0125,1,distance*.0125);

    if(index<samples.length-1){
      const k=index*2;
      indices.push(k,k+2,k+1,k+1,k+2,k+3);
    }
  });

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions,3)
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs,2)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function standardMaterial(THREE,{
  color,
  roughness=1,
  metalness=0,
  opacity=1,
  renderOrder=1
}){
  const material=new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent:opacity<1,
    opacity,
    side:THREE.DoubleSide,
    depthWrite:opacity>=1,
    polygonOffset:true,
    polygonOffsetFactor:-renderOrder,
    polygonOffsetUnits:-renderOrder
  });
  return material;
}

export function createRiverLayer({
  THREE,
  scene,
  terrainHeight
}){
  const group=new THREE.Group();
  group.name='OzetiRiverLayerV85';
  scene.add(group);

  const materials={
    floodplain:standardMaterial(THREE,{
      color:RIVER_CONFIG.floodplainColor,
      roughness:1,
      opacity:RIVER_CONFIG.floodplainOpacity,
      renderOrder:1
    }),
    outerBank:standardMaterial(THREE,{
      color:RIVER_CONFIG.outerBankColor,
      roughness:1,
      renderOrder:2
    }),
    innerBank:standardMaterial(THREE,{
      color:RIVER_CONFIG.innerBankColor,
      roughness:1,
      renderOrder:3
    }),
    water:standardMaterial(THREE,{
      color:RIVER_CONFIG.waterColor,
      roughness:.18,
      metalness:.04,
      opacity:RIVER_CONFIG.waterOpacity,
      renderOrder:4
    })
  };

  const meshes=[];
  let built=false;
  let sampleCount=0;
  let triangleCount=0;
  let measuredLength=0;

  function addRibbon(samples,options,material,name,renderOrder){
    const geometry=createRibbonGeometry({
      THREE,
      samples,
      terrainHeight,
      ...options
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;
    mesh.receiveShadow=true;
    mesh.castShadow=false;
    mesh.renderOrder=renderOrder;
    group.add(mesh);
    meshes.push(mesh);
    triangleCount+=geometry.index.count/3;
    return mesh;
  }

  function rebuild(){
    clear();

    for(const path of RIVER_PATHS){
      const sampled=buildCurveSamples(THREE,path);
      const samples=sampled.samples;
      sampleCount+=samples.length;
      measuredLength+=sampled.length;

      addRibbon(
        samples,
        {
          widthExtra:RIVER_CONFIG.floodplainExtraMeters,
          yOffset:RIVER_CONFIG.floodplainYOffset
        },
        materials.floodplain,
        `${path.id}-floodplain`,
        1
      );

      addRibbon(
        samples,
        {
          widthExtra:RIVER_CONFIG.outerBankExtraMeters,
          yOffset:RIVER_CONFIG.outerBankYOffset
        },
        materials.outerBank,
        `${path.id}-outer-bank`,
        2
      );

      addRibbon(
        samples,
        {
          widthExtra:RIVER_CONFIG.innerBankExtraMeters,
          yOffset:RIVER_CONFIG.innerBankYOffset
        },
        materials.innerBank,
        `${path.id}-inner-bank`,
        3
      );

      addRibbon(
        samples,
        {
          widthExtra:0,
          yOffset:RIVER_CONFIG.waterYOffset
        },
        materials.water,
        `${path.id}-water`,
        4
      );
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
    sampleCount=0;
    triangleCount=0;
    measuredLength=0;
    built=false;
  }

  function dispose(){
    clear();
    Object.values(materials).forEach(material=>material.dispose());
    scene.remove(group);
  }

  function stats(){
    return {
      built,
      paths:RIVER_STATS.paths,
      controlPoints:RIVER_STATS.controlPoints,
      sourceLengthMeters:RIVER_STATS.totalLengthMeters,
      measuredLengthMeters:measuredLength,
      samples:sampleCount,
      meshes:meshes.length,
      triangles:triangleCount
    };
  }

  return {group,rebuild,clear,dispose,stats};
}
