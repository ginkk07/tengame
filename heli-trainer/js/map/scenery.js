import {
  TERRAIN_CONFIG,
  RIVER_PATH,
  RIVER_WIDTHS,
  PRIMARY_ROADS,
  SECONDARY_ROADS,
  BRIDGES,
  FIELDS,
  FOREST_PATCHES,
  LANDMARKS,
  UTILITY_LINE,
  FACTIONS
} from './map-data.js';

import {
  factionCenterWorld
} from './factions.js';

export function buildOzetiScenery({
  THREE,
  scene,
  terrainHeight
}){
  const MAP_HALF_X=
    TERRAIN_CONFIG.width*.5;

  const MAP_HALF_Z=
    TERRAIN_CONFIG.depth*.5;

  const ozetiScenery=
    new THREE.Group();

  scene.add(ozetiScenery);

function clearOzetiScenery(){
  while(ozetiScenery.children.length){
    const child=ozetiScenery.children[ozetiScenery.children.length-1];
    ozetiScenery.remove(child);

    child.traverse?.(obj=>{
      if(obj.geometry)obj.geometry.dispose?.();

      if(obj.material){
        if(Array.isArray(obj.material)){
          obj.material.forEach(
            material=>material.dispose?.()
          );
        }else{
          obj.material.dispose?.();
        }
      }
    });
  }
}

function samplePolyline(points,step=70){
  const out=[];

  for(let i=0;i<points.length-1;i++){
    const a=points[i];
    const b=points[i+1];

    const dx=b[0]-a[0];
    const dz=b[1]-a[1];
    const dist=Math.hypot(dx,dz);

    const count=Math.max(
      2,
      Math.ceil(dist/step)
    );

    for(let s=0;s<count;s++){
      const t=s/count;

      out.push([
        THREE.MathUtils.lerp(
          a[0],
          b[0],
          t
        ),
        THREE.MathUtils.lerp(
          a[1],
          b[1],
          t
        )
      ]);
    }
  }

  out.push(
    points[points.length-1]
  );

  return out;
}

function buildRibbon(points,{
  width=20,
  yOffset=.5,
  color=0x7a6b58,
  roughness=1,
  metalness=0,
  opacity=1
}={}){
  const sampled=
    samplePolyline(
      points,
      70
    );

  const positions=[];
  const indices=[];

  for(let i=0;i<sampled.length;i++){
    const p=sampled[i];

    const prev=
      sampled[
        Math.max(0,i-1)
      ];

    const next=
      sampled[
        Math.min(
          sampled.length-1,
          i+1
        )
      ];

    let tx=next[0]-prev[0];
    let tz=next[1]-prev[1];

    const len=
      Math.hypot(tx,tz) ||
      1;

    tx/=len;
    tz/=len;

    const nx=-tz;
    const nz=tx;

    const lx=
      p[0]+
      nx*width*.5;

    const lz=
      p[1]+
      nz*width*.5;

    const rx=
      p[0]-
      nx*width*.5;

    const rz=
      p[1]-
      nz*width*.5;

    positions.push(
      lx,
      terrainHeight(lx,lz)+yOffset,
      lz,

      rx,
      terrainHeight(rx,rz)+yOffset,
      rz
    );

    if(i<sampled.length-1){
      const k=i*2;

      indices.push(
        k,k+2,k+1,
        k+1,k+2,k+3
      );
    }
  }

  const geo=
    new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  geo.setIndex(indices);
  geo.computeVertexNormals();

  const material=
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      transparent:opacity<1,
      opacity,
      side:THREE.DoubleSide,
      polygonOffset:true,
      polygonOffsetFactor:-1
    });

  const mesh=
    new THREE.Mesh(
      geo,
      material
    );

  mesh.receiveShadow=true;

  return mesh;
}

function buildVariableRibbon(points,widths,{
  yOffset=.5,
  color=0x7a6b58,
  roughness=1,
  metalness=0,
  opacity=1
}={}){
  const positions=[];
  const indices=[];

  for(let i=0;i<points.length;i++){
    const p=points[i];

    const prev=
      points[
        Math.max(0,i-1)
      ];

    const next=
      points[
        Math.min(
          points.length-1,
          i+1
        )
      ];

    let tx=next[0]-prev[0];
    let tz=next[1]-prev[1];

    const len=
      Math.hypot(tx,tz) ||
      1;

    tx/=len;
    tz/=len;

    const nx=-tz;
    const nz=tx;

    const width=
      widths[
        Math.min(
          i,
          widths.length-1
        )
      ];

    const lx=
      p[0]+
      nx*width*.5;

    const lz=
      p[1]+
      nz*width*.5;

    const rx=
      p[0]-
      nx*width*.5;

    const rz=
      p[1]-
      nz*width*.5;

    positions.push(
      lx,
      terrainHeight(lx,lz)+yOffset,
      lz,

      rx,
      terrainHeight(rx,rz)+yOffset,
      rz
    );

    if(i<points.length-1){
      const k=i*2;

      indices.push(
        k,k+2,k+1,
        k+1,k+2,k+3
      );
    }
  }

  const geo=
    new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  geo.setIndex(indices);
  geo.computeVertexNormals();

  const material=
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      transparent:opacity<1,
      opacity,
      side:THREE.DoubleSide,
      polygonOffset:true,
      polygonOffsetFactor:-1
    });

  const mesh=
    new THREE.Mesh(
      geo,
      material
    );

  mesh.receiveShadow=true;

  return mesh;
}

function buildRoad(points,width=28,{
  asphalt=0x686965,
  shoulder=0x8e846e,
  centerLine=true
}={}){
  const group=
    new THREE.Group();

  const shoulderMesh=
    buildRibbon(
      points,
      {
        width:width+8,
        yOffset:.34,
        color:shoulder,
        roughness:1
      }
    );

  const roadMesh=
    buildRibbon(
      points,
      {
        width,
        yOffset:.48,
        color:asphalt,
        roughness:.96
      }
    );

  group.add(
    shoulderMesh,
    roadMesh
  );

  if(centerLine && width>=20){
    const center=
      buildRibbon(
        points,
        {
          width:1.15,
          yOffset:.6,
          color:0xc7b984,
          roughness:.92
        }
      );

    group.add(center);
  }

  return group;
}

function buildRiverSystem(points,widths){
  const group=
    new THREE.Group();

  const outerWidths=
    widths.map(
      width=>width+44
    );

  const innerBankWidths=
    widths.map(
      width=>width+20
    );

  const floodplainWidths=
    widths.map(
      width=>width+240
    );

  const floodplain=
    buildVariableRibbon(
      points,
      floodplainWidths,
      {
        yOffset:.025,
        color:0x4e6548,
        roughness:1,
        opacity:.26
      }
    );

  const outerBank=
    buildVariableRibbon(
      points,
      outerWidths,
      {
        yOffset:.06,
        color:0x776f58,
        roughness:1
      }
    );

  const innerBank=
    buildVariableRibbon(
      points,
      innerBankWidths,
      {
        yOffset:.10,
        color:0x68715a,
        roughness:1
      }
    );

  const water=
    buildVariableRibbon(
      points,
      widths,
      {
        yOffset:.18,
        color:0x4d82a8,
        roughness:.16,
        metalness:.08,
        opacity:.86
      }
    );

  group.add(
    floodplain,
    outerBank,
    innerBank,
    water
  );

  return group;
}

function createBridge(a,b,width=24){
  const group=
    new THREE.Group();

  const ax=a[0];
  const az=a[1];

  const bx=b[0];
  const bz=b[1];

  const dx=bx-ax;
  const dz=bz-az;

  const len=
    Math.hypot(dx,dz);

  const angle=
    Math.atan2(dz,dx);

  const hA=
    terrainHeight(ax,az);

  const hB=
    terrainHeight(bx,bz);

  const deckY=
    Math.max(hA,hB)+7.5;

  const deckMat=
    new THREE.MeshStandardMaterial({
      color:0x76736d,
      roughness:.92
    });

  const deck=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        len,
        2.4,
        width
      ),
      deckMat
    );

  deck.position.set(
    (ax+bx)*.5,
    deckY,
    (az+bz)*.5
  );

  deck.rotation.y=
    -angle;

  deck.castShadow=true;
  deck.receiveShadow=true;

  group.add(deck);

  const roadSurface=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        len*.985,
        .34,
        width-4
      ),
      new THREE.MeshStandardMaterial({
        color:0x575955,
        roughness:.96
      })
    );

  roadSurface.position.y=1.36;
  deck.add(roadSurface);

  const railMat=
    new THREE.MeshStandardMaterial({
      color:0x4b5154,
      roughness:.84
    });

  for(const side of [-1,1]){
    const rail=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          len,
          1.15,
          .7
        ),
        railMat
      );

    rail.position.set(
      0,
      1.65,
      side*(width*.5-.6)
    );

    deck.add(rail);
  }

  const supportMat=
    new THREE.MeshStandardMaterial({
      color:0x716b61,
      roughness:.98
    });

  for(const t of [.22,.5,.78]){
    const px=
      THREE.MathUtils.lerp(
        ax,
        bx,
        t
      );

    const pz=
      THREE.MathUtils.lerp(
        az,
        bz,
        t
      );

    const gy=
      terrainHeight(px,pz);

    const supportH=
      Math.max(
        3,
        deckY-gy-1
      );

    const support=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          3.4,
          supportH,
          5.2
        ),
        supportMat
      );

    support.position.set(
      px,
      gy+supportH*.5,
      pz
    );

    support.castShadow=true;
    support.receiveShadow=true;

    group.add(support);
  }

  return group;
}

function createResidentialHouse(x,z,{
  scale=1,
  wall=0xc8c0af,
  roof=0x7d4b42,
  angle=0
}={}){
  const group=
    new THREE.Group();

  const ground=
    terrainHeight(x,z);

  const w=14*scale;
  const d=11*scale;
  const h=8.2*scale;

  const body=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w,
        h,
        d
      ),
      new THREE.MeshStandardMaterial({
        color:wall,
        roughness:.96
      })
    );

  body.position.y=h*.5;
  body.castShadow=true;
  body.receiveShadow=true;
  group.add(body);

  const roofMesh=
    new THREE.Mesh(
      new THREE.ConeGeometry(
        Math.max(w,d)*.58,
        4.8*scale,
        4
      ),
      new THREE.MeshStandardMaterial({
        color:roof,
        roughness:.9
      })
    );

  roofMesh.rotation.y=
    Math.PI*.25;

  roofMesh.position.y=
    h+2.2*scale;

  roofMesh.castShadow=true;
  group.add(roofMesh);

  group.position.set(
    x,
    ground,
    z
  );

  group.rotation.y=angle;

  ozetiScenery.add(group);

  return group;
}

function createTownBuilding(x,z,{
  w=24,
  d=18,
  h=20,
  color=0xa9a79f,
  angle=0
}={}){
  const ground=
    terrainHeight(x,z);

  const group=
    new THREE.Group();

  const body=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w,
        h,
        d
      ),
      new THREE.MeshStandardMaterial({
        color,
        roughness:.93
      })
    );

  body.position.y=h*.5;
  body.castShadow=true;
  body.receiveShadow=true;
  group.add(body);

  const roof=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w+1.2,
        .9,
        d+1.2
      ),
      new THREE.MeshStandardMaterial({
        color:0x65635e,
        roughness:.92
      })
    );

  roof.position.y=h+.45;
  group.add(roof);

  const cap=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(3,w*.18),
        2.8,
        Math.max(3,d*.18)
      ),
      new THREE.MeshStandardMaterial({
        color:0x77736b,
        roughness:.9
      })
    );

  cap.position.y=h+1.8;
  group.add(cap);

  group.position.set(
    x,
    ground,
    z
  );

  group.rotation.y=angle;

  ozetiScenery.add(group);

  return group;
}

function createWarehouse(x,z,{
  w=42,
  d=28,
  h=12,
  color=0x858984,
  angle=0
}={}){
  const ground=
    terrainHeight(x,z);

  const group=
    new THREE.Group();

  const body=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w,
        h,
        d
      ),
      new THREE.MeshStandardMaterial({
        color,
        roughness:.9
      })
    );

  body.position.y=h*.5;
  body.castShadow=true;
  body.receiveShadow=true;
  group.add(body);

  const roof=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w+1,
        .8,
        d+1
      ),
      new THREE.MeshStandardMaterial({
        color:0x666b68,
        roughness:.88
      })
    );

  roof.position.y=h+.4;
  group.add(roof);

  group.position.set(
    x,
    ground,
    z
  );

  group.rotation.y=angle;

  ozetiScenery.add(group);

  return group;
}

function createResidentialCluster(cx,cz,angle=0){
  const placements=[
    [-112,-70,.90],
    [-65,-24,1.00],
    [-18,-74,.86],
    [32,-22,1.08],
    [84,-64,.92],
    [-102,18,.82],
    [-46,42,.96],
    [12,34,.88],
    [72,46,1.02],
    [-78,92,.84],
    [-18,104,.94],
    [48,102,.82],
    [112,72,.90]
  ];

  const ca=Math.cos(angle);
  const sa=Math.sin(angle);

  placements.forEach(
    (p,i)=>{
      const rx=
        p[0]*ca-
        p[1]*sa;

      const rz=
        p[0]*sa+
        p[1]*ca;

      createResidentialHouse(
        cx+rx,
        cz+rz,
        {
          scale:p[2],
          wall:[
            0xc8c0af,
            0xbdb5a6,
            0xd3cabb
          ][i%3],
          roof:[
            0x7c4b43,
            0x6f5045,
            0x87564a
          ][(i+1)%3],
          angle:
            angle+
            ((i%3)-1)*.09
        }
      );
    }
  );
}

function createTownCenter(cx,cz,angle=0){
  const buildings=[
    [-115,-54,36,22,24],
    [-64,-48,28,20,18],
    [-18,-55,31,21,28],
    [38,-46,42,24,22],
    [96,-50,30,19,17],
    [-102,18,32,22,20],
    [-48,18,44,24,31],
    [12,18,34,21,24],
    [64,18,36,22,20],
    [110,24,30,20,17],
    [-82,78,28,20,17],
    [-24,74,38,22,23],
    [34,82,32,21,19],
    [88,78,40,23,27]
  ];

  const ca=Math.cos(angle);
  const sa=Math.sin(angle);

  buildings.forEach(
    (b,i)=>{
      const rx=
        b[0]*ca-
        b[1]*sa;

      const rz=
        b[0]*sa+
        b[1]*ca;

      createTownBuilding(
        cx+rx,
        cz+rz,
        {
          w:b[2],
          d:b[3],
          h:b[4],
          color:[
            0xaaa79e,
            0xb7b0a3,
            0x9f9f99,
            0xb9b5aa
          ][i%4],
          angle:
            angle+
            ((i%4)-1.5)*.03
        }
      );
    }
  );
}

function createIndustrialCluster(cx,cz,angle=0){
  const buildings=[
    [-105,-48,72,34,16],
    [-28,-54,48,28,14],
    [46,-52,58,32,18],
    [106,-38,42,28,13],
    [-88,34,52,30,14],
    [-18,38,78,36,17],
    [78,42,64,34,15],
    [-54,104,46,26,13],
    [30,100,54,30,14]
  ];

  const ca=Math.cos(angle);
  const sa=Math.sin(angle);

  buildings.forEach(
    (b,i)=>{
      const rx=
        b[0]*ca-
        b[1]*sa;

      const rz=
        b[0]*sa+
        b[1]*ca;

      createWarehouse(
        cx+rx,
        cz+rz,
        {
          w:b[2],
          d:b[3],
          h:b[4],
          color:[
            0x828782,
            0x767d80,
            0x8b8578
          ][i%3],
          angle
        }
      );
    }
  );
}

function createStadium(x,z,angle=.06){
  const ground=
    terrainHeight(x,z);

  const group=
    new THREE.Group();

  const apron=
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        154,
        154,
        1.8,
        64
      ),
      new THREE.MeshStandardMaterial({
        color:0x8d8a80,
        roughness:1
      })
    );

  apron.scale.set(
    1.28,
    1,
    .88
  );

  apron.position.y=.9;
  apron.receiveShadow=true;
  group.add(apron);

  const track=
    new THREE.Mesh(
      new THREE.TorusGeometry(
        100,
        11,
        10,
        72
      ),
      new THREE.MeshStandardMaterial({
        color:0x9a6756,
        roughness:.97
      })
    );

  track.rotation.x=
    Math.PI*.5;

  track.scale.set(
    1.34,
    1,
    .88
  );

  track.position.y=2.1;
  group.add(track);

  const field=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        160,
        2.2,
        92
      ),
      new THREE.MeshStandardMaterial({
        color:0x507e4b,
        roughness:1
      })
    );

  field.position.y=1.7;
  field.receiveShadow=true;
  group.add(field);

  const standMat=
    new THREE.MeshStandardMaterial({
      color:0xb5b0a5,
      roughness:.94
    });

  const stands=[
    [0,-105,224,28,20],
    [0,105,224,28,20],
    [-135,0,28,120,17],
    [135,0,28,120,17]
  ];

  stands.forEach(
    ([sx,sz,w,d,h])=>{
      const stand=
        new THREE.Mesh(
          new THREE.BoxGeometry(
            w,
            h,
            d
          ),
          standMat
        );

      stand.position.set(
        sx,
        h*.5+1.3,
        sz
      );

      stand.castShadow=true;
      stand.receiveShadow=true;

      group.add(stand);
    }
  );

  const poleMat=
    new THREE.MeshStandardMaterial({
      color:0x555b5d,
      roughness:.82
    });

  for(const [px,pz] of [
    [-148,-92],
    [148,-92],
    [-148,92],
    [148,92]
  ]){
    const pole=
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          1.4,
          1.8,
          42,
          8
        ),
        poleMat
      );

    pole.position.set(
      px,
      22,
      pz
    );

    group.add(pole);

    const lamp=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          11,
          3,
          2
        ),
        new THREE.MeshStandardMaterial({
          color:0xd6d8d2,
          emissive:0x2d2d24,
          emissiveIntensity:.22,
          roughness:.65
        })
      );

    lamp.position.set(
      px,
      43,
      pz
    );

    group.add(lamp);
  }

  group.position.set(
    x,
    ground+.2,
    z
  );

  group.rotation.y=angle;

  ozetiScenery.add(group);
}

function createChurchArea(x,z,angle=-.12){
  const ground=
    terrainHeight(x,z);

  const group=
    new THREE.Group();

  const plaza=
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        62,
        62,
        1.5,
        24
      ),
      new THREE.MeshStandardMaterial({
        color:0xb9b1a3,
        roughness:1
      })
    );

  plaza.position.y=.75;
  plaza.receiveShadow=true;
  group.add(plaza);

  const churchMat=
    new THREE.MeshStandardMaterial({
      color:0xd4cec0,
      roughness:.95
    });

  const roofMat=
    new THREE.MeshStandardMaterial({
      color:0x6f5147,
      roughness:.88
    });

  const body=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        24,
        18,
        46
      ),
      churchMat
    );

  body.position.set(
    0,
    9,
    8
  );

  body.castShadow=true;
  body.receiveShadow=true;

  group.add(body);

  const transept=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        42,
        15,
        16
      ),
      churchMat
    );

  transept.position.set(
    0,
    7.5,
    9
  );

  transept.castShadow=true;
  transept.receiveShadow=true;

  group.add(transept);

  const roof=
    new THREE.Mesh(
      new THREE.ConeGeometry(
        20,
        10,
        4
      ),
      roofMat
    );

  roof.rotation.y=
    Math.PI*.25;

  roof.position.set(
    0,
    22,
    8
  );

  roof.castShadow=true;
  group.add(roof);

  const tower=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        13,
        35,
        13
      ),
      churchMat
    );

  tower.position.set(
    0,
    17.5,
    -22
  );

  tower.castShadow=true;
  tower.receiveShadow=true;
  group.add(tower);

  const spire=
    new THREE.Mesh(
      new THREE.ConeGeometry(
        7.5,
        18,
        4
      ),
      roofMat
    );

  spire.rotation.y=
    Math.PI*.25;

  spire.position.set(
    0,
    44,
    -22
  );

  spire.castShadow=true;
  group.add(spire);

  const wallMat=
    new THREE.MeshStandardMaterial({
      color:0x9f978a,
      roughness:1
    });

  const wallSegments=[
    [0,-66,132,1.3,2.4],
    [0,66,132,1.3,2.4],
    [-66,0,1.3,132,2.4],
    [66,0,1.3,132,2.4]
  ];

  wallSegments.forEach(
    ([wx,wz,w,d,h])=>{
      const wall=
        new THREE.Mesh(
          new THREE.BoxGeometry(
            w,
            h,
            d
          ),
          wallMat
        );

      wall.position.set(
        wx,
        h*.5,
        wz
      );

      wall.receiveShadow=true;

      group.add(wall);
    }
  );

  for(const [hx,hz] of [
    [-38,34],
    [36,36],
    [-42,-34],
    [42,-30]
  ]){
    const hall=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          17,
          8,
          13
        ),
        new THREE.MeshStandardMaterial({
          color:0xc7beae,
          roughness:.96
        })
      );

    hall.position.set(
      hx,
      4,
      hz
    );

    hall.castShadow=true;
    hall.receiveShadow=true;
    group.add(hall);
  }

  group.position.set(
    x,
    ground+.2,
    z
  );

  group.rotation.y=angle;

  ozetiScenery.add(group);
}


function createTerrainPatch(x,z,w,d,{
  color=0x6f7659,
  segments=8,
  angle=0,
  yOffset=.08
}={}){
  const positions=[];
  const indices=[];

  const ca=Math.cos(angle);
  const sa=Math.sin(angle);

  for(let iz=0;iz<=segments;iz++){
    const vz=
      -d*.5+
      d*(iz/segments);

    for(let ix=0;ix<=segments;ix++){
      const vx=
        -w*.5+
        w*(ix/segments);

      const wx=
        x+
        vx*ca-
        vz*sa;

      const wz=
        z+
        vx*sa+
        vz*ca;

      positions.push(
        wx,
        terrainHeight(wx,wz)+yOffset,
        wz
      );
    }
  }

  const row=
    segments+1;

  for(let iz=0;iz<segments;iz++){
    for(let ix=0;ix<segments;ix++){
      const a=
        iz*row+ix;

      const b=
        a+1;

      const c=
        a+row;

      const d2=
        c+1;

      indices.push(
        a,c,b,
        b,c,d2
      );
    }
  }

  const geo=
    new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh=
    new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color,
        roughness:1,
        metalness:0,
        polygonOffset:true,
        polygonOffsetFactor:-1
      })
    );

  mesh.receiveShadow=true;

  ozetiScenery.add(mesh);

  return mesh;
}

function createParkingLot(x,z,w,d,angle=0){
  const group=
    new THREE.Group();

  const lot=
    createTerrainPatch(
      x,
      z,
      w,
      d,
      {
        color:0x5f615d,
        segments:6,
        angle,
        yOffset:.17
      }
    );

  /*
   * createTerrainPatch() already attaches to ozetiScenery.
   * The group below only holds the parking-space stripes.
   */
  const ca=Math.cos(angle);
  const sa=Math.sin(angle);

  const stripeMat=
    new THREE.MeshBasicMaterial({
      color:0xc7c6b7,
      transparent:true,
      opacity:.55
    });

  for(let i=-3;i<=3;i++){
    const localX=
      i*(w/8);

    const wx=
      x+
      localX*ca;

    const wz=
      z+
      localX*sa;

    const stripe=
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .45,
          .12,
          d*.72
        ),
        stripeMat
      );

    stripe.position.set(
      wx,
      terrainHeight(wx,wz)+.38,
      wz
    );

    stripe.rotation.y=angle;
    group.add(stripe);
  }

  ozetiScenery.add(group);

  return lot;
}

function seededRandom(seed){
  let value=
    seed>>>0;

  return ()=>{
    value=
      (
        Math.imul(
          value,
          1664525
        )+
        1013904223
      )>>>0;

    return value/
      4294967296;
  };
}

function createForestPatches(){
  const treeGeo=
    new THREE.ConeGeometry(
      5.2,
      18,
      5
    );

  treeGeo.translate(
    0,
    9,
    0
  );

  const trunkGeo=
    new THREE.CylinderGeometry(
      1.0,
      1.35,
      7,
      6
    );

  trunkGeo.translate(
    0,
    3.5,
    0
  );

  const crownMat=
    new THREE.MeshStandardMaterial({
      color:0xffffff,
      roughness:1
    });

  const trunkMat=
    new THREE.MeshStandardMaterial({
      color:0x5d4938,
      roughness:1
    });

  const patches=FOREST_PATCHES;

  const total=
    patches.reduce(
      (sum,p)=>sum+p[4],
      0
    );

  const crowns=
    new THREE.InstancedMesh(
      treeGeo,
      crownMat,
      total
    );

  const trunks=
    new THREE.InstancedMesh(
      trunkGeo,
      trunkMat,
      total
    );

  crowns.castShadow=true;
  crowns.receiveShadow=true;

  trunks.castShadow=true;
  trunks.receiveShadow=true;

  const dummy=
    new THREE.Object3D();

  const rand=
    seededRandom(
      0x0a2e71
    );

  let index=0;

  for(const patch of patches){
    const [
      cx,
      cz,
      rx,
      rz,
      count
    ]=patch;

    for(let i=0;i<count;i++){
      const a=
        rand()*
        Math.PI*
        2;

      const r=
        Math.sqrt(rand());

      const x=
        cx+
        Math.cos(a)*
        rx*
        r;

      const z=
        cz+
        Math.sin(a)*
        rz*
        r;

      /*
       * Keep the dense town core and river corridor readable.
       */
      const townDist=
        Math.hypot(
          x-180,
          z-120
        );

      const valleyZ=
        .16*x+
        220*
        Math.sin(
          x/1550
        );

      if(
        townDist<880 ||
        Math.abs(
          z-valleyZ
        )<145
      ){
        i--;
        continue;
      }

      const scale=
        .72+
        rand()*.65;

      const y=
        terrainHeight(x,z);

      dummy.position.set(
        x,
        y,
        z
      );

      dummy.rotation.set(
        0,
        rand()*
        Math.PI*
        2,
        0
      );

      dummy.scale.set(
        scale,
        scale,
        scale
      );

      dummy.updateMatrix();

      crowns.setMatrixAt(
        index,
        dummy.matrix
      );

      const crownColor=
        new THREE.Color(
          [
            0x2e5038,
            0x365d40,
            0x3e6645,
            0x294a34
          ][
            Math.floor(
              rand()*4
            )
          ]
        );

      crowns.setColorAt(
        index,
        crownColor
      );

      dummy.scale.set(
        scale*.82,
        scale,
        scale*.82
      );

      dummy.updateMatrix();

      trunks.setMatrixAt(
        index,
        dummy.matrix
      );

      index++;
    }
  }

  crowns.count=index;
  trunks.count=index;

  crowns.instanceMatrix.needsUpdate=true;
  trunks.instanceMatrix.needsUpdate=true;

  if(crowns.instanceColor){
    crowns.instanceColor.needsUpdate=true;
  }

  ozetiScenery.add(
    trunks,
    crowns
  );
}

function terrainSlopeAt(x,z,step=42){
  const hx0=
    terrainHeight(
      x-step,
      z
    );

  const hx1=
    terrainHeight(
      x+step,
      z
    );

  const hz0=
    terrainHeight(
      x,
      z-step
    );

  const hz1=
    terrainHeight(
      x,
      z+step
    );

  const dx=
    (hx1-hx0)/
    (step*2);

  const dz=
    (hz1-hz0)/
    (step*2);

  return Math.hypot(
    dx,
    dz
  );
}

function createGroundCover(){
  /*
   * Low-poly grass tufts are deliberately concentrated on gentle ground.
   * They provide low-altitude parallax without turning the whole map into
   * dense geometry.
   */
  const rand=
    seededRandom(
      0x51ca77
    );

  const grassGeo=
    new THREE.ConeGeometry(
      .45,
      1.7,
      3
    );

  grassGeo.translate(
    0,
    .85,
    0
  );

  const grassMat=
    new THREE.MeshStandardMaterial({
      color:0x567247,
      roughness:1,
      side:THREE.DoubleSide
    });

  const maxGrass=1150;

  const grass=
    new THREE.InstancedMesh(
      grassGeo,
      grassMat,
      maxGrass
    );

  grass.castShadow=false;
  grass.receiveShadow=true;

  const dummy=
    new THREE.Object3D();

  let count=0;

  for(let attempt=0;attempt<7600;attempt++){
    const x=
      THREE.MathUtils.lerp(
        -MAP_HALF_X+80,
        MAP_HALF_X-80,
        rand()
      );

    const z=
      THREE.MathUtils.lerp(
        -MAP_HALF_Z+80,
        MAP_HALF_Z-80,
        rand()
      );

    const slope=
      terrainSlopeAt(
        x,
        z,
        38
      );

    if(slope>.105){
      continue;
    }

    const townDist=
      Math.hypot(
        x-120,
        z-70
      );

    if(townDist<720){
      continue;
    }

    const nearFaction=
      Object.values(FACTIONS).some(
        faction=>{
          const center=
            factionCenterWorld(
              faction.id
            );

          return Math.hypot(
            x-center.x,
            z-center.z
          )<330;
        }
      );

    if(nearFaction){
      continue;
    }

    const y=
      terrainHeight(
        x,
        z
      );

    const s=
      .55+
      rand()*.85;

    dummy.position.set(
      x,
      y,
      z
    );

    dummy.rotation.set(
      0,
      rand()*Math.PI*2,
      0
    );

    dummy.scale.set(
      s,
      s*(.72+rand()*.55),
      s
    );

    dummy.updateMatrix();

    grass.setMatrixAt(
      count++,
      dummy.matrix
    );

    if(count>=maxGrass){
      break;
    }
  }

  grass.count=count;
  grass.instanceMatrix.needsUpdate=true;

  ozetiScenery.add(grass);
}

function createRiverReeds(points){
  const sampled=
    samplePolyline(
      points,
      105
    );

  const reedGeo=
    new THREE.ConeGeometry(
      .32,
      2.8,
      4
    );

  reedGeo.translate(
    0,
    1.4,
    0
  );

  const reedMat=
    new THREE.MeshStandardMaterial({
      color:0x4b6844,
      roughness:1
    });

  const maxCount=
    sampled.length*6;

  const reeds=
    new THREE.InstancedMesh(
      reedGeo,
      reedMat,
      maxCount
    );

  reeds.receiveShadow=true;

  const dummy=
    new THREE.Object3D();

  const rand=
    seededRandom(
      0x11eed42
    );

  let count=0;

  sampled.forEach(
    (p,i)=>{
      const prev=
        sampled[
          Math.max(0,i-1)
        ];

      const next=
        sampled[
          Math.min(
            sampled.length-1,
            i+1
          )
        ];

      let tx=
        next[0]-prev[0];

      let tz=
        next[1]-prev[1];

      const len=
        Math.hypot(
          tx,
          tz
        ) || 1;

      tx/=len;
      tz/=len;

      const nx=-tz;
      const nz=tx;

      for(const side of [-1,1]){
        for(let k=0;k<3;k++){
          const offset=
            54+
            rand()*38;

          const along=
            (rand()-.5)*55;

          const x=
            p[0]+
            nx*offset*side+
            tx*along;

          const z=
            p[1]+
            nz*offset*side+
            tz*along;

          if(
            Math.abs(x)>MAP_HALF_X-30 ||
            Math.abs(z)>MAP_HALF_Z-30
          ){
            continue;
          }

          const y=
            terrainHeight(
              x,
              z
            );

          const s=
            .7+
            rand()*.85;

          dummy.position.set(
            x,
            y,
            z
          );

          dummy.rotation.set(
            0,
            rand()*Math.PI*2,
            0
          );

          dummy.scale.set(
            s,
            s*(.8+rand()*.5),
            s
          );

          dummy.updateMatrix();

          reeds.setMatrixAt(
            count++,
            dummy.matrix
          );
        }
      }
    }
  );

  reeds.count=count;
  reeds.instanceMatrix.needsUpdate=true;

  ozetiScenery.add(reeds);
}

function createTerrainSurfaceDetails(){
  /*
   * Sparse low-poly rocks + scrub give scale at low altitude without
   * replacing the terrain with thousands of expensive unique meshes.
   */
  const rand=
    seededRandom(
      0x46a2c91
    );

  const rockGeo=
    new THREE.DodecahedronGeometry(
      1,
      0
    );

  const rockMat=
    new THREE.MeshStandardMaterial({
      color:0x696963,
      roughness:1,
      flatShading:true
    });

  const scrubGeo=
    new THREE.ConeGeometry(
      1.7,
      4.8,
      5
    );

  scrubGeo.translate(
    0,
    2.4,
    0
  );

  const scrubMat=
    new THREE.MeshStandardMaterial({
      color:0x456043,
      roughness:1
    });

  const rockMax=260;
  const scrubMax=620;

  const rocks=
    new THREE.InstancedMesh(
      rockGeo,
      rockMat,
      rockMax
    );

  const scrub=
    new THREE.InstancedMesh(
      scrubGeo,
      scrubMat,
      scrubMax
    );

  rocks.castShadow=true;
  rocks.receiveShadow=true;

  scrub.castShadow=true;
  scrub.receiveShadow=true;

  const dummy=
    new THREE.Object3D();

  let rockCount=0;
  let scrubCount=0;

  for(let attempt=0;attempt<4200;attempt++){
    const x=
      THREE.MathUtils.lerp(
        -MAP_HALF_X+90,
        MAP_HALF_X-90,
        rand()
      );

    const z=
      THREE.MathUtils.lerp(
        -MAP_HALF_Z+90,
        MAP_HALF_Z-90,
        rand()
      );

    const y=
      terrainHeight(
        x,
        z
      );

    const slope=
      terrainSlopeAt(
        x,
        z,
        45
      );

    const townDist=
      Math.hypot(
        x-120,
        z-70
      );

    const factionNear=
      Object.values(FACTIONS).some(
        faction=>{
          const center=
            factionCenterWorld(
              faction.id
            );

          return Math.hypot(
            x-center.x,
            z-center.z
          )<360;
        }
      );

    if(factionNear){
      continue;
    }

    if(
      rockCount<rockMax &&
      slope>.095 &&
      rand()<.24
    ){
      const s=
        3.2+
        rand()*7.5;

      dummy.position.set(
        x,
        y+s*.18,
        z
      );

      dummy.rotation.set(
        rand()*.45,
        rand()*Math.PI*2,
        rand()*.45
      );

      dummy.scale.set(
        s,
        s*(.55+rand()*.45),
        s*(.70+rand()*.65)
      );

      dummy.updateMatrix();

      rocks.setMatrixAt(
        rockCount++,
        dummy.matrix
      );
    }

    if(
      scrubCount<scrubMax &&
      townDist>720 &&
      slope<.16 &&
      rand()<.22
    ){
      const s=
        .65+
        rand()*.90;

      dummy.position.set(
        x,
        y,
        z
      );

      dummy.rotation.set(
        0,
        rand()*Math.PI*2,
        0
      );

      dummy.scale.set(
        s,
        s*(.78+rand()*.48),
        s
      );

      dummy.updateMatrix();

      scrub.setMatrixAt(
        scrubCount++,
        dummy.matrix
      );
    }

    if(
      rockCount>=rockMax &&
      scrubCount>=scrubMax
    ){
      break;
    }
  }

  rocks.count=rockCount;
  scrub.count=scrubCount;

  rocks.instanceMatrix.needsUpdate=true;
  scrub.instanceMatrix.needsUpdate=true;

  ozetiScenery.add(
    rocks,
    scrub
  );
}

function createRiverBankVegetation(points){
  const sampled=
    samplePolyline(
      points,
      145
    );

  const treeGeo=
    new THREE.ConeGeometry(
      4.0,
      14,
      5
    );

  treeGeo.translate(
    0,
    7,
    0
  );

  const treeMat=
    new THREE.MeshStandardMaterial({
      color:0x31533a,
      roughness:1
    });

  const maxCount=
    sampled.length*4;

  const trees=
    new THREE.InstancedMesh(
      treeGeo,
      treeMat,
      maxCount
    );

  trees.castShadow=true;
  trees.receiveShadow=true;

  const dummy=
    new THREE.Object3D();

  const rand=
    seededRandom(
      0x817beef
    );

  let count=0;

  sampled.forEach(
    (p,i)=>{
      const prev=
        sampled[
          Math.max(0,i-1)
        ];

      const next=
        sampled[
          Math.min(
            sampled.length-1,
            i+1
          )
        ];

      let tx=
        next[0]-prev[0];

      let tz=
        next[1]-prev[1];

      const length=
        Math.hypot(
          tx,
          tz
        ) || 1;

      tx/=length;
      tz/=length;

      const nx=-tz;
      const nz=tx;

      for(const side of [-1,1]){
        const treesHere=
          rand()>.48
            ? 2
            : 1;

        for(let k=0;k<treesHere;k++){
          const offset=
            76+
            rand()*72;

          const along=
            (rand()-.5)*70;

          const x=
            p[0]+
            nx*offset*side+
            tx*along;

          const z=
            p[1]+
            nz*offset*side+
            tz*along;

          if(
            Math.abs(x)>MAP_HALF_X-50 ||
            Math.abs(z)>MAP_HALF_Z-50
          ){
            continue;
          }

          const y=
            terrainHeight(
              x,
              z
            );

          const s=
            .72+
            rand()*.65;

          dummy.position.set(
            x,
            y,
            z
          );

          dummy.rotation.set(
            0,
            rand()*Math.PI*2,
            0
          );

          dummy.scale.set(
            s,
            s,
            s
          );

          dummy.updateMatrix();

          trees.setMatrixAt(
            count++,
            dummy.matrix
          );
        }
      }
    }
  );

  trees.count=count;
  trees.instanceMatrix.needsUpdate=true;

  ozetiScenery.add(trees);
}

function createUtilityLine(points){
  const poleMat=
    new THREE.MeshStandardMaterial({
      color:0x51575a,
      roughness:.9
    });

  const wireMat=
    new THREE.LineBasicMaterial({
      color:0x34383a,
      transparent:true,
      opacity:.72
    });

  const sampled=
    samplePolyline(
      points,
      145
    );

  const wirePoints=[];

  sampled.forEach(
    (p,index)=>{
      const ground=
        terrainHeight(
          p[0],
          p[1]
        );

      const pole=
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            .55,
            .85,
            15,
            6
          ),
          poleMat
        );

      pole.position.set(
        p[0],
        ground+7.5,
        p[1]
      );

      pole.castShadow=true;

      ozetiScenery.add(pole);

      if(index%2===0){
        const arm=
          new THREE.Mesh(
            new THREE.BoxGeometry(
              7,
              .5,
              .5
            ),
            poleMat
          );

        arm.position.set(
          p[0],
          ground+14,
          p[1]
        );

        ozetiScenery.add(arm);
      }

      wirePoints.push(
        new THREE.Vector3(
          p[0],
          ground+14.4,
          p[1]
        )
      );
    }
  );

  const line=
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        wirePoints
      ),
      wireMat
    );

  ozetiScenery.add(line);
}

function addOzetiLandmarks(){
  clearOzetiScenery();

  ozetiScenery.add(
    buildRiverSystem(
      RIVER_PATH,
      RIVER_WIDTHS
    )
  );

  createTownCenter(
    ...LANDMARKS.townCenter
  );

  LANDMARKS.residential.forEach(
    item=>createResidentialCluster(
      ...item
    )
  );

  createStadium(
    ...LANDMARKS.stadium
  );

  createParkingLot(
    ...LANDMARKS.stadiumParking
  );

  createChurchArea(
    ...LANDMARKS.church
  );

  LANDMARKS.industrial.forEach(
    item=>createIndustrialCluster(
      ...item
    )
  );

  LANDMARKS.industrialParking.forEach(
    item=>createParkingLot(
      ...item
    )
  );

  ozetiScenery.add(
    buildRoad(
      PRIMARY_ROADS.valley,
      31,
      {
        asphalt:0x61635f,
        shoulder:0x8d816c,
        centerLine:true
      }
    )
  );

  ozetiScenery.add(
    buildRoad(
      PRIMARY_ROADS.crossTown,
      29,
      {
        asphalt:0x62645f,
        shoulder:0x8d816c,
        centerLine:true
      }
    )
  );

  ozetiScenery.add(
    buildRoad(
      PRIMARY_ROADS.west,
      25,
      {
        asphalt:0x696963,
        shoulder:0x887b66,
        centerLine:true
      }
    )
  );

  SECONDARY_ROADS.forEach(
    points=>{
      ozetiScenery.add(
        buildRoad(
          points,
          17,
          {
            asphalt:0x716d62,
            shoulder:0x887d69,
            centerLine:false
          }
        )
      );
    }
  );

  BRIDGES.forEach(
    bridge=>{
      ozetiScenery.add(
        createBridge(
          bridge.a,
          bridge.b,
          bridge.width
        )
      );
    }
  );

  FIELDS.forEach(
    field=>{
      createTerrainPatch(
        field[0],
        field[1],
        field[2],
        field[3],
        {
          angle:field[4],
          color:field[5],
          segments:9,
          yOffset:.06
        }
      );
    }
  );

  createForestPatches();

  createRiverBankVegetation(
    RIVER_PATH
  );

  createRiverReeds(
    RIVER_PATH
  );

  createGroundCover();
  createTerrainSurfaceDetails();

  createUtilityLine(
    UTILITY_LINE
  );
}



  addOzetiLandmarks();

  return {
    group:ozetiScenery,
    clear:clearOzetiScenery
  };
}
