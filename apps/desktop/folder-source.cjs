const fs=require('node:fs');
const path=require('node:path');
// Generated file names keep Drive names out of commands and local paths.
async function folderSource(files,dir,media,progress=()=>{}) {
  if(!Array.isArray(files)||!files.length)throw new Error('Thư mục không có video');
  const sources=[];let bytes=0,offset=0,hasAudio=false,width=0,height=0;
  for(const [index,file] of files.entries()) {
    progress(`Đang tải clip ${index+1}/${files.length}: ${file.name}`);
    const input=`input-${index}.mp4`, output=`clip-${index}.mp4`;
    await media.downloadDrive(file.url,path.join(dir,input));
    bytes+=fs.statSync(path.join(dir,input)).size;
    const info=await media.probe(input,dir);hasAudio ||= info.hasAudio;
    if(!width) {const ratio=info.width/info.height;[width,height]=ratio<0.8?[1080,1920]:ratio>1.2?[1920,1080]:[1080,1080];}
    progress(`Đang chuẩn bị clip ${index+1}/${files.length}`);
    const args=['-y','-v','error','-protocol_whitelist','file,pipe','-i',input];
    if(!info.hasAudio)args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000');
    args.push('-map','0:v:0','-map',info.hasAudio?'0:a:0':'1:a:0','-t',String(info.duration),'-vf',`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,'-af','aresample=48000:async=1:first_pts=0','-ac','2','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',output);
    await media.runMedia('ffmpeg',args,dir,Math.max(20*60_000,info.duration*2000));
    const normalized=await media.probe(output,dir);
    sources.push({name:String(file.name).slice(0,500),start:offset,duration:normalized.duration,hasAudio:info.hasAudio});
    offset+=normalized.duration;
    fs.unlinkSync(path.join(dir,input));
  }
  progress(`Đang ghép ${files.length} clip trên máy bạn`);
  fs.writeFileSync(path.join(dir,'sources.txt'),files.map((_f,i)=>`file 'clip-${i}.mp4'`).join('\n'));
  await media.runMedia('ffmpeg',['-y','-v','error','-protocol_whitelist','file,pipe','-f','concat','-safe','1','-i','sources.txt','-c','copy','-movflags','+faststart','source.mp4'],dir,Math.max(20*60_000,offset*1000));
  const info=await media.probe('source.mp4',dir);
  for(let i=0;i<files.length;i++)fs.unlinkSync(path.join(dir,`clip-${i}.mp4`));
  fs.unlinkSync(path.join(dir,'sources.txt'));
  return {...info,hasAudio,bytes,sources};
}
module.exports={folderSource};
