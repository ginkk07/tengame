import {
  FACILITY_REFERENCE_POINTS,
  FULLMAP_POIS,
  OZETI_PLAYABLE_BOUNDS,
  STADIUM_REFERENCE,
  TOWER_REFERENCE_POINTS
} from '../map-data.js?v=91';
import {mapPointToWorld} from '../factions.js?v=91';
import {FACILITY_PLACEMENTS_V91,FACILITY_COLLISIONS_V91,FACILITY_COUNTS_V91} from '../facilities/facility-data-v91.js?v=91';

const COMPONENT_SECTOR='components-v91';
const COLLISION_CELL=128;

function insidePlayable(x,y,margin=0){
  return (
    x>=OZETI_PLAYABLE_BOUNDS.minX+margin &&
    x<=OZETI_PLAYABLE_BOUNDS.maxX-margin &&
    y>=OZETI_PLAYABLE_BOUNDS.minY+margin &&
    y<=OZETI_PLAYABLE_BOUNDS.maxY-margin
  );
}

function poi(id){
  return FULLMAP_POIS.find(item=>item.id===id) || null;
}

function facilityModel(type){
  if(type==='garage_vendor') return 'facility.garage_vendor';
  if(type==='spawn_board') return 'facility.spawn_board';
  return 'facility.weapons_vendor';
}

const TOWN_PROXY_SPECS=Object.freeze({
  apartments:{model:'building.apartment',halfW:15,halfD:9,height:16,scale:[1.35,1.05,1.25]},
  apartment_garages:{model:'building.industrial',halfW:11,halfD:7,height:6.5,scale:[.78,.76,.72]},
  stadium_garages:{model:'building.industrial',halfW:10,halfD:7,height:6.2,scale:[.72,.72,.70]},
  shops_1:{model:'building.house.large',halfW:10,halfD:8,height:8.5,scale:[1.35,1.05,.9]},
  shops_2:{model:'building.house.large',halfW:10,halfD:8,height:8.5,scale:[1.35,1.05,.9]},
  industrial_1:{model:'building.industrial',halfW:20,halfD:13,height:10,scale:[1.4,1.15,1.3]}
});

function stableYaw(id){
  let h=2166136261;
  for(let i=0;i<id.length;i++){
    h^=id.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return ((h>>>0)%6283)/1000;
}

function makePlacements(){
  const placements=[];
  const collision=[];
  const sources={towers:0,facilities:0,landmarks:0,supportFacilities:0,baseSupport:0,farmSupport:0,townSupport:0};

  for(const tower of TOWER_REFERENCE_POINTS){
    if(!insidePlayable(tower.x,tower.y,6)) continue;
    placements.push({
      model:'infrastructure.tower',
      name:`Ozeti ${tower.id}`,
      mapX:tower.x,mapY:tower.y,
      rotationY:0,scale:1,yOffset:0
    });
    collision.push({
      kind:'tower',mapX:tower.x,mapY:tower.y,
      halfW:3.2,halfD:3.2,height:43,yOffset:0
    });
    sources.towers++;
  }

  for(const facility of FACILITY_REFERENCE_POINTS){
    if(!insidePlayable(facility.x,facility.y,4)) continue;
    placements.push({
      model:facilityModel(facility.type),
      name:`${facility.faction}:${facility.type}`,
      mapX:facility.x,mapY:facility.y,
      rotationY:0,scale:1,yOffset:0
    });

    if(facility.type==='garage_vendor'){
      collision.push({
        kind:'facility',mapX:facility.x,mapY:facility.y,
        halfW:7,halfD:5,height:5.5,yOffset:0
      });
    }else if(facility.type==='weapons_vendor'){
      collision.push({
        kind:'facility',mapX:facility.x,mapY:facility.y,
        halfW:4,halfD:2.5,height:4.3,yOffset:0
      });
    }else{
      collision.push({
        kind:'facility',mapX:facility.x,mapY:facility.y,
        halfW:1.9,halfD:.5,height:3.5,yOffset:0
      });
    }
    sources.facilities++;
  }

  if(insidePlayable(STADIUM_REFERENCE.x,STADIUM_REFERENCE.y,100)){
    placements.push({
      model:'landmark.stadium',
      name:'Dinamo Ozeti stadium proxy',
      mapX:STADIUM_REFERENCE.x,mapY:STADIUM_REFERENCE.y,
      rotationY:STADIUM_REFERENCE.yaw,scale:1,
      targetElevation:STADIUM_REFERENCE.targetElevation,
      yOffset:0
    });

    const yaw=STADIUM_REFERENCE.yaw;
    collision.push(
      {kind:'stadium',mapX:STADIUM_REFERENCE.x,mapY:STADIUM_REFERENCE.y-56,halfW:68,halfD:8,height:12,yaw,groundYOverride:STADIUM_REFERENCE.targetElevation},
      {kind:'stadium',mapX:STADIUM_REFERENCE.x,mapY:STADIUM_REFERENCE.y+56,halfW:68,halfD:8,height:12,yaw,groundYOverride:STADIUM_REFERENCE.targetElevation},
      {kind:'stadium',mapX:STADIUM_REFERENCE.x-76,mapY:STADIUM_REFERENCE.y,halfW:8,halfD:44,height:11,yaw,groundYOverride:STADIUM_REFERENCE.targetElevation},
      {kind:'stadium',mapX:STADIUM_REFERENCE.x+76,mapY:STADIUM_REFERENCE.y,halfW:8,halfD:44,height:11,yaw,groundYOverride:STADIUM_REFERENCE.targetElevation}
    );
    sources.landmarks++;
  }

  const pool=poi('pool');
  if(pool && insidePlayable(pool.x,pool.y,24)){
    placements.push({
      model:'landmark.pool',name:'Ozeti pool proxy',
      mapX:pool.x,mapY:pool.y,
      rotationY:.02,scale:1,yOffset:.05
    });
    sources.landmarks++;
  }

  const lumberyard=poi('lumberyard');
  if(lumberyard && insidePlayable(lumberyard.x,lumberyard.y,28)){
    placements.push({
      model:'landmark.lumberyard',name:'Ozeti lumberyard proxy',
      mapX:lumberyard.x,mapY:lumberyard.y,
      rotationY:.04,scale:1,yOffset:0
    });
    collision.push({
      kind:'lumberyard',mapX:lumberyard.x,mapY:lumberyard.y,
      halfW:23,halfD:16,height:3.2,yaw:.04
    });
    sources.landmarks++;
  }

  const church=poi('church_top');
  if(church && insidePlayable(church.x,church.y,20)){
    placements.push({
      model:'building.church',name:'Ozeti church landmark proxy',
      mapX:church.x,mapY:church.y,
      rotationY:.02,scale:1.15,yOffset:0
    });
    collision.push({
      kind:'church',mapX:church.x,mapY:church.y,
      halfW:8,halfD:14,height:28,yaw:.02
    });
    sources.landmarks++;
  }

  for(const townPoi of FULLMAP_POIS){
    let spec=TOWN_PROXY_SPECS[townPoi.id] || null;

    if(!spec && /^residential_\d+$/.test(townPoi.id)){
      spec={
        model:'building.house.large',
        halfW:7.5,halfD:10,height:8.2,
        scale:[1.08,1.02,1.05]
      };
    }

    if(!spec && /^hillside_church_\d+$/.test(townPoi.id)){
      spec={
        model:'building.church',
        halfW:6.5,halfD:11.5,height:24,
        scale:.88
      };
    }

    if(!spec || !insidePlayable(townPoi.x,townPoi.y,18)) continue;

    const yaw=stableYaw(townPoi.id);
    placements.push({
      model:spec.model,
      name:`Ozeti ${townPoi.id} proxy`,
      mapX:townPoi.x,mapY:townPoi.y,
      rotationY:yaw,scale:spec.scale,yOffset:0
    });
    collision.push({
      kind:'town_proxy',mapX:townPoi.x,mapY:townPoi.y,
      halfW:spec.halfW,halfD:spec.halfD,
      height:spec.height,yaw
    });
    sources.landmarks++;
  }

  for(const spec of FACILITY_PLACEMENTS_V91){
    placements.push({...spec});
  }
  for(const item of FACILITY_COLLISIONS_V91){
    collision.push({...item});
  }
  sources.supportFacilities=FACILITY_COUNTS_V91.total;
  sources.baseSupport=FACILITY_COUNTS_V91.baseSupport;
  sources.farmSupport=FACILITY_COUNTS_V91.farmSupport;
  sources.townSupport=FACILITY_COUNTS_V91.townSupport;

  return {placements,collision,sources};
}

export function createComponentLayer({objects,terrainHeight}){
  let data=null;
  let loaded=false;
  const grid=new Map();

  function key(ix,iz){return `${ix}_${iz}`;}

  function addCollision(source){
    const world=mapPointToWorld(source.mapX,source.mapY);
    const groundY=Number.isFinite(Number(source.groundYOverride))
      ? Number(source.groundYOverride)
      : terrainHeight(world.x,world.z)+Number(source.yOffset||0);
    const record={
      ...source,
      x:world.x,z:world.z,
      groundY,
      topY:groundY+Number(source.height||1),
      yaw:Number(source.yaw||0)
    };
    const ix=Math.floor(world.x/COLLISION_CELL);
    const iz=Math.floor(world.z/COLLISION_CELL);
    const k=key(ix,iz);
    if(!grid.has(k)) grid.set(k,[]);
    grid.get(k).push(record);
  }

  function rebuild(){
    if(loaded) return stats();
    data=makePlacements();

    for(const spec of data.placements){
      if(Number.isFinite(Number(spec.targetElevation))){
        const world=mapPointToWorld(spec.mapX,spec.mapY);
        spec.yOffset=Number(spec.targetElevation)-terrainHeight(world.x,world.z);
      }
    }

    objects.placement.placeMany(data.placements,{sectorId:COMPONENT_SECTOR});
    for(const c of data.collision) addCollision(c);
    loaded=true;
    return stats();
  }

  function clear(){
    if(!loaded) return;
    objects.clearSector(COMPONENT_SECTOR);
    grid.clear();
    data=null;
    loaded=false;
  }

  function hitTest(x,y,z,clearance=0){
    const cx=Math.floor(x/COLLISION_CELL);
    const cz=Math.floor(z/COLLISION_CELL);
    for(let dz=-1;dz<=1;dz++){
      for(let dx=-1;dx<=1;dx++){
        for(const record of grid.get(key(cx+dx,cz+dz)) || []){
          if(y>record.topY+clearance) continue;
          const ox=x-record.x;
          const oz=z-record.z;
          const c=Math.cos(record.yaw);
          const s=Math.sin(record.yaw);
          const lx=ox*c+oz*s;
          const lz=-ox*s+oz*c;
          if(
            Math.abs(lx)<=record.halfW+clearance &&
            Math.abs(lz)<=record.halfD+clearance
          ) return record;
        }
      }
    }
    return null;
  }

  function resolveMovement(previous,current,clearance=2.2){
    const hit=hitTest(current.x,current.y,current.z,clearance);
    if(!hit) return null;
    const previousHit=hitTest(previous.x,previous.y,previous.z,clearance);
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
      loaded,
      placements:data?.placements.length || 0,
      collisionObjects:data?.collision.length || 0,
      towers:data?.sources.towers || 0,
      facilities:data?.sources.facilities || 0,
      landmarks:data?.sources.landmarks || 0,
      supportFacilities:data?.sources.supportFacilities || 0,
      baseSupport:data?.sources.baseSupport || 0,
      farmSupport:data?.sources.farmSupport || 0,
      townSupport:data?.sources.townSupport || 0
    };
  }

  return {rebuild,clear,hitTest,resolveMovement,stats};
}
