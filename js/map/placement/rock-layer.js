function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function hash2(x,z){
  let n=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263))|0;
  n=(n^(n>>>13))|0;
  n=Math.imul(n,1274126177)|0;
  n=(n^(n>>>16))>>>0;
  return n/4294967295;
}

function slopeDegrees(heightAt,x,z,d){
  const hL=heightAt(x-d,z);
  const hR=heightAt(x+d,z);
  const hD=heightAt(x,z-d);
  const hU=heightAt(x,z+d);
  const gx=(hR-hL)/(2*d);
  const gz=(hU-hD)/(2*d);
  return Math.atan(Math.hypot(gx,gz))*180/Math.PI;
}

export function generateTerrainRockPlacements({
  heightAt,
  bounds,
  worldHalfX,
  worldHalfZ,
  sectorSize=512,
  gridStep=128,
  sampleDistance=64,
  slopeThreshold=11.5
}){
  if(typeof heightAt!=='function'){
    throw new Error('Rock layer requires terrain height sampler');
  }
  if(!bounds){
    throw new Error('Rock layer requires terrain bounds');
  }

  const placements=[];
  const startX=bounds.minX+gridStep*.5;
  const endX=bounds.maxX-gridStep*.5;
  const startZ=bounds.minZ+gridStep*.5;
  const endZ=bounds.maxZ-gridStep*.5;

  for(let z=startZ;z<=endZ;z+=gridStep){
    for(let x=startX;x<=endX;x+=gridStep){
      const slope=slopeDegrees(
        heightAt,
        x,
        z,
        sampleDistance
      );

      if(slope<slopeThreshold){
        continue;
      }

      const cellX=Math.round((x-bounds.minX)/gridStep);
      const cellZ=Math.round((z-bounds.minZ)/gridStep);
      const density=hash2(cellX,cellZ);

      // Keep the layer sparse. Selection is deterministic from the terrain
      // grid, not frame-time randomness, so reloads reproduce the same rocks.
      const keepChance=clamp(
        .34+(slope-slopeThreshold)*.08,
        .34,
        .76
      );

      if(density>keepChance){
        continue;
      }

      const jitterX=(hash2(cellX+31,cellZ-17)-.5)*gridStep*.44;
      const jitterZ=(hash2(cellX-47,cellZ+29)-.5)*gridStep*.44;
      const px=clamp(x+jitterX,bounds.minX,bounds.maxX);
      const pz=clamp(z+jitterZ,bounds.minZ,bounds.maxZ);
      const localSlope=slopeDegrees(
        heightAt,
        px,
        pz,
        sampleDistance
      );

      if(localSlope<slopeThreshold*.9){
        continue;
      }

      const model=
        localSlope>=12.4
          ? 'rock.cliff'
          : localSlope>=11.9
            ? 'rock.medium'
            : 'rock.small';

      const sx=Math.floor((px+worldHalfX)/sectorSize);
      const sz=Math.floor((pz+worldHalfZ)/sectorSize);
      const sectorId=
        String(sx).padStart(2,'0')+'_'+
        String(sz).padStart(2,'0');

      placements.push({
        model,
        x:px,
        z:pz,
        rotationY:hash2(cellX+7,cellZ+11)*Math.PI*2,
        scale:.72+hash2(cellX-13,cellZ+19)*.62,
        yOffset:model==='rock.cliff' ? -.42 : -.18,
        alignToTerrain:true,
        normalSampleDistance:sampleDistance,
        sectorId,
        source:'terrain-derived-rock-v79',
        slopeDegrees:localSlope
      });
    }
  }

  return placements;
}

export function createTerrainRockLayer({
  placement,
  terrainHeight,
  terrainBounds,
  worldHalfX,
  worldHalfZ,
  sectorSize
}){
  const specs=generateTerrainRockPlacements({
    heightAt:terrainHeight,
    bounds:terrainBounds,
    worldHalfX,
    worldHalfZ,
    sectorSize
  });

  placement.placeMany(specs);

  return {
    count:specs.length,
    specs,
    clear(){
      const ids=new Set(specs.map(spec=>spec.sectorId));
      for(const id of ids){
        placement.clearSector(id);
      }
    }
  };
}
