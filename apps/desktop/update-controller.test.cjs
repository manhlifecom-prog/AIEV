const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {attachUpdates}=require('./update-controller.cjs');
const {ORIGIN}=require('./policy.cjs');
test('updater downloads automatically, exposes progress and installs only after work completes',async()=>{
 const app=new EventEmitter();app.getVersion=()=> '1.2.0';const window=new EventEmitter(),sent=[];
 window.webContents={mainFrame:{url:ORIGIN+'/studio'},isDestroyed:()=>false,send:(...args)=>sent.push(args)};
 const event={sender:window.webContents,senderFrame:window.webContents.mainFrame};let handler,busy=false,calls=0,installArgs;
 const updater=new EventEmitter();let finish;updater.checkForUpdates=()=>{calls++;updater.emit('checking-for-update');return new Promise(resolve=>{finish=resolve;});};updater.quitAndInstall=(...args)=>{installArgs=args;};
 attachUpdates({updater,app,window,ipcMain:{removeHandler(){},handle(_name,fn){handler=fn;}},isBusy:()=>busy,dialog:{showMessageBox:async()=>({response:0})}});
 try{
  assert.equal(updater.autoDownload,true);assert.equal(updater.autoInstallOnAppQuit,true);assert.equal(updater.allowDowngrade,false);assert.equal(updater.allowPrerelease,false);
  await assert.rejects(()=>handler({sender:{}},'install'));
  await assert.rejects(()=>handler(event,'https://attacker.example/update.exe'));
  const checking=handler(event,'check');await handler(event,'check');assert.equal(calls,1);updater.emit('update-available',{version:'1.3.0'});finish();await checking;
  updater.emit('download-progress',{percent:44.7});assert.equal((await handler(event,'status')).percent,45);
  await assert.rejects(()=>handler(event,'install'),/chưa tải xong/);
  updater.emit('update-downloaded',{version:'1.3.0'});busy=true;await assert.rejects(()=>handler(event,'install'),/đang xử lý/);assert.equal(installArgs,undefined);
  let prevented=false;window.emit('close',{preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);
  busy=false;await handler(event,'install');assert.deepEqual(installArgs,[true,true]);assert.equal((await handler(event,'status')).status,'installing');
  updater.emit('error',Error('hash mismatch'));assert.equal((await handler(event,'status')).status,'error');assert.ok(sent.length>0);
 }finally{window.emit('closed');assert.equal(app.listenerCount('before-quit'),0);}
});
