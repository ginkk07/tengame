import * as THREE from '../vendor/three/three.module.js';

// === PHYSICS CORE: no DOM, keys, assist flags, target altitude or camera ===
const DEG=Math.PI/180;
const G=9.81;
const BASE_MASS=4200;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Generic trainer coefficients; no airframe-specific flight-test calibration.
// Rotor: blade elements + dynamic uniform wake + shaft power/RPM governor.
// Rigid body: implicit midpoint with Cayley attitude update.
// Fin, fuselage CdA and cyclic hub response remain reduced-order approximations.
const FLIGHT_MODEL=Object.freeze({
  density:1.225,
  inertia:Object.freeze([18000,56000,50000]), // roll, yaw, pitch; reference kg m²
  torqueAccel:Object.freeze([6.0,1.6,5.0]), // reference actuator authority, rad/s²
  discAngle:10*DEG,
  discTime:.075,
  collectiveTime:.12,
  dragForward:3.2,dragBackward:7.5,dragSide:28,dragVertical:18, // effective CdA m²; trainer tuning
  finArea:5.0,finArm:6.0, // effective side area (m²), aft aerodynamic lever (m)
  angularDamping:Object.freeze([.55,.25,.65]),
  angularAirDamping:Object.freeze([.009,.003,.008]),
  rotorRadius:4.5,hubHeight:1.9,gustLoadSlope:1100
});

// Uniform-wake blade-element rotor. SI units throughout. This is a generic
// trainer rotor, not a flight-validated model of a particular helicopter.
// Blade-element force resolution: NASA NDARC, TP-2015-218751, rotor theory.
// Descent-wake boundaries: NASA/TP-2005-213477, tables 3/4. The C1 Hermite
// extension below is a reduced approximation, not the full Johnson model.
class RotorAerodynamics{
  constructor(thrustRatio){
    this.radius=FLIGHT_MODEL.rotorRadius;this.area=Math.PI*this.radius**2;
    this.nominalOmega=48;this.rotorInertia=2400;this.solidity=.12;
    this.minPitch=2*DEG;this.maxPitch=32*DEG;
    this.samples=[];
    const nr=8,na=12,dr=this.radius*.8/nr;
    for(let r=0;r<nr;r++)for(let a=0;a<na;a++){
      const az=2*Math.PI*(a+.5)/na;
      this.samples.push({r:this.radius*.2+(r+.5)*dr,sin:Math.sin(az),cos:Math.cos(az),
        weight:.5*FLIGHT_MODEL.density*this.solidity*Math.PI*this.radius*dr/na});
    }
    this.configure(thrustRatio);
    this.reset(BASE_MASS*G);
  }
  // Average normal force, in-plane force and aerodynamic shaft torque are
  // resolved from the SAME section lift/drag. Negative torque can spin up the
  // rotor in a flare/autorotation; low collective does not switch the rotor off.
  loads(pitch,omega,inflow,axial,plane){
    const normal=axial+inflow;let thrust=0,torque=0,inPlaneForce=0,profileLoss=0;
    for(const s of this.samples){
      const tangent=omega*s.r+plane*s.sin;
      const speed=Math.hypot(tangent,normal);
      if(speed<1e-8)continue;
      const phi=Math.atan2(normal,tangent),alpha=pitch-phi;
      const sa=Math.sin(alpha),ca=Math.cos(alpha);
      // Smooth symmetric section polar with bounded lift and separated-flow
      // drag. No threshold that abruptly removes all rotor lift.
      const cl=1.5*Math.tanh(5.7*sa*ca/1.5);
      const cd=.012+.012*cl*cl+1.6*sa*sa;
      const dynamic=s.weight*speed*speed,lift=dynamic*cl,drag=dynamic*cd;
      const ct=tangent/speed,st=normal/speed;
      const tangential=lift*st+drag*ct;
      thrust+=lift*ct-drag*st;torque+=s.r*tangential;
      inPlaneForce-=tangential*s.sin;profileLoss+=drag*speed;
    }
    return {thrust,torque,inPlaneForce,profileLoss};
  }
  pitchForHover(thrust){
    const inflow=Math.sqrt(Math.max(0,thrust)/(2*FLIGHT_MODEL.density*this.area));
    let lo=this.minPitch,hi=42*DEG;
    for(let i=0;i<35;i++){
      const mid=(lo+hi)/2;
      if(this.loads(mid,this.nominalOmega,inflow,0,0).thrust<thrust)lo=mid;else hi=mid;
    }
    return {pitch:(lo+hi)/2,inflow};
  }
  configure(thrustRatio){
    if(this.thrustRatio===thrustRatio)return;
    this.thrustRatio=thrustRatio;
    const trim=this.pitchForHover(BASE_MASS*G*thrustRatio);
    this.maxPitch=trim.pitch;
    // The UI maximum denotes static OGE thrust at governed RPM. Available
    // shaft power is finite, with 10% transient governor margin.
    this.maxPower=1.10*this.loads(trim.pitch,this.nominalOmega,trim.inflow,0,0).torque*this.nominalOmega;
  }
  pitch(collective){return this.minPitch+clamp(collective,0,1)*(this.maxPitch-this.minPitch);}
  reset(weight){
    const trim=this.pitchForHover(weight);
    this.omega=this.nominalOmega;this.inflow=trim.inflow;
    this.hoverCollective=clamp((trim.pitch-this.minPitch)/(this.maxPitch-this.minPitch),0,1);
    const load=this.loads(this.pitch(this.hoverCollective),this.omega,this.inflow,0,0);
    this.thrust=load.thrust;this.engineTorque=Math.max(0,load.torque);
    this.shaftPower=this.engineTorque*this.omega;this.aeroTorque=load.torque;
    this.profileLoss=load.profileLoss;this.vrs=0;this.axial=0;this.plane=0;
    this.groundInflow=1;this.inPlaneForce=0;
  }
  static hermite(x,x0,x1,y0,y1,m0,m1){
    const h=x1-x0,t=clamp((x-x0)/h,0,1),t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*y0+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*y1+(t3-t2)*h*m1;
  }
  momentum(z,x,upper){
    let lo=upper?Math.max(0,-z):0,hi=upper?Math.max(2,-z+2):Math.max(2,Math.abs(z)+2);
    if(!upper&&z<-2&&x<.75)hi=-z/2;
    for(let i=0;i<28;i++){
      const v=(lo+hi)/2;
      if(v*Math.hypot(x,z+v)<1)lo=v;else hi=v;
    }
    return (lo+hi)/2;
  }
  baselineWake(z,x){
    let vi;
    if(x>=.75||z>=0)vi=this.momentum(z,x,false);
    else{
      // Bridge momentum theory's invalid turbulent-wake interval. The axial
      // upper/lower branches are never selected by the previous frame's sign.
      const shift=.2*(x/.75)**2,a=-1.5+shift,b=-2.1+shift;
      const va=this.momentum(a,x,true),vb=this.momentum(b,x,false);
      const slope=(v,q)=>-v*(q+v)/(x*x+(q+v)*(q+2*v));
      vi=z>=a?this.momentum(z,x,true):z<=b?this.momentum(z,x,false):
        RotorAerodynamics.hermite(z,b,a,vb,va,slope(vb,b),slope(va,a));
      // Momentum has a unique root here. Fade the empirical bridge out before
      // its lateral boundary, rather than jumping from a cubic to that root.
      if(x>.65)vi=THREE.MathUtils.lerp(vi,this.momentum(z,x,false),
        THREE.MathUtils.smoothstep(x,.65,.75));
    }
    return vi;
  }
  wakeTarget(thrust,axial,plane,groundInflow){
    // Signed extension also handles brief negative blade-element thrust.
    const sign=thrust<0?-1:1;
    const vh=Math.sqrt(Math.abs(thrust)/(2*FLIGHT_MODEL.density*this.area));
    if(vh<.01){this.vrs=0;return 0;}
    const z=sign*axial/vh,x=plane/vh;
    let vi=this.baselineWake(z,x);
    // Smooth mean VRS wake extension: normalized onset -.2, extrema -.45/-1.5,
    // washout at .95 in-plane speed magnitude (NASA stability-boundary data).
    // This modifies inflow only, never collective or aircraft attitude.
    const exit=1-THREE.MathUtils.smoothstep(x,.50,.95);
    let axialWake;
    const lower=-2.1,lowerV=-lower/2-Math.sqrt(lower*lower/4-1);
    if(z>=-.2)axialWake=-z/2+Math.sqrt(z*z/4+1);
    else if(z>=-.45){
      const qd=-.1+Math.sqrt(1.01),md=.5-.2/(4*Math.sqrt(1.01));
      axialWake=RotorAerodynamics.hermite(z,-.45,-.2,.85,qd,0,md)-z;
    }else if(z>=-1.5)axialWake=RotorAerodynamics.hermite(z,-1.5,-.45,1.25,.85,0,0)-z;
    else if(z>lower){
      const ml=.5-lower/(4*Math.sqrt(lower*lower/4-1));
      axialWake=RotorAerodynamics.hermite(z,lower,-1.5,lower+lowerV,1.25,ml,0)-z;
    }else axialWake=-z/2-Math.sqrt(Math.max(0,z*z/4-1));
    const region=THREE.MathUtils.smoothstep(-z,.2,.45)*(1-THREE.MathUtils.smoothstep(-z,1.5,2.1));
    this.vrs=sign>0?exit*region:0;
    // Blend only the descent range, so ordinary edgewise inflow retains its
    // momentum solution and translational efficiency emerges automatically.
    if(z<-.2)vi+=(axialWake-this.baselineWake(z,0))*exit;
    return sign*vh*vi*groundInflow;
  }
  step(dt,collective,axial,plane,groundInflow){
    this.axial=axial;this.plane=plane;this.groundInflow=groundInflow;
    const pitch=this.pitch(collective);
    let load=this.loads(pitch,this.omega,this.inflow,axial,plane);
    const target=this.wakeTarget(load.thrust,axial,plane,groundInflow);
    const transit=clamp(this.radius/(2*Math.max(3,Math.hypot(plane,axial+this.inflow))),.045,.45);
    this.inflow+=(target-this.inflow)*(1-Math.exp(-dt/transit));
    load=this.loads(pitch,this.omega,this.inflow,axial,plane);
    const demand=load.torque+this.rotorInertia*(this.nominalOmega-this.omega)/.35;
    const limit=this.maxPower/Math.max(this.omega,this.nominalOmega*.3);
    const targetTorque=clamp(demand,0,limit);
    this.engineTorque+=(targetTorque-this.engineTorque)*(1-Math.exp(-dt/.18));
    this.engineTorque=clamp(this.engineTorque,0,limit);
    // Midpoint work update: delta rotor kinetic energy = shaft work - aero work.
    const before=this.omega;
    this.omega=Math.max(0,before+(this.engineTorque-load.torque)*dt/this.rotorInertia);
    this.shaftPower=this.engineTorque*(before+this.omega)/2;
    this.aeroTorque=load.torque;this.profileLoss=load.profileLoss;
    this.thrust=load.thrust;this.inPlaneForce=load.inPlaneForce;
    return load;
  }
  thrustCurve(){
    // Immutable numeric observation. The assist may invert this curve but
    // cannot integrate the rotor, modify its wake, or obtain a state reference.
    return Array.from({length:9},(_,i)=>this.loads(this.pitch(i/8),this.omega,
      this.inflow,this.axial,this.plane).thrust);
  }
}

class HelicopterPhysics{
  constructor({mass=BASE_MASS,thrustRatio=1.55}={}){
    this.mass=mass;this.thrustRatio=thrustRatio;
    this.rotorModel=new RotorAerodynamics(thrustRatio);
    this.state={
      pos:new THREE.Vector3(),vel:new THREE.Vector3(),attitude:new THREE.Quaternion(),
      omega:new THREE.Vector3(),pitch:0,roll:0,yaw:0,
      collective:.65,effectiveCollective:.65,rotorPitch:0,rotorRoll:0,
      pitchRate:0,rollRate:0,yawRateBody:0,yawAuthority:1,
      rotorThrust:0,rotorRPM:100,shaftPower:0,inducedFlow:0,vrs:0,groundInflow:1,verticalAccel:0,grounded:false,rotorClearance:0,gustSpeed:0
    };
    this.forward=new THREE.Vector3();this.up=new THREE.Vector3();this.right=new THREE.Vector3();
    this.rotorUp=new THREE.Vector3();this.airVelocity=new THREE.Vector3();
    this.bodyAir=new THREE.Vector3();this.dragForce=new THREE.Vector3();
    this.rotorForce=new THREE.Vector3();this.totalForce=new THREE.Vector3();
    this.passiveMoment=new THREE.Vector3();this.torque=new THREE.Vector3();
    this.inertia=new THREE.Vector3();this.angularAuthority=new THREE.Vector3();
    this.dampingRate=new THREE.Vector3();
    this.inverseQ=new THREE.Quaternion();this.deltaQ=new THREE.Quaternion();
    this.diskQ=new THREE.Quaternion();this.tempQ=new THREE.Quaternion();
    this.angularMomentum=new THREE.Vector3();this.gyro=new THREE.Vector3();
    this.rotationStart=new THREE.Vector3();this.rotationMid=new THREE.Vector3();
    this.rotationNext=new THREE.Vector3();this.rotationDerivative=new THREE.Vector3();
    this.rotorPlaneForce=new THREE.Vector3();
    this.axis=new THREE.Vector3();this.bodyDrag=new THREE.Vector3();
    this.localWind=new THREE.Vector3();this.hub=new THREE.Vector3();
    this.samplePoint=new THREE.Vector3();this.sampledWind=new THREE.Vector3();
    this.gustMoment=new THREE.Vector3();
    this.finForceBody=new THREE.Vector3();this.finForce=new THREE.Vector3();
    this.reset(new THREE.Vector3(0,42,320),Math.PI);
  }
  configure(mass,thrustRatio){
    this.mass=mass;this.thrustRatio=thrustRatio;this.rotorModel.configure(thrustRatio);
  }
  reset(position,yaw=0){
    const s=this.state;
    s.pos.copy(position);s.vel.set(0,0,0);s.omega.set(0,0,0);
    s.attitude.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    this.rotorModel.reset(this.mass*G);
    s.yaw=yaw;s.collective=s.effectiveCollective=this.rotorModel.hoverCollective;
    s.rotorPitch=s.rotorRoll=s.verticalAccel=0;
    s.rotorThrust=this.rotorModel.thrust;s.rotorRPM=100;
    s.shaftPower=this.rotorModel.shaftPower;s.inducedFlow=this.rotorModel.inflow;s.vrs=0;s.groundInflow=1;
    s.rotorClearance=0;s.gustSpeed=0;this.gustMoment.set(0,0,0);
    this.finForceBody.set(0,0,0);this.finForce.set(0,0,0);
    s.pitchRate=s.rollRate=s.yawRateBody=0;s.yawAuthority=1;s.grounded=false;
    this.dragForce.set(0,0,0);this.rotorForce.set(0,0,0);this.passiveMoment.set(0,0,0);
    this.updateFrames();this.sampleAir(new THREE.Vector3());this.updateAngularProperties();
  }
  updateFrames(){
    const s=this.state,q=s.attitude;
    this.forward.set(1,0,0).applyQuaternion(q);
    this.up.set(0,1,0).applyQuaternion(q);
    this.right.set(0,0,1).applyQuaternion(q);
    const horizontal=Math.hypot(this.forward.x,this.forward.z);
    s.pitch=Math.atan2(this.forward.y,horizontal);
    // Euler angles are readouts only. Freeze azimuth at the vertical pole.
    if(horizontal>.025)s.yaw=Math.atan2(-this.forward.z,this.forward.x);
    if(horizontal>.025)s.roll=Math.atan2(-this.right.y,this.up.y);
    this.diskQ.setFromAxisAngle(this.axis.set(0,0,1),s.rotorPitch);
    this.tempQ.setFromAxisAngle(this.axis.set(1,0,0),s.rotorRoll);
    this.diskQ.multiply(this.tempQ);
    this.rotorUp.set(0,1,0).applyQuaternion(this.diskQ).applyQuaternion(q).normalize();
    this.inverseQ.copy(q).invert();
  }
  sampleAir(wind){
    this.airVelocity.copy(this.state.vel).sub(wind);
    this.bodyAir.copy(this.airVelocity).applyQuaternion(this.inverseQ);

  }
  sampleEnvironment(environment){
    const s=this.state;
    this.hub.copy(s.pos).addScaledVector(this.up,FLIGHT_MODEL.hubHeight);
    if(environment.sampleWind)environment.sampleWind(this.hub,this.localWind);
    else this.localWind.copy(environment.wind);
    s.gustSpeed=this.localWind.length();
    this.sampleAir(this.localWind);
    s.rotorClearance=this.hub.y-environment.groundHeight(this.hub.x,this.hub.z);
    const clearance=Math.max(0,s.rotorClearance);
    const planeSpeed=Math.sqrt(Math.max(0,this.airVelocity.lengthSq()-this.airVelocity.dot(this.rotorUp)**2));
    // Cheeseman/Bennett effective induced-velocity factor, as summarized in
    // NASA NDARC TP-20220000355 appx D, section 12-4.1.2. The wake direction
    // sets effective ground distance. No correction when the wake points up.
    // h >= .5 R regularizes the near-surface formula; terrain footprint and
    // slope are not resolved. The far-field cut-off is blended continuously.
    const upright=Math.max(0,this.rotorUp.y);
    const axial=this.airVelocity.dot(this.rotorUp);
    const wakeSpeed=Math.hypot(planeSpeed,axial+this.rotorModel.inflow);
    const wakeDown=clamp((this.airVelocity.y+this.rotorModel.inflow*this.rotorUp.y)/Math.max(wakeSpeed,.01),0,1);
    const h=Math.max(clearance,FLIGHT_MODEL.rotorRadius*.5)/Math.max(wakeDown,.001);
    const imageReduction=1-Math.pow(Math.max(0,1-(FLIGHT_MODEL.rotorRadius/(4*h))**2),1.5);
    const farFade=1-THREE.MathUtils.smoothstep(h/FLIGHT_MODEL.rotorRadius,2,3);
    s.groundInflow=1-(environment.groundEffect!==false&&s.rotorClearance>0?
      imageReduction*upright**2*farFade:0);
    this.gustMoment.set(0,0,0);
    if(!environment.sampleWind)return;
    const arm=FLIGHT_MODEL.rotorRadius*.65;
    const sample=(direction,sign)=>{
      this.samplePoint.copy(this.hub).addScaledVector(direction,sign*arm);
      environment.sampleWind(this.samplePoint,this.sampledWind);
      return this.sampledWind.dot(this.rotorUp);
    };
    const foreDifference=sample(this.forward,1)-sample(this.forward,-1);
    const sideDifference=sample(this.right,1)-sample(this.right,-1);
    const response=FLIGHT_MODEL.gustLoadSlope*arm*clamp(s.effectiveCollective/.65,0,1.5);
    // Unequal gust loading across the disc produces actual body moments.
    this.gustMoment.set(-sideDifference*response,0,foreDifference*response);
  }
  updateAngularProperties(){
    const scale=this.mass/BASE_MASS;
    this.inertia.fromArray(FLIGHT_MODEL.inertia).multiplyScalar(scale);
    // Hub stiffness follows RPM; thrust-dependent moment follows actual load.
    // This is a reduced hub response, not a full articulated-blade flapping model.
    const rpm=this.rotorModel.omega/this.rotorModel.nominalOmega;
    const rotorAuthority=.20*rpm*rpm+.80*Math.max(0,this.rotorModel.thrust)/(BASE_MASS*G);
    const airspeed=this.airVelocity.length();
    this.angularAuthority.set(
      FLIGHT_MODEL.torqueAccel[0]*rotorAuthority/scale,
      FLIGHT_MODEL.torqueAccel[1]/scale,
      FLIGHT_MODEL.torqueAccel[2]*rotorAuthority/scale
    );
    this.dampingRate.fromArray(FLIGHT_MODEL.angularDamping);
    this.dampingRate.addScaledVector(this.axis.fromArray(FLIGHT_MODEL.angularAirDamping),airspeed).divideScalar(scale);
  }
  rotationAcceleration(w,controls,out){
    const side=this.bodyAir.z+w.y*FLIGHT_MODEL.finArm;
    const force=-.5*FLIGHT_MODEL.density*FLIGHT_MODEL.finArea*Math.hypot(this.bodyAir.x,side)*side;
    this.finForceBody.set(0,0,force);
    this.passiveMoment.set(-this.inertia.x*this.dampingRate.x*w.x,
      -this.inertia.y*this.dampingRate.y*w.y+FLIGHT_MODEL.finArm*force,
      -this.inertia.z*this.dampingRate.z*w.z);
    this.torque.set(this.inertia.x*this.angularAuthority.x*this.state.rotorRoll/FLIGHT_MODEL.discAngle,
      this.inertia.y*this.angularAuthority.y*clamp(controls.pedal,-1,1),
      this.inertia.z*this.angularAuthority.z*this.state.rotorPitch/FLIGHT_MODEL.discAngle)
      .add(this.passiveMoment).add(this.gustMoment);
    this.angularMomentum.copy(w).multiply(this.inertia);
    this.gyro.crossVectors(w,this.angularMomentum);
    return out.copy(this.torque).sub(this.gyro).divide(this.inertia);
  }
  updateRotation(dt,controls){
    const s=this.state,w=s.omega;
    this.updateAngularProperties();
    const substeps=Math.max(1,Math.ceil(dt*120)),h=dt/substeps;
    for(let j=0;j<substeps;j++){
      this.rotationStart.copy(w);this.rotationNext.copy(w);
      // Implicit midpoint preserves free rigid-body energy and |I omega|.
      // Damping and fin moments are evaluated at the SAME midpoint rate.
      for(let i=0;i<16;i++){
        this.rotationMid.copy(this.rotationStart).add(this.rotationNext).multiplyScalar(.5);
        this.rotationAcceleration(this.rotationMid,controls,this.rotationDerivative);
        w.copy(this.rotationStart).addScaledVector(this.rotationDerivative,h);
        const error=w.distanceToSquared(this.rotationNext);
        this.rotationNext.copy(w);
        if(error<1e-24)break;
      }
      this.rotationMid.copy(this.rotationStart).add(w).multiplyScalar(.5);
      // Cayley rotation is paired with midpoint momentum integration. Body
      // axes always right-multiply; no Euler-angle singularity at 90 degrees.
      this.deltaQ.set(this.rotationMid.x*h*.5,this.rotationMid.y*h*.5,
        this.rotationMid.z*h*.5,1).normalize();
      s.attitude.multiply(this.deltaQ).normalize();
    }
    // Re-evaluate the same physical fin force in the updated world frame.
    this.rotationAcceleration(this.rotationMid,controls,this.rotationDerivative);
    this.finForce.copy(this.finForceBody).applyQuaternion(s.attitude);
    s.rollRate=w.x;s.yawRateBody=w.y;s.pitchRate=w.z;
    s.yawAuthority=clamp(1-Math.abs(FLIGHT_MODEL.finArm*this.finForceBody.z)/
      Math.max(1,this.inertia.y*this.angularAuthority.y),0,1);
  }
  calculateDrag(){
    const v=this.bodyAir;
    // Cross-flow pressure forces oppose each local velocity component. This
    // gives side slip its own force, instead of using it to inflate axial drag.
    // Sum F_i*v_i <= 0 at every attitude. CdA values remain trainer parameters.
    this.bodyDrag.set(
      -.5*FLIGHT_MODEL.density*(v.x>=0?FLIGHT_MODEL.dragForward:FLIGHT_MODEL.dragBackward)*Math.abs(v.x)*v.x,
      -.5*FLIGHT_MODEL.density*FLIGHT_MODEL.dragVertical*Math.abs(v.y)*v.y,
      -.5*FLIGHT_MODEL.density*FLIGHT_MODEL.dragSide*Math.abs(v.z)*v.z);
    this.dragForce.copy(this.bodyDrag).applyQuaternion(this.state.attitude).add(this.finForce);
    return this.dragForce;
  }
  calculateRotorThrust(dt){
    const s=this.state,axial=this.airVelocity.dot(this.rotorUp);
    this.rotorPlaneForce.copy(this.airVelocity).addScaledVector(this.rotorUp,-axial);
    const plane=this.rotorPlaneForce.length();
    const load=this.rotorModel.step(dt,s.effectiveCollective,axial,plane,s.groundInflow);
    if(plane>1e-8)this.rotorPlaneForce.multiplyScalar(load.inPlaneForce/plane);
    else this.rotorPlaneForce.set(0,0,0);
    this.rotorForce.copy(this.rotorUp).multiplyScalar(load.thrust).add(this.rotorPlaneForce);
    s.rotorThrust=load.thrust;s.rotorRPM=100*this.rotorModel.omega/this.rotorModel.nominalOmega;
    s.shaftPower=this.rotorModel.shaftPower;s.inducedFlow=this.rotorModel.inflow;s.vrs=this.rotorModel.vrs;
    return load.thrust;
  }
  step(dt,controls,environment){
    if(!(dt>0))return;
    const s=this.state;
    s.collective=clamp(controls.collective,0,1);
    s.effectiveCollective+=(s.collective-s.effectiveCollective)*
      (1-Math.exp(-dt/FLIGHT_MODEL.collectiveTime));
    const discFollow=1-Math.exp(-dt/FLIGHT_MODEL.discTime);
    s.rotorPitch+=(clamp(controls.pitch,-1,1)*FLIGHT_MODEL.discAngle-s.rotorPitch)*discFollow;
    s.rotorRoll+=(clamp(controls.roll,-1,1)*FLIGHT_MODEL.discAngle-s.rotorRoll)*discFollow;
    this.updateFrames();this.sampleEnvironment(environment);
    this.updateRotation(dt,controls);
    this.updateFrames();this.sampleEnvironment(environment);
    this.calculateDrag();this.calculateRotorThrust(dt);
    this.totalForce.copy(this.rotorForce).add(this.dragForce);
    this.totalForce.y-=this.mass*G;
    s.verticalAccel=this.totalForce.y/this.mass;
    s.vel.addScaledVector(this.totalForce,dt/this.mass);
    s.pos.addScaledVector(s.vel,dt);
    s.grounded=false;
    const ground=environment.groundHeight(s.pos.x,s.pos.z)+1.8;
    if(s.pos.y<ground){
      s.pos.y=ground;s.grounded=true;
      if(s.vel.y<0)s.vel.y=0;
      // Contact friction is part of the world physics, independent of assists.
      const speed=Math.hypot(s.vel.x,s.vel.z);
      const normalAccel=Math.max(0,-this.totalForce.y/this.mass);
      const dv=Math.min(speed,.45*normalAccel*dt);
      if(speed>1e-8){s.vel.x*=1-dv/speed;s.vel.z*=1-dv/speed;}
    }
    const edge=environment.boundary;
    for(const axis of ['x','z']){
      if(Math.abs(s.pos[axis])>edge){
        const sign=Math.sign(s.pos[axis]);s.pos[axis]=sign*edge;
        if(s.vel[axis]*sign>0)s.vel[axis]=0;
      }
    }
  }
  observe(){
    // Copies are the only interface to the controller. It never receives state.
    const s=this.state,thrustCurve=this.rotorModel.thrustCurve();
    return {position:s.pos.clone(),yaw:s.yaw,height:s.pos.y,velocity:s.vel.clone(),omega:s.omega.clone(),
      attitude:s.attitude.clone(),forward:this.forward.clone(),up:this.up.clone(),
      right:this.right.clone(),rotorUp:this.rotorUp.clone(),bodyAir:this.bodyAir.clone(),
      pitch:s.pitch,roll:s.roll,collective:s.effectiveCollective,
      mass:this.mass,maxThrust:thrustCurve[thrustCurve.length-1],thrustCurve,
      angularAuthority:this.angularAuthority.clone(),dampingRate:this.dampingRate.clone(),
      dragY:this.dragForce.y+this.rotorPlaneForce.y};
  }
}
// === END PHYSICS CORE ===

// === ENVIRONMENT: continuous world-space wind field, no aircraft state writes ===
class FlightEnvironment{
  constructor(groundHeight,boundary){
    this.groundHeight=groundHeight;this.boundary=boundary;
    this.wind=new THREE.Vector3();this.time=0;this.strength=1;this.targetStrength=1;
    this.groundEffect=true;
  }
  reset(){this.time=0;this.strength=this.targetStrength;}
  advance(dt){
    this.time+=dt;
    this.strength+=(this.targetStrength-this.strength)*(1-Math.exp(-dt/.5));
  }
  sampleWind(p,out){
    const t=this.time,x=p.x,y=p.y,z=p.z;
    // Different spatial scales and nonmatching periods produce smooth gusts.
    // Fixed simulation time makes replay independent of render frame rate.
    const a=Math.sin(.071*x+.037*z+.019*y+.83*t);
    const b=Math.sin(-.043*x+.097*z-.023*y+1.37*t+1.9);
    const c=Math.sin(.129*x-.083*z+.061*y+2.17*t+4.2);
    const d=Math.sin(.013*x+.021*z+.011*y+.29*t+2.8);
    const strength=this.strength*(1-Math.exp(-t/1.2));
    return out.copy(this.wind).addScaledVector(
      FlightEnvironment.temp.set(1.6*a+.7*b+.6*d,.85*b+.45*c+.35*d,1.4*d+.8*c+.5*a),strength);
  }
}
FlightEnvironment.temp=new THREE.Vector3();
// === END ENVIRONMENT ===

// === PILOT INPUT: keyboard shaping and a collective lever, no flight forces ===
class PilotControls{
  constructor(){this.reset(.65);}
  reset(collective){this.pitch=0;this.roll=0;this.yaw=0;this.collective=collective;this.collectiveInput=0;this.collectiveWasActive=false;}
  step(dt,raw,lastCollective){
    for(const axis of ['pitch','roll','yaw']){
      const target=clamp(raw[axis]||0,-1,1);
      const reversing=this[axis]*target<0;
      const rate=axis==='yaw'?1/.16:(reversing?2/.12:1/.10);
      const delta=clamp(target-this[axis],-rate*dt,rate*dt);
      this[axis]+=delta;
    }
    // Pedal-like input: build pressure gradually, then ease back on release.
    // This shapes the pilot command only; the rotor actuator remains physical.
    const collectiveTarget=clamp(raw.collective||0,-1,1);
    const reversing=this.collectiveInput*collectiveTarget<0;
    const collectiveRate=collectiveTarget===0?1/.35:(reversing?2/.25:1/.5);
    this.collectiveInput+=clamp(collectiveTarget-this.collectiveInput,
      -collectiveRate*dt,collectiveRate*dt);
    // The pilot lever is persistent. Automatic actuator commands must not
    // overwrite it on every step. Adopt the last actuator command only when
    // the pilot deliberately starts a collective input, for a smooth handoff.
    if(collectiveTarget!==0&&!this.collectiveWasActive&&Number.isFinite(lastCollective)){
      this.collective=clamp(lastCollective,0,1);
    }
    const leverRate=this.collectiveInput>=0?.45:.225;
    this.collective=clamp(this.collective+this.collectiveInput*leverRate*dt,0,1);
    this.collectiveWasActive=collectiveTarget!==0||Math.abs(this.collectiveInput)>1e-4;
    return {pitch:this.pitch,roll:this.roll,yaw:this.yaw,collective:this.collective,
      collectiveInput:this.collectiveInput,
      collectiveActive:collectiveTarget!==0||Math.abs(this.collectiveInput)>1e-4};
  }
}

// === GAME ASSISTS: observation -> actuator commands; never mutates physics ===
class FlightAssistController{
  constructor(){this.reset(0);}
  collectiveForThrust(thrust,curve){
    if(thrust<=curve[0])return 0;
    for(let i=1;i<curve.length;i++)if(thrust<=curve[i]){
      return (i-1+clamp((thrust-curve[i-1])/Math.max(1,curve[i]-curve[i-1]),0,1))/(curve.length-1);
    }
    return 1;
  }
  reset(height){this.holdAltitude=height;this.maneuver=false;this.recovery=0;
    this.wasManual=false;this.hoverPosition=new THREE.Vector3();this.hoverYaw=0;this.hoverCaptured=false;this.assistCollective=null;this.altitudeBlend=1;this.idleTime=0;this.hoverIdle=0;this.hoverBlend=0;this.status='手動飛行';}
  step(dt,pilot,obs,options,tuning){
    // The setting is the requested body rate; no hidden 25% boost.
    const attitudeRate=tuning.attitudeRate*DEG;
    const yawRate=tuning.yawRate*DEG;
    const commands={
      pitch:clamp(pilot.pitch*tuning.attitudeRate/50,-1,1),
      roll:clamp(pilot.roll*tuning.attitudeRate/50,-1,1),
      pedal:clamp(pilot.yaw*tuning.yawRate/65,-1,1),collective:pilot.collective
    };
    if(!options.master){
      this.reset(obs.height);return commands;
    }
    let targetPitch=pilot.pitch*attitudeRate;
    let targetRoll=pilot.roll*attitudeRate;
    let targetYaw=pilot.yaw*yawRate;
    const manualCyclic=Math.abs(pilot.pitch)>.03||Math.abs(pilot.roll)>.03;
    const manualYaw=Math.abs(pilot.yaw)>.03;
    const handsOn=manualCyclic||manualYaw||pilot.collectiveActive;
    this.idleTime=handsOn?0:this.idleTime+dt;
    const horizontalSpeed=Math.hypot(obs.velocity.x,obs.velocity.z);
    const hoverEligible=options.hover&&!handsOn&&horizontalSpeed<4&&obs.up.y>.96&&obs.omega.length()<8*DEG;
    this.hoverIdle=hoverEligible?this.hoverIdle+dt:0;
    if(handsOn||!options.hover||obs.up.y<.65)this.hoverCaptured=false;
    // Once captured, the hold survives its own corrective tilt/rate.
    // Pilot input, disabling hover or extreme tilt explicitly releases it.
    const hoverTarget=this.hoverCaptured||this.hoverIdle>=.75?1:0;
    if(hoverTarget&&!this.hoverCaptured){
      this.hoverPosition.copy(obs.position);this.hoverYaw=obs.yaw;
      this.holdAltitude=obs.height;this.wasManual=false;this.hoverCaptured=true;
    }
    this.hoverBlend+=clamp(hoverTarget-this.hoverBlend,-dt/.12,dt/.6);
    // Manual input takes priority; release must settle before hover recaptures.
    const inputWeight=1-clamp(Math.max(Math.abs(pilot.pitch),Math.abs(pilot.roll),Math.abs(pilot.yaw))/.15,0,1);
    const hoverWeight=options.hover&&!handsOn&&this.hoverCaptured?this.hoverBlend*inputWeight:0;
    const hovering=hoverWeight>1e-5;
    // Preserve the requested half-strength roll leveling, with delayed re-entry.
    // Hover owns the leveling correction as it fades in, avoiding double pull.
    if(options.stability&&!manualCyclic&&!manualYaw&&obs.up.y>Math.cos(80*DEG)){
      const bankWeight=THREE.MathUtils.smoothstep(obs.up.y,Math.cos(80*DEG),.65);
      const yawWeight=1/(1+(obs.omega.y/(30*DEG))**2);
      const levelWeight=clamp((this.idleTime-.35)/.6,0,1)*(1-hoverWeight)*bankWeight*yawWeight;
      targetRoll+=.25*clamp(-obs.roll*1.5,-25*DEG,25*DEG)*levelWeight;
    }
    if(hovering){
      // Position error requests a bounded horizontal velocity; velocity
      // error requests acceleration. Tilt corrections act through the cyclic.
      const desiredVelocity=this.hoverPosition.clone().sub(obs.position);
      desiredVelocity.y=0;desiredVelocity.multiplyScalar(.35).clampLength(0,3);
      const acceleration=desiredVelocity.sub(obs.velocity);acceleration.y=0;
      const desiredPitch=clamp(-Math.atan2(acceleration.dot(obs.forward),G),-.12,.12);
      const desiredRoll=clamp(Math.atan2(acceleration.dot(obs.right),G),-.10,.10);
      targetPitch+=(desiredPitch-obs.pitch)*1.2*hoverWeight;
      targetRoll+=(desiredRoll-obs.roll)*.6*hoverWeight;
      const headingError=Math.atan2(Math.sin(this.hoverYaw-obs.yaw),Math.cos(this.hoverYaw-obs.yaw));
      targetYaw+=clamp(headingError*.8,-15*DEG,15*DEG)*hoverWeight;
    }
    if(options.turn&&!manualYaw&&obs.bodyAir.x>10&&obs.up.y>.45&&Math.abs(obs.roll)<70*DEG){
      targetYaw+=clamp(-G*Math.tan(obs.roll)/Math.max(horizontalSpeed,10)*obs.up.y,-25*DEG,25*DEG);
    }
    const rateControl=(target,actual,authority,drag,response)=>clamp(
      (target-actual)/(response*Math.max(authority,.1))+drag*target/Math.max(authority,.1),-1,1
    );
    if(options.stability||hovering){
      // Active cyclic remains responsive, especially for countersteering.
      // Match release braking to the disc's finite response: the old
      // 0.5/0.6 s lag added large unrequested angles after a short key press.
      // This arrests angular rate through cyclic torque, leaving flight
      // velocity and the separate weak roll-level target untouched.
      const pitchResponse=Math.abs(pilot.pitch)>.03?.18:.20;
      const rollResponse=Math.abs(pilot.roll)>.03?.18:.24;
      const yawResponse=manualYaw?.18:THREE.MathUtils.lerp(.65,.4,hoverWeight);
      const rateWeight=options.stability?1:hoverWeight;
      commands.pitch=THREE.MathUtils.lerp(commands.pitch,
        rateControl(targetPitch,obs.omega.z,obs.angularAuthority.z,obs.dampingRate.z,pitchResponse),rateWeight);
      commands.roll=THREE.MathUtils.lerp(commands.roll,
        rateControl(targetRoll,obs.omega.x,obs.angularAuthority.x,obs.dampingRate.x,rollResponse),rateWeight);
      commands.pedal=THREE.MathUtils.lerp(commands.pedal,
        rateControl(targetYaw,obs.omega.y,obs.angularAuthority.y,obs.dampingRate.y,yawResponse),rateWeight);
    }else if(options.turn&&!manualYaw){
      commands.pedal+=targetYaw*obs.dampingRate.y/Math.max(obs.angularAuthority.y,.1);
    }
    if(options.envelope){
      const tilt=Math.acos(clamp(obs.up.y,-1,1));
      if(tilt>100*DEG){
        const recoveryAxis=obs.up.clone().cross(new THREE.Vector3(0,1,0))
          .applyQuaternion(obs.attitude.clone().invert());
        if(recoveryAxis.lengthSq()<1e-8)recoveryAxis.set(0,0,-1);
        recoveryAxis.normalize();
        const strength=THREE.MathUtils.smoothstep(tilt,100*DEG,125*DEG)*1.6;
        commands.pitch+=recoveryAxis.z*strength;
        commands.roll+=recoveryAxis.x*strength;
      }
    }
    commands.pitch=clamp(commands.pitch,-1,1);
    commands.roll=clamp(commands.roll,-1,1);commands.pedal=clamp(commands.pedal,-1,1);
    this.status='手動總距';
    if(options.hover){
      if(this.assistCollective===null)this.assistCollective=obs.collective;
      // Roll and pedal do not disengage vertical support. Pitch maneuvers,
      // extreme attitude and manual collective still have pilot priority.
      const manualPitch=Math.abs(pilot.pitch)>.03;
      const tilt=Math.acos(clamp(obs.up.y,-1,1));
      const maneuver=manualPitch||Math.abs(obs.pitch)>45*DEG||tilt>75*DEG||Math.abs(obs.omega.z)>25*DEG;
      if(maneuver){this.maneuver=true;this.recovery=0;}
      else if(this.maneuver){
        // Holding a deliberate 10-25 degree pitch is still powered
        // forward/backward flight. Do not re-enable height compensation
        // merely because the pilot released the cyclic key. Resume only
        // near level, or after the full position/heading hover captures.
        const settled=tilt<65*DEG&&(hovering||Math.abs(obs.pitch)<5*DEG)&&Math.abs(obs.omega.z)<12*DEG;
        this.recovery=settled?this.recovery+dt:0;
        if(this.recovery>.35){this.maneuver=false;this.wasManual=true;}
      }
      const bankSupport=1-THREE.MathUtils.smoothstep(tilt,45*DEG,75*DEG);
      const pitchSupport=1-THREE.MathUtils.smoothstep(Math.abs(obs.pitch),25*DEG,45*DEG);
      const altitudeTarget=this.maneuver||pilot.collectiveActive?0:bankSupport*pitchSupport;
      this.altitudeBlend+=(altitudeTarget-this.altitudeBlend)*(1-Math.exp(-dt/.18));
      if(pilot.collectiveActive||this.maneuver){
        this.holdAltitude=obs.height;this.wasManual=true;
        this.status=pilot.collectiveActive?'手動總距':'機動放行・手動總距';
      }else{
        const verticalCapacity=obs.maxThrust*Math.max(0,obs.rotorUp.y);
        const maxUp=Math.max(0,verticalCapacity/obs.mass-G);
        if(this.wasManual){
          // Capture a descending aircraft at its current height and brake
          // its descent. Do not extrapolate a target far below it from a weak,
          // tilted thrust snapshot: that could request zero lift while falling.
          const rise=Math.max(0,obs.velocity.y);
          this.holdAltitude=obs.height+rise*rise/(2*.35*G);
          this.wasManual=false;
        }
        const w=2.4/1.55;
        const acceleration=clamp((this.holdAltitude-obs.height)*w*w-2*w*obs.velocity.y,-.35*G,maxUp);
        // Only automatic height control retains a minimum powered collective.
        // This trainer guard is not a physical rotor limit; manual can reach 0.
        const poweredFloor=.3*clamp(obs.mass*G/Math.max(obs.maxThrust,1),0,1);
        const requiredThrust=(obs.mass*(G+acceleration)-obs.dragY)/Math.max(obs.rotorUp.y,.1);
        const supportCollective=clamp(this.collectiveForThrust(requiredThrust,obs.thrustCurve),poweredFloor,1);
        // Fade from the pilot lever, not the previous assist output.
        // A zero hold weight must fully return collective authority.
        commands.collective=THREE.MathUtils.lerp(pilot.collective,supportCollective,this.altitudeBlend);
        this.status=hovering?'懸停保持':'懸停待命・高度保持';
      }
      // Keep assist entry/exit and height corrections continuous. Manual
      // collective follows its own 0.5-second input ramp and has priority.
      if(pilot.collectiveActive){this.assistCollective=commands.collective;}
      else{
        const rate=commands.collective>this.assistCollective?1.5:.25;
        this.assistCollective+=clamp(commands.collective-this.assistCollective,-rate*dt,rate*dt);
        commands.collective=this.assistCollective;
      }
    }else{this.holdAltitude=obs.height;this.wasManual=true;this.maneuver=false;this.altitudeBlend=0;this.assistCollective=null;}
    return commands;
  }
}
// === END GAME ASSISTS ===
export {HelicopterPhysics,RotorAerodynamics,FlightEnvironment,PilotControls,FlightAssistController,FLIGHT_MODEL,DEG,G,BASE_MASS};
