import React from "react";
import {AbsoluteFill, Audio, Img, Sequence, Video, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {VIETNAMESE_FONT_FAMILY, useVietnameseFont, vietnameseFontFaceCss} from "./components/vietnameseFont";

const FPS = 30;
const NAVY = "#090e16";
const GOLD = "#f4b942";
const CYAN = "#28d7f4";

type CaptionGroup = {start: number; duration: number; lines: string[]};
type Broll = {from: number; duration: number; src: string; label: string};
type ShortAd = {id: string; duration: number; hook: string; groups: CaptionGroup[]; broll: Broll[]};

const ads: ShortAd[] = [
  {id:"ad01", duration:53.82, hook:"HỌC NHIỀU\nVẪN MẤT GỐC?", groups:[
    {start:0,duration:12.96,lines:["Nếu con cứ nhắc tới","tiếng Anh là sợ","học trước quên sau","gặp bài kiểm tra","trên lớp lại rất nản","học thêm nhiều nơi","vẫn chưa cải thiện"]},
    {start:12.96,duration:20.36,lines:["Ba mẹ đừng vội nghĩ","con lười hay con kém","Rất nhiều bạn không phải","không có khả năng tiếng Anh","Vấn đề là con đã","bị hổng kiến thức","và mất gốc quá lâu","chưa được học lại","một cách đúng đắn"]},
    {start:33.32,duration:4.70,lines:["Thầy và đội ngũ","tổ chức chương trình","Bí mật lấy gốc tiếng Anh"]},
    {start:38.02,duration:15.80,lines:["Ba mẹ chỉ cần","nhấn vào link bên dưới","đội ngũ giáo viên hỗ trợ","sẽ liên hệ tới ba mẹ","Đừng để nỗi sợ","tiếp tục đeo bám con","thêm một năm nữa"]},
  ], broll:[
    {from:11.7,duration:2.8,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",label:"HỌC TRƯỚC • QUÊN SAU"},
    {from:31.9,duration:2.8,src:"staging/brisky-real/05-class-lesson.jpg",label:"HỌC LẠI ĐÚNG PHẦN BỊ HỔNG"},
  ]},
  {id:"ad02", duration:63.46, hook:"TỪ 3–4 ĐIỂM\nLÊN 8 ĐIỂM", groups:[
    {start:0,duration:38.61,lines:["Đây là câu chuyện","của một mẹ có con","đang học lớp 7","và bị mất gốc tiếng Anh","Sau học kỳ năm ngoái","điểm của con rất kém","mẹ vô cùng lo lắng","Nhưng khi kết thúc năm học","con đạt 8 điểm tiếng Anh","Với nhiều bạn, điểm 8","có thể chưa quá đặc biệt","Nhưng từ 3–4 điểm","vươn lên đạt 8 điểm","là cả một quá trình","và sự nỗ lực rất lớn"]},
    {start:38.61,duration:15.08,lines:["Sau nhiều năm giảng dạy","học sinh mất gốc","thầy đã đúc rút","một lộ trình học tập","và chia sẻ trong","3 buổi Zoom cho cha mẹ","có con lớp 3 đến lớp 9"]},
    {start:53.69,duration:9.77,lines:["Nếu ba mẹ quan tâm","hãy nhấn link bên dưới","để nhận hướng dẫn","tham gia chương trình"]},
  ], broll:[
    {from:17,duration:3,src:"staging/brisky-generated-v2/03-confident-student.png",label:"TỪ MẤT GỐC ĐẾN 8 ĐIỂM"},
    {from:37.2,duration:2.8,src:"staging/brisky-real/07-brisky-students.jpg",label:"TIẾN BỘ BẰNG LỘ TRÌNH PHÙ HỢP"},
  ]},
  {id:"ad03", duration:66.10, hook:"DẤU HIỆU CON\nĐANG HỔNG GỐC", groups:[
    {start:0,duration:11.38,lines:["Trước mỗi bài kiểm tra","ba mẹ luôn hồi hộp","không biết con có","làm được bài hay không","hay lại bị điểm kém?"]},
    {start:11.38,duration:6.74,lines:["Nhiều học sinh hiện nay","không mất gốc hoàn toàn","nhưng có những dấu hiệu","ba mẹ cần chú ý"]},
    {start:18.12,duration:22.68,lines:["Học từ vựng hôm nay","ngày mai đã quên","gặp bài đọc dài","con rất ngại đọc","làm bài kiểm tra","chỉ khoanh theo cảm tính","học thuộc ngữ pháp","nhưng không biết áp dụng","trên lớp tưởng hiểu bài","về nhà lại làm sai"]},
    {start:40.80,duration:15.30,lines:["Thầy tổ chức chương trình","Zoom trong 3 buổi","dành cho cha mẹ","có con lớp 3 đến lớp 9","đang gặp những vấn đề trên"]},
    {start:56.10,duration:10,lines:["Nếu ba mẹ quan tâm","hãy nhấn đường link","để nhận món quà","và lộ trình từ Brisky"]},
  ], broll:[
    {from:17,duration:2.8,src:"staging/brisky-generated-v3/02-long-reading.png",label:"NGẠI BÀI ĐỌC DÀI"},
    {from:31,duration:2.8,src:"staging/brisky-generated-v3/03-grammar-application.png",label:"THUỘC NHƯNG KHÓ ÁP DỤNG"},
  ]},
  {id:"ad04", duration:58.49, hook:"CON ĐANG HỔNG\nỞ PHẦN NÀO?", groups:[
    {start:0,duration:22.68,lines:["Có bạn hổng từ vựng","học hôm nay, mai lại quên","Có bạn hổng câu đơn","biết từ nhưng không biết","ghép các từ thành câu"]},
    {start:22.68,duration:18.68,lines:["Có bạn hổng ngữ pháp","học rồi nhưng không biết","làm sao để áp dụng","Có bạn hổng đọc hiểu","biết từng từ, từng câu","nhưng không hiểu cả đoạn"]},
    {start:41.36,duration:5,lines:["Thầy Quyền và đội ngũ","tổ chức chương trình","Bí mật lấy gốc tiếng Anh"]},
    {start:46.36,duration:5.22,lines:["Đây là 3 buổi Zoom","dành cho cha mẹ","có con lớp 3 đến lớp 9"]},
    {start:51.58,duration:6.91,lines:["Nhấn nút đăng ký","và để lại thông tin","để tham gia chương trình"]},
  ], broll:[
    {from:20.9,duration:2.8,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",label:"XÁC ĐỊNH ĐÚNG PHẦN BỊ HỔNG"},
    {from:39.8,duration:2.8,src:"staging/brisky-real/04-brisky-teachers.jpg",label:"ĐÚNG GIÁO VIÊN • ĐÚNG LỘ TRÌNH"},
  ]},
  {id:"ad05", duration:55.76, hook:"ĐỪNG VỘI\nGẮN NHÃN CON LƯỜI", groups:[
    {start:0,duration:7.72,lines:["Cứ nhắc tới tiếng Anh","là con rất sợ","Ba mẹ đừng vội nghĩ","rằng con đang lười"]},
    {start:7.72,duration:7.80,lines:["Con không học, không làm bài","hay điểm kiểm tra thấp","không đồng nghĩa","con là một đứa trẻ lười"]},
    {start:15.52,duration:9.75,lines:["Vấn đề thật sự là","con đã mất gốc","và đang mông lung","không có định hướng"]},
    {start:25.27,duration:10.08,lines:["Brisky tổ chức chương trình","Bí mật lấy gốc tiếng Anh","trong 3 buổi Zoom","cho cha mẹ có con lớp 3–9"]},
    {start:35.35,duration:9.22,lines:["Ba mẹ nhận được","lộ trình từ cơ bản","cho đến nâng cao","để biết con đang ở đâu"]},
    {start:44.57,duration:11.19,lines:["Nếu ba mẹ quan tâm","hãy nhấn nút đăng ký","đội ngũ Brisky sẽ","liên hệ và tư vấn kỹ hơn"]},
  ], broll:[
    {from:14,duration:2.8,src:"staging/brisky-generated-v2/01-teacher-guiding-student.png",label:"HIỂU CON • KHÔNG GẮN NHÃN"},
    {from:34,duration:2.8,src:"staging/brisky-generated-v3/04-level-assessment.png",label:"KIỂM TRA ĐÚNG • LỘ TRÌNH ĐÚNG"},
  ]},
];

type CaptionCue = {from:number; duration:number; text:string};
const makeCues = (ad:ShortAd):CaptionCue[] => ad.groups.flatMap((group) => {
  const unit = group.duration / group.lines.length;
  return group.lines.map((text,index) => ({from:Math.round((group.start + unit*index)*FPS), duration:Math.max(12,Math.round(unit*FPS)+2), text}));
});

const keywords = new Set(["sợ","mất","gốc","8","điểm","3–4","lười","hổng","từ","vựng","ngữ","pháp","đọc","hiểu","3","buổi","zoom","lộ","trình","đăng","ký","brisky"]);

const FastSubtitle:React.FC<{cue:CaptionCue}> = ({cue}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const enter=spring({frame,fps,config:{damping:18,stiffness:260,mass:.62}});
  const exit=interpolate(frame,[Math.max(0,cue.duration-5),cue.duration],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <AbsoluteFill style={{justifyContent:"flex-end",fontFamily:`'${VIETNAMESE_FONT_FAMILY}', sans-serif`}}>
    <div style={{height:180,background:NAVY,borderTop:"1px solid rgba(40,215,244,.34)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 34px",boxSizing:"border-box"}}>
      <div style={{opacity:enter*exit,transform:`translateY(${(1-enter)*10}px) scale(${.975+enter*.025})`,textAlign:"center"}}>
        <div style={{color:"rgba(226,237,245,.58)",fontSize:14,fontWeight:750,letterSpacing:4,marginBottom:6}}>THẦY QUYỀN CHIA SẺ</div>
        <div style={{fontSize:42,fontWeight:800,lineHeight:1.12,letterSpacing:"-.02em",color:"white"}}>{cue.text.split(/\s+/).map((word,i)=>{const clean=word.toLocaleLowerCase("vi").replace(/[.,!?;:]/g,"");const active=keywords.has(clean);return <React.Fragment key={`${word}-${i}`}><span style={{color:active?(i%2?CYAN:GOLD):"white"}}>{word}</span>{i<cue.text.split(/\s+/).length-1?" ":""}</React.Fragment>})}</div>
        <div style={{width:68,height:3,borderRadius:99,margin:"8px auto 0",background:`linear-gradient(90deg,${GOLD},${CYAN})`}}/>
      </div>
    </div>
  </AbsoluteFill>;
};

const BrollScene:React.FC<{item:Broll}> = ({item}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const p=spring({frame,fps,config:{damping:19,stiffness:210,mass:.7}});
  return <div style={{position:"absolute",left:0,right:0,top:0,height:1740,overflow:"hidden",background:"#062044",opacity:p}}>
    <Img src={staticFile(item.src)} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${1.045+frame*.00012})`}}/>
    <AbsoluteFill style={{background:"linear-gradient(180deg,rgba(0,20,45,.05) 48%,rgba(0,20,45,.86) 100%)"}}/>
    <div style={{position:"absolute",left:52,right:52,bottom:80,color:"white",fontFamily:`'${VIETNAMESE_FONT_FAMILY}',sans-serif`,fontSize:48,fontWeight:800,textAlign:"center",textShadow:"0 4px 16px #00152c"}}>{item.label}</div>
  </div>;
};

const ShortAdComposition:React.FC<{index:number}> = ({index}) => {
  useVietnameseFont();
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const ad=ads[index];
  const cues=makeCues(ad);
  const smoothScale=1.026+Math.sin(frame/82)*.012;
  const smoothX=Math.sin(frame/113)*7;
  const smoothY=Math.sin(frame/149)*4;
  const endFrom=Math.max(0,Math.round((ad.duration-4.2)*fps));
  return <AbsoluteFill style={{background:NAVY,color:"white",fontFamily:`'${VIETNAMESE_FONT_FAMILY}',sans-serif`,overflow:"hidden"}}>
    <style>{vietnameseFontFaceCss}</style>
    <div style={{position:"absolute",left:0,right:0,top:0,height:1740,overflow:"hidden"}}>
      <Video src={staticFile(`staging/brisky-raw-ads/short-v2/${ad.id}-short-v2.mp4`)} style={{width:"100%",height:"100%",objectFit:"cover",transform:`translate(${smoothX}px,${smoothY}px) scale(${smoothScale})`}}/>
      <div style={{position:"absolute",top:30,left:34,padding:"10px 16px",borderRadius:12,background:"rgba(9,14,22,.86)",color:GOLD,fontSize:22,fontWeight:800,letterSpacing:1}}>BRISKY ACADEMY</div>
      <div style={{position:"absolute",top:0,left:0,height:6,width:`${Math.min(100,frame/(ad.duration*fps)*100)}%`,background:`linear-gradient(90deg,${GOLD},${CYAN})`}}/>
      <Sequence from={0} durationInFrames={84}>
        <AbsoluteFill style={{alignItems:"center",justifyContent:"flex-start",paddingTop:150,background:"linear-gradient(180deg,rgba(1,18,40,.62),transparent 42%)"}}>
          <div style={{whiteSpace:"pre-line",fontSize:64,lineHeight:1.04,fontWeight:850,textAlign:"center",textShadow:"0 5px 18px rgba(0,0,0,.8)"}}>{ad.hook}</div>
          <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={.17}/>
        </AbsoluteFill>
      </Sequence>
      {ad.broll.map((item,i)=><Sequence key={i} from={Math.round(item.from*fps)} durationInFrames={Math.round(item.duration*fps)}><BrollScene item={item}/><Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={.14}/></Sequence>)}
    </div>
    <Audio src={staticFile("staging/brisky-raw-ads/music.mp3")} volume={.045} loop/>
    {cues.map((cue,index)=><Sequence key={`caption-${index}`} from={cue.from} durationInFrames={cue.duration}><FastSubtitle cue={cue}/></Sequence>)}
    <Sequence from={endFrom} durationInFrames={Math.round(4.2*fps)}>
      <div style={{position:"absolute",left:0,right:0,top:0,height:1740,background:"#062044",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Img src={staticFile("staging/brisky-raw-ads/brisky-bimat-poster.png")} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
      </div>
      <div style={{position:"absolute",left:0,right:0,bottom:0,height:180,background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",color:GOLD,fontSize:48,fontWeight:850}}>NHẤN ĐĂNG KÝ NGAY</div>
      <Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={.2}/>
    </Sequence>
  </AbsoluteFill>;
};

export const BRISKY_SHORT_V2_DURATIONS=ads.map((ad)=>Math.ceil(ad.duration*FPS));
export const BriskyShortV201=()=> <ShortAdComposition index={0}/>;
export const BriskyShortV202=()=> <ShortAdComposition index={1}/>;
export const BriskyShortV203=()=> <ShortAdComposition index={2}/>;
export const BriskyShortV204=()=> <ShortAdComposition index={3}/>;
export const BriskyShortV205=()=> <ShortAdComposition index={4}/>;
