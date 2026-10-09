"use client";
import React,{useMemo} from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {captionFonts} from '../../../../../server/src/customer/caption-styles';
import {getTextEffect,type TextEffectId} from '../../../../../server/src/customer/text-effects';
import {captionPages,demoCaptions} from './timing';
import {EditorialVideo} from './EditorialVideo';
export type MotionTextProps={fontCss?:string;effect:TextEffectId;text?:string;captions?:Caption[];src?:string;title?:string};
// Timed-word highlight/pop adapted for SVG rendering from Remotion Elements:
// https://www.remotion.dev/elements/captions/popping-word-captions/
// https://www.remotion.dev/elements/captions/word-highlight-captions/
// Marker/circle variants follow https://www.remotion.dev/elements/text/.
// SVG keeps the same composition usable by Player and the on-device web renderer.
export function MotionText({effect,text='Biến khoảnh khắc thành câu chuyện',captions,src,title,fontCss}:MotionTextProps){
 const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),time=frame/fps*1000;
 const preset=getTextEffect(effect)||getTextEffect('word-highlight')!,font=captionFonts[preset.font];
 const titleOnly=Boolean(src&&title&&(!captions||!captions.length));
 const pages=useMemo(()=>captionPages(titleOnly?demoCaptions(title!):captions||demoCaptions(text)),[captions,text,title,titleOnly]);
 const page=pages.find(p=>time>=p[0].startMs&&time<p[p.length-1].endMs);
 const fontSize=width*(width<height?.056:.038)*(font.family==='Judson'?1.18:1),maxWidth=width*.82;
 const layout=useMemo(()=>{if(!page)return [];const canvas=typeof document==='undefined'?null:document.createElement('canvas'),ctx=canvas?.getContext('2d');if(ctx)ctx.font=`${font.italic?'italic ':''}${font.weight} ${fontSize}px "${font.family}"`;
 const items=page.map((word,index)=>({word,index,w:Math.min(maxWidth,ctx?.measureText(word.text.trim()).width||word.text.length*fontSize*.55)}));const rows:typeof items[]=[[]];let rowWidth=0;for(const item of items){if(rowWidth+item.w+fontSize*.25>maxWidth&&rows.at(-1)!.length){rows.push([]);rowWidth=0;}rows.at(-1)!.push(item);rowWidth+=item.w+fontSize*.25;}
 return rows.flatMap((row,line)=>{let x=(width-row.reduce((n,w)=>n+w.w,0)-(row.length-1)*fontSize*.25)/2;return row.map(item=>{const r={...item,x,y:(titleOnly?height*.22:src?height*.84:height*.51)+(line-(rows.length-1)/2)*fontSize*1.4};x+=item.w+fontSize*.25;return r;});});},[page,font,fontSize,maxWidth,width,height,src,titleOnly]);
 const localFrame=page?(time-page[0].startMs)/1000*fps:0;
 if(effect==='coffee-editorial'&&src)return <EditorialVideo src={src} title={title} captions={captions} fontCss={fontCss}/>;
 return <AbsoluteFill style={{backgroundColor:src?'transparent':'#10131C'}}>{src?<Video src={src} style={{width:'100%',height:'100%'}}/>:null}
 <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position:'absolute',inset:0}}>
 {fontCss&&<defs><style>{fontCss}</style></defs>}
 {!src&&<><defs><radialGradient id="ambient"><stop stopColor={preset.accent} stopOpacity=".17"/><stop offset="1" stopColor="#10131C" stopOpacity="0"/></radialGradient></defs><ellipse cx={width*.3} cy={height*.25} rx={width*.75} ry={height*.8} fill="url(#ambient)"/><line x1={width*.12} x2={width*.88} y1={height*.78} y2={height*.78} stroke={preset.accent} strokeOpacity=".25"/><text x={width*.12} y={height*.16} fill={preset.accent} fontSize={width*.024} fontFamily="Be Vietnam Pro" letterSpacing={width*.003}>AIEV / MOTION TYPE</text><text x={width*.12} y={height*.87} fill="#8992A5" fontSize={width*.022} fontFamily="Be Vietnam Pro">{preset.name.toUpperCase()}</text></>}
 {title&&!titleOnly&&time<4000&&<text x={width/2} y={height*.15} fill="#FFFFFF" stroke="#10131C" strokeWidth={1} paintOrder="stroke" fontFamily="Be Vietnam Pro" fontWeight="700" fontSize={Math.min(fontSize,width*.8/Math.max(1,title.length)*1.8)} textAnchor="middle">{title}</text>}
 {layout.map(({word,index,w,x,y})=>{const active=time>=word.startMs&&time<word.endMs,relative=(time-word.startMs)/1000*fps;const start=page![0].startMs;const enter=interpolate(localFrame-index*2,[0,.35*fps],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const pop=active?spring({frame:Math.max(0,relative),fps,config:{damping:12,stiffness:220}}):0;const scale=preset.kind==='pop'&&active?1+Math.sin(Math.min(1,pop)*Math.PI)*.17:1;const offset=preset.kind==='rise'?(1-enter)*fontSize*.75:0;const opacity=preset.kind==='rise'?enter:preset.kind==='cinema'?interpolate(localFrame,[0,.8*fps],[0,1],{extrapolateRight:'clamp',extrapolateLeft:'clamp'}):1;let value=word.text.trim();if(preset.kind==='type'){const reveal=Math.max(0,Math.min(value.length,Math.ceil((time-word.startMs)/Math.max(1,word.endMs-word.startMs)*value.length)));value=value.slice(0,reveal);}
 const ink=(preset.kind==='highlight'||preset.kind==='pop')&&active?preset.accent:preset.ink;
 return <g key={index} opacity={opacity} transform={`translate(${x+w/2} ${y+offset}) scale(${scale}) translate(${-w/2} 0)`}>
 {preset.kind==='marker'&&active&&<rect x={-fontSize*.12} y={-fontSize*.87} width={(w+fontSize*.24)*Math.min(1,Math.max(0,relative/(fps*.12)))} height={fontSize*1.13} rx={fontSize*.1} fill={preset.accent}/>}
 {preset.kind==='circle'&&active&&<ellipse cx={w/2} cy={-fontSize*.32} rx={w/2+fontSize*.2} ry={fontSize*.73} fill="none" stroke={preset.accent} strokeWidth={fontSize*.045} pathLength={1} strokeDasharray={1} strokeDashoffset={1-Math.min(1,Math.max(0,relative/(fps*.2)))}/>}
 {preset.kind==='glitch'&&localFrame<fps*.23&&<text x={Math.sin(frame*2)*fontSize*.12} y={0} fill={preset.accent} fontFamily={font.family} fontWeight={font.weight} fontSize={fontSize}>{value}</text>}
 <text x={0} y={0} fill={preset.kind==='marker'&&active?'#10131C':ink} stroke={src?'#10131C':'none'} strokeWidth={fontSize*.023} paintOrder="stroke" fontFamily={font.family} fontWeight={font.weight} fontStyle={font.italic?'italic':'normal'} fontSize={fontSize} textLength={preset.kind==='type'?undefined:w} lengthAdjust="spacingAndGlyphs" letterSpacing={preset.kind==='cinema'?interpolate(localFrame,[0,fps*3],[0,fontSize*.025],{extrapolateRight:'clamp'}):0}>{value}</text>
 {preset.kind==='type'&&value&&value.length<word.text.trim().length&&frame%fps<fps*.6&&<rect x={w*value.length/word.text.trim().length+2} y={-fontSize*.8} width={fontSize*.045} height={fontSize} fill={preset.accent}/>}
 </g>;})}
 </svg></AbsoluteFill>;
}
