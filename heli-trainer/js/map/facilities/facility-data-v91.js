import {
  FACILITY_REFERENCE_POINTS,
  FACTIONS,
  FULLMAP_ENVIRONMENT_POIS,
  FULLMAP_POIS,
  OZETI_PLAYABLE_BOUNDS,
  STADIUM_REFERENCE
} from '../map-data.js?v=91';

/*
 * v91 simulation-support facilities.
 *
 * These are NOT extracted original Unreal actor transforms. They are proxy
 * obstacles/layouts anchored to calibrated Ozeti references so the helicopter
 * simulator has believable flight-scale facilities around known bases, farms
 * and town landmarks. Exact model shape/offset is intentionally treated as
 * simulation reconstruction rather than ground-truth asset placement.
 */
export const FACILITY_LAYOUT_META=Object.freeze({
  version:91,
  source:'official facility anchors + calibrated full-map POIs',
  interpretation:'simulation proxy layout / not original actor positions'
});

function insidePlayable(x,y,margin=0){
  return (
    x>=OZETI_PLAYABLE_BOUNDS.minX+margin &&
    x<=OZETI_PLAYABLE_BOUNDS.maxX-margin &&
    y>=OZETI_PLAYABLE_BOUNDS.minY+margin &&
    y<=OZETI_PLAYABLE_BOUNDS.maxY-margin
  );
}

function stableYaw(id){
  let h=2166136261;
  for(let i=0;i<id.length;i++){
    h^=id.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return ((h>>>0)%6283)/1000;
}

function offsetPoint(anchor,yaw,forward,right){
  const c=Math.cos(yaw);
  const s=Math.sin(yaw);
  return {
    x:anchor.x+right*c-forward*s,
    y:anchor.y+right*s+forward*c
  };
}

function baseAnchor(factionId){
  const points=FACILITY_REFERENCE_POINTS.filter(item=>item.faction===factionId);
  return {
    x:points.reduce((sum,item)=>sum+item.x,0)/points.length,
    y:points.reduce((sum,item)=>sum+item.y,0)/points.length
  };
}

function baseYaw(factionId){
  const polygon=FACTIONS[factionId].points;
  const a=polygon[0];
  const b=polygon[1];
  return Math.atan2(b[1]-a[1],b[0]-a[0]);
}

const placement=[];
const collision=[];
const clearings=[];
const counts={baseSupport:0,farmSupport:0,townSupport:0};

function add({
  id,group,model,x,y,yaw=0,scale=1,
  halfW,halfD,height,clearRadius=0,yOffset=0
}){
  if(!insidePlayable(x,y,Math.max(4,Math.min(24,clearRadius*.25)))) return;
  placement.push({
    id,group,model,mapX:x,mapY:y,rotationY:yaw,scale,yOffset,
    name:`Ozeti ${id} simulation proxy`
  });
  if(Number.isFinite(halfW) && Number.isFinite(halfD) && Number.isFinite(height)){
    collision.push({
      id,kind:'facility_support',mapX:x,mapY:y,
      halfW,halfD,height,yaw,yOffset
    });
  }
  if(clearRadius>0){
    clearings.push({id,x,y,radius:clearRadius});
  }
  counts[group]++;
}

for(const factionId of ['lonestar','manticore','valkyra']){
  const anchor=baseAnchor(factionId);
  const yaw=baseYaw(factionId);
  const specs=[
    ['hangar_a','facility.hangar',-42,-55,16,22,11.5,30],
    ['operations','facility.operations',-48,0,12,9,8.5,24],
    ['hangar_b','facility.hangar',-42,55,16,22,11.5,30],
    ['vehicle_shelter','facility.vehicle_shelter',15,-52,12,7,5.8,21],
    ['workshop','facility.workshop',32,0,12,8,7.2,22],
    ['fuel_depot','facility.fuel_depot',15,52,13,10,8.4,24],
    ['light_mast_w','facility.light_mast',58,-66,1.4,1.4,27,9],
    ['gatehouse','facility.gatehouse',72,0,7,4,4.8,18],
    ['light_mast_e','facility.light_mast',58,66,1.4,1.4,27,9]
  ];

  for(const [suffix,model,forward,right,halfW,halfD,height,clearRadius] of specs){
    const point=offsetPoint(anchor,yaw,forward,right);
    add({
      id:`${factionId}_${suffix}`,
      group:'baseSupport',model,
      x:point.x,y:point.y,yaw,
      halfW,halfD,height,clearRadius
    });
  }
}

const farmPois=FULLMAP_ENVIRONMENT_POIS.filter(item=>item.kind==='farm');
for(const farm of farmPois){
  const yaw=stableYaw(farm.id);
  const barn=offsetPoint(farm,yaw,0,0);
  const silo=offsetPoint(farm,yaw,-10,23);
  const shed=offsetPoint(farm,yaw,15,-20);
  add({
    id:`${farm.id}_barn`,group:'farmSupport',model:'facility.barn',
    x:barn.x,y:barn.y,yaw,halfW:11,halfD:16,height:10.5,clearRadius:24
  });
  add({
    id:`${farm.id}_silo`,group:'farmSupport',model:'facility.silo',
    x:silo.x,y:silo.y,yaw,halfW:4.5,halfD:4.5,height:14.5,clearRadius:12
  });
  add({
    id:`${farm.id}_shed`,group:'farmSupport',model:'facility.storage_shed',
    x:shed.x,y:shed.y,yaw,halfW:7,halfD:5,height:5.5,clearRadius:14
  });
}

const industrial=FULLMAP_POIS.find(item=>item.id==='industrial_1');
if(industrial){
  const yaw=.18;
  for(const [suffix,forward,right] of [
    ['tank_a',-18,26],['tank_b',4,30],['shed',24,-24]
  ]){
    const p=offsetPoint(industrial,yaw,forward,right);
    const isTank=suffix.startsWith('tank');
    add({
      id:`industrial_1_${suffix}`,group:'townSupport',
      model:isTank?'facility.fuel_tank':'facility.storage_shed',
      x:p.x,y:p.y,yaw,
      halfW:isTank?4.5:7,
      halfD:isTank?4.5:5,
      height:isTank?9.5:5.5,
      clearRadius:isTank?12:14
    });
  }
}

const lumberyard=FULLMAP_POIS.find(item=>item.id==='lumberyard');
if(lumberyard){
  const p=offsetPoint(lumberyard,.04,18,30);
  add({
    id:'lumberyard_loading_shelter',group:'townSupport',
    model:'facility.vehicle_shelter',x:p.x,y:p.y,yaw:.04,
    halfW:12,halfD:7,height:5.8,clearRadius:18
  });
}

const pool=FULLMAP_POIS.find(item=>item.id==='pool');
if(pool){
  const p=offsetPoint(pool,.02,20,-24);
  add({
    id:'pool_service',group:'townSupport',model:'facility.storage_shed',
    x:p.x,y:p.y,yaw:.02,halfW:7,halfD:5,height:5.5,clearRadius:14
  });
}

for(const [suffix,forward,right] of [
  ['nw',-67,-92],['ne',-67,92],['sw',67,-92],['se',67,92]
]){
  const p=offsetPoint(STADIUM_REFERENCE,STADIUM_REFERENCE.yaw,forward,right);
  add({
    id:`stadium_floodlight_${suffix}`,group:'townSupport',
    model:'facility.floodlight',x:p.x,y:p.y,yaw:STADIUM_REFERENCE.yaw,
    halfW:1.8,halfD:1.8,height:31,clearRadius:7
  });
}

export const FACILITY_PLACEMENTS_V91=Object.freeze(placement);
export const FACILITY_COLLISIONS_V91=Object.freeze(collision);
export const FACILITY_CLEARINGS_V91=Object.freeze(clearings);
export const FACILITY_COUNTS_V91=Object.freeze({...counts,total:placement.length});
