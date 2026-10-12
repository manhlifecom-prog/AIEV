const {inside}=require('./policy.cjs');

function attachUpdates({updater,app,window,ipcMain,isBusy,dialog}) {
  let state={status:'idle',currentVersion:app.getVersion(),version:'',percent:0,message:'Tự động kiểm tra và tải bản cập nhật'},checking=null;
  const send=patch=>{state={...state,...patch};if(!window.webContents.isDestroyed())window.webContents.send('aiev:update-state',state);return state;};
  const trusted=event=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||!inside(event.senderFrame.url))throw Error('Không được phép');};
  updater.autoDownload=true;
  updater.autoInstallOnAppQuit=true;
  updater.autoRunAppAfterInstall=true;
  updater.allowDowngrade=false;
  updater.allowPrerelease=false;
  updater.disableWebInstaller=true;
  // Full downloads also work for users coming from releases without blockmaps.
  updater.disableDifferentialDownload=true;
  updater.logger=null;
  const handlers={
    'checking-for-update':()=>send({status:'checking',message:'Đang kiểm tra phiên bản mới…'}),
    'update-available':info=>send({status:'downloading',version:info.version,percent:0,message:'Đang tải bản mới trong nền…'}),
    'download-progress':info=>send({status:'downloading',percent:Math.max(0,Math.min(100,Math.round(info.percent))),message:'Đang tải bản mới trong nền…'}),
    'update-downloaded':info=>send({status:'ready',version:info.version,percent:100,message:'Bản mới đã sẵn sàng. Sẽ cài khi đóng app.'}),
    'update-not-available':()=>send({status:'latest',message:'Bạn đang dùng phiên bản mới nhất'}),
    'error':()=>send({status:'error',message:'Chưa cập nhật được. Kiểm tra kết nối hoặc dung lượng máy rồi thử lại.'}),
  };
  for(const [event,handler] of Object.entries(handlers))updater.on(event,handler);
  async function check(show=false){
    if(show)window.webContents.send('aiev:update-open');
    if(checking||['downloading','ready','installing'].includes(state.status))return state;
    checking=updater.checkForUpdates().catch(()=>handlers.error()).finally(()=>{checking=null;});
    await checking;return state;
  }
  ipcMain.removeHandler('aiev:update');
  ipcMain.handle('aiev:update',async(event,action)=>{
    trusted(event);
    if(action==='status')return {...state,busy:isBusy()};
    if(action==='check')return check();
    if(action!=='install')throw Error('Chức năng không được phép');
    if(state.status!=='ready')throw Error('Bản cập nhật chưa tải xong');
    if(isBusy())throw Error('App đang xử lý video hoặc yêu cầu AI. Hãy chờ hoàn tất rồi cập nhật.');
    send({status:'installing',message:'Đang cài bản mới và mở lại AIEV…'});
    updater.quitAndInstall(true,true);
    return state;
  });
  let warning=false;
  const guard=event=>{
    if(!isBusy())return;
    event.preventDefault();
    if(!warning){warning=true;void dialog.showMessageBox(window,{type:'info',message:'AIEV đang xử lý video',detail:'Hãy chờ tác vụ hoàn tất trước khi đóng hoặc cập nhật. Bản cập nhật đã tải sẽ được giữ lại.'}).finally(()=>{warning=false;});}
  };
  window.on('close',guard);app.on('before-quit',guard);
  const startup=setTimeout(()=>{void check();},5000),periodic=setInterval(()=>{void check();},6*60*60*1000);
  startup.unref?.();periodic.unref?.();
  window.once('closed',()=>{clearTimeout(startup);clearInterval(periodic);app.removeListener('before-quit',guard);for(const [event,handler] of Object.entries(handlers))updater.removeListener(event,handler);});
  return {check};
}
module.exports={attachUpdates};
