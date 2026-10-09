import React from 'react';
import {interpolate} from 'remotion';

const reveal=(t:number,delay=0)=>interpolate(t,[delay,delay+.45],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
export const socialSceneNames=['Đồng hồ tăng trưởng','Tảng băng phân tầng','Hóa đơn chạy giấy','Điện thoại & timeline','Đồng hồ & checklist','Chữ nổi & lời kết'];
const demoItems=[['Ý tưởng','Câu chuyện','Thể hiện'],['Phần nhìn thấy','Chuẩn bị nội dung','Chăm chút từng chi tiết'],['Chọn câu mở đầu','Giữ một ý chính','Thêm hình minh họa','Nhấn từ quan trọng','Đặt nhịp chuyển cảnh','Kết bằng một câu hỏi'],['Cắt gọn','Thiết kế chữ','Thêm đồ họa','Xem lại'],['Nội dung rõ ràng','Bố cục dễ đọc','Nhịp dựng phù hợp','Giữ giọng nói riêng'],['Câu chuyện của bạn','XỨNG ĐÁNG ĐƯỢC KỂ']];
export function SocialScenes({scene,t,items,demo}:{scene:number;t:number;items:string[];demo:boolean}){
 const rows=(demo?demoItems[scene]:items).slice(0,6);
 const label=(s:string)=>s.length>30?s.slice(0,29)+'…':s;
 return <g fontFamily="Be Vietnam Pro" fontWeight="700">
 {scene===2&&<>
  <defs><clipPath id="receipt-window"><rect x="155" y="210" width="770" height="940"/></clipPath></defs>
  <g clipPath="url(#receipt-window)"><g transform={`translate(0 ${-900*(1-reveal(t,.15))})`}>
   <path d={'M170 190H910V1080'+Array.from({length:20},(_,i)=>`L${910-i*37-18.5} 1095L${910-(i+1)*37} 1080`).join('')+'Z'} fill="#fff5e6"/>
   <text x="540" y="315" textAnchor="middle" fill="#281d24" fontSize="62">GHI CHÚ NỘI DUNG</text>
   <text x="540" y="370" textAnchor="middle" fill="#87717b" fontSize="25" letterSpacing="6">TỪ Ý TƯỞNG ĐẾN VIDEO</text>
   <path d="M220 414H860" stroke="#ad969e" strokeDasharray="7 7" strokeWidth="3"/>
   {rows.map((s,i)=><g key={i} opacity={reveal(t,.6+i*.38)}><text x="220" y={495+i*86} fill="#987780" fontSize="29">{String(i+1).padStart(2,'0')}</text><text x="285" y={495+i*86} fill="#30212b" fontSize="30">{label(s)}</text><path d={`M220 ${518+i*86}H860`} stroke="#cdbdc0" strokeDasharray="3 6"/></g>)}
  </g></g>
  <rect x="135" y="20" width="810" height="210" rx="38" fill="#260b20" stroke="#bf548f" strokeWidth="3"/>
  <rect x="260" y="64" width="560" height="98" rx="49" fill="url(#social-metal)"/><circle cx="540" cy="113" r="19" fill="#321d2b"/>
  <rect x="165" y="194" width="750" height="19" rx="9" fill="#0d070e"/>
 </>}
 {scene===3&&<>
  <rect x="460" y="30" width="525" height="1050" rx="65" fill="#160b17" stroke="#dd68ac" strokeWidth="4"/>
  <rect x="620" y="55" width="200" height="28" rx="14" fill="#030205"/>
  <text x="500" y="140" fill="#fff0fa" fontSize="29">CÂU CHUYỆN CỦA BẠN</text>
  <rect x="505" y="185" width="430" height="500" rx="20" fill="url(#social-bg)"/>
  <circle cx="720" cy="375" r="96" fill="#f98ec9" fillOpacity=".16"/>
  <path d="M695 330L765 375L695 420Z" fill="#ffd4ec"/>
  <text x="720" y="565" fill="#ffd0ea" textAnchor="middle" fontSize="36">VIDEO + CHỮ</text>
  {Array.from({length:8},(_,i)=><rect key={i} x={510+i*53} y="748" width="46" height="75" rx="7" fill={i%2?'#892854':'#ce4b90'}/>)}
  {Array.from({length:49},(_,i)=><rect key={i} x={510+i*8.5} y={855-(10+Math.abs(Math.sin(i*1.71))*25)} width="4" height={20+Math.abs(Math.sin(i*1.71))*50} fill="#ff9dcd"/>)}
  <line x1={510+reveal(t,.4)*410} x2={510+reveal(t,.4)*410} y1="720" y2="915" stroke="#ff67b3" strokeWidth="6"/>
  <rect x="505" y="954" width="430" height="75" rx="20" fill="#f29d42"/><text x="720" y="1003" textAnchor="middle" fill="#30151b" fontSize="32">XEM THÀNH PHẨM</text>
  <text x="85" y="345" fill="#ff9ace" fontSize="28" letterSpacing="4">TỪNG BƯỚC</text>
  {rows.slice(0,4).map((s,i)=><g key={i} opacity={.3+.7*reveal(t,.7+i*.8)}><circle cx="112" cy={420+i*120} r="26" fill="#e84499"/><path d={`M100 ${420+i*120}l9 10 17-20`} fill="none" stroke="white" strokeWidth="4"/><text x="155" y={430+i*120} fill="#fff2fa" fontSize="27">{s.slice(0,15)}</text></g>)}
 </>}
 {scene===4&&<>
  <circle cx="540" cy="355" r="290" fill="#200b20" stroke="url(#social-metal)" strokeWidth="15"/>
  <circle cx="540" cy="355" r="185" fill="none" stroke="#f377ba" strokeWidth="10" strokeDasharray="5 10"/>
  {Array.from({length:60},(_,i)=><line key={i} x1="540" x2="540" y1="82" y2={i%5?94:112} stroke="#edc8dc" strokeWidth={i%5?2:4} transform={`rotate(${i*6} 540 355)`}/>)}
  <path d="M535 355L540 91L545 355Z" fill="#ff9ccc" transform={`rotate(${t*45} 540 355)`}/><circle cx="540" cy="355" r="12" fill="#fff"/>
  {rows.slice(0,4).map((s,i)=><g key={i} opacity={reveal(t,.4+i*.6)} transform={`translate(${30*(1-reveal(t,.4+i*.6))} 0)`}><rect x="105" y={700+i*102} width="870" height="80" rx="17" fill="#4d173a" stroke="#97446e"/><text x="145" y={751+i*102} fill="#ffedfa" fontSize="32">{label(s)}</text><circle cx="926" cy={740+i*102} r="23" fill="#e24b98"/><path d={`M914 ${740+i*102}l9 10 17-20`} stroke="white" strokeWidth="4" fill="none"/></g>)}
 </>}
 {scene===5&&<g opacity={reveal(t)} transform={`translate(540 440) scale(${interpolate(t,[0,.3,.65],[.75,1.04,1],{extrapolateRight:'clamp'})}) translate(-540 -440)`}>
  <circle cx="540" cy="370" r={220+Math.sin(t*2)*12} fill="none" stroke="#ff70b8" strokeOpacity=".35" strokeWidth="2"/>
  <circle cx="540" cy="370" r="170" fill="#c72d84" fillOpacity=".17"/>
  <path d="M435 300Q435 265 470 265H610Q645 265 645 300V385Q645 420 610 420H540L485 462V420H470Q435 420 435 385Z" fill="#ff97cf"/>
  <path d="M477 325H602M477 365H570" stroke="#62163e" strokeWidth="12" strokeLinecap="round"/>
  {rows.slice(0,3).map((s,i)=><text key={i} x="540" y={660+i*88} textAnchor="middle" fill={i===0?'#fff3fa':'url(#social-type)'} fontSize={Math.min(62,1300/Math.max(s.length,1))} style={{filter:'drop-shadow(0px 8px 0px #53122f)'}}>{s.toUpperCase()}</text>)}
 </g>}
 </g>;
}
