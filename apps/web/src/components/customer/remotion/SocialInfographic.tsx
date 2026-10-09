"use client";
import React from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {captionPages} from './timing';
import {SocialScenes} from './SocialScenes';

function lines(text:string,max=23){const rows:string[]=[''];for(const word of text.split(/\s+/)){const last=rows.length-1;if(rows[last]&&(rows[last]+' '+word).length>max)rows.push(word);else rows[last]+=(rows[last]?' ':'')+word;}if(rows.length>1&&rows[rows.length-1].length<8){const previous=rows[rows.length-2].split(" ");if(previous.length>1){rows[rows.length-1]=previous.pop()+" "+rows[rows.length-1];rows[rows.length-2]=previous.join(" ");}}return rows;}
export function SocialInfographic({src,title,captions=[],fontCss,demo=false}:{src?:string;title?:string;captions?:Caption[];fontCss?:string;demo?:boolean}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),seconds=frame/fps,scene=Math.floor(seconds/6)%6;
 const enter=interpolate(seconds%6,[0,.55],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const page=captionPages(captions).find(p=>seconds*1000>=p[0].startMs&&seconds*1000<p[p.length-1].endMs);
 const headings=['Biến ý tưởng thành giá trị','Điều bạn thấy chỉ là phần nổi','Một video, nhiều lớp chăm chút','Đưa câu chuyện vào từng khung hình','Nhịp dựng tạo nên khác biệt','Đến lượt câu chuyện của bạn'];
 const heading=lines(title||(demo?headings[scene]:'Câu chuyện của bạn'),23).slice(0,3);
 const sceneWords=captions.filter(w=>w.startMs>=Math.floor(seconds/6)*6000&&w.startMs<(Math.floor(seconds/6)+1)*6000).map(w=>w.text.trim()).join(' ');
 const sceneItems=lines(sceneWords||title||'Câu chuyện của bạn',27).slice(0,6);
 const words=page?.map(w=>w.text.trim()).join(' ')||'';
 const subtitle=demo?['Một ý tưởng • nhiều cách kể','Đẹp ở hình • rõ ở ý','Mỗi chi tiết đều có vai trò','Dựng từng bước • kể liền mạch','Đúng nhịp • đúng điểm nhấn','Bạn muốn kể điều gì hôm nay?'][scene]:words;
 const captionsLines=lines(subtitle,26).slice(0,3);
 return <AbsoluteFill style={{backgroundColor:'#190716'}}>
 {src&&<Video src={src} style={{position:'absolute',left:'7.4%',top:'21%',width:'85.2%',height:'34%',objectFit:'contain'}}/>}
 <svg width="100%" height="100%" viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
 <defs><linearGradient id="social-metal"><stop stopColor="#8c6078"/><stop offset=".5" stopColor="#fff2e6"/><stop offset="1" stopColor="#995478"/></linearGradient><linearGradient id="social-type"><stop stopColor="#ffd6ec"/><stop offset="1" stopColor="#ff409c"/></linearGradient><linearGradient id="social-bg" x2=".25" y2="1"><stop stopColor="#851451"/><stop offset=".52" stopColor="#330c2c"/><stop offset="1" stopColor="#0f0916"/></linearGradient><linearGradient id="ice-face" x2="1" y2="1"><stop stopColor="#ffe5f5"/><stop offset="1" stopColor="#e46cb5"/></linearGradient>{fontCss&&<style>{fontCss}</style>}</defs>
 {!src&&<rect width="1080" height="1920" fill="url(#social-bg)"/>}
 {Array.from({length:12},(_,i)=><line key={i} x1={i*100} x2={i*100} y1="0" y2="1920" stroke="#ffc0e7" strokeOpacity=".035"/>)}
 <text x="84" y="128" fill="#f4a8d4" fontFamily="Be Vietnam Pro" fontSize="27" fontWeight="700" letterSpacing="5">AIEV / SOCIAL STORY</text>
 {heading.map((line,i)=><text key={i} x="84" y={220+i*75} fill={i===heading.length-1?'url(#social-type)':'#fff1fa'} style={{filter:'drop-shadow(0px 7px 0px #4b0c2d)',transform:`translateY(${(1-enter)*22}px)`}} fontFamily="Be Vietnam Pro" fontWeight="700" fontSize={Math.min(74,900/Math.max(1,line.length)*1.8)}>{line}</text>)}
 <g transform={src?'translate(259 1070) scale(.52)':'translate(0 410)'} opacity={enter}>
 {scene===0?<>
 <rect x="86" y="30" width="908" height="104" rx="30" fill="#ef51a8" fillOpacity=".17" stroke="#f793c8" strokeOpacity=".4"/>
 {['Ý TƯỞNG','VIDEO','CHIA SẺ'].map((s,i)=><g key={s}><circle cx={142+i*302} cy="82" r="23" fill="#ffb6df"/><path d={i===1?`M${135+i*302} 68 l23 14 -23 14Z`:`M${132+i*302} 82h20m-10-10v20`} stroke="#521437" fill="#521437" strokeWidth="4"/><text x={183+i*302} y="92" fill="#fff2fa" fontSize="29" fontFamily="Be Vietnam Pro" fontWeight="700">{s}</text></g>)}
 <circle cx="540" cy="650" r="352" fill="#1c091d" stroke="#cf6a9e" strokeWidth="9"/>
 <circle cx="540" cy="650" r="324" fill="none" stroke="#f681c0" strokeOpacity=".2" strokeWidth="2"/>
 {Array.from({length:41},(_,i)=>{const a=(140+i*6.5)*Math.PI/180;return <line key={i} x1={540+Math.cos(a)*306} y1={650+Math.sin(a)*306} x2={540+Math.cos(a)*(i%5===0?277:294)} y2={650+Math.sin(a)*(i%5===0?277:294)} stroke={i>25?'#ff5cad':'#ffd3ec'} strokeWidth={i%5===0?4:2}/>;})}
 <g transform={`rotate(${interpolate(seconds%6,[0,4.5],[-120,110],{extrapolateRight:'clamp'})} 540 650)`}><path d="M530 650 L540 365 L550 650Z" fill="#fff1fa"/><circle cx="540" cy="650" r="30" fill="#ff9ad1"/><circle cx="540" cy="650" r="9" fill="#42102f"/></g>
 <text x="540" y="810" textAnchor="middle" fill="#f7b4d8" fontFamily="Be Vietnam Pro" fontSize="35" fontWeight="700" letterSpacing="4">NHỊP SÁNG TẠO</text>
 <text x="540" y="1100" textAnchor="middle" fill="#c98daf" fontFamily="Be Vietnam Pro" fontSize="27">Đồ họa chuyển động minh họa</text>
 </>:scene===1?<>
 <path d="M170 950 L235 610 L335 260 L445 610 L510 950Z" fill="url(#ice-face)"/>
 <path d="M335 260 L445 610 L510 950 L340 1090 L310 610Z" fill="#b42d80" opacity=".75"/>
 <path d="M80 590 Q300 575 540 590 T1000 590" stroke="#ff99d1" strokeWidth="5" fill="none"/>
 <rect x="80" y="595" width="920" height="520" fill="#ae247b" fillOpacity=".12"/>
 {(demo?['Quay video','Thiết kế chữ','Dựng câu chuyện']:['Ý tưởng','Nội dung','Thể hiện']).map((s,i)=><g key={s} opacity={interpolate(seconds%6,[.5+i*.4,1+i*.4],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}><line x1={i===0?400:470} y1={410+i*250} x2="590" y2={410+i*250} stroke="#ed94c9" strokeWidth="2"/><circle cx="590" cy={410+i*250} r="6" fill="#ffc8e9"/><rect x="610" y={368+i*250} width="370" height="88" rx="20" fill="#fff1fa"/><rect x="627" y={386+i*250} width="52" height="52" rx="12" fill="#df398e"/><text x="653" y={423+i*250} textAnchor="middle" fill="white" fontSize="30" fontFamily="Be Vietnam Pro" fontWeight="700">{i+1}</text><text x="695" y={424+i*250} fill="#381229" fontSize="30" fontFamily="Be Vietnam Pro" fontWeight="700">{s}</text></g>)}
 </>:<SocialScenes scene={scene} t={seconds%6} items={sceneItems} demo={demo}/>}
 </g>
 {captionsLines.length>0&&<g><rect x="80" y="1650" width="920" height="210" rx="28" fill="#240b22" stroke="#b94d8d"/>{captionsLines.map((line,i)=><text key={i} x="540" y={1710+i*54} textAnchor="middle" fill={i===0?'#ffb0da':'#fff3fb'} fontSize="42" fontFamily="Be Vietnam Pro" fontWeight="700">{line}</text>)}</g>}
 </svg></AbsoluteFill>;
}
