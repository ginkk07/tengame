import {
  FACTIONS,
  WORLD_CONFIG,
  OZETI_MAP_BOUNDS,
  TACTICAL_PIXEL_CALIBRATION
} from './map-data.js?v=74';

const MAP_CENTER={
  x:WORLD_CONFIG.centerX,
  y:WORLD_CONFIG.centerY
};

export function mapPointToWorld(mapX,mapY){
  return {
    x:mapX-MAP_CENTER.x,
    z:MAP_CENTER.y-mapY
  };
}

export function worldPointToMapCoordinate(x,z){
  return {
    x:MAP_CENTER.x+x,
    y:MAP_CENTER.y-z
  };
}

export function worldToTacticalMapPixel(x,z){
  const map=
    worldPointToMapCoordinate(
      x,
      z
    );

  const c=
    TACTICAL_PIXEL_CALIBRATION;

  return {
    x:
      c.xx*
      map.x+
      c.xy*
      map.y+
      c.xOffset,

    y:
      c.yx*
      map.x+
      c.yy*
      map.y+
      c.yOffset
  };
}

export function factionCenterWorld(id){
  const faction=FACTIONS[id];

  if(!faction){
    return {x:0,z:0};
  }

  let sx=0;
  let sy=0;

  faction.points.forEach(
    point=>{
      sx+=point[0];
      sy+=point[1];
    }
  );

  return mapPointToWorld(
    sx/faction.points.length,
    sy/faction.points.length
  );
}

export function createFactionWorldLayer({
  THREE,
  scene,
  terrainHeight
}){
  /*
   * v74:
   * Faction polygons, labels and map-control graphics are UI overlays,
   * not terrain. Keep the 3D world completely clean.
   */
  const group=
    new THREE.Group();

  group.name=
    'FactionWorldUI_DISABLED';

  group.visible=false;

  scene.add(group);

  function rebuild(){
    group.visible=false;
  }

  function clear(){
    while(group.children.length){
      group.remove(
        group.children[
          group.children.length-1
        ]
      );
    }
  }

  return {
    group,
    rebuild,
    clear
  };
}

export {FACTIONS};
