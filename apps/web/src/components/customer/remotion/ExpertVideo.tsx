import React,{useMemo} from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {expertPreset,type ExpertPresetId} from '../../../../../server/src/customer/text-effects';
import {captionPages} from './timing';
export type ExpertVideoProps={preset:ExpertPresetId;src:string;title?:string;captions?:Caption[];fontCss?:string;demo?:boolean};
export function ExpertVideo({preset,src,title='',captions=[],fontCss,demo=false}:ExpertVideoProps){
 const p=expertPreset(preset)!,f=useCurrentFrame(),{fps,durationInFrames}=useVideoConfig(),t=f/fps;
 const pages=useMemo(()=>captionPages(captions),[captions]),page=pages.find(x=>t*1000>=x[0].startMs&&t*1000<x.at(-1)!.endMs);
 const entry=interpolate(f,[0,22],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),head=demo?p.heading:title;
 const serif=p.layout!=='map',font=serif?'Judson':'Be Vietnam Pro',speaker=demo?(p.speaker==='vinh'?'THẦY VINH TOÁN':'THẦY LÊ VĂN THÀNH'):'CHIA SẺ KIẾN THỨC';
 const portrait=!demo||p.speaker==='vinh';
 const videoStyle:React.CSSProperties=portrait?{position:'absolute',top:'20%',left:'21%',width:'58%',height:'54%',borderRadius:24,overflow:'hidden'}:{position:'absolute',top:'27%',left:'6%',width:'88%',height:'28%',borderRadius:20,overflow:'hidden'};
 const y=portrait?1510:1160;
 // Only demo variants contain authored example points; customer exports use their own title/transcript.
 const nodes=demo?[...p.points]:page?[page.map(w=>w.text.trim()).join(' ')]:[];
 return <AbsoluteFill style={{backgroundColor:p.bg}}><div style={videoStyle}><Video src={src} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
 <svg width="100%" height="100%" viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
 {fontCss&&<defs><style>{fontCss}</style></defs>}
 <g stroke={p.accent} strokeWidth="2" fill="none" opacity=".2"><circle cx="1070" cy="110" r="280"/><circle cx="1070" cy="110" r="220"/>{p.layout==='note'&&[0,1,2,3,4].map(i=><path key={i} d={`M70 ${1480+i*70}H1010`}/>)}</g>
 <text x="80" y="116" fontFamily="Be Vietnam Pro" fontWeight="700" fontSize="27" letterSpacing="3" fill={p.accent}>{speaker}</text><path d="M80 154H1000" stroke={p.accent} opacity=".4"/>
 <g opacity={entry} transform={`translate(0 ${(1-entry)*25})`}><text x="80" y="270" fontFamily={font} fontWeight={serif?'400':'700'} fontStyle={p.layout==='quote'?'italic':'normal'} fontSize={Math.min(98,1660/Math.max(14,head.length))} fill={p.ink}>{head}</text>{demo&&<text x="84" y="332" fontFamily="Be Vietnam Pro" fontSize="29" fill={p.accent}>{p.subtitle}</text>}</g>
 {p.layout==='quote'&&<text x="78" y={y-15} fontFamily="Judson" fontSize="180" fill={p.accent} opacity=".65">“</text>}
 {nodes.map((node,i)=>{const reveal=interpolate(f-i*fps*.6,[fps*.8,fps*1.2],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const row=y+i*94;return <g key={i} opacity={reveal} transform={`translate(${(1-reveal)*30} 0)`}>
 {p.layout==='map'?<><path d={`M118 ${row-23}V${row+65}`} stroke={p.accent} strokeWidth="3" strokeDasharray="5 7"/><rect x="84" y={row-57} width="70" height="70" rx="20" fill={p.accent}/><text x="119" y={row-10} textAnchor="middle" fontFamily="Be Vietnam Pro" fontSize="28" fontWeight="700" fill={p.bg}>{i+1}</text></>:<><circle cx="116" cy={row-21} r="24" fill={p.accent} opacity=".15"/><path d={`M105 ${row-21}l8 8 15-18`} fill="none" stroke={p.accent} strokeWidth="4" strokeLinecap="round"/></>}
 <text x="183" y={row-4} fontFamily={font} fontSize={Math.min(49,1230/Math.max(24,node.length))} fontWeight={serif?'400':'700'} fill={p.ink}>{node}</text></g>;})}
 {!demo&&page&&nodes.length===0&&<text x="540" y="1710" textAnchor="middle" fill={p.ink}>{page.map(c=>c.text).join('')}</text>}
 <path d="M80 1804H1000" stroke={p.accent} opacity=".35"/><text x="80" y="1861" fontFamily="Be Vietnam Pro" fontSize="23" fill={p.accent}>{demo?'TRÍCH ĐOẠN CHIA SẺ · '+p.name.toUpperCase():''}</text><rect x="80" y="1893" width={920*f/durationInFrames} height="4" fill={p.accent}/>
 </svg></AbsoluteFill>;
}
