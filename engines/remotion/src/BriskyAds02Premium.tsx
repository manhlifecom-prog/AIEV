import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BriskyCaptionCue, BriskyFullVideoProps } from "./BriskyFullVideo";
import {
  useVietnameseFont,
  VIETNAMESE_FONT_FAMILY,
  vietnameseFontFaceCss,
} from "./components/vietnameseFont";

const NAVY = "#061936";
const NAVY_2 = "#0A2448";
const GOLD = "#F0B63D";
const GOLD_SOFT = "#FFD978";
const IVORY = "#FFF9EA";
const MUTED = "#B7C4D8";

type IconKind = "alert" | "book" | "target" | "roadmap" | "gift" | "arrow" | "spark";

const Icon: React.FC<{ kind: IconKind; size?: number }> = ({ kind, size = 34 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "alert") return <svg {...common}><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4.5"/><path d="M12 17h.01"/></svg>;
  if (kind === "book") return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></svg>;
  if (kind === "target") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m15 9 5-5"/><path d="M17 4h3v3"/></svg>;
  if (kind === "roadmap") return <svg {...common}><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h3.5a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3H17"/><path d="m10 11 3 3 3-3"/></svg>;
  if (kind === "gift") return <svg {...common}><path d="M3 9h18v4H3z"/><path d="M5 13v8h14v-8"/><path d="M12 9v12"/><path d="M12 9H8.5A2.5 2.5 0 1 1 11 6.5V9Z"/><path d="M12 9h3.5A2.5 2.5 0 1 0 13 6.5V9Z"/></svg>;
  if (kind === "arrow") return <svg {...common}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
  return <svg {...common}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>;
};

const iconForText = (text: string): IconKind => {
  const value = text.toLocaleLowerCase("vi");
  if (/quên|sai|sợ|mất gốc|hổng|nản|chán|ngại/.test(value)) return "alert";
  if (/lộ trình|nền tảng|từng bước|cụ thể/.test(value)) return "roadmap";
  if (/điểm cao|tốt hơn|chủ động|tự giác|mục tiêu/.test(value)) return "target";
  if (/miễn phí|quà|tặng|ba buổi/.test(value)) return "gift";
  if (/đường link|quan tâm|truy cập|nhận được/.test(value)) return "arrow";
  if (/học|tiếng anh|từ vựng|ngữ pháp|bài đọc/.test(value)) return "book";
  return "spark";
};

const SideBackgrounds: React.FC = () => {
  const frame = useCurrentFrame();
  const shimmer = (frame * .72) % 950 - 220;
  return <>
    <div style={{ position: "absolute", inset: "0 auto 0 0", width: 158, background: `radial-gradient(circle at 25% 12%,#123865 0,${NAVY_2} 24%,${NAVY} 62%,#031126 100%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -94, top: 426, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(240,182,61,.18)" }} />
      <div style={{ position: "absolute", width: 260, height: 28, background: "linear-gradient(90deg,transparent,rgba(240,182,61,.11),transparent)", transform: `translateY(${shimmer}px) rotate(-18deg)` }} />
    </div>
    <div style={{ position: "absolute", inset: "0 0 0 auto", width: 158, background: `radial-gradient(circle at 78% 18%,#123865 0,${NAVY_2} 25%,${NAVY} 64%,#031126 100%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -92, top: 425, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(240,182,61,.18)" }} />
      <div style={{ position: "absolute", width: 260, height: 28, background: "linear-gradient(90deg,transparent,rgba(240,182,61,.11),transparent)", transform: `translateY(${950 - shimmer}px) rotate(18deg)` }} />
    </div>
    <div style={{ position: "absolute", left: 155, top: 0, width: 3, height: 720, background: `linear-gradient(${GOLD_SOFT},${GOLD},#8E6420)` }} />
    <div style={{ position: "absolute", right: 155, top: 0, width: 3, height: 720, background: `linear-gradient(${GOLD_SOFT},${GOLD},#8E6420)` }} />
  </>;
};

const LeftRail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, stiffness: 175, mass: .74 } });
  const pulse = 1 + Math.sin(frame / 16) * .025;
  return <div style={{ position: "absolute", left: 0, top: 0, width: 158, height: 720, color: IVORY, fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif` }}>
    <div style={{ position: "absolute", top: 45, left: 14, right: 14, textAlign: "center", opacity: enter, transform: `translateY(${(1-enter)*-20}px)` }}>
      <div style={{ color: GOLD, fontSize: 15, fontWeight: 900, letterSpacing: 2.5 }}>BÍ MẬT</div>
      <div style={{ marginTop: 9, fontSize: 23, fontWeight: 950, lineHeight: 1.02 }}>LẤY GỐC</div>
      <div style={{ marginTop: 7, fontSize: 18, fontWeight: 850, lineHeight: 1.05 }}>TIẾNG ANH</div>
    </div>
    <div style={{ position: "absolute", top: 168, left: 15, right: 15, height: 270, borderRadius: 25, border: "1px solid rgba(240,182,61,.48)", background: "linear-gradient(145deg,rgba(240,182,61,.12),rgba(255,255,255,.025))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08),0 20px 55px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: enter, transform: `scale(${(.9 + enter*.1)*pulse})` }}>
      <div style={{ width: 52, height: 52, borderRadius: 17, display: "grid", placeItems: "center", color: GOLD, border: "1px solid rgba(240,182,61,.52)", marginBottom: 7 }}><Icon kind="gift" size={28}/></div>
      <div style={{ color: GOLD_SOFT, fontSize: 72, fontWeight: 950, lineHeight: .95, letterSpacing: "-.06em" }}>3</div>
      <div style={{ marginTop: 7, color: IVORY, fontSize: 22, fontWeight: 950, letterSpacing: 1.5 }}>BUỔI</div>
      <div style={{ marginTop: 5, color: GOLD, fontSize: 20, fontWeight: 950, letterSpacing: .6 }}>MIỄN PHÍ</div>
    </div>
    <div style={{ position: "absolute", top: 483, left: 23, right: 18, display: "grid", gap: 18, color: IVORY, fontSize: 14, fontWeight: 850 }}>
      {["HIỂU GỐC", "NHỚ LÂU", "CHỦ ĐỘNG"].map((label, index) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: index === 1 ? GOLD_SOFT : GOLD, boxShadow: "0 0 12px rgba(240,182,61,.45)" }}/><span>{label}</span></div>)}
    </div>
    <div style={{ position: "absolute", bottom: 37, left: 20, right: 20, textAlign: "center", color: MUTED, fontSize: 9, fontWeight: 800, letterSpacing: 1.7 }}>TÀI LIỆU • HỌC THỬ</div>
  </div>;
};

type RailChapter = { from: number; duration: number; icon: IconKind; kicker: string; title: string; accent: string };
const railChapters: RailChapter[] = [
  { from: 0, duration: 1800, icon: "alert", kicker: "DẤU HIỆU", title: "CON ĐANG", accent: "MẤT GỐC" },
  { from: 1800, duration: 1140, icon: "book", kicker: "GIẢI PHÁP", title: "HỌC LẠI", accent: "TỪ GỐC" },
  { from: 2940, duration: 620, icon: "target", kicker: "CÁ NHÂN HÓA", title: "KIỂM TRA", accent: "LỘ TRÌNH" },
  { from: 3560, duration: 204, icon: "arrow", kicker: "BƯỚC TIẾP THEO", title: "TÌM HIỂU", accent: "NGAY" },
];

const RightChapter: React.FC<{ chapter: RailChapter }> = ({ chapter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, stiffness: 180, mass: .72 } });
  const exit = interpolate(frame, [chapter.duration - 10, chapter.duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alpha = enter * exit;
  return <div style={{ position: "absolute", right: 0, top: 74, width: 158, color: IVORY, textAlign: "center", opacity: alpha, transform: `translateX(${(1-enter)*28}px)`, fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif` }}>
    <div style={{ margin: "0 auto 23px", width: 58, height: 58, borderRadius: 18, display: "grid", placeItems: "center", color: GOLD, background: "linear-gradient(145deg,rgba(240,182,61,.16),rgba(255,255,255,.03))", border: "1px solid rgba(240,182,61,.48)", transform: `scale(${.82 + enter*.18}) rotate(${(1-enter)*-8}deg)` }}><Icon kind={chapter.icon} size={31}/></div>
    <div style={{ color: MUTED, fontSize: 11, fontWeight: 850, letterSpacing: 2.2 }}>{chapter.kicker}</div>
    <div style={{ marginTop: 20, fontSize: 19, fontWeight: 850, lineHeight: 1.08 }}>{chapter.title}</div>
    <div style={{ marginTop: 10, color: GOLD, fontSize: 25, fontWeight: 950, lineHeight: 1.04 }}>{chapter.accent}</div>
    <div style={{ margin: "28px auto 0", width: 72, height: 2, background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
  </div>;
};

const RightRail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, stiffness: 175, mass: .74 } });
  return <div style={{ position: "absolute", right: 0, top: 0, width: 158, height: 720, color: IVORY, textAlign: "center", fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif` }}>
    <div style={{ position: "absolute", top: 52, left: 13, right: 13, opacity: enter, transform: `translateY(${(1-enter)*-18}px)` }}>
      <div style={{ color: MUTED, fontSize: 11, fontWeight: 850, letterSpacing: 2.2 }}>DÀNH CHO</div>
      <div style={{ marginTop: 11, color: GOLD, fontSize: 25, fontWeight: 950 }}>CHA MẸ</div>
    </div>
    <div style={{ position: "absolute", top: 149, left: 15, right: 15, height: 146, borderRadius: 24, border: "1px solid rgba(240,182,61,.48)", background: "linear-gradient(145deg,rgba(255,255,255,.035),rgba(240,182,61,.1))", display: "grid", placeItems: "center", opacity: enter, transform: `scale(${.91 + enter*.09})` }}>
      <div><div style={{ color: MUTED, fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>CÓ CON</div><div style={{ color: GOLD_SOFT, fontSize: 31, fontWeight: 950, marginTop: 10 }}>LỚP 3–9</div></div>
    </div>
    <div style={{ position: "absolute", top: 342, left: 16, right: 16 }}>
      <div style={{ margin: "0 auto 17px", width: 54, height: 54, borderRadius: 18, display: "grid", placeItems: "center", color: GOLD, border: "1px solid rgba(240,182,61,.5)", background: "rgba(255,255,255,.025)", transform: `scale(${1+Math.sin(frame/17)*.025})` }}><Icon kind="alert" size={29}/></div>
      <div style={{ color: MUTED, fontSize: 10, fontWeight: 850, letterSpacing: 1.8 }}>ĐANG</div>
      <div style={{ color: GOLD, fontSize: 24, fontWeight: 950, marginTop: 9 }}>MẤT GỐC</div>
      <div style={{ color: IVORY, fontSize: 17, fontWeight: 900, marginTop: 8, lineHeight: 1.06 }}>TIẾNG ANH</div>
    </div>
    <div style={{ position: "absolute", left: 18, right: 18, bottom: 91, height: 1, background: "linear-gradient(90deg,transparent,rgba(240,182,61,.62),transparent)" }} />
    <div style={{ position: "absolute", left: 12, right: 12, bottom: 38 }}><div style={{ color: IVORY, fontSize: 19, fontWeight: 900, letterSpacing: 2.1 }}>BRISKY</div><div style={{ color: GOLD, fontSize: 9, fontWeight: 850, letterSpacing: 3.5, marginTop: 6 }}>ACADEMY</div></div>
  </div>;
};

const VideoStage: React.FC<{ source: string }> = ({ source }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 450, 900, 1200, 1800, 2500, 3200, 3764], [1.01, 1.035, 1.016, 1.04, 1.018, 1.042, 1.022, 1.045], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const driftX = Math.sin(frame / 92) * 2.4;
  const beatFrames = [450, 1200, 1800, 2500, 3200];
  const flash = Math.max(0, ...beatFrames.map((beat) => interpolate(Math.abs(frame-beat), [0, 3, 8], [.18, .08, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  return <div style={{ position: "absolute", left: 158, top: 0, width: 404, height: 720, overflow: "hidden", background: "#0A0E15" }}>
    <OffthreadVideo src={staticFile(source)} style={{ position: "absolute", width: 720, height: 720, left: -158, top: 0, objectFit: "fill", transform: `translateX(${driftX}px) scale(${zoom})`, transformOrigin: "50% 43%" }} />
    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 34px rgba(6,25,54,.18)" }} />
    <div style={{ position: "absolute", inset: 0, background: "white", opacity: flash }} />
  </div>;
};

type Broll = { from: number; duration: number; src: string };
const brolls: Broll[] = [
  { from: 150, duration: 135, src: "staging/brisky-premium/broll-01-child-struggling.png" },
  { from: 2535, duration: 135, src: "staging/brisky-premium/broll-02-parent-learning.png" },
  { from: 3270, duration: 135, src: "staging/brisky-premium/broll-03-assessment-roadmap.png" },
];

const BrollShot: React.FC<{ item: Broll }> = ({ item }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [item.duration-10, item.duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, item.duration], [1.055, 1.12], { extrapolateRight: "clamp" });
  const wipe = interpolate(frame, [0, 14], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: 158, top: 0, width: 404, height: 720, overflow: "hidden", opacity: enter*exit, clipPath: `inset(0 ${wipe}% 0 0 round 0px)` }}>
    <Img src={staticFile(item.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateY(${interpolate(frame,[0,item.duration],[4,-5])}px)` }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 64%,rgba(6,25,54,.38))" }} />
  </div>;
};

const SubtitleDock: React.FC<{ cue: BriskyCaptionCue }> = ({ cue }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalFrame = cue.from + localFrame;
  const enter = spring({ frame: localFrame, fps, config: { damping: 19, stiffness: 235, mass: .66 } });
  const exit = interpolate(localFrame, [Math.max(1, cue.durationInFrames-7), cue.durationInFrames], [1,0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const text = cue.words.map((word) => word.text).join(" ");
  const kind = iconForText(text);
  const overBroll = brolls.some((item) => globalFrame >= item.from && globalFrame < item.from + item.duration);
  if (!overBroll) return <div style={{ position: "absolute", left: 170, bottom: 25, width: 50, height: 50, borderRadius: 16, display: "grid", placeItems: "center", color: NAVY, background: `linear-gradient(145deg,${GOLD_SOFT},${GOLD})`, boxShadow: "0 12px 34px rgba(0,0,0,.28)", opacity: enter*exit, transform: `scale(${.72 + enter*.28}) rotate(${(1-enter)*-8}deg)` }}><Icon kind={kind} size={27}/></div>;
  return <div style={{ position: "absolute", left: 171, bottom: 18, width: 378, minHeight: 88, display: "flex", alignItems: "center", padding: "14px 17px", gap: 13, borderRadius: 22, background: "rgba(6,25,54,.94)", boxShadow: "0 14px 36px rgba(0,0,0,.34),inset 0 0 0 1px rgba(240,182,61,.35)", color: IVORY, opacity: enter*exit, transform: `translateY(${(1-enter)*12}px)`, fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif` }}>
    <div style={{ flex: "0 0 auto", width: 43, height: 43, borderRadius: 14, display: "grid", placeItems: "center", color: NAVY, background: `linear-gradient(145deg,${GOLD_SOFT},${GOLD})` }}><Icon kind={kind} size={24}/></div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 850, lineHeight: 1.15, letterSpacing: "-.02em" }}>
        {cue.words.map((word, index) => {
          const active = globalFrame >= word.start && globalFrame <= word.end;
          const spoken = globalFrame > word.end;
          return <React.Fragment key={`${word.start}-${index}`}><span style={{ color: active ? GOLD_SOFT : spoken ? IVORY : "rgba(255,249,234,.64)", textShadow: active ? "0 0 16px rgba(240,182,61,.38)" : undefined, transform: active ? "scale(1.035)" : undefined, display: "inline-block" }}>{word.text}</span>{index < cue.words.length-1 ? " " : ""}</React.Fragment>;
        })}
      </div>
    </div>
  </div>;
};

export const BriskyAds02Premium: React.FC<BriskyFullVideoProps> = ({ source, captions }) => {
  useVietnameseFont();
  return <AbsoluteFill style={{ background: NAVY, fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif` }}>
    <style>{vietnameseFontFaceCss}</style>
    <VideoStage source={source}/>
    {brolls.map((item) => <Sequence key={item.from} from={item.from} durationInFrames={item.duration}><BrollShot item={item}/></Sequence>)}
    <SideBackgrounds/>
    <LeftRail/>
    <RightRail/>
    {captions.map((cue, index) => <Sequence key={`sub-${index}`} from={cue.from} durationInFrames={cue.durationInFrames}><SubtitleDock cue={cue}/></Sequence>)}
  </AbsoluteFill>;
};
