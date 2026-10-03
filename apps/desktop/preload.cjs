const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('aievDesktop',{
  version:'0.3.0',
  request:(endpoint,body)=>ipcRenderer.invoke('aiev:local',endpoint,body),
  open:id=>ipcRenderer.invoke('aiev:open',id,false),
  save:id=>ipcRenderer.invoke('aiev:open',id,true),
});
