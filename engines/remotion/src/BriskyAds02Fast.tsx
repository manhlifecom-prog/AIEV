import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BriskyFullVideoProps } from "./BriskyFullVideo";
import {
  useVietnameseFont,
  VIETNAMESE_FONT_FAMILY,
  vietnameseFontFaceCss,
} from "./components/vietnameseFont";

const FPS = 30;
const SPEED = 1;
const NAVY = "#061936";
const NAVY_LIGHT = "#12345F";
const GOLD = "#F2B83F";
const GOLD_LIGHT = "#FFDA79";
const IVORY = "#FFF9EB";
const MUTED = "#B7C6DD";

type IconKind = "alert" | "book" | "gift" | "roadmap" | "target" | "arrow" | "spark";
type Cut = { start: number; end: number; zoomFrom: number; zoomTo: number; panFrom: number; panTo: number };

const cuts: Cut[] = [
  { start: 0, end: 15.02, zoomFrom: 1.00, zoomTo: 1.055, panFrom: 0, panTo: -3 },
  { start: 60.30, end: 73.55, zoomFrom: 1.015, zoomTo: 1.055, panFrom: 3, panTo: -2 },
  { start: 82.86, end: 97.70, zoomFrom: 1.055, zoomTo: 1.01, panFrom: -2, panTo: 3 },
  { start: 106.20, end: 125.30, zoomFrom: 1.01, zoomTo: 1.02, panFrom: 2, panTo: 1 },
];

const cutDuration = (cut: Cut) => Math.round(((cut.end - cut.start) * FPS) / SPEED);
export const BRISKY_ADS_02_FAST_DURATION = cuts.reduce((sum, cut) => sum + cutDuration(cut), 0);

const Icon: React.FC<{ kind: IconKind; size?: number }> = ({ kind, size = 28 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "alert") return <svg {...common}><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4.5"/><path d="M12 17h.01"/></svg>;
  if (kind === "book") return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></svg>;
  if (kind === "gift") return <svg {...common}><path d="M3 9h18v4H3z"/><path d="M5 13v8h14v-8"/><path d="M12 9v12"/><path d="M12 9H8.5A2.5 2.5 0 1 1 11 6.5V9Z"/><path d="M12 9h3.5A2.5 2.5 0 1 0 13 6.5V9Z"/></svg>;
  if (kind === "roadmap") return <svg {...common}><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h3.5a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3H17"/><path d="m10 11 3 3 3-3"/></svg>;
  if (kind === "target") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m15 9 5-5"/><path d="M17 4h3v3"/></svg>;
  if (kind === "arrow") return <svg {...common}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
  return <svg {...common}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>;
};

const outputCutStarts = cuts.reduce<number[]>((all, cut, index) => {
  all.push(index === 0 ? 0 : all[index - 1] + cutDuration(cuts[index - 1]));
  return all;
}, []);

const FastClip: React.FC<{ source: string; cut: Cut; duration: number }> = ({ source, cut, duration }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [cut.zoomFrom, cut.zoomTo], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" });
  const pan = interpolate(frame, [0, duration], [cut.panFrom, cut.panTo], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ overflow: "hidden", background: "#050A11" }}>
    <OffthreadVideo src={staticFile(source)} startFrom={Math.round(cut.start * FPS)} playbackRate={SPEED} style={{ width: "100%", height: "100%", objectFit: "fill", transform: `translateX(${pan}px) scale(${zoom})`, transformOrigin: "50% 42%" }} />
    <AbsoluteFill style={{ boxShadow: "inset 0 0 34px rgba(6,25,54,.2)" }} />
  </AbsoluteFill>;
};

const VideoTimeline: React.FC<{ source: string }> = ({ source }) => <AbsoluteFill>
  {cuts.map((cut, index) => <Sequence key={cut.start} from={outputCutStarts[index]} durationInFrames={cutDuration(cut)}><FastClip source={source} cut={cut} duration={cutDuration(cut)}/></Sequence>)}
</AbsoluteFill>;

type Broll = { from: number; duration: number; src: string; direction: "in" | "out"; transition: "left" | "right" | "circle"; icon: IconKind; kicker: string; accent: string };
const brolls: Broll[] = [
  { from: 35, duration: 110, src: "staging/brisky-generated-v3/01-vocabulary-forgotten.png", direction: "in", transition: "left", icon: "alert", kicker: "HỌC TỪ VỰNG HÔM NAY", accent: "MAI LẠI QUÊN" },
  { from: 170, duration: 112, src: "staging/brisky-generated-v3/02-long-reading.png", direction: "out", transition: "right", icon: "book", kicker: "GẶP BÀI ĐỌC DÀI", accent: "CON NGẠI LÀM" },
  { from: 330, duration: 121, src: "staging/brisky-generated-v3/03-grammar-application.png", direction: "out", transition: "circle", icon: "alert", kicker: "HỌC THUỘC NGỮ PHÁP", accent: "KHÓ ÁP DỤNG" },
  { from: 446, duration: 125, src: "staging/brisky-generated-v2/01-teacher-guiding-student.png", direction: "in", transition: "right", icon: "book", kicker: "NHIỀU NĂM TRỰC TIẾP", accent: "DẠY HỌC SINH MẤT GỐC" },
  { from: 585, duration: 125, src: "staging/brisky-real/05-class-lesson.jpg", direction: "out", transition: "left", icon: "roadmap", kicker: "TỪ KINH NGHIỆM GIẢNG DẠY", accent: "XÂY CHƯƠNG TRÌNH 3 BUỔI" },
  { from: 760, duration: 120, src: "staging/brisky-generated-v2/02-trial-english-class.png", direction: "out", transition: "circle", icon: "gift", kicker: "DÀNH CHO CON LỚP 3–9", accent: "3 BUỔI MIỄN PHÍ" },
  { from: 925, duration: 125, src: "staging/brisky-generated-v2/01-teacher-guiding-student.png", direction: "in", transition: "right", icon: "roadmap", kicker: "MỘT LỘ TRÌNH RÕ RÀNG", accent: "HỌC LẠI TỪ GỐC" },
  { from: 1090, duration: 115, src: "staging/brisky-generated-v2/03-confident-student.png", direction: "out", transition: "left", icon: "target", kicker: "KHƠI DẬY ĐỘNG LỰC", accent: "TỰ GIÁC • CHỦ ĐỘNG" },
  { from: 1240, duration: 60, src: "staging/brisky-generated-v2/02-trial-english-class.png", direction: "out", transition: "right", icon: "spark", kicker: "MỤC TIÊU CUỐI CÙNG", accent: "YÊU TIẾNG ANH HƠN" },
  { from: 1288, duration: 210, src: "staging/brisky-generated-v3/04-level-assessment.png", direction: "in", transition: "circle", icon: "target", kicker: "QUÀ TẶNG CHO CON", accent: "KIỂM TRA MIỄN PHÍ" },
  { from: 1530, duration: 145, src: "staging/brisky-generated-v2/01-teacher-guiding-student.png", direction: "out", transition: "left", icon: "roadmap", kicker: "SAU BUỔI KIỂM TRA", accent: "LỘ TRÌNH RIÊNG CHO CON" },
  { from: 1670, duration: 130, src: "staging/brisky-generated-v2/03-confident-student.png", direction: "in", transition: "right", icon: "arrow", kicker: "BA MẸ QUAN TÂM?", accent: "NHẬN QUÀ TỪ BRISKY" },
];

const BrollShot: React.FC<{ item: Broll }> = ({ item }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [item.duration - 8, item.duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fromScale = item.direction === "in" ? 1.02 : 1.13;
  const toScale = item.direction === "in" ? 1.13 : 1.02;
  const scale = interpolate(frame, [0, item.duration], [fromScale, toScale], { easing: Easing.inOut(Easing.quad), extrapolateRight: "clamp" });
  const reveal = interpolate(frame, [0, 11], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clipPath = item.transition === "left" ? `inset(0 ${reveal}% 0 0)` : item.transition === "right" ? `inset(0 0 0 ${reveal}%)` : `circle(${100 - reveal}% at 50% 50%)`;
  const shine = interpolate(frame, [8, 34], [-90, 430], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: 158, top: 0, width: 404, height: 720, overflow: "hidden", opacity: enter * exit, clipPath }}>
    <Img src={staticFile(item.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translate(${Math.sin(frame/22)*2}px,${interpolate(frame,[0,item.duration],[5,-5])}px)` }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,25,54,.04) 48%,rgba(6,25,54,.34) 100%)" }} />
    <div style={{ position: "absolute", left: 15, right: 15, bottom: 18, minHeight: 82, padding: "11px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 12, overflow: "hidden", color: IVORY, background: "linear-gradient(135deg,rgba(6,25,54,.97),rgba(16,48,88,.94))", border: "1px solid rgba(242,184,63,.56)", boxShadow: "0 14px 34px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08)", transform: `translateY(${(1-enter)*15}px)`, fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif` }}>
      <div style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: 15, display: "grid", placeItems: "center", color: NAVY, background: `linear-gradient(145deg,${GOLD_LIGHT},${GOLD})`, boxShadow: "0 7px 18px rgba(242,184,63,.22)" }}><Icon kind={item.icon} size={23}/></div>
      <div style={{ minWidth: 0 }}><div style={{ color: MUTED, fontSize: 10, fontWeight: 850, letterSpacing: 1.35, lineHeight: 1.15 }}>{item.kicker}</div><div style={{ color: GOLD_LIGHT, fontSize: item.accent.length > 22 ? 16 : 19, fontWeight: 950, lineHeight: 1.1, marginTop: 5, letterSpacing: "-.01em" }}>{item.accent}</div></div>
      <div style={{ position: "absolute", top: -30, bottom: -30, left: 0, width: 64, transform: `translateX(${shine}px) rotate(15deg)`, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)" }}/>
    </div>
  </div>;
};

const RailShell: React.FC = () => {
  const frame = useCurrentFrame();
  const sweep = (frame * 1.35) % 860 - 160;
  return <>
    <div style={{ position: "absolute", left: 0, top: 0, width: 158, height: 720, overflow: "hidden", background: `radial-gradient(circle at 28% 9%,${NAVY_LIGHT},${NAVY} 49%,#031126)` }}><div style={{ position: "absolute", left: -80, top: sweep, width: 260, height: 24, transform: "rotate(-18deg)", background: "linear-gradient(90deg,transparent,rgba(242,184,63,.14),transparent)" }}/></div>
    <div style={{ position: "absolute", right: 0, top: 0, width: 158, height: 720, overflow: "hidden", background: `radial-gradient(circle at 72% 11%,${NAVY_LIGHT},${NAVY} 52%,#031126)` }}><div style={{ position: "absolute", right: -80, top: 700-sweep, width: 260, height: 24, transform: "rotate(18deg)", background: "linear-gradient(90deg,transparent,rgba(242,184,63,.14),transparent)" }}/></div>
    <div style={{ position: "absolute", left: 155, top: 0, width: 3, height: 720, background: `linear-gradient(${GOLD_LIGHT},${GOLD},#8C641F)` }}/>
    <div style={{ position: "absolute", right: 155, top: 0, width: 3, height: 720, background: `linear-gradient(${GOLD_LIGHT},${GOLD},#8C641F)` }}/>
  </>;
};

const LeftOfferRail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 16, stiffness: 185, mass: .72 } });
  const pulse = 1 + Math.sin(frame / 12) * .025;
  return <div style={{ position: "absolute", left: 0, top: 0, width: 158, height: 720, textAlign: "center", color: IVORY, fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif` }}>
    <div style={{ position: "absolute", top: 43, left: 10, right: 10, opacity: p, transform: `translateY(${(1-p)*-18}px)` }}><div style={{ color: GOLD, fontSize: 14, fontWeight: 900, letterSpacing: 2.2 }}>BÍ MẬT</div><div style={{ fontSize: 22, fontWeight: 950, marginTop: 7 }}>LẤY GỐC</div><div style={{ fontSize: 17, fontWeight: 850, marginTop: 6 }}>TIẾNG ANH</div></div>
    <div style={{ position: "absolute", top: 165, left: 15, right: 15, height: 278, borderRadius: 27, border: "1px solid rgba(242,184,63,.55)", background: "linear-gradient(145deg,rgba(242,184,63,.15),rgba(255,255,255,.025))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${(.9+p*.1)*pulse})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.08),0 20px 55px rgba(0,0,0,.2)" }}>
      <div style={{ width: 49, height: 49, borderRadius: 16, display: "grid", placeItems: "center", color: GOLD, border: "1px solid rgba(242,184,63,.55)" }}><Icon kind="gift" size={27}/></div>
      <div style={{ color: GOLD_LIGHT, fontSize: 76, fontWeight: 950, lineHeight: .9, marginTop: 10 }}>3</div><div style={{ fontSize: 22, fontWeight: 950, marginTop: 9 }}>BUỔI</div><div style={{ color: GOLD, fontSize: 20, fontWeight: 950, marginTop: 5 }}>MIỄN PHÍ</div>
    </div>
    <div style={{ position: "absolute", top: 488, left: 20, right: 16, display: "grid", gap: 17, textAlign: "left", fontSize: 13, fontWeight: 850 }}>
      {["HIỂU GỐC", "NHỚ LÂU", "CHỦ ĐỘNG"].map((label) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: GOLD, boxShadow: "0 0 12px rgba(242,184,63,.5)" }}/>{label}</div>)}
    </div>
    <div style={{ position: "absolute", left: 17, right: 17, bottom: 36, color: MUTED, fontSize: 9, fontWeight: 800, letterSpacing: 1.7 }}>TÀI LIỆU • HỌC THỬ</div>
  </div>;
};

type RailChapter = { from: number; duration: number; icon: IconKind; kicker: string; title: string; accent: string };
const railChapters: RailChapter[] = [
  { from: 0, duration: 451, icon: "alert", kicker: "DẤU HIỆU", title: "CON ĐANG", accent: "MẤT GỐC" },
  { from: 451, duration: 398, icon: "gift", kicker: "CHƯƠNG TRÌNH", title: "3 BUỔI", accent: "MIỄN PHÍ" },
  { from: 849, duration: 445, icon: "roadmap", kicker: "PHƯƠNG PHÁP", title: "HỌC LẠI", accent: "TỪ GỐC" },
  { from: 1294, duration: 379, icon: "target", kicker: "QUÀ TẶNG", title: "KIỂM TRA", accent: "MIỄN PHÍ" },
  { from: 1673, duration: BRISKY_ADS_02_FAST_DURATION - 1673, icon: "arrow", kicker: "BƯỚC TIẾP", title: "TÌM HIỂU", accent: "BRISKY" },
];

const RailChapterCard: React.FC<{ item: RailChapter }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 200, mass: .68 } });
  const exit = interpolate(frame, [item.duration-8,item.duration], [1,0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", right: 0, top: 76, width: 158, textAlign: "center", color: IVORY, opacity: enter*exit, transform: `translateX(${(1-enter)*28}px)`, fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif` }}>
    <div style={{ margin: "0 auto 20px", width: 58, height: 58, borderRadius: 19, display: "grid", placeItems: "center", color: GOLD, border: "1px solid rgba(242,184,63,.5)", background: "rgba(255,255,255,.025)", transform: `scale(${.78+enter*.22}) rotate(${(1-enter)*-9}deg)` }}><Icon kind={item.icon} size={31}/></div>
    <div style={{ color: MUTED, fontSize: 10, fontWeight: 850, letterSpacing: 1.9 }}>{item.kicker}</div><div style={{ fontSize: 18, fontWeight: 900, marginTop: 16 }}>{item.title}</div><div style={{ color: GOLD, fontSize: 25, fontWeight: 950, marginTop: 8, lineHeight: 1.02 }}>{item.accent}</div>
    <div style={{ width: 72, height: 2, margin: "26px auto", background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }}/>
    <div style={{ color: MUTED, fontSize: 11, fontWeight: 800, lineHeight: 1.55 }}>DÀNH CHO<br/><span style={{ color: IVORY, fontSize: 16 }}>LỚP 3–9</span></div>
  </div>;
};

const RightDynamicRail: React.FC = () => <div style={{ position: "absolute", right: 0, top: 0, width: 158, height: 720 }}>
  {railChapters.map((item) => <Sequence key={item.from} from={item.from} durationInFrames={item.duration}><RailChapterCard item={item}/></Sequence>)}
  <div style={{ position: "absolute", left: 16, right: 16, bottom: 92, height: 1, background: "linear-gradient(90deg,transparent,rgba(242,184,63,.65),transparent)" }}/><div style={{ position: "absolute", left: 10, right: 10, bottom: 37, textAlign: "center", fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif` }}><div style={{ color: IVORY, fontSize: 19, fontWeight: 900, letterSpacing: 2 }}>BRISKY</div><div style={{ color: GOLD, fontSize: 9, fontWeight: 850, letterSpacing: 3.5, marginTop: 6 }}>ACADEMY</div></div>
</div>;

type Callout = { from: number; duration: number; icon: IconKind; title: string; accent: string };
const callouts: Callout[] = [
  { from: 9, duration: 68, icon: "alert", title: "HỌC TRƯỚC", accent: "QUÊN SAU?" },
  { from: 475, duration: 75, icon: "gift", title: "3 BUỔI", accent: "MIỄN PHÍ" },
  { from: 875, duration: 72, icon: "roadmap", title: "HỌC LẠI", accent: "TỪ GỐC" },
  { from: 1325, duration: 76, icon: "target", title: "KIỂM TRA", accent: "MIỄN PHÍ" },
  { from: 1730, duration: 88, icon: "arrow", title: "TÌM HIỂU", accent: "BRISKY ACADEMY" },
];

const KineticCallout: React.FC<{ item: Callout }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 15, stiffness: 220, mass: .64 } });
  const exit = interpolate(frame, [item.duration-8,item.duration], [1,0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [7,24], [-250,480], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: 174, top: 25, width: 372, minHeight: 88, display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderRadius: 23, overflow: "hidden", background: "rgba(6,25,54,.92)", border: "1px solid rgba(242,184,63,.5)", boxShadow: "0 14px 38px rgba(0,0,0,.34)", opacity: p*exit, transform: `translateY(${(1-p)*-28}px) scale(${.9+p*.1})`, color: IVORY, fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif` }}>
    <div style={{ width: 47, height: 47, flex: "0 0 auto", borderRadius: 15, display: "grid", placeItems: "center", color: NAVY, background: `linear-gradient(145deg,${GOLD_LIGHT},${GOLD})`, transform: `rotate(${(1-p)*-12}deg)` }}><Icon kind={item.icon} size={26}/></div>
    <div><div style={{ color: MUTED, fontSize: 13, fontWeight: 850, letterSpacing: 1.5 }}>{item.title}</div><div style={{ color: GOLD_LIGHT, fontSize: item.accent.length > 12 ? 22 : 28, fontWeight: 950, marginTop: 2 }}>{item.accent}</div></div>
    <div style={{ position: "absolute", top: -40, bottom: -40, left: 0, width: 70, transform: `translateX(${sweep}px) rotate(14deg)`, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)" }}/>
  </div>;
};

export const BriskyAds02Fast: React.FC<BriskyFullVideoProps> = ({ source }) => {
  useVietnameseFont();
  return <AbsoluteFill style={{ background: NAVY, fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Arial,sans-serif` }}>
    <style>{vietnameseFontFaceCss}</style>
    <VideoTimeline source={source}/>
    {brolls.map((item) => <Sequence key={`${item.from}-${item.src}`} from={item.from} durationInFrames={item.duration}><BrollShot item={item}/></Sequence>)}
    <RailShell/><LeftOfferRail/><RightDynamicRail/>
    {callouts.map((item) => <Sequence key={item.from} from={item.from} durationInFrames={item.duration}><KineticCallout item={item}/></Sequence>)}
  </AbsoluteFill>;
};
