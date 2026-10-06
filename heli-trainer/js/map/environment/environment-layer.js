import {
  BUILDING_REFERENCE_FEATURES,
  OZETI_PLAYABLE_BOUNDS,
  FACTIONS,
  SITE_CLEARINGS,
  FULLMAP_POIS
} from '../map-data.js?v=91';

import {
  mapPointToWorld
} from '../factions.js?v=91';

import {
  ROAD_PATHS
} from '../roads/road-data.js?v=91';

import {
  FOREST_DENSITY_CELLS,
  FOREST_DENSITY_META
} from './environment-data-v90.js?v=91';

import {FACILITY_CLEARINGS_V91} from '../facilities/facility-data-v91.js?v=91';

const ENVIRONMENT_SECTOR='environment-v91';
const BUILDING_TREE_MARGIN=10;
const BASE_TREE_MARGIN=0;
const PRIMARY_ROAD_TREE_MARGIN=10;
const TREE_MIN_SPACING=7.5;
const COLLISION_CELL_SIZE=128;

const PRIMARY_ROADS=ROAD_PATHS.filter(path=>path.class==='primary');

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

function pointInPolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const xi=points[i][0];
    const yi=points[i][1];
    const xj=points[j][0];
    const yj=points[j][1];
    const intersects=(
      ((yi>y)!==(yj>y)) &&
      (x < (xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi)
    );
    if(intersects){
      inside=!inside;
    }
  }
  return inside;
}

function insideFactionBase(mapX,mapY){
  for(const faction of Object.values(FACTIONS)){
    if(pointInPolygon(mapX,mapY,faction.points)){
      return true;
    }
  }
  return false;
}

function insideSiteClearing(mapX,mapY){
  for(const site of SITE_CLEARINGS){
    const dx=mapX-site.x;
    const dy=mapY-site.y;
    if(dx*dx+dy*dy<=site.radius*site.radius){
      return true;
    }
  }
  return false;
}

const BUILT_POI_KINDS=new Set([
  'stadium','pool','church_top','lumberyard','apartments','garage',
  'shops_1','shops_2','industrial_1','residential','church_terrace'
]);

function insideBuiltPoiClearing(mapX,mapY){
  for(const point of FULLMAP_POIS){
    if(!BUILT_POI_KINDS.has(point.kind)) continue;
    let radius=24;
    if(point.kind==='stadium') radius=135;
    else if(point.kind==='industrial_1' || point.kind==='lumberyard') radius=34;
    else if(point.kind==='apartments') radius=30;
    const dx=mapX-point.x;
    const dy=mapY-point.y;
    if(dx*dx+dy*dy<=radius*radius) return true;
  }
  return false;
}

function insideFacilityClearing(mapX,mapY){
  for(const site of FACILITY_CLEARINGS_V91){
    const dx=mapX-site.x;
    const dy=mapY-site.y;
    if(dx*dx+dy*dy<=site.radius*site.radius) return true;
  }
  return false;
}

function pointSegmentDistanceSq(px,py,ax,ay,bx,by){
  const abx=bx-ax;
  const aby=by-ay;
  const apx=px-ax;
  const apy=py-ay;
  const denom=abx*abx+aby*aby;
  const t=denom>0
    ? Math.max(0,Math.min(1,(apx*abx+apy*aby)/denom))
    : 0;
  const qx=ax+abx*t;
  const qy=ay+aby*t;
  const dx=px-qx;
  const dy=py-qy;
  return dx*dx+dy*dy;
}

function treeTooCloseToPrimaryRoad(mapX,mapY){
  for(const path of PRIMARY_ROADS){
    const clearance=path.width*.5+PRIMARY_ROAD_TREE_MARGIN;
    const limitSq=clearance*clearance;
    for(let i=1;i<path.points.length;i++){
      const a=path.points[i-1];
      const b=path.points[i];
      if(pointSegmentDistanceSq(
        mapX,mapY,a[0],a[1],b[0],b[1]
      )<=limitSq){
        return true;
      }
    }
  }
  return false;
}

function treeTooCloseToBuilding(mapX,mapY){
  for(const building of BUILDING_REFERENCE_FEATURES){
    const dx=mapX-building.x;
    const dy=mapY-building.y;
    const yaw=Number(building.angle)||0;
    const c=Math.cos(yaw);
    const s=Math.sin(yaw);
    const localX=dx*c+dy*s;
    const localY=-dx*s+dy*c;
    const halfW=(Number(building.w)||15)*.5+BUILDING_TREE_MARGIN;
    const halfD=(Number(building.d)||13.5)*.5+BUILDING_TREE_MARGIN;
    if(Math.abs(localX)<=halfW && Math.abs(localY)<=halfD){
      return true;
    }
  }
  return false;
}

function buildingModel(feature){
  const width=Number(feature.w)||15;
  const depth=Number(feature.d)||13.5;
  const height=Number(feature.h)||6.8;
  const maxSide=Math.max(width,depth);
  const area=width*depth;

  if(maxSide>=29 || area>=650){
    return {id:'building.industrial',base:[30,8.75,20]};
  }
  if(height>=10.4 || area>=500){
    return {id:'building.apartment',base:[22,14.8,12]};
  }
  if(maxSide>=20 || height>=8.1){
    return {id:'building.house.large',base:[13,10.58,18]};
  }
  return {id:'building.house.small',base:[9,7.94,12]};
}

function forestTreeCount(density){
  return Math.max(2,Math.min(7,2+Math.round(density*5)));
}

function makeTreePlacements(){
  const placements=[];
  const collision=[];
  const treeGrid=new Map();
  let skippedBuildings=0;
  let skippedBases=0;
  let skippedPrimaryRoads=0;
  let skippedSpacing=0;
  let skippedBounds=0;

  function spacingKey(ix,iy){
    return `${ix}_${iy}`;
  }

  function treeTooCloseToTree(mapX,mapY){
    const cellSize=TREE_MIN_SPACING;
    const ix=Math.floor(mapX/cellSize);
    const iy=Math.floor(mapY/cellSize);
    const limitSq=TREE_MIN_SPACING*TREE_MIN_SPACING;

    for(let dy=-1;dy<=1;dy++){
      for(let dx=-1;dx<=1;dx++){
        const records=treeGrid.get(spacingKey(ix+dx,iy+dy)) || [];
        for(const point of records){
          const ox=mapX-point[0];
          const oy=mapY-point[1];
          if(ox*ox+oy*oy<limitSq){
            return true;
          }
        }
      }
    }
    return false;
  }

  function recordTree(mapX,mapY){
    const cellSize=TREE_MIN_SPACING;
    const ix=Math.floor(mapX/cellSize);
    const iy=Math.floor(mapY/cellSize);
    const key=spacingKey(ix,iy);
    if(!treeGrid.has(key)){
      treeGrid.set(key,[]);
    }
    treeGrid.get(key).push([mapX,mapY]);
  }

  FOREST_DENSITY_CELLS.forEach((cell,cellIndex)=>{
    const baseX=Number(cell[0]);
    const baseY=Number(cell[1]);
    const density=Math.max(0,Math.min(1,Number(cell[2])||0));
    const count=forestTreeCount(density);
    const clusterRadius=52+density*34;

    for(let i=0;i<count;i++){
      const angle=hash01(baseX,baseY,cellIndex*31+i*7)*Math.PI*2;
      const radial=Math.sqrt(
        hash01(baseY,baseX,cellIndex*47+i*13)
      )*clusterRadius;

      const mapX=baseX+Math.cos(angle)*radial;
      const mapY=baseY+Math.sin(angle)*radial;

      if(!insidePlayable(mapX,mapY,7)){
        skippedBounds++;
        continue;
      }
      if(insideFactionBase(mapX,mapY,BASE_TREE_MARGIN)){
        skippedBases++;
        continue;
      }
      if(insideSiteClearing(mapX,mapY)){
        skippedBases++;
        continue;
      }
      if(insideBuiltPoiClearing(mapX,mapY)){
        skippedBuildings++;
        continue;
      }
      if(insideFacilityClearing(mapX,mapY)){
        skippedBuildings++;
        continue;
      }
      if(treeTooCloseToBuilding(mapX,mapY)){
        skippedBuildings++;
        continue;
      }
      if(treeTooCloseToPrimaryRoad(mapX,mapY)){
        skippedPrimaryRoads++;
        continue;
      }
      if(treeTooCloseToTree(mapX,mapY)){
        skippedSpacing++;
        continue;
      }

      recordTree(mapX,mapY);

      const typeRoll=hash01(mapX,mapY,91);
      const model=typeRoll<0.24 ? 'tree.conifer' : 'tree.broadleaf';
      const scale=.78+hash01(mapY,mapX,131)*.50;
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

      collision.push({kind:'tree',mapX,mapY,scale,model});
    }
  });

  return {
    placements,
    collision,
    skipped:{
      bounds:skippedBounds,
      bases:skippedBases,
      buildings:skippedBuildings,
      primaryRoads:skippedPrimaryRoads,
      spacing:skippedSpacing
    }
  };
}

function rotatedBuildingCorner(feature,sx,sz){
  const width=Number(feature.w)||15;
  const depth=Number(feature.d)||13.5;
  const yaw=Number(feature.angle)||0;
  const c=Math.cos(yaw);
  const s=Math.sin(yaw);
  const lx=sx*width*.5;
  const lz=sz*depth*.5;
  return {
    x:feature.x+lx*c-lz*s,
    y:feature.y+lx*s+lz*c
  };
}

function buildingGround(feature,terrainHeight){
  const samples=[
    {x:feature.x,y:feature.y},
    rotatedBuildingCorner(feature,-1,-1),
    rotatedBuildingCorner(feature, 1,-1),
    rotatedBuildingCorner(feature, 1, 1),
    rotatedBuildingCorner(feature,-1, 1)
  ].map(point=>{
    const world=mapPointToWorld(point.x,point.y);
    return terrainHeight(world.x,world.z);
  });

  const center=samples[0];
  const min=Math.min(...samples);
  const max=Math.max(...samples);
  const uphillLift=Math.min(.8,Math.max(0,(max-center)*.25));
  const base=center+uphillLift-.15;

  return {
    center,
    min,
    max,
    base,
    yOffset:base-center,
    relief:max-min
  };
}

function makeBuildingPlacements(terrainHeight){
  const placements=[];
  const collision=[];
  let maxFootprintRelief=0;

  for(const feature of BUILDING_REFERENCE_FEATURES){
    if(!insidePlayable(feature.x,feature.y,2)){
      continue;
    }

    const model=buildingModel(feature);
    const width=Number(feature.w)||15;
    const depth=Number(feature.d)||13.5;
    const height=Number(feature.h)||6.8;
    const yaw=Number(feature.angle)||0;
    const ground=buildingGround(feature,terrainHeight);

    maxFootprintRelief=Math.max(maxFootprintRelief,ground.relief);

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
      yOffset:ground.yOffset,
      alignToTerrain:false
    });

    collision.push({
      kind:'building',
      mapX:feature.x,
      mapY:feature.y,
      width,
      depth,
      height,
      yaw,
      baseY:ground.base
    });
  }

  return {placements,collision,maxFootprintRelief};
}

export function createEnvironmentLayer({objects,terrainHeight}){
  const collisionRecords=[];
  const collisionGrid=new Map();
  let trees=null;
  let buildings=null;
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

    trees=makeTreePlacements();
    buildings=makeBuildingPlacements(terrainHeight);

    objects.placement.placeMany(
      [...trees.placements,...buildings.placements],
      {sectorId:ENVIRONMENT_SECTOR}
    );

    for(const record of trees.collision){
      const world=mapPointToWorld(record.mapX,record.mapY);
      const conifer=record.model==='tree.conifer';
      const height=(conifer ? 13.2 : 11.6)*record.scale;
      const radius=(conifer ? 3.45 : 3.85)*record.scale;
      const groundY=terrainHeight(world.x,world.z);

      insertCollision({
        kind:'tree',x:world.x,z:world.z,
        groundY,topY:groundY+height,radius,
        yaw:0,halfW:radius,halfD:radius
      });
    }

    for(const record of buildings.collision){
      const world=mapPointToWorld(record.mapX,record.mapY);
      insertCollision({
        kind:'building',x:world.x,z:world.z,
        groundY:record.baseY,
        topY:record.baseY+record.height,
        radius:0,yaw:record.yaw,
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
    trees=null;
    buildings=null;
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
    const hit=hitTest(current.x,current.y,current.z,clearance);
    if(!hit){
      return null;
    }

    const previousHit=hitTest(
      previous.x,previous.y,previous.z,clearance
    );

    if(
      !previousHit &&
      previous.y>hit.topY+clearance &&
      current.y<=hit.topY+clearance
    ){
      current.y=hit.topY+clearance;
      return {kind:hit.kind,mode:'vertical',topY:hit.topY};
    }

    current.x=previous.x;
    current.z=previous.z;
    return {kind:hit.kind,mode:'horizontal',topY:hit.topY};
  }

  function stats(){
    return {
      forestDensityCells:FOREST_DENSITY_META.cells,
      trees:trees ? trees.placements.length : 0,
      treeSkipped:trees ? trees.skipped : null,
      buildingReferences:BUILDING_REFERENCE_FEATURES.length,
      buildings:buildings ? buildings.placements.length : 0,
      maxBuildingFootprintRelief:buildings ? buildings.maxFootprintRelief : 0,
      collisionObjects:collisionRecords.length,
      loaded
    };
  }

  return {
    rebuild,clear,hitTest,resolveMovement,stats,
    source:{
      terrain:'verified recovered heightfield',
      forest:'tactical-image woodland density reconstruction / not per-tree ground truth',
      buildings:'calibrated building-footprint reconstruction'
    }
  };
}
