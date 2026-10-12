import type {Edit} from '../browser-plan';
import {remapCaptions,type TimedWord} from './timing';

// Explicit caption styles retain their existing appearance. Ordinary web
// subtitles use Remotion without requiring a template marker in the chat.
export function browserMotionEdit(edit:Edit):Edit {
 return !edit.textEffect&&edit.subtitles&&!edit.captionStyle?{...edit,textEffect:'word-highlight'}:edit;
}
export function motionPreview(edit:Edit,words:TimedWord[],width:number,height:number){
 if(!edit.textEffect)return undefined;
 return {effect:edit.textEffect,title:edit.title,captions:edit.subtitles?remapCaptions(words,edit.segments):[],width,height,durationInFrames:Math.max(1,Math.round(edit.segments.reduce((n,s)=>n+s.end-s.start,0)*30))};
}
export type MotionPreview=NonNullable<ReturnType<typeof motionPreview>>;
