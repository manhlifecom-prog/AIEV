"use client";
import {Player} from '@remotion/player';
import {MotionText} from './MotionText';
import type {MotionPreview} from './browser-motion';

export default function ResultPlayer({src,recipe}:{src:string;recipe:MotionPreview}){
 return <Player component={MotionText} inputProps={{src,effect:recipe.effect,title:recipe.title,captions:recipe.captions}} durationInFrames={recipe.durationInFrames} fps={30} compositionWidth={recipe.width} compositionHeight={recipe.height} controls style={{width:'100%',borderRadius:12,overflow:'hidden'}} errorFallback={({error})=><p role="alert">Chưa phát được bản xem trước: {error.message}</p>}/>;
}
