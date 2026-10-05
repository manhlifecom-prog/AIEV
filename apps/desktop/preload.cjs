const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('aievDesktop',{
  version:'1.2.0',
  mediaLibrary:true,
  ...(process.platform==='win32'?{update:action=>ipcRenderer.invoke('aiev:update',action),onUpdate:callback=>{const listener=(_event,value)=>callback(value);const show=()=>callback({open:true});ipcRenderer.on('aiev:update-state',listener);ipcRenderer.on('aiev:update-open',show);return()=>{ipcRenderer.removeListener('aiev:update-state',listener);ipcRenderer.removeListener('aiev:update-open',show);};}}:{}),
  platform:process.platform==='darwin'?'macos':process.platform==='win32'?'windows':'linux',
  request:(endpoint,body)=>ipcRenderer.invoke('aiev:local',endpoint,body),
  cancelChat:id=>ipcRenderer.invoke('aiev:cancel-chat',id),
  onActivity:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('aiev:activity',listener);return()=>ipcRenderer.removeListener('aiev:activity',listener);},
  preview:id=>ipcRenderer.invoke('aiev:preview',id),
  open:id=>ipcRenderer.invoke('aiev:open',id,false),
  save:id=>ipcRenderer.invoke('aiev:open',id,true),
});
