// Yield a task without the background-tab delay imposed on repeated short timers.
export function yieldToBrowser(){
  if(typeof MessageChannel==='undefined')return Promise.resolve();
  return new Promise(resolve=>{
    const channel=new MessageChannel();
    channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};
    channel.port2.postMessage(0);
  });
}
