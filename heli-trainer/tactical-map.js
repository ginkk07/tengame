import {
  FACTIONS,
  TACTICAL_HIT_AREAS,
  MAP_ASSETS
} from './map-data.js';

import {
  factionCenterWorld,
  worldToTacticalMapPixel
} from './factions.js';

function zoneRect(id){
  const z=
    TACTICAL_HIT_AREAS[id];

  const faction=
    FACTIONS[id];

  return `
    <rect class="faction-zone"
          tabindex="0"
          data-faction="${id}"
          x="${z.x}"
          y="${z.y}"
          width="${z.width}"
          height="${z.height}"
          rx="5"
          fill="${faction.css}"
          fill-opacity=".04"
          stroke="${faction.css}"
          stroke-width="2"></rect>
  `;
}

export function createTacticalMap({
  root,
  stage,
  state,
  heli,
  orient,
  terrainHeight,
  clearPressed
}){
  let open=false;

  const markup=`
    <div id="mapOverlay" hidden aria-hidden="true">
      <div class="map-shell"
           role="dialog"
           aria-modal="true"
           aria-label="Ozeti 戰術地圖">
        <div class="map-head">
          <div class="map-title">
            OZETI 戰術地圖
            <span class="map-sub">
              依照 Ozeti 實際配置 · 點陣營基地移動 · M 開啟 / 關閉
            </span>
          </div>
          <button id="mapClose" type="button">關閉 M</button>
        </div>

        <div class="map-stage">
          <svg id="tacticalMapSvg"
               viewBox="0 0 670 625"
               preserveAspectRatio="xMidYMid meet"
               role="img"
               aria-label="Ozeti 三陣營戰術地圖">
            <image href="${MAP_ASSETS.tacticalMap}"
                   x="0"
                   y="0"
                   width="670"
                   height="625"
                   preserveAspectRatio="none"></image>

            ${zoneRect('manticore')}
            ${zoneRect('valkyra')}
            ${zoneRect('lonestar')}

            <g id="playerMapMarker"
               transform="translate(323 412)">
              <circle cx="0"
                      cy="0"
                      r="8"
                      fill="rgba(10,15,18,.82)"
                      stroke="#ffffff"
                      stroke-width="2"
                      vector-effect="non-scaling-stroke"></circle>
              <path d="M 0 -14 L 7 8 L 0 4 L -7 8 Z"
                    fill="#ffffff"
                    stroke="#141a1e"
                    stroke-width="1.5"
                    vector-effect="non-scaling-stroke"></path>
            </g>
          </svg>
        </div>

        <div class="map-actions">
          <button class="faction-jump"
                  type="button"
                  data-faction="lonestar">
            藍色 · LONESTAR
          </button>
          <button class="faction-jump"
                  type="button"
                  data-faction="valkyra">
            紅色 · VALKYRA
          </button>
          <button class="faction-jump"
                  type="button"
                  data-faction="manticore">
            綠色 · MANTICORE
          </button>
        </div>
      </div>
    </div>
  `;

  stage.insertAdjacentHTML(
    'beforeend',
    markup
  );

  const overlay=
    document.getElementById(
      'mapOverlay'
    );

  const closeButton=
    document.getElementById(
      'mapClose'
    );

  const toggleButton=
    document.getElementById(
      'mapToggleKey'
    );

  const playerMarker=
    document.getElementById(
      'playerMapMarker'
    );

  function setOpen(next){
    open=
      Boolean(next);

    overlay.hidden=
      !open;

    overlay.setAttribute(
      'aria-hidden',
      String(!open)
    );

    clearPressed?.();

    if(open){
      closeButton.focus();
    }else{
      root.focus();
    }
  }

  function toggle(){
    setOpen(!open);
  }

  function moveToFaction(id){
    if(!FACTIONS[id]){
      return;
    }

    const center=
      factionCenterWorld(id);

    const y=
      terrainHeight(
        center.x,
        center.z
      )+42;

    state.pos.set(
      center.x,
      y,
      center.z
    );

    state.vel.set(0,0,0);

    state.pitch=0;
    state.roll=0;
    state.verticalInput=0;

    state.pitchCommand=0;
    state.rollCommand=0;
    state.yawCommand=0;

    state.pitchRate=0;
    state.rollRate=0;
    state.yawRateBody=0;

    state.rotorPitch=0;
    state.rotorRoll=0;

    state.collective=.65;
    state.effectiveCollective=.65;
    state.holdAltitude=y;

    state.pitchTrim=0;
    state.pitchWasActive=false;
    state.verticalWasActive=false;

    heli.position.copy(
      state.pos
    );

    orient();

    setOpen(false);
  }

  function updateMarker(){
    const point=
      worldToTacticalMapPixel(
        state.pos.x,
        state.pos.z
      );

    const degrees=
      state.yaw*
      180/
      Math.PI;

    playerMarker.setAttribute(
      'transform',
      `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) rotate(${degrees.toFixed(2)})`
    );
  }

  function bindFactionElement(element){
    const activate=()=>{
      moveToFaction(
        element.dataset.faction
      );
    };

    element.addEventListener(
      'click',
      activate
    );

    if(
      element.classList.contains(
        'faction-zone'
      )
    ){
      element.addEventListener(
        'keydown',
        event=>{
          if(
            event.code==='Enter' ||
            event.code==='Space'
          ){
            event.preventDefault();
            activate();
          }
        }
      );
    }
  }

  overlay.querySelectorAll(
    '[data-faction]'
  ).forEach(
    bindFactionElement
  );

  closeButton.addEventListener(
    'click',
    ()=>setOpen(false)
  );

  toggleButton?.addEventListener(
    'click',
    toggle
  );

  return {
    setOpen,
    toggle,
    moveToFaction,
    updateMarker,
    isOpen:()=>open
  };
}
