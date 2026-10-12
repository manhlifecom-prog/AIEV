import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
if(process.platform!=='darwin' || !['arm64','x64'].includes(process.arch)) throw new Error('Run on the target Mac architecture.');
const directory=path.resolve('.runtime/bin'); fs.mkdirSync(path.join(directory,'notices'),{recursive:true});
const base='https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/';
const records=[];
for(const name of ['ffmpeg','ffprobe','LICENSE','README']) {
  const asset=['ffmpeg','ffprobe'].includes(name) ? `${name}-darwin-${process.arch}` : `darwin-${process.arch}.${name}`;
  const output=path.join(directory,['ffmpeg','ffprobe'].includes(name)?name:'notices/'+name);
  const response=await fetch(base+asset); if(!response.ok || !response.body) throw new Error('Media download failed: '+asset);
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(output));
  if(['ffmpeg','ffprobe'].includes(name)) fs.chmodSync(output,0o755);
  records.push({asset,url:base+asset,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex')});
}
const run=(name,args)=>{const r=spawnSync(path.join(directory,name),args,{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return r.stdout+r.stderr;};
if(!run('ffmpeg',['-filters']).includes('subtitles') || !run('ffmpeg',['-encoders']).includes('libx264')) throw new Error('Mac FFmpeg requires libass subtitles and libx264.');
run('ffprobe',['-version']);
fs.writeFileSync(path.join(directory,'notices','build.json'),JSON.stringify({architecture:process.arch,release:'b6.1.1',binaries:records},null,2));
fs.writeFileSync(path.join(directory,'notices','SOURCES.txt'),'FFmpeg is a separate GPL-licensed executable. License and exact build information are included.\nBinary release: '+base+'\nCorresponding sources/build information: https://github.com/eugeneware/ffmpeg-static/tree/master/download-binaries\nFFmpeg source: https://ffmpeg.org/download.html\n');
console.log('Mac media verified: '+process.arch);
