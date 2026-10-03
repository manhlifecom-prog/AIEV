const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {randomUUID}=require('node:crypto');
const {ORIGIN,inside}=require('./policy.cjs');
function attachLocal({app,ipcMain,dialog,shell,window}) {
  ipcMain.removeHandler('aiev:local'); ipcMain.removeHandler('aiev:open');
  const root=path.join(app.getPath('userData'),'local-videos'); fs.mkdirSync(root,{recursive:true});
  process.env.FFMPEG_PATH=path.join(process.resourcesPath,'media','ffmpeg.exe');
  process.env.FFPROBE_PATH=path.join(process.resourcesPath,'media','ffprobe.exe');
  const engine=import(pathToFileURL(path.join(__dirname,'renderer.mjs')).href);
  const manifest=path.join(root,'index.json');
  const records=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):{};
  let working=false;
  const persist=()=>fs.writeFileSync(manifest,JSON.stringify(records));
  function trusted(event) {if(event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame || !inside(event.senderFrame.url)) throw new Error('Không được phép');}
  async function api(endpoint,body,binary) {
    const response=await window.webContents.session.fetch(ORIGIN+'/api/customer'+endpoint,{method:'POST',credentials:'include',headers:{'Content-Type':binary?'application/octet-stream':'application/json','Origin':ORIGIN},body:binary || JSON.stringify(body || {})});
    const result=await response.json(); if(!response.ok) {const error=new Error(result.error || 'Không kết nối được AI'); error.status=response.status; throw error;} return result;
  }
  function record(id) {if(typeof id!=='string' || !records[id]) throw new Error('Video không có trên máy này'); const dir=path.join(root,records[id].directory); if(path.dirname(dir)!==root) throw new Error('Đường dẫn không hợp lệ'); return dir;}
  async function render(id) {
    const dir=record(id),media=await engine;
    await api('/local/'+id+'/confirm',{});
    try {
      let plan;
      if(fs.existsSync(path.join(dir,'plan.json'))) plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'));
      else {
        const metadata=await media.probe('source.mp4',dir);
        if(metadata.hasAudio) for(const [idx,chunk] of [...media.speechChunks(metadata.duration)].entries()) {
          window.setTitle(`AIEV · Nhận diện lời thoại đoạn ${idx+1}`);
          await media.runMedia('ffmpeg',['-y','-v','error','-protocol_whitelist','file,pipe','-ss',String(chunk.start),'-i','source.mp4','-t',String(chunk.seconds),'-vn','-ac','1','-ar','16000','-b:a','48k','speech.mp3'],dir);
          await api('/local/'+id+'/audio/'+idx,null,fs.readFileSync(path.join(dir,'speech.mp3')));
          fs.unlinkSync(path.join(dir,'speech.mp3'));
        }
        plan=await api('/local/'+id+'/plan',{}); fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify(plan));
      }
      media.validateEdit(plan.edit,(await media.probe('source.mp4',dir)).duration);
      await media.renderPlan(plan.edit,plan.words,plan.hasAudio,dir,stage=>window.setTitle('AIEV · '+stage));
      await api('/local/'+id+'/complete',{});
    } catch(error) {await api('/local/'+id+'/fail',{}).catch(()=>{}); throw error;}
    finally {window.setTitle('AIEV Studio');}
  }
  ipcMain.handle('aiev:local',async(event,endpoint,body)=>{
    trusted(event);
    try {
      if(working) throw new Error('Máy đang xử lý video trước');
      if(endpoint==='/chat') {
        working=true;
        let started=false;
        try {
          const message=body?.message;
          if(typeof message!=='string' || message.length>8000) throw new Error('Yêu cầu không hợp lệ');
          const decision=await api('/assistant',{...body,requestId:randomUUID(),device:'windows'});
          if(decision.action==='confirm') {
            record(decision.jobId);
            await api('/local/'+decision.jobId+'/confirm',{});
            started=true;
            void render(decision.jobId).catch(error=>dialog.showMessageBox(window,{type:'error',message:'Chưa hoàn tất dựng tại máy',detail:error.message})).finally(()=>{working=false;});
            return {result:decision};
          }
          if(decision.action!=='prepare') return {result:decision};
          const url=decision.url;
          const directory=randomUUID(),dir=path.join(root,directory); fs.mkdirSync(dir);
          try {
            const media=await engine;
            if(decision.sourceJobId && records[decision.sourceJobId] && fs.existsSync(path.join(record(decision.sourceJobId),'source.mp4'))) fs.copyFileSync(path.join(record(decision.sourceJobId),'source.mp4'),path.join(dir,'source.mp4'));
            else if(url) {window.setTitle('AIEV · Đang tải video về máy bạn'); await media.downloadDrive(url,path.join(dir,'source.mp4'));}
            else {const selected=await dialog.showOpenDialog(window,{title:'Chọn video nguồn trên máy bạn',properties:['openFile'],filters:[{name:'Video',extensions:['mp4','mov','mkv','webm','avi']}]}); if(selected.canceled) throw new Error('Đã hủy chọn video'); fs.copyFileSync(selected.filePaths[0],path.join(dir,'source.mp4'));}
            const metadata={...await media.probe('source.mp4',dir),bytes:fs.statSync(path.join(dir,'source.mp4')).size};
            const result=await api('/local/quote',{threadId:decision.threadId,turnId:decision.turnId,message:decision.prompt,url:url || 'local-file',metadata});
            records[result.jobId]={directory}; persist(); return {result};
          } catch(error) {fs.rmSync(dir,{recursive:true,force:true}); return {result:{...decision,localError:error.message}};}
        } finally {if(!started) {working=false; window.setTitle('AIEV Studio');}}
      }
      const match=typeof endpoint==='string' && endpoint.match(/^\/videos\/([a-zA-Z0-9-]+)\/confirm$/);
      if(!match) throw new Error('Chức năng không được phép');
      working=true;
      void render(match[1]).catch(error=>dialog.showMessageBox(window,{type:'error',message:'Chưa hoàn tất dựng tại máy',detail:error.message})).finally(()=>{working=false;});
      return {result:{success:true}};
    } catch(error) {return {error:error.message,status:error.status || 400};}
  });
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
