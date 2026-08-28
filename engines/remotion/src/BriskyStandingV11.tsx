import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  VIETNAMESE_FONT_FAMILY,
  useVietnameseFont,
  vietnameseFontFaceCss,
} from "./components/vietnameseFont";

export const BRISKY_STANDING_V11_FPS = 30000 / 1001;
const SOURCE = "staging/brisky-raw-ads/ad04.mp4";
const SPEED = 1.06;
const REFERENCE_FAST_SPEED = 1.14;
const NAVY = "#071426";
const GOLD = "#f5b942";
const CYAN = "#32d5f3";
const POSTER_SECONDS = 3.6;

type Piece = {start: number; end: number};
type EditorialSegment = {
  id: string;
  pieces: Piece[];
  zoomFrom: number;
  zoomTo: number;
};
type TimedSegment = EditorialSegment & {
  from: number;
  durationInFrames: number;
  timedPieces: Array<Piece & {from: number; durationInFrames: number}>;
};
type IconKind = "alert" | "book" | "search" | "route" | "video" | "gift" | "cursor" | "target";

const secToFrames = (seconds: number) => Math.max(1, Math.round(seconds * BRISKY_STANDING_V11_FPS));

// Word-guarded cuts: 80 ms before first phoneme and 120 ms after final phoneme.
// Countdown, resets, production direction and filler takes are intentionally absent.
const EDITORIAL_SEGMENTS: EditorialSegment[] = [
  {id: "hook", pieces: [{start: 49.18, end: 56.68}], zoomFrom: 1.005, zoomTo: 1.034},
  {id: "cause", pieces: [{start: 96.94, end: 102.76}], zoomFrom: 1.034, zoomTo: 1.012},
  {id: "vocabulary", pieces: [{start: 115.56, end: 119.82}], zoomFrom: 1.012, zoomTo: 1.04},
  {id: "reading", pieces: [{start: 153.93, end: 161.23}], zoomFrom: 1.04, zoomTo: 1.016},
  {id: "consequence", pieces: [{start: 230.12, end: 236.56}], zoomFrom: 1.016, zoomTo: 1.045},
  {id: "program", pieces: [{start: 387.19, end: 392.29}], zoomFrom: 1.045, zoomTo: 1.018},
  {id: "audience", pieces: [{start: 502.62, end: 514.22}], zoomFrom: 1.018, zoomTo: 1.044},
  {id: "content", pieces: [{start: 570.61, end: 580.01}], zoomFrom: 1.044, zoomTo: 1.016},
  {id: "cta", pieces: [{start: 761.77, end: 765.39}], zoomFrom: 1.016, zoomTo: 1.045},
];

const makeTimedSegments = (speed: number): TimedSegment[] => {
  let segmentFrom = 0;
  return EDITORIAL_SEGMENTS.map((segment) => {
    let pieceFrom = 0;
    const timedPieces = segment.pieces.map((piece) => {
      const durationInFrames = secToFrames((piece.end - piece.start) / speed);
      const timedPiece = {...piece, from: pieceFrom, durationInFrames};
      pieceFrom += durationInFrames;
      return timedPiece;
    });
    const durationInFrames = timedPieces.reduce((sum, piece) => sum + piece.durationInFrames, 0);
    const timed = {...segment, from: segmentFrom, durationInFrames, timedPieces};
    segmentFrom += durationInFrames;
    return timed;
  });
};

const TIMED_SEGMENTS = makeTimedSegments(SPEED);
const TIMED_SEGMENTS_V12 = makeTimedSegments(REFERENCE_FAST_SPEED);

const SPEECH_FRAMES = TIMED_SEGMENTS.reduce((sum, segment) => sum + segment.durationInFrames, 0);
export const BRISKY_STANDING_V11_DURATION = SPEECH_FRAMES + secToFrames(POSTER_SECONDS);
const SPEECH_FRAMES_V12 = TIMED_SEGMENTS_V12.reduce((sum, segment) => sum + segment.durationInFrames, 0);
export const BRISKY_STANDING_V12_DURATION = SPEECH_FRAMES_V12 + secToFrames(POSTER_SECONDS);

const Icon: React.FC<{kind: IconKind}> = ({kind}) => {
  const paths: Record<IconKind, React.ReactNode> = {
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4.5M12 17h.01"/></>,
    book: <><path d="M4 5.5c3.2-.8 5.5-.3 8 1.5v13c-2.5-1.8-4.8-2.3-8-1.5v-13Z"/><path d="M20 5.5c-3.2-.8-5.5-.3-8 1.5v13c2.5-1.8 4.8-2.3 8-1.5v-13Z"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/></>,
    route: <><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18c5 0 3-8 8-8h2"/></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></>,
    gift: <><path d="M4 10h16v11H4zM3 7h18v4H3zM12 7v14"/><path d="M12 7H8.5a2.5 2.5 0 1 1 2.2-3.7L12 7Zm0 0h3.5a2.5 2.5 0 1 0-2.2-3.7L12 7Z"/></>,
    cursor: <path d="m5 3 12 10-6 .8 3.5 6.2-2.8 1.5-3.4-6.2L5 20V3Z"/>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m15 9 6-6M17 3h4v4"/></>,
  };
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
};

const SpeakerSegment: React.FC<{segment: TimedSegment; speed?: number}> = ({segment, speed = SPEED}) => {
  const frame = useCurrentFrame();
  const baseScale = interpolate(frame, [0, Math.max(1, segment.durationInFrames - 1)], [segment.zoomFrom, segment.zoomTo], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const punch = interpolate(frame, [0, 4, 11], [.018, .007, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const scale = baseScale + punch;
  return (
    <AbsoluteFill style={{background: "#02070d", overflow: "hidden"}}>
      <div style={{position: "absolute", inset: -22, transform: `scale(${scale})`, transformOrigin: "50% 44%"}}>
        {segment.timedPieces.map((piece, index) => (
          <Sequence key={`${segment.id}-${index}`} from={piece.from} durationInFrames={piece.durationInFrames}>
            <OffthreadVideo src={staticFile(SOURCE)} startFrom={secToFrames(piece.start)} endAt={secToFrames(piece.end)} playbackRate={speed} muted style={{width: "100%", height: "100%", objectFit: "cover"}} />
            <Audio
              src={staticFile(SOURCE)}
              startFrom={secToFrames(piece.start)}
              endAt={secToFrames(piece.end)}
              playbackRate={speed}
              volume={(localFrame) => {
                const fadeIn = interpolate(localFrame, [0, 2], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                const fadeOut = interpolate(localFrame, [Math.max(0, piece.durationInFrames - 3), piece.durationInFrames - 1], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                return Math.min(fadeIn, fadeOut);
              }}
            />
          </Sequence>
        ))}
      </div>
      <AbsoluteFill style={{background: "linear-gradient(180deg,rgba(3,12,24,.05) 55%,rgba(3,12,24,.24) 100%)"}} />
    </AbsoluteFill>
  );
};

const HighlightedText: React.FC<{text: string; fontSize?: number}> = ({text, fontSize = 43}) => {
  const keywords = new Set(["sợ", "quên", "gốc", "hổng", "đọc", "hiểu", "mệt", "3", "buổi", "zoom", "đăng", "ký"]);
  return <div style={{fontSize, lineHeight: 1.13, fontWeight: 930, color: "white"}}>{text.split(/\s+/).map((word, index) => {
    const clean = word.toLocaleLowerCase("vi").replace(/[.,!?;:–—]/g, "");
    return <React.Fragment key={`${word}-${index}`}><span style={{color: keywords.has(clean) ? (index % 2 ? CYAN : GOLD) : "white"}}>{word}</span>{index < text.split(/\s+/).length - 1 ? " " : ""}</React.Fragment>;
  })}</div>;
};

type CaptionSpec = {from: number; duration: number; text: string};
const CAPTIONS: CaptionSpec[] = [
  {from: 0.45, duration: 2.1, text: "Con học nhiều năm nhưng vẫn sợ tiếng Anh"},
  {from: 4.15, duration: 2.2, text: "Học trước quên sau, điểm số chưa cao"},
  {from: 8.05, duration: 2.15, text: "Con chưa được tiếp cận đúng phương pháp"},
  {from: 13.05, duration: 2.15, text: "Hổng từ vựng: học hôm nay, ngày mai lại quên"},
  {from: 18.05, duration: 2.25, text: "Biết từng từ nhưng không hiểu cả đoạn"},
  {from: 25.0, duration: 2.15, text: "Càng học càng mệt, càng kiểm tra càng sợ"},
  {from: 28.0, duration: 2.0, text: "Càng lên lớp cao, con càng đuối"},
  {from: 31.0, duration: 2.2, text: "Bí mật lấy gốc tiếng Anh cho con"},
  {from: 36.2, duration: 2.25, text: "3 buổi Zoom dành cho cha mẹ có con lớp 3–9"},
  {from: 47.4, duration: 2.3, text: "Ba mẹ nhận biết chính xác con đang yếu phần nào"},
  {from: 55.1, duration: 2.25, text: "Nhấn đăng ký để tham gia chương trình"},
];

const REFERENCE_CAPTIONS: CaptionSpec[] = [
  {from: 0.35, duration: 1.55, text: "Học nhiều năm vẫn sợ tiếng Anh"},
  {from: 3.75, duration: 1.5, text: "Học trước quên sau, điểm chưa cao"},
  {from: 7.35, duration: 1.5, text: "Con chưa học đúng phương pháp"},
  {from: 11.8, duration: 1.55, text: "Hổng từ vựng: học rồi lại quên"},
  {from: 16.5, duration: 1.55, text: "Biết từ nhưng không hiểu cả đoạn"},
  {from: 22.75, duration: 1.5, text: "Càng kiểm tra, con càng sợ"},
  {from: 28.2, duration: 1.55, text: "Bí mật lấy gốc tiếng Anh siêu tốc"},
  {from: 33.45, duration: 1.55, text: "3 buổi Zoom hoàn toàn miễn phí"},
  {from: 39.1, duration: 1.5, text: "Dành cho cha mẹ có con lớp 3–9"},
  {from: 44.1, duration: 1.55, text: "Xác định đúng phần con đang hổng"},
  {from: 49.6, duration: 1.55, text: "Nhận lộ trình học lại phù hợp"},
];

const CaptionCard: React.FC<{text: string; durationInFrames: number; compact?: boolean}> = ({text, durationInFrames, compact = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 220, mass: .68}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 7), durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: compact ? 238 : 245, pointerEvents: "none"}}>
    <div style={{width: compact ? undefined : 870, maxWidth: compact ? 780 : undefined, boxSizing: "border-box", padding: compact ? "12px 24px 14px" : "18px 30px 20px", borderRadius: compact ? 17 : 23, background: compact ? "rgba(9,14,22,.88)" : "rgba(7,17,32,.91)", border: "1px solid rgba(255,255,255,.15)", boxShadow: compact ? "0 14px 38px rgba(0,0,0,.42)" : "0 22px 55px rgba(0,0,0,.43)", textAlign: "center", opacity: enter * exit, transform: `translateY(${(1-enter)*(compact ? 15 : 24)}px) scale(${(compact ? .965 : .95)+enter*(compact ? .035 : .05)})`}}>
      {compact ? <div style={{fontSize:10,letterSpacing:3.2,fontWeight:850,color:"rgba(225,235,244,.58)",marginBottom:5}}>BRISKY ACADEMY</div> : null}
      <HighlightedText text={text} fontSize={compact ? 38 : 43} />
      <div style={{width: compact ? 58 : 84, height: compact ? 3 : 4, borderRadius: 99, margin: compact ? "8px auto 0" : "11px auto 0", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
    </div>
  </AbsoluteFill>;
};

type BrollSpec = {from: number; duration: number; src: string; portrait: boolean; icon: IconKind; title: string};
const BROLLS: BrollSpec[] = [
  {from: 6.75, duration: 2.7, src: "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", portrait: true, icon: "alert", title: "CON ĐANG CẦN MỘT PHƯƠNG PHÁP ĐÚNG"},
  {from: 16.0, duration: 2.75, src: "staging/brisky-generated-v3/02-long-reading.png", portrait: true, icon: "search", title: "BIẾT TỪ NHƯNG CHƯA HIỂU ĐƯỢC CẢ ĐOẠN"},
  {from: 29.2, duration: 2.75, src: "staging/brisky-real/04-brisky-teachers.jpg", portrait: false, icon: "gift", title: "BÍ MẬT LẤY GỐC TIẾNG ANH CHO CON"},
];

const Broll: React.FC<{spec: BrollSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 190, mass: .72}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 6), durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const src = staticFile(spec.src);
  return <AbsoluteFill style={{background: NAVY, opacity: enter * exit, overflow: "hidden"}}>
    {spec.portrait ? <Img src={src} style={{width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.012 + frame * .0003})`}} /> : <>
      <Img src={src} style={{position: "absolute", inset: -80, width: 1240, height: 2080, objectFit: "cover", filter: "blur(32px) brightness(.3)", transform: "scale(1.08)"}} />
      <div style={{position: "absolute", left: 54, right: 54, top: 430, height: 610, borderRadius: 30, overflow: "hidden", border: `2px solid rgba(245,185,66,.55)`, background: "#030a12", boxShadow: "0 28px 75px rgba(0,0,0,.45)"}}><Img src={src} style={{width: "100%", height: "100%", objectFit: "contain"}} /></div>
    </>}
    <AbsoluteFill style={{background: "linear-gradient(180deg,rgba(3,12,28,.1) 45%,rgba(3,12,28,.82) 100%)"}} />
    <div style={{position: "absolute", left: 68, right: 68, top: 110, display: "flex", alignItems: "center", gap: 18, padding: "17px 23px", borderRadius: 23, background: "rgba(6,18,36,.88)", border: "1px solid rgba(255,255,255,.16)", transform: `translateY(${(1-enter)*-28}px)`}}>
      <div style={{width: 66, height: 66, flex: "0 0 66px", borderRadius: 19, display: "grid", placeItems: "center", color: NAVY, background: GOLD}}><Icon kind={spec.icon}/></div>
      <div style={{fontSize: 31, lineHeight: 1.08, fontWeight: 950, color: "white"}}>{spec.title}</div>
    </div>
  </AbsoluteFill>;
};

type InfographicSpec = {from: number; duration: number; eyebrow: string; title: string; items: Array<{icon: IconKind; text: string}>};
const INFOGRAPHICS: InfographicSpec[] = [
  {from: 23.15, duration: 2.8, eyebrow: "VÒNG LẶP CÀNG NGÀY CÀNG NẶNG", title: "Học thêm nhưng chưa đúng cách", items: [{icon: "book", text: "Càng học càng mệt"}, {icon: "alert", text: "Càng kiểm tra càng sợ"}, {icon: "search", text: "Càng lên cao càng đuối"}]},
  {from: 40.6, duration: 2.85, eyebrow: "3 BUỔI ZOOM DÀNH CHO BA MẸ", title: "Biết đúng phần con đang hổng", items: [{icon: "search", text: "Nhận diện điểm yếu"}, {icon: "book", text: "Hiểu đúng nguyên nhân"}, {icon: "route", text: "Chọn lộ trình phù hợp"}]},
];

const Infographic: React.FC<{spec: InfographicSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 200, mass: .75}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 7), durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{background: "radial-gradient(circle at 18% 10%,#133e59 0%,#091521 38%,#070b12 100%)", padding: "245px 70px 180px", boxSizing: "border-box", opacity: enter * exit}}>
    <div style={{textAlign: "center", transform: `translateY(${(1-enter)*34}px)`}}><div style={{fontSize: 20, letterSpacing: 5.3, color: GOLD, fontWeight: 900}}>{spec.eyebrow}</div><div style={{fontSize: 57, lineHeight: 1.06, color: "white", fontWeight: 950, marginTop: 20}}>{spec.title}</div><div style={{width: 92, height: 5, borderRadius: 99, margin: "24px auto 48px", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} /></div>
    <div style={{display: "flex", flexDirection: "column", gap: 22}}>{spec.items.map((item, index) => {const p = spring({frame: frame-index*6, fps, config: {damping: 18, stiffness: 205, mass: .7}}); return <div key={item.text} style={{height: 142, borderRadius: 28, padding: "0 28px", display: "flex", alignItems: "center", gap: 24, background: "rgba(255,255,255,.075)", border: "1px solid rgba(255,255,255,.16)", opacity: p, transform: `translateX(${(1-p)*70}px)`}}><div style={{width: 82, height: 82, flex: "0 0 82px", borderRadius: 23, display: "grid", placeItems: "center", color: NAVY, background: GOLD}}><Icon kind={item.icon}/></div><div style={{fontSize: 40, lineHeight: 1.08, color: "white", fontWeight: 930}}>{item.text}</div><div style={{marginLeft: "auto", color: "rgba(255,255,255,.34)", fontSize: 27, fontWeight: 900}}>0{index+1}</div></div>})}</div>
  </AbsoluteFill>;
};

type CalloutSpec = {from: number; duration: number; side: "left" | "right"; icon: IconKind; kicker: string; title: string};
const CALLOUTS: CalloutSpec[] = [
  {from: 2.55, duration: 1.55, side: "right", icon: "alert", kicker: "DẤU HIỆU", title: "HỌC TRƯỚC • QUÊN SAU"},
  {from: 10.3, duration: 1.55, side: "left", icon: "route", kicker: "NGUYÊN NHÂN", title: "CHƯA ĐÚNG PHƯƠNG PHÁP"},
  {from: 14.45, duration: 1.45, side: "right", icon: "book", kicker: "PHẦN HỔNG 01", title: "TỪ VỰNG"},
  {from: 20.65, duration: 1.5, side: "left", icon: "search", kicker: "PHẦN HỔNG 02", title: "ĐỌC HIỂU"},
  {from: 34.1, duration: 1.6, side: "right", icon: "gift", kicker: "CHƯƠNG TRÌNH", title: "BÍ MẬT LẤY GỐC"},
  {from: 44.2, duration: 1.6, side: "left", icon: "video", kicker: "DÀNH CHO CHA MẸ", title: "3 BUỔI ZOOM • LỚP 3–9"},
];

const Callout: React.FC<{spec: CalloutSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 17, stiffness: 220, mass: .68}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames-6), durationInFrames], [1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <div style={{position:"absolute",top:220,left:spec.side==="left"?34:undefined,right:spec.side==="right"?34:undefined,width:400,padding:"16px 18px",boxSizing:"border-box",borderRadius:23,background:"rgba(9,18,31,.91)",border:"1px solid rgba(255,255,255,.17)",boxShadow:"0 20px 48px rgba(0,0,0,.38)",display:"flex",alignItems:"center",gap:16,opacity:enter*exit,transform:`translateX(${(1-enter)*(spec.side==="left"?-55:55)}px) scale(${.92+enter*.08})`}}><div style={{width:70,height:70,flex:"0 0 70px",borderRadius:20,display:"grid",placeItems:"center",color:NAVY,background:GOLD}}><Icon kind={spec.icon}/></div><div><div style={{fontSize:13,letterSpacing:2.2,color:"rgba(235,240,246,.62)",fontWeight:850,marginBottom:5}}>{spec.kicker}</div><div style={{fontSize:27,lineHeight:1.08,color:"white",fontWeight:950}}>{spec.title}</div></div></div>;
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 15, stiffness: 220, mass: .7}});
  return <div style={{position:"absolute",left:42,right:42,top:54,display:"flex",justifyContent:"center",opacity:p,transform:`translateY(${(1-p)*-25}px) scale(${.93+p*.07})`}}><div style={{padding:"17px 28px",borderRadius:999,background:"rgba(4,22,47,.87)",border:`2px solid ${GOLD}`,boxShadow:"0 12px 35px rgba(0,0,0,.34)",fontSize:39,fontWeight:950,color:"white",textAlign:"center"}}>HỌC NHIỀU NĂM VẪN SỢ TIẾNG ANH?</div></div>;
};

const CutMask: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = interpolate(frame, [0, 4, Math.max(5, durationInFrames - 6), durationInFrames - 1], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const sweep = interpolate(frame, [0, durationInFrames], [-500, 1450], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{background:NAVY,opacity,overflow:"hidden"}}><div style={{position:"absolute",top:-250,bottom:-250,left:0,width:360,background:`linear-gradient(90deg,transparent,${GOLD},${CYAN},transparent)`,filter:"blur(5px)",transform:`translateX(${sweep}px) rotate(13deg)`}}/></AbsoluteFill>;
};

const CtaOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 16, stiffness: 210, mass: .7}});
  return <AbsoluteFill style={{justifyContent:"flex-end",alignItems:"center",paddingBottom:245,pointerEvents:"none"}}><div style={{display:"flex",alignItems:"center",gap:15,padding:"21px 32px",borderRadius:999,background:GOLD,color:NAVY,fontSize:37,fontWeight:950,boxShadow:"0 18px 55px rgba(245,185,66,.42)",transform:`scale(${.92+p*.08})`,opacity:p}}><Icon kind="cursor"/> NHẤN NÚT ĐĂNG KÝ BÊN DƯỚI</div></AbsoluteFill>;
};

const EndCard: React.FC = () => <AbsoluteFill style={{background:"#052044"}}><div style={{position:"absolute",inset:0,bottom:180,overflow:"hidden"}}><Img src={staticFile("staging/brisky-raw-ads/brisky-bimat-poster.png")} style={{width:"100%",height:"100%",objectFit:"contain"}}/></div><div style={{position:"absolute",left:0,right:0,bottom:0,height:180,background:NAVY,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}><div style={{color:GOLD,fontSize:42,fontWeight:950}}>3 BUỔI HOÀN TOÀN MIỄN PHÍ</div><div style={{color:"white",fontSize:27,fontWeight:800,marginTop:7}}>CHA MẸ CÓ CON LỚP 3–9 • NHẤN ĐĂNG KÝ NGAY</div></div></AbsoluteFill>;

const BriskyStandingVideo: React.FC<{referenceFastMode?: boolean}> = ({referenceFastMode = false}) => {
  useVietnameseFont();
  const frame = useCurrentFrame();
  const speed = referenceFastMode ? REFERENCE_FAST_SPEED : SPEED;
  const timedSegments = referenceFastMode ? TIMED_SEGMENTS_V12 : TIMED_SEGMENTS;
  const speechFrames = referenceFastMode ? SPEECH_FRAMES_V12 : SPEECH_FRAMES;
  const totalFrames = speechFrames + secToFrames(POSTER_SECONDS);
  const timeScale = referenceFastMode ? SPEED / REFERENCE_FAST_SPEED : 1;
  const captions = referenceFastMode ? REFERENCE_CAPTIONS : CAPTIONS;
  const musicVolume = (localFrame: number) => {
    const fadeIn = interpolate(localFrame,[0,secToFrames(.5)],[0,.11],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
    const endRise = interpolate(localFrame,[Math.max(0,speechFrames-secToFrames(.3)),speechFrames+secToFrames(.35)],[.11,.3],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
    const fadeOut = interpolate(localFrame,[totalFrames-secToFrames(1),totalFrames],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
    return Math.max(fadeIn,endRise)*fadeOut;
  };
  return <AbsoluteFill style={{background:NAVY,color:"white",fontFamily:`'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif`}}>
    <style>{vietnameseFontFaceCss}</style>
    {timedSegments.map((segment) => <Sequence key={segment.id} from={segment.from} durationInFrames={segment.durationInFrames}><SpeakerSegment segment={segment} speed={speed}/></Sequence>)}
    <div style={{position:"absolute",left:0,right:0,top:0,height:6,background:"rgba(255,255,255,.1)"}}><div style={{height:"100%",width:`${Math.min(100,(frame/Math.max(1,totalFrames-1))*100)}%`,background:`linear-gradient(90deg,${GOLD},${CYAN})`}}/></div>
    <Sequence from={0} durationInFrames={secToFrames(2.15)}><Hook/><Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={.2}/></Sequence>
    {BROLLS.map((spec,index)=><Sequence key={`broll-${index}`} from={secToFrames(spec.from*timeScale)} durationInFrames={secToFrames(spec.duration)}><Broll spec={spec}/><Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={.13}/></Sequence>)}
    {INFOGRAPHICS.map((spec,index)=><Sequence key={`info-${index}`} from={secToFrames(spec.from*timeScale)} durationInFrames={secToFrames(spec.duration)}><Infographic spec={spec}/><Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={.14}/></Sequence>)}
    {CALLOUTS.map((spec,index)=><Sequence key={`callout-${index}`} from={secToFrames(spec.from*timeScale)} durationInFrames={secToFrames(spec.duration)}><Callout spec={spec}/><Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={.1}/></Sequence>)}
    {[2,6,7,8].map((segmentIndex) => {
      const duration = 14;
      const from = Math.max(0, timedSegments[segmentIndex].from - 4);
      return <Sequence key={`cut-mask-${segmentIndex}`} from={from} durationInFrames={duration}><CutMask/><Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={.11}/></Sequence>;
    })}
    {captions.map((caption,index)=><Sequence key={`caption-${index}`} from={secToFrames(caption.from)} durationInFrames={secToFrames(caption.duration)}><CaptionCard text={caption.text} durationInFrames={secToFrames(caption.duration)} compact={referenceFastMode}/></Sequence>)}
    <Sequence from={timedSegments[8].from} durationInFrames={timedSegments[8].durationInFrames}><CtaOverlay/><Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={.14}/></Sequence>
    <Sequence from={speechFrames} durationInFrames={secToFrames(POSTER_SECONDS)}><EndCard/><Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={.24}/></Sequence>
    <Audio src={staticFile("staging/brisky-raw-ads/music.mp3")} volume={musicVolume} loop/>
  </AbsoluteFill>;
};

export const BriskyShortV11Video6: React.FC = () => <BriskyStandingVideo />;
export const BriskyShortV12Video6: React.FC = () => <BriskyStandingVideo referenceFastMode />;
