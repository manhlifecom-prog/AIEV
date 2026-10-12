import { frameFilter, type Framing, type SourceClip } from '../../../../server/src/customer/edit-quality';
export type TimelineClip=SourceClip & {hasAudio:boolean};
export function displayDimensions(width:number,height:number,rotation:number) {
  return Math.abs(rotation)%180===90 ? {width:height,height:width} : {width,height};
}
export function sourceAtTime(clips:TimelineClip[],time:number) {
  const index=clips.findIndex(c=>time>=c.start && time<c.start+c.duration);
  if(index<0)throw Error('Mốc cảnh nằm ngoài nguồn video');
  return {index,clip:clips[index],time:time-clips[index].start};
}
export function sourceCuts(segments:({start:number;end:number}&Framing)[],clips:TimelineClip[]) {
  return segments.flatMap(segment=>clips.flatMap((clip,index)=>{
    const start=Math.max(segment.start,clip.start),end=Math.min(segment.end,clip.start+clip.duration);
    return end-start>0.005 ? [{...segment,index,start:start-clip.start,end:end-clip.start,clip}] : [];
  }));
}
export function sourceAudioArgs(clip:TimelineClip,file:string,output:string) {
  return ['-y',...(clip.hasAudio?['-i',file,'-vn','-af','apad']:['-f','lavfi','-i','anullsrc=r=16000:cl=mono']),'-t',String(clip.duration),'-ac','1','-ar','16000','-c:a','pcm_s16le',output];
}
export function sourceCutArgs(cut:ReturnType<typeof sourceCuts>[number],hasAudio:boolean,width:number,height:number,preview:boolean,output:string) {
  const seconds=cut.end-cut.start;
  return ['-y','-ss',String(cut.start),'-i','input.mp4',...(hasAudio&&!cut.clip.hasAudio?['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']:[]),'-map','0:v:0',...(hasAudio?['-map',cut.clip.hasAudio?'0:a:0':'1:a:0']:[]),'-vf',frameFilter(cut,width,height,cut.clip.content),'-t',String(seconds),'-c:v','libx264','-preset',preview?'ultrafast':'veryfast','-crf',preview?'27':'18','-pix_fmt','yuv420p',...(hasAudio?['-c:a','aac','-ar','48000','-ac','2','-af','apad']:[]),'-movflags','+faststart',output];
}
