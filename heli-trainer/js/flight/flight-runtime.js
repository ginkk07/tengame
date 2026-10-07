// Connect the unchanged v51 flight model to Ozeti's world contacts and UI config.
export function createFlightRuntime({THREE,aircraft,pilotControls,flightAssists,environment,collision,readConfig,readAssists}){
  const previous=new THREE.Vector3();let commands={pitch:0,roll:0,pedal:0,collective:aircraft.state.collective};
  function configure(){
    const c=readConfig();aircraft.configure(c.mass,c.thrustRatio);
    environment.targetStrength=c.turbulence;environment.groundEffect=c.groundEffect;
    if(Number.isFinite(c.boundary))environment.boundary=c.boundary;
    return c;
  }
  function step(dt,raw){
    const c=configure(),pilot=pilotControls.step(dt,raw,commands.collective);
    commands=flightAssists.step(dt,pilot,aircraft.observe(),readAssists(),c);
    environment.advance(dt);previous.copy(aircraft.state.pos);aircraft.step(dt,commands,environment);
    const s=aircraft.state,hit=collision?.()?.resolveMovement(previous,s.pos,2.2);
    if(hit?.mode==='vertical'){
      if(s.vel.y<0)s.vel.y=0;s.grounded=true;
      flightAssists.holdAltitude=Math.max(flightAssists.holdAltitude,hit.topY+2.2);
    }else if(hit){s.vel.x*=-.08;s.vel.z*=-.08;}
    if(s.grounded)flightAssists.holdAltitude=Math.max(flightAssists.holdAltitude,s.pos.y);
    return pilot;
  }
  function reset(position,yaw){
    configure();environment.reset();aircraft.reset(position,yaw);
    pilotControls.reset(aircraft.state.collective);flightAssists.reset(position.y);
    commands={pitch:0,roll:0,pedal:0,collective:aircraft.state.collective};
  }
  function releaseInputs(){pilotControls.pitch=pilotControls.roll=pilotControls.yaw=pilotControls.collectiveInput=0;pilotControls.collectiveWasActive=false;}
  return {step,reset,releaseInputs,get commands(){return commands;}};
}

export function createFixedStepClock(step,interval=1/120){
  let accumulator=0,ticks=0;
  return {advance(dt,paused=false){
    if(paused){accumulator=0;return 0;}accumulator+=Math.max(0,Math.min(.1,dt));let count=0;
    while(accumulator+1e-12>=interval){step(interval);accumulator=Math.max(0,accumulator-interval);ticks++;count++;}
    return count;
  },reset(){accumulator=0;},get ticks(){return ticks;}};
}
