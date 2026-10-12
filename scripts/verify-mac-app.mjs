import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=process.cwd(), output=path.join(root,'.runtime/app-builds/desktop');
const packaged=fs.readdirSync(output).filter(x=>x.startsWith('mac')).map(x=>path.join(output,x,'AIEV Studio.app')).find(x=>fs.existsSync(x));
if(!packaged) throw new Error('Packaged Mac app missing');
const resources=path.join(packaged,'Contents/Resources');
process.env.FFMPEG_PATH=path.join(resources,'media/ffmpeg');process.env.FFPROBE_PATH=path.join(resources,'media/ffprobe');
const require=createRequire(path.join(root,'apps/desktop/package.json'));
const asar=await import(pathToFileURL(require.resolve('@electron/asar')).href);
const scratch=fs.mkdtempSync(path.join(root,'.runtime/mac-check-'));
fs.writeFileSync(path.join(scratch,'renderer.mjs'),asar.extractFile(path.join(resources,'app.asar'),'renderer.mjs'));
for(const file of ['local-engine.cjs','media-library.cjs','runtime.cjs','preload.cjs','chat-stream.cjs']) asar.extractFile(path.join(resources,'app.asar'),file);
for(const binary of [process.env.FFMPEG_PATH,process.env.FFPROBE_PATH]) {
  const r=spawnSync('otool',['-L',binary],{encoding:'utf8'});if(r.status!==0) throw new Error('Could not inspect '+binary);
  const links=r.stdout.split('\n').slice(1).map(x=>x.trim().split(' ')[0]).filter(Boolean);
  if(links.some(x=>!x.startsWith('/System/') && !x.startsWith('/usr/lib/')))throw new Error('Media binary depends on unbundled libraries: '+links);
}
const {runMedia,renderPlan,probe}=await import(pathToFileURL(path.join(scratch,'renderer.mjs')).href);
await runMedia('ffmpeg',['-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=440','-t','2','-c:v','libx264','-c:a','aac','source.mp4'],scratch);
await renderPlan({title:'AIEV Mac',ratio:'1:1',subtitles:true,segments:[{start:0,end:1}]},[{word:'Kiểm tra',start:0,end:0.8}],true,scratch,console.log);
const metadata=await probe('final.mp4',scratch);
if(metadata.width!==1080 || metadata.height!==1080 || Math.abs(metadata.duration-1)>0.1 || !metadata.hasAudio)throw new Error('Packaged Mac rendering failed');
const signature=spawnSync('codesign',['--verify','--deep','--strict',packaged],{encoding:'utf8'});
if(signature.status!==0)throw new Error('Invalid application signature: '+signature.stderr);
const production=process.argv.includes('--production');
if(production) {
  const details=spawnSync('codesign',['--display','--verbose=4',packaged],{encoding:'utf8'});
  if(details.status!==0 || !/Authority=Developer ID Application:/.test(details.stderr) || !/flags=.*runtime/.test(details.stderr))throw new Error('Official Mac app requires Developer ID and hardened runtime.');
  for(const [command,args] of [['spctl',['--assess','--type','execute','--verbose',packaged]],['xcrun',['stapler','validate',packaged]]]) {
    const verified=spawnSync(command,args,{encoding:'utf8'});if(verified.status!==0)throw new Error('Official Mac notarization verification failed: '+verified.stderr);
  }
}
const version=JSON.parse(asar.extractFile(path.join(resources,'app.asar'),'package.json').toString()).version;
fs.writeFileSync(path.join(output,'mac-verification.json'),JSON.stringify({version,architecture:process.arch,metadata,signature:production?'Developer ID signed and notarized':'ad-hoc preview, not notarized',verifiedAt:new Date().toISOString()},null,2));
console.log('Packaged Mac engine rendered an MP4 with captions successfully.');
