const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('aievDesktop',{
  version:'0.6.0',
  platform:process.platform==='darwin'?'macos':process.platform==='win32'?'windows':'linux',
  request:(endpoint,body)=>ipcRenderer.invoke('aiev:local',endpoint,body),
  cancelChat:id=>ipcRenderer.invoke('aiev:cancel-chat',id),
  onActivity:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('aiev:activity',listener);return()=>ipcRenderer.removeListener('aiev:activity',listener);},
  open:id=>ipcRenderer.invoke('aiev:open',id,false),
  save:id=>ipcRenderer.invoke('aiev:open',id,true),
});
