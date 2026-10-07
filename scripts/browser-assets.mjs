import fs from 'node:fs';
import path from 'node:path';
const target=path.resolve('apps/web/public/studio/renderer');
fs.mkdirSync(target,{recursive:true});
for(const name of ['ffmpeg','core']) {
  const source=path.resolve('node_modules/@ffmpeg/'+name+'/dist/esm');
  fs.cpSync(source,path.join(target,name),{recursive:true,filter:file=>!file.endsWith('.d.ts')});
  for(const file of fs.readdirSync(path.join(target,name)))if(file.endsWith('.d.ts'))fs.unlinkSync(path.join(target,name,file));
  fs.copyFileSync('node_modules/@ffmpeg/'+name+'/package.json',path.join(target,name,'package.json'));
}
// libass needs an actual Unicode font; do not depend on system fonts in a worker.
fs.copyFileSync('apps/web/browser-assets/NotoSans.ttf',path.join(target,'caption.ttf'));
fs.copyFileSync('apps/web/browser-assets/OFL.txt',path.join(target,'OFL.txt'));
fs.copyFileSync('apps/web/browser-assets/FFmpeg-LICENSE',path.join(target,'FFmpeg-LICENSE'));
fs.writeFileSync(path.join(target,'SOURCES.txt'),'FFmpeg.wasm wrapper source: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/ffmpeg\nDistributed wrapper version: @ffmpeg/ffmpeg 0.12.15 (npm)\nFFmpeg.wasm core 0.12.10 build source: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10\nFFmpeg: https://github.com/FFmpeg/FFmpeg/tree/n5.1.4\nNoto Sans: https://github.com/google/fonts/tree/main/ofl/notosans\n');
console.log('Browser worker, single-thread core and Unicode font prepared');

fs.cpSync('apps/web/browser-assets/fonts',path.join(target,'fonts'),{recursive:true});
