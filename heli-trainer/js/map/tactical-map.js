import {FACTIONS,MAP_ASSETS} from './map-data.js?v=98';
import {factionCenterWorld,mapPointToWorld,worldToTacticalMapPixel} from './factions.js?v=98';
import {TACTICAL_SIZE,tacticalHeadingDegrees} from './map-projection.js';
const MAP=MAP_ASSETS.tacticalMap,CONTOURS=MAP_ASSETS.tacticalContours;

function factionMarkup(id){
  const faction=FACTIONS[id],points=faction.points.map(([x,y])=>{const w=mapPointToWorld(x,y);const p=worldToTacticalMapPixel(w.x,w.z);return p.x.toFixed(2)+','+p.y.toFixed(2);});
  const center=factionCenterWorld(id),p=worldToTacticalMapPixel(center.x,center.z);
  return `<polygon class="faction-zone" tabindex="0" role="button" aria-label="移動至 ${faction.name}" data-faction="${id}" points="${points.join(' ')}" fill="${faction.css}" fill-opacity=".13" stroke="${faction.css}" stroke-width="3"/>
    <text class="faction-label" x="${p.x}" y="${p.y-21}" text-anchor="middle" fill="${faction.css}">${faction.name}</text>`;
}
function gridMarkup(){
  const lines=[];for(let v=0;v<=1024;v+=50)lines.push(`<path d="M ${v} 0 V 1024 M 0 ${v} H 1024"/>`);
  return `<g id="mapGrid" fill="none" stroke="#e3e7d0" stroke-opacity=".22" stroke-width=".8">${lines.join('')}</g>`;
}
export function createTacticalMap({root,stage,state,heli,orient,terrainHeight,clearPressed,onTeleport,onMapOpen}){
  let open=false,view={x:0,y:0,size:TACTICAL_SIZE},drag=null;
  stage.insertAdjacentHTML('beforeend',`<div id="mapOverlay" hidden aria-hidden="true">
    <div class="map-shell" role="dialog" aria-modal="true" aria-label="Ozeti 戰術地圖">
      <div class="map-head"><div class="map-title">OZETI 戰術地圖 <span class="map-sub">目前重建全圖 · 20.48 × 20.48 km · 北朝上</span></div><button id="mapClose" type="button">關閉 M</button></div>
      <div class="map-tools"><label><input id="mapGridToggle" type="checkbox" checked> 1 km 網格</label><label><input id="mapContourToggle" type="checkbox"> 50 m 等高線</label><span>滾輪縮放 · 拖動平移</span><button id="mapZoomIn" aria-label="放大地圖">＋</button><button id="mapZoomOut" aria-label="縮小地圖">－</button><button id="mapResetView">全圖</button></div>
      <div class="map-stage"><svg id="tacticalMapSvg" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" role="img" aria-label="目前 Ozeti 地形、樹林、道路與建築全圖">
        <image id="tacticalBaseImage" x="0" y="0" width="1024" height="1024"/>
        <image id="tacticalContoursImage" x="0" y="0" width="1024" height="1024" visibility="hidden"/>
        ${gridMarkup()}${Object.keys(FACTIONS).map(factionMarkup).join('')}
        <g id="playerMapMarker"><circle r="7" fill="#101b20" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/><path d="M 0 -15 L 8 9 L 0 4 L -8 9 Z" fill="#fff" stroke="#141a1e" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g>
        <g class="map-north"><path d="M 38 75 V 30 l -7 13 M 38 30 l 7 13" stroke="#fff" fill="none" stroke-width="3"/><text x="38" y="22" text-anchor="middle" fill="#fff">N</text></g>
      </svg></div>
      <div class="map-actions">${Object.keys(FACTIONS).map(id=>`<button class="faction-jump" type="button" data-faction="${id}">${FACTIONS[id].name}</button>`).join('')}</div>
    </div></div>`);
  const overlay=document.getElementById('mapOverlay'),svg=document.getElementById('tacticalMapSvg'),marker=document.getElementById('playerMapMarker'),close=document.getElementById('mapClose');
  const image=document.getElementById('tacticalBaseImage'),contours=document.getElementById('tacticalContoursImage');
  function updateMarker(){const p=worldToTacticalMapPixel(state.pos.x,state.pos.z);marker.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${tacticalHeadingDegrees(state.yaw).toFixed(2)})`);}
  function setOpen(next){
    if(next)onMapOpen?.();open=Boolean(next);overlay.hidden=!open;overlay.setAttribute('aria-hidden',String(!open));clearPressed?.();
    if(open){if(!image.hasAttribute('href'))image.setAttribute('href',MAP);updateMarker();close.focus();}else root.focus();
  }
  function moveToFaction(id){
    if(!FACTIONS[id])return;const p=factionCenterWorld(id),position={x:p.x,y:terrainHeight(p.x,p.z)+42,z:p.z};
    if(onTeleport)onTeleport(position,state.yaw);
    else{state.pos.set(position.x,position.y,position.z);state.vel.set(0,0,0);state.pitch=state.roll=0;heli.position.copy(state.pos);orient();}
    setOpen(false);
  }
  function applyView(){view.size=Math.max(128,Math.min(1024,view.size));view.x=Math.max(0,Math.min(1024-view.size,view.x));view.y=Math.max(0,Math.min(1024-view.size,view.y));svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.size} ${view.size}`);}
  function zoom(factor,fx=.5,fy=.5){const size=Math.max(128,Math.min(1024,view.size*factor));view.x+=(view.size-size)*fx;view.y+=(view.size-size)*fy;view.size=size;applyView();}
  function fractions(e){const r=svg.getBoundingClientRect(),side=Math.min(r.width,r.height);return {x:(e.clientX-r.left-(r.width-side)/2)/side,y:(e.clientY-r.top-(r.height-side)/2)/side};}
  svg.addEventListener('wheel',e=>{e.preventDefault();const p=fractions(e);zoom(Math.exp(e.deltaY*.001),p.x,p.y);},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-faction]'))return;drag={p:fractions(e),x:view.x,y:view.y};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag)return;const p=fractions(e);view.x=drag.x-(p.x-drag.p.x)*view.size;view.y=drag.y-(p.y-drag.p.y)*view.size;applyView();});
  svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
  document.getElementById('mapZoomIn').addEventListener('click',()=>zoom(.75));document.getElementById('mapZoomOut').addEventListener('click',()=>zoom(1/.75));
  document.getElementById('mapResetView').addEventListener('click',()=>{view={x:0,y:0,size:1024};applyView();});
  document.getElementById('mapGridToggle').addEventListener('change',e=>document.getElementById('mapGrid').setAttribute('visibility',e.target.checked?'visible':'hidden'));
  document.getElementById('mapContourToggle').addEventListener('change',e=>{if(e.target.checked&&!contours.hasAttribute('href'))contours.setAttribute('href',CONTOURS);contours.setAttribute('visibility',e.target.checked?'visible':'hidden');});
  overlay.querySelectorAll('[data-faction]').forEach(el=>{el.addEventListener('click',()=>moveToFaction(el.dataset.faction));if(el.tagName.toLowerCase()==='polygon')el.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();moveToFaction(el.dataset.faction);}});});
  overlay.addEventListener('keydown',e=>{if((e.code==='KeyM'||e.code==='Escape')&&!e.repeat){e.preventDefault();e.stopPropagation();setOpen(false);}});
  close.addEventListener('click',()=>setOpen(false));document.getElementById('mapToggleKey')?.addEventListener('click',()=>setOpen(!open));
  return {setOpen,toggle:()=>setOpen(!open),moveToFaction,updateMarker,isOpen:()=>open};
}
