import React from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import type {Caption} from '@remotion/captions';

export type EditorialProps={src:string;title?:string;captions?:Caption[];fontCss?:string;demo?:boolean};
const cream='#F7EFDB',lime='#D5E6A6';
function Icon({kind,x,y}:{kind:number;x:number;y:number}){return <g transform={`translate(${x} ${y})`} stroke={cream} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">{kind===0?<><path d="M-20-13H13V6Q13 21-3 21Q-20 21-20 6ZM13-9H20Q32-9 27 3Q24 9 13 9M-14-27Q-20-34-13-41M0-27Q-6-34 1-41"/></>:kind===1?<><circle r="26"/><path d="M0-18V0L12 8M-8-35H8"/></>:<><path d="M0-31L7-8L30 0L7 8L0 31L-7 8L-30 0L-7-8Z"/></>}</g>}
/** Reusable editorial layout. Demo copy is never used for a customer's export. */
export function EditorialVideo({src,title='',captions=[],fontCss,demo=false}:EditorialProps){
 const frame=useCurrentFrame(),{fps,durationInFrames}=useVideoConfig(),seconds=frame/fps,progress=frame/durationInFrames;
 const scene=progress<.34?0:progress<.7?1:2,local=(progress-(scene===0?0:scene===1?.34:.7))*durationInFrames;
 const enter=interpolate(local,[0,20],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const active=captions.filter(c=>seconds*1000>=c.startMs-350&&seconds*1000<c.endMs+350).slice(0,4).map(c=>c.text.trim()).join(' ');
 const headline=(title||active||'').slice(0,64),split=Math.ceil(headline.length/2),space=headline.indexOf(' ',split),lines=headline.length>22&&space>0?[headline.slice(0,space),headline.slice(space+1)]:[headline];
 return <AbsoluteFill style={{backgroundColor:'#1B241F'}}><Video src={src} muted={demo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
 <svg viewBox="0 0 1080 1920" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0}}>
 <defs>{fontCss&&<style>{fontCss}</style>}<linearGradient id="editorial-shade" x2="0" y2="1"><stop stopColor="#12221A" stopOpacity=".79"/><stop offset=".45" stopColor="#12221A" stopOpacity=".08"/><stop offset="1" stopColor="#12221A" stopOpacity=".96"/></linearGradient></defs>
 <rect width="1080" height="1920" fill="url(#editorial-shade)"/>
 <g fill={cream} fontFamily="Be Vietnam Pro" fontWeight="700"><text x="86" y="122" fontSize="25" letterSpacing="6">{demo?'SLOW / LIVING':'STORY / FILM'}</text><text x="994" y="122" fontSize="23" textAnchor="end">{String(scene+1).padStart(2,'0')} — 03</text></g>
 <path d="M86 158H994" stroke={cream} opacity=".45"/>
 <g opacity={enter} transform={`translate(0 ${(1-enter)*35})`} fill={cream}>
 {demo?<><text x="82" y="320" fontFamily="Judson" fontSize="132">{scene===0?'Chậm lại,':scene===1?'Một chút':'Giữ lại'}</text><text x="82" y="452" fontFamily="Judson" fontStyle="italic" fontSize="142" fill={lime}>{scene===0?'để tận hưởng.':scene===1?'thảnh thơi.':'điều đẹp.'}</text></>:lines.map((line,i)=><text key={i} x="86" y={310+i*112} fontFamily="Judson" fontSize={Math.min(112,900/Math.max(1,line.length)*1.75)}>{line}</text>)}
 <path d="M89 493Q350 477 650 493" stroke={lime} strokeWidth="5" fill="none" strokeDasharray="570" strokeDashoffset={570*(1-enter)}/>
 </g>
 {demo&&scene===1&&<g opacity={enter}><path d="M570 960L770 890H960" fill="none" stroke={cream} strokeWidth="2"/><circle cx="570" cy="960" r="8" fill={lime}/><rect x="740" y="795" width="250" height="72" rx="36" fill={cream}/><text x="865" y="842" textAnchor="middle" fontFamily="Be Vietnam Pro" fontWeight="700" fontSize="27" fill="#25382D">GÓC NHỎ BÌNH YÊN</text></g>}
 <g transform={`translate(0 ${(1-enter)*28})`} opacity={enter}>
 <rect x="64" y="1370" width="952" height="365" rx="34" fill="#1A3027" fillOpacity=".92" stroke={cream} strokeOpacity=".22"/>
 <text x="108" y="1434" fontFamily="Be Vietnam Pro" fontWeight="700" fontSize="23" fill={lime} letterSpacing="4">{demo?'NGHI THỨC BUỔI SÁNG':'KHOẢNH KHẮC / CÂU CHUYỆN'}</text>
 <path d="M215 1510H866" stroke={cream} strokeOpacity=".3" strokeDasharray="5 10"/>
 {[0,1,2].map((i)=><g key={i}><circle cx={223+i*317} cy="1520" r="53" fill="#294435"/><Icon kind={i} x={223+i*317} y={1520}/><text x={223+i*317} y="1620" textAnchor="middle" fill={cream} fontFamily="Judson" fontSize="41">{demo?['Pha một tách','Dành một phút','Tận hưởng'][i]:['Mở đầu','Cảm nhận','Lưu giữ'][i]}</text><text x={223+i*317} y="1670" textAnchor="middle" fill={lime} fontFamily="Be Vietnam Pro" fontSize="20">0{i+1}</text></g>)}
 </g>
 <text x="540" y="1820" textAnchor="middle" fill={cream} fontFamily="Be Vietnam Pro" fontSize="28">{demo?(scene===2?'Một ngày đẹp bắt đầu từ điều nhỏ.':'Một tách cà phê. Một khoảng trời riêng.') :active}</text>
 <rect x="86" y="1865" width="908" height="3" fill={cream} opacity=".2"/><rect x="86" y="1865" width={908*progress} height="3" fill={lime}/>
 </svg></AbsoluteFill>;
}
