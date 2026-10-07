function rockPart(THREE,radius,flatten,color,detail=1){
  const geometry=new THREE.IcosahedronGeometry(radius,detail);
  geometry.scale(1,flatten,.9);
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({
    color,
    roughness:.96,
    metalness:0
  });
  return {geometry,material};
}

export function registerRockModels(registry){
  registry.register({
    id:'rock.small',
    category:'rock',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:16384,
    alignToTerrain:true,
    createParts(THREE){
      return [rockPart(THREE,1.2,.72,0x6d6b62,1)];
    }
  });

  registry.register({
    id:'rock.medium',
    category:'rock',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:4096,
    alignToTerrain:true,
    createParts(THREE){
      return [rockPart(THREE,2.4,.68,0x68665f,1)];
    }
  });

  registry.register({
    id:'rock.cliff',
    category:'rock',
    mode:'instanced',
    sourceUnitScale:true,
    defaultCapacity:512,
    alignToTerrain:true,
    createParts(THREE){
      const part=rockPart(THREE,5.2,.5,0x625f58,2);
      part.geometry.scale(1.35,1,1);
      return [part];
    }
  });
}
