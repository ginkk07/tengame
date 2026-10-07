import {CALIBRATION} from './coordinates.js';
// Outside the textured city, preserve the source road network's paths and widths.
export function createNativeRoads(THREE,group,pack,terrain){
  const coords=pack.view(pack.meta.coords),position=[],color=[],uv=[],indices=[];
  const palette=[[128,130,132],[124,126,128],[145,112,78]].map(a=>new THREE.Color().setRGB(...a.map(n=>n/255),THREE.SRGBColorSpace).multiplyScalar(.85));
  const native=(u,v)=>({x:(u*163.84-CALIBRATION.originX)/CALIBRATION.unitsPerMetre,z:(v*163.84-(163.84-CALIBRATION.originY))/CALIBRATION.unitsPerMetre});
  for(const edge of pack.meta.edges){
    if(edge.onDeck)continue;
    const c=palette[edge.tier]||palette[1],half=edge.widthM/(100*CALIBRATION.unitsPerMetre)*.5;
    for(let j=0;j<edge.count-1;j++){
      const a=native(coords[(edge.offset+j)*2],coords[(edge.offset+j)*2+1]),b=native(coords[(edge.offset+j+1)*2],coords[(edge.offset+j+1)*2+1]);
      const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)continue;
      const steps=Math.ceil(length/6),ox=-dz/length*half,oz=dx/length*half,widthSteps=Math.max(1,Math.ceil(half*2/6));
      for(let k=0;k<steps;k++){
        const f=k/steps,h=(k+1)/steps,x=a.x+dx*f,z=a.z+dz*f,xx=a.x+dx*h,zz=a.z+dz*h;
        if(Math.abs((x+xx)*.5)<710 && Math.abs((z+zz)*.5)<710)continue;
        for(let w=0;w<widthSteps;w++){
          const left=-1+w/widthSteps*2,right=-1+(w+1)/widthSteps*2,i=position.length/3;
          for(const [px,pz,u] of [[x+ox*right,z+oz*right,(right+1)/2],[x+ox*left,z+oz*left,(left+1)/2],[xx+ox*right,zz+oz*right,(right+1)/2],[xx+ox*left,zz+oz*left,(left+1)/2]]){position.push(px,terrain.nativeHeight(px,pz)+.18,pz);color.push(c.r,c.g,c.b);uv.push(u,0);}indices.push(i,i+2,i+1,i+1,i+2,i+3);
        }
      }
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  material.onBeforeCompile=shader=>{shader.vertexShader='varying float vRoadAcross;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoadAcross=uv.x;');shader.fragmentShader='varying float vRoadAcross;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.0-smoothstep(.32,.5,abs(vRoadAcross-.5));');};material.customProgramCacheKey=()=> 'ozeti-city-road-shoulders-v95';
  const mesh=new THREE.Mesh(g,material);mesh.name='source outer road paths';mesh.receiveShadow=true;
  mesh.updateHeights=()=>{const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,terrain.nativeHeight(p.getX(i),p.getZ(i))+.18);p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();};group.add(mesh);return mesh;
}
