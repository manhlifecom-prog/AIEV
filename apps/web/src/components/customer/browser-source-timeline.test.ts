import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {displayDimensions,sourceAtTime,sourceCuts,sourceAudioArgs,sourceCutArgs} from './browser-source-timeline';
const clips=[{start:0,duration:3,hasAudio:false,content:{x:0,y:0,width:160,height:90}},{start:3,duration:2,hasAudio:true,content:{x:0,y:0,width:90,height:160}}];
test('Timeline preserves reordered cuts across files and reads rotated dimensions',()=>{
 assert.deepEqual(displayDimensions(1920,1080,-90),{width:1080,height:1920});
 assert.deepEqual(sourceAtTime(clips,3.5),{index:1,clip:clips[1],time:0.5});
 assert.throws(()=>sourceAtTime(clips,5),/ngoài nguồn/);
 const cuts=sourceCuts([{start:3.5,end:4.5},{start:1.5,end:3.5}],clips);
 assert.deepEqual(cuts.map(c=>[c.index,c.start,c.end]),[[1,.5,1.5],[0,1.5,3],[1,0,.5]]);
 assert.equal(cuts.reduce((n,c)=>n+c.end-c.start,0),3);
});
test('Actual media commands render selected originals in Full HD, including silent and portrait clips',{skip:!fs.existsSync(path.resolve('.runtime/bin/ffmpeg.exe'))},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manh-timeline-'));
 const ff=path.resolve('.runtime/bin/ffmpeg.exe'),probe=path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
 const run=(args:string[])=>{const result=spawnSync(ff,args,{cwd:dir,windowsHide:true,encoding:'utf8'});assert.equal(result.status,0,result.stderr?.slice(-2000));};
 const metadata=(file:string)=>{const result=spawnSync(probe,['-v','error','-show_format','-show_streams','-of','json',file],{cwd:dir,windowsHide:true,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
 try {
  run(['-y','-f','lavfi','-i','color=blue:s=160x90:r=30','-t','3','-c:v','libx264','-pix_fmt','yuv420p','a.mp4']);
  run(['-y','-f','lavfi','-i','color=red:s=90x160:r=30','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','b.mp4']);
  for(const [i,clip] of clips.entries())run(sourceAudioArgs(clip,i===0?'a.mp4':'b.mp4',`audio${i}.wav`));
  fs.writeFileSync(path.join(dir,'audio.txt'),"file 'audio0.wav'\nfile 'audio1.wav'");run(['-y','-f','concat','-safe','0','-i','audio.txt','-c:a','pcm_s16le','speech.wav']);
  const speech=metadata('speech.wav');assert.ok(Math.abs(Number(speech.format.duration)-5)<.05);assert.equal(speech.streams[0].sample_rate,'16000');
  const cuts=sourceCuts([{start:3.5,end:4.5,framing:'fit'},{start:1.5,end:3.5,framing:'fit'}],clips);
  for(const [i,cut] of cuts.entries()){fs.copyFileSync(path.join(dir,cut.index===0?'a.mp4':'b.mp4'),path.join(dir,'input.mp4'));run(sourceCutArgs(cut,true,1080,1920,false,`cut${i}.mp4`));}
  fs.writeFileSync(path.join(dir,'cuts.txt'),cuts.map((_,i)=>`file 'cut${i}.mp4'`).join('\n'));run(['-y','-f','concat','-safe','0','-i','cuts.txt','-c','copy','final.mp4']);
  const output=metadata('final.mp4'),video=output.streams.find((s:any)=>s.codec_type==='video');assert.equal(video.width,1080);assert.equal(video.height,1920);assert.ok(Math.abs(Number(output.format.duration)-3)<.15);assert.ok(output.streams.some((s:any)=>s.codec_type==='audio'));
 } finally {assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('manh-timeline-'));fs.rmSync(dir,{recursive:true,force:true});}
});
