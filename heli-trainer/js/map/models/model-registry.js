export class ModelRegistry{
  constructor(){
    this.models=new Map();
  }

  register(definition){
    if(!definition || !definition.id){
      throw new Error('Model definition requires id');
    }
    if(this.models.has(definition.id)){
      throw new Error(`Duplicate model id: ${definition.id}`);
    }
    this.models.set(definition.id,Object.freeze({...definition}));
    return definition.id;
  }

  get(id){
    const definition=this.models.get(id);
    if(!definition){
      throw new Error(`Unknown map model: ${id}`);
    }
    return definition;
  }

  has(id){
    return this.models.has(id);
  }

  ids(){
    return [...this.models.keys()];
  }
}
