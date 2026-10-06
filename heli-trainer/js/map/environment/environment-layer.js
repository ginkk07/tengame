import {
  FOREST_REFERENCE_POINTS,
  BUILDING_REFERENCE_FEATURES,
  OZETI_PLAYABLE_BOUNDS
} from '../map-data.js?v=88';

import {
  mapPointToWorld
} from '../factions.js?v=88';

const ENVIRONMENT_SECTOR='environment-v88';
const TREES_PER_REFERENCE=6;
const TREE_CLUSTER_RADIUS=42;
const BUILDING_TREE_CLEARANCE=24;
const COLLISION_CELL_SIZE=128;

function fract(value){
  return value-Math.floor(value);
}

function hash01(x,y,salt=0){
  return fract(
    Math.sin(
      Number(x)*12.9898+
      Number(y)*78.233+
      Number(salt)*37.719
    )*43758.5453123
  );
}

function insidePlayable(mapX,mapY,margin=0){
  return (
    mapX>=OZETI_PLAYABLE_BOUNDS.minX+margin &&
    mapX<=OZETI_PLAYABLE_BOUNDS.maxX-margin &&
    mapY>=OZETI_PLAYABLE_BOUNDS.minY+margin &&
    mapY<=OZETI_PLAYABLE_BOUNDS.maxY-margin
  );
}

function buildingModel(feature){
  const width=Number(feature.w)||15;
  const depth=Number(feature.d)||13.5;
  const height=Number(feature.h)||6.8;
  const maxSide=Math.max(width,depth);
  const area=width*depth;

  if(maxSide>=29 || area>=650){
    return {
      id:'building.industrial',
      base:[30,8.75,20]
    };
  }

  if(height>=10.4 || area>=500){
    return {
      id:'building.apartment',
      base:[22,14.8,12]
    };
  }

  if(maxSide>=20 || height>=8.1){
    return {
      id:'building.house.large',
      base:[13,10.58,18]
    };
  }

  return {
    id:'building.house.small',
    base:[9,7.94,12]
  };
}

function treeTooCloseToBuilding(mapX,mapY){
  const limitSq=BUILDING_TREE_CLEARANCE*BUILDING_TREE_CLEARANCE;

  for(const building of BUILDING_REFERENCE_FEATURES){
    const dx=mapX-building.x;
    const dy=mapY-building.y;

    if(dx*dx+dy*dy<limitSq){
      return true;
    }
  }

  return false;
}

function makeTreePlacements(){
  const placements=[];
  const collision=[];

  FOREST_REFERENCE_POINTS.forEach((point,seedIndex)=>{
    const baseX=Number(point[0]);
    const baseY=Number(point[1]);

    for(let i=0;i<TREES_PER_REFERENCE;i++){
      let mapX=baseX;
      let mapY=baseY;

      if(i>0){
        const angle=
          hash01(baseX,baseY,seedIndex*17+i*5)*
          Math.PI*2;

        const radial=
          Math.sqrt(
            hash01(baseY,baseX,seedIndex*23+i*11)
          )*
          TREE_CLUSTER_RADIUS;

        mapX+=Math.cos(angle)*radial;
        mapY+=Math.sin(angle)*radial;
      }

      if(!insidePlayable(mapX,mapY,8)){
        continue;
      }

      if(treeTooCloseToBuilding(mapX,mapY)){
        continue;
      }

      const typeRoll=hash01(mapX,mapY,91);
      const model=typeRoll<0.22 ? 'tree.conifer' : 'tree.broadleaf';
      const scale=.80+hash01(mapY,mapX,131)*.48;
      const rotationY=hash01(mapX,mapY,173)*Math.PI*2;

      placements.push({
        model,
        mapX,
        mapY,
        rotationY,
        scale,
        yOffset:0,
        alignToTerrain:false
      });

      collision.push({
        kind:'tree',
        mapX,
        mapY,
        scale,
        model
      });
    }
  });

  return {placements,collision};
}

function makeBuildingPlacements(){
  const placements=[];
  const collision=[];

  for(const feature of BUILDING_REFERENCE_FEATURES){
    if(!insidePlayable(feature.x,feature.y,2)){
      continue;
    }

    const model=buildingModel(feature);
    const width=Number(feature.w)||15;
    const depth=Number(feature.d)||13.5;
    const height=Number(feature.h)||6.8;
    const yaw=Number(feature.angle)||0;

    placements.push({
      model:model.id,
      mapX:feature.x,
      mapY:feature.y,
      rotationY:yaw,
      scale:[
        width/model.base[0],
        height/model.base[1],
        depth/model.base[2]
      ],
      yOffset:0,
      alignToTerrain:false
    });

    collision.push({
      kind:'building',
      mapX:feature.x,
      mapY:feature.y,
      width,
      depth,
      height,
      yaw
    });
  }

  return {placements,collision};
}

export function createEnvironmentLayer({
  objects,
  terrainHeight
}){
  const trees=makeTreePlacements();
  const buildings=makeBuildingPlacements();
  const collisionRecords=[];
  const collisionGrid=new Map();
  let loaded=false;

  function gridKey(ix,iz){
    return `${ix}_${iz}`;
  }

  function insertCollision(record){
    collisionRecords.push(record);

    const ix=Math.floor(record.x/COLLISION_CELL_SIZE);
    const iz=Math.floor(record.z/COLLISION_CELL_SIZE);
    const key=gridKey(ix,iz);

    if(!collisionGrid.has(key)){
      collisionGrid.set(key,[]);
    }

    collisionGrid.get(key).push(record);
  }

  function rebuild(){
    if(loaded){
      return stats();
    }

    const placements=[
      ...trees.placements,
      ...buildings.placements
    ];

    objects.placement.placeMany(
      placements,
      {sectorId:ENVIRONMENT_SECTOR}
    );

    for(const record of trees.collision){
      const world=mapPointToWorld(record.mapX,record.mapY);
      const conifer=record.model==='tree.conifer';
      const height=(conifer ? 13.2 : 11.6)*record.scale;
      const radius=(conifer ? 3.1 : 3.2)*record.scale;

      const groundY=terrainHeight(world.x,world.z);

      insertCollision({
        kind:'tree',
        x:world.x,
        z:world.z,
        groundY,
        topY:groundY+height,
        radius,
        yaw:0,
        halfW:radius,
        halfD:radius
      });
    }

    for(const record of buildings.collision){
      const world=mapPointToWorld(record.mapX,record.mapY);
      const groundY=terrainHeight(world.x,world.z);

      insertCollision({
        kind:'building',
        x:world.x,
        z:world.z,
        groundY,
        topY:groundY+record.height,
        radius:0,
        yaw:record.yaw,
        halfW:record.width*.5,
        halfD:record.depth*.5
      });
    }

    loaded=true;
    return stats();
  }

  function clear(){
    if(!loaded){
      return;
    }

    objects.clearSector(ENVIRONMENT_SECTOR);
    collisionRecords.length=0;
    collisionGrid.clear();
    loaded=false;
  }

  function hitTest(x,y,z,clearance=0){
    const px=Number(x);
    const py=Number(y);
    const pz=Number(z);

    const cellX=Math.floor(px/COLLISION_CELL_SIZE);
    const cellZ=Math.floor(pz/COLLISION_CELL_SIZE);

    for(let dzCell=-1;dzCell<=1;dzCell++){
      for(let dxCell=-1;dxCell<=1;dxCell++){
        const records=collisionGrid.get(
          gridKey(cellX+dxCell,cellZ+dzCell)
        ) || [];

        for(const record of records){
          if(py>record.topY+clearance){
            continue;
          }

          const dx=px-record.x;
          const dz=pz-record.z;

          if(record.kind==='tree'){
            const r=record.radius+clearance;
            if(dx*dx+dz*dz<=r*r){
              return record;
            }
            continue;
          }

          const c=Math.cos(record.yaw);
          const s=Math.sin(record.yaw);
          const localX=dx*c+dz*s;
          const localZ=-dx*s+dz*c;

          if(
            Math.abs(localX)<=record.halfW+clearance &&
            Math.abs(localZ)<=record.halfD+clearance
          ){
            return record;
          }
        }
      }
    }

    return null;
  }

  function resolveMovement(previous,current,clearance=2.2){
    const hit=hitTest(
      current.x,
      current.y,
      current.z,
      clearance
    );

    if(!hit){
      return null;
    }

    const previousHit=hitTest(
      previous.x,
      previous.y,
      previous.z,
      clearance
    );

    if(
      !previousHit &&
      previous.y>hit.topY+clearance &&
      current.y<=hit.topY+clearance
    ){
      current.y=hit.topY+clearance;
      return {
        kind:hit.kind,
        mode:'vertical',
        topY:hit.topY
      };
    }

    current.x=previous.x;
    current.z=previous.z;

    return {
      kind:hit.kind,
      mode:'horizontal',
      topY:hit.topY
    };
  }

  function stats(){
    return {
      forestReferencePoints:FOREST_REFERENCE_POINTS.length,
      trees:trees.placements.length,
      buildingReferences:BUILDING_REFERENCE_FEATURES.length,
      buildings:buildings.placements.length,
      collisionObjects:collisionRecords.length,
      loaded
    };
  }

  return {
    rebuild,
    clear,
    hitTest,
    resolveMovement,
    stats,
    source:{
      terrain:'verified recovered heightfield',
      forest:'calibrated woodland-density reconstruction',
      buildings:'calibrated building-footprint reconstruction'
    }
  };
}
