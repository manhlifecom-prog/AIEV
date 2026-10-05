const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {randomUUID}=require('node:crypto');
const {ORIGIN,inside}=require('./policy.cjs');
const {readChatStream}=require('./chat-stream.cjs');
const {folderSource}=require('./folder-source.cjs');
const {nativePlatform,mediaResources}=require('./runtime.cjs');
const {MediaLibrary}=require('./media-library.cjs');
function attachLocal({app,ipcMain,dialog,shell,window}) {
  ipcMain.removeHandler('aiev:preview');
  ipcMain.removeHandler('aiev:local'); ipcMain.removeHandler('aiev:open'); ipcMain.removeHandler('aiev:cancel-chat');
  const root=path.join(app.getPath('userData'),'local-videos'); fs.mkdirSync(root,{recursive:true});
  const library=new MediaLibrary(app.getPath('userData'));
  const binaries=mediaResources(process.resourcesPath);
  process.env.FFMPEG_PATH=binaries.ffmpeg;
  process.env.FFPROBE_PATH=binaries.ffprobe;
  const engine=import(pathToFileURL(path.join(__dirname,'renderer.mjs')).href);
  const manifest=path.join(root,'index.json');
  const records=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):{};
  let working=false, chatWorking=false, libraryWorking=false, chatController=null, currentRequest=null, renderRequest=null;
  const notify=(requestId,event)=>{if(!window.webContents.isDestroyed?.())window.webContents.send?.('aiev:activity',{requestId,...event});};
  const stage=(label)=>{window.setTitle('AIEV · '+label);if(renderRequest || currentRequest)notify(renderRequest || currentRequest,{type:'status',data:{label,cancellable:false}});};
  const persist=()=>fs.writeFileSync(manifest,JSON.stringify(records));
  function trusted(event) {if(event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame || !inside(event.senderFrame.url)) throw new Error('Không được phép');}
  async function api(endpoint,body,binary) {
    const response=await window.webContents.session.fetch(ORIGIN+'/api/customer'+endpoint,{method:'POST',credentials:'include',headers:{'Content-Type':binary?'application/octet-stream':'application/json','Origin':ORIGIN},body:binary || JSON.stringify(body || {})});
    const result=await response.json(); if(!response.ok) {const error=new Error(result.error || 'Không kết nối được AI'); error.status=response.status; throw error;} return result;
  }
  function record(id) {if(typeof id!=='string' || !records[id]) throw new Error('Video không có trên máy này'); const dir=path.join(root,records[id].directory); if(path.dirname(dir)!==root) throw new Error('Đường dẫn không hợp lệ'); return dir;}
  async function account() {
    const response=await window.webContents.session.fetch(ORIGIN+'/api/customer/me',{credentials:'include',headers:{'Origin':ORIGIN}});
    const user=await response.json();
    if(!response.ok || typeof user.id!=='string') {const error=new Error('Hãy đăng nhập để chọn video trên máy');error.status=response.status || 401;throw error;}
    return user;
  }
  const previews=require('./media-preview.cjs').createPreviewHandler({account,resolve:async(id)=>{
    const response=await window.webContents.session.fetch(ORIGIN+'/api/customer/videos',{credentials:'include',headers:{'Origin':ORIGIN}});
    const jobs=await response.json();
    if(!response.ok || !Array.isArray(jobs) || !jobs.some(job=>job.id===id && ['done','local_running'].includes(job.status)))throw Error('Video không thuộc tài khoản đang đăng nhập');
    const dir=record(id),final=path.join(dir,'final.mp4'),preview=path.join(dir,'preview.mp4');
    const file=fs.existsSync(final)?final:preview;
    if(!fs.existsSync(file))throw Error('Bản xem trước đang được dựng');
    const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'));
    return {file,preview:file===preview,story:typeof plan.edit?.story==='string'?plan.edit.story:''};
  }});
  const protocol=window.webContents.session.protocol;
  if(protocol.isProtocolHandled)void protocol.isProtocolHandled('aiev-media').then(handled=>{if(handled)protocol.unhandle('aiev-media');protocol.handle('aiev-media',previews.handle);});
  ipcMain.handle('aiev:preview',async(event,id)=>{trusted(event);return previews.issue(id);});
  const launch=id=>{
    working=true;renderRequest=id;
    void render(id).catch(error=>dialog.showMessageBox(window,{type:'error',message:'Chưa hoàn tất dựng tại máy',detail:error.message})).finally(()=>{working=false;renderRequest=null;notify(id,{type:'status',data:{label:'',cancellable:false}});});
  };
  async function render(id) {
    const dir=record(id),media=await engine;
    await api('/local/'+id+'/confirm',{});
    try {
      let plan;
      if(fs.existsSync(path.join(dir,'plan.json'))) plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'));
      else {
        const metadata=fs.existsSync(path.join(dir,'source-metadata.json'))?JSON.parse(fs.readFileSync(path.join(dir,'source-metadata.json'),'utf8')):await media.probe('source.mp4',dir);
        if(metadata.hasAudio) for(const [idx,chunk] of [...media.speechChunks(metadata.duration)].entries()) {
          stage(`Nhận diện lời thoại đoạn ${idx+1}`);
          await media.runMedia('ffmpeg',['-y','-v','error','-protocol_whitelist','file,pipe','-ss',String(chunk.start),'-i','source.mp4','-t',String(chunk.seconds),'-vn','-ac','1','-ar','16000','-b:a','48k','speech.mp3'],dir);
          await api('/local/'+id+'/audio/'+idx,null,fs.readFileSync(path.join(dir,'speech.mp3')));
          fs.unlinkSync(path.join(dir,'speech.mp3'));
        }
        stage('AI đang lập kế hoạch dựng video');
        const frames=await media.extractVisualFrames(dir,metadata,stage);
        plan=await api('/local/'+id+'/plan',{frames}); fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify(plan));
      }
      media.validateEdit(plan.edit,(await media.probe('source.mp4',dir)).duration);
      await media.renderPlan(plan.edit,plan.words,plan.hasAudio,dir,stage,fs.existsSync(path.join(dir,'source-metadata.json'))?JSON.parse(fs.readFileSync(path.join(dir,'source-metadata.json'),'utf8')):undefined,()=>notify(id,{type:'preview',data:{label:'Bản xem trước đã sẵn sàng · Đang xuất Full HD'}}));
      await api('/local/'+id+'/complete',{});
    } catch(error) {await api('/local/'+id+'/fail',{}).catch(()=>{}); throw error;}
    finally {window.setTitle('AIEV Studio');}
  }
  ipcMain.handle('aiev:local',async(event,endpoint,body)=>{
    trusted(event);
    try {
      if(typeof endpoint==='string' && /^\/library\/(status|pick-folder|pick-files|refresh|revoke)$/.test(endpoint)) {
        if(chatWorking || libraryWorking)throw Error('Hãy chờ thao tác nguồn hiện tại hoàn tất');
        libraryWorking=true;
        try {
        const user=await account();
        if(endpoint==='/library/revoke')return {result:await library.revoke(user.id)};
        if(endpoint==='/library/status' || endpoint==='/library/refresh')return {result:await library.scan(user.id)};
        const folder=endpoint==='/library/pick-folder';
        const selection=await dialog.showOpenDialog(window,{title:folder?'Cho AIEV sử dụng video trong thư mục này':'Cho AIEV sử dụng các video này',properties:folder?['openDirectory']:['openFile','multiSelections'],...(folder?{}:{filters:[{name:'Video',extensions:['mp4','mov','m4v','mkv','webm','avi','mts','m2ts']}]})});
        if(selection.canceled)return {result:await library.scan(user.id)};
        return {result:await library.grant(user.id,selection.filePaths,folder)};
        } finally {libraryWorking=false;}
      }
      if(endpoint==='/chat') {
        if(chatWorking || libraryWorking)throw Error('Hãy chờ thao tác hiện tại hoàn tất');
        chatWorking=true;
        let preparing=false, started=false;
        try {
          const message=body?.message;
          if(typeof message!=='string' || message.length>8000) throw new Error('Yêu cầu không hợp lệ');
          const requestId=typeof body.requestId==='string'?body.requestId:randomUUID(); currentRequest=requestId;
          notify(requestId,{type:'status',data:{label:'AI đang nhận yêu cầu',cancellable:false}});
          const user=await account();
          if(!library.index.has(user.id))await library.scan(user.id);
          const localLibrary=library.context(user.id,message);
          chatController=new AbortController();
          const response=await window.webContents.session.fetch(ORIGIN+'/api/customer/assistant',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','Origin':ORIGIN},signal:chatController.signal,body:JSON.stringify({...body,requestId,localLibrary,device:nativePlatform(),deviceVersion:app.getVersion?.() || '1.0.0',stream:true})});
          const decision=await readChatStream(response,event=>notify(requestId,event.type==='result'?{type:'reply',data:{text:event.data.reply || ''}}:event));
          chatController=null;
          if(working && ['prepare','confirm'].includes(decision.action))throw Error('Video đang dựng. Bạn vẫn có thể trao đổi ý tưởng với AI và chỉnh tiếp khi hoàn tất.');
          if(decision.action==='prepare') stage('Chuẩn bị video nguồn trên máy bạn');
          if(decision.action==='confirm') {
            record(decision.jobId);
            await api('/local/'+decision.jobId+'/confirm',{});
            started=true;
            launch(decision.jobId);
            return {result:decision};
          }
          if(decision.action!=='prepare') return {result:decision};
          preparing=true;working=true;
          const url=decision.url;
          const directory=randomUUID(),dir=path.join(root,directory); fs.mkdirSync(dir);
          try {
            const media=await engine;
            let metadata;
            if(Array.isArray(decision.sourceIds) && decision.sourceIds.length) {
              if(!localLibrary || decision.sourceIds.length>50 || new Set(decision.sourceIds).size!==decision.sourceIds.length || decision.sourceIds.some(id=>!localLibrary.files.some(file=>file.id===id)))throw Error('AI chưa chọn được nguồn hợp lệ. Hãy làm mới thư viện video.');
              const files=decision.sourceIds.map(id=>localLibrary.files.find(file=>file.id===id));
              stage(`Đang lấy ${files.length} video từ thư mục đã cấp quyền`);
              if(files.length===1)await library.copy(user.id,files[0].id,path.join(dir,'source.mp4'));
              else metadata=await folderSource(files,dir,media,stage,(file,destination)=>library.copy(user.id,file.id,destination));
            }
            else if(decision.sourceJobId && records[decision.sourceJobId] && fs.existsSync(path.join(record(decision.sourceJobId),'source.mp4'))) {
              const previous=record(decision.sourceJobId);fs.copyFileSync(path.join(previous,'source.mp4'),path.join(dir,'source.mp4'));
              if(fs.existsSync(path.join(previous,'source-metadata.json')))metadata=JSON.parse(fs.readFileSync(path.join(previous,'source-metadata.json'),'utf8'));
            }
            else if(url && /\/drive\/(?:u\/\d+\/)?folders\//.test(new URL(url).pathname)) {
              stage('Đang đọc thư mục Drive');
              const listing=await api('/drive/folder',{url});
              metadata=await folderSource(listing.files,dir,media,stage);
            }
            else if(url) {stage('Đang tải video về máy bạn'); await media.downloadDrive(url,path.join(dir,'source.mp4'));}
            else {stage('Chọn video trong cửa sổ trên máy bạn'); const selected=await dialog.showOpenDialog(window,{title:'Chọn video nguồn trên máy bạn',properties:['openFile','multiSelections'],filters:[{name:'Video',extensions:['mp4','mov','m4v','mkv','webm','avi']}]}); if(selected.canceled) throw new Error('Đã hủy chọn video');
              if(selected.filePaths.length===1)fs.copyFileSync(selected.filePaths[0],path.join(dir,'source.mp4'));
              else metadata=await folderSource(selected.filePaths.map(file=>({name:path.basename(file),file})),dir,media,stage,(file,destination)=>fs.promises.copyFile(file.file,destination));
            }
            metadata ||= {...await media.probe('source.mp4',dir),bytes:fs.statSync(path.join(dir,'source.mp4')).size};
            metadata.visualAnalysis=true;
            fs.writeFileSync(path.join(dir,'source-metadata.json'),JSON.stringify(metadata));
            const result=await api('/local/quote',{threadId:decision.threadId,turnId:decision.turnId,message:decision.prompt,url:url || 'local-file',metadata});
            records[result.jobId]={directory}; persist(); return {result};
          } catch(error) {
            const target=path.resolve(dir);
            if(path.dirname(target)!==path.resolve(root) || !/^[a-f0-9-]{36}$/.test(path.basename(target)))throw Error('Không thể dọn đường dẫn tác vụ không hợp lệ');
            fs.rmSync(target,{recursive:true,force:true}); return {result:{...decision,localError:error.message}};
          }
        } finally {chatController=null;chatWorking=false;currentRequest=null;if(preparing && !started)working=false;if(!working)window.setTitle('AIEV Studio');}
      }
      const match=typeof endpoint==='string' && endpoint.match(/^\/videos\/([a-zA-Z0-9-]+)\/confirm$/);
      if(!match) throw new Error('Chức năng không được phép');
      if(working || chatWorking)throw Error('Hãy chờ tác vụ hiện tại trước khi bắt đầu lượt dựng khác');
      launch(match[1]);
      return {result:{success:true}};
    } catch(error) {return {error:error.message,status:error.status || 400};}
  });
  ipcMain.handle('aiev:cancel-chat',async(event,requestId)=>{trusted(event);if(requestId===currentRequest && chatController){chatController.abort();return true;}return false;});
  ipcMain.handle('aiev:open',async(event,id,save)=>{
    trusted(event);
    const response=await window.webContents.session.fetch(ORIGIN+'/api/customer/videos',{credentials:'include',headers:{'Origin':ORIGIN}});
    const jobs=await response.json();
    if(!response.ok || !Array.isArray(jobs) || !jobs.some(job=>job.id===id && job.status==='done' && job.output==='local.mp4')) throw new Error('Video không thuộc tài khoản đang đăng nhập');
    const file=path.join(record(id),'final.mp4');
    if(!fs.existsSync(file)) throw new Error('Video chưa hoàn tất trên máy này');
    if(save) {const target=await dialog.showSaveDialog(window,{title:'Lưu video MP4',defaultPath:path.join(app.getPath('downloads'),'AIEV-video.mp4'),filters:[{name:'MP4',extensions:['mp4']}]}); if(!target.canceled) fs.copyFileSync(file,target.filePath);}
    else await shell.openPath(file);
  });
}
module.exports={attachLocal};
