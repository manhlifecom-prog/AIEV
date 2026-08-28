import React from "react";
import {
  AbsoluteFill,
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

const CYAN = "#25d7f2";
const ORANGE = "#ff693b";
const cuts = [
  { source: "main" as const, start: 0, end: 11.4, zoom: 1.025 },
  { source: "offer" as const, start: 104.5, end: 141.1, zoom: 1.02 },
  { source: "offer" as const, start: 144.9, end: 163.2, zoom: 1.025 },
  { source: "offer" as const, start: 163.9, end: 168.2, zoom: 1.02 },
  { source: "offer" as const, start: 185, end: 196.6, zoom: 1.02 },
];

const glass: React.CSSProperties = {
  background: "rgba(13,17,25,.78)",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 22,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.1),0 22px 65px rgba(0,0,0,.4)",
  backdropFilter: "blur(22px)",
};

const Clip: React.FC<{ cut: (typeof cuts)[number]; index: number; duration: number }> = ({ cut, index, duration }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1, cut.zoom], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `scale(${zoom})` }}>
      {cut.source === "offer" ? (
        <>
          <OffthreadVideo muted src={staticFile("staging/ads-vinh-offer-3-buoi.mp4")} startFrom={Math.round(cut.start * 30)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(34px) brightness(.42)", transform: "scale(1.08)" }} />
          <OffthreadVideo src={staticFile("staging/ads-vinh-offer-3-buoi.mp4")} startFrom={Math.round(cut.start * 30)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        </>
      ) : (
        <OffthreadVideo src={staticFile("staging/ads-vinh-source.mp4")} startFrom={Math.round(cut.start * 30)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {index > 0 && frame < 4 ? <AbsoluteFill style={{ background: "white", opacity: interpolate(frame, [0, 4], [.42, 0]) }} /> : null}
    </AbsoluteFill>
  );
};

const Footage: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill>
      {cuts.map((cut, index) => {
        const duration = Math.round((cut.end - cut.start) * 30);
        const at = from;
        from += duration;
        return <Sequence key={index} from={at} durationInFrames={duration}><Clip cut={cut} index={index} duration={duration} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};

const Pop: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 185, mass: .7 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 42}px) scale(${.9 + p * .1})`, ...style }}>{children}</div>;
};

const TopBadge: React.FC<{ eyebrow: string; title: string; accent: string }> = ({ eyebrow, title, accent }) => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: 66 }}>
    <Pop>
      <div style={{ ...glass, minWidth: 520, padding: "16px 30px 19px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,.58)", fontSize: 17, letterSpacing: 5, marginBottom: 7 }}>{eyebrow}</div>
        <div style={{ color: accent, fontSize: 40, fontWeight: 800 }}>{title}</div>
      </div>
    </Pop>
  </AbsoluteFill>
);

const ProofMoment: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <AbsoluteFill style={{ background: "rgba(7,10,16,.75)", backdropFilter: "blur(15px)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(circle at 20% 30%,rgba(37,215,242,.16),transparent 34%),radial-gradient(circle at 80% 70%,rgba(255,105,59,.15),transparent 38%)" }} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <Pop><div style={{ color: "rgba(255,255,255,.62)", letterSpacing: 7, fontSize: 22 }}>KẾT QUẢ HỌC SINH</div></Pop>
      <Pop delay={6}><div style={{ ...glass, padding: "24px 44px", fontSize: 48, fontWeight: 700 }}>TỪ <span style={{ color: ORANGE }}>MẤT GỐC</span> → TIẾN BỘ VƯỢT BẬC</div></Pop>
      <Pop delay={12}><div style={{ color: CYAN, fontSize: 150, lineHeight: 1, fontWeight: 800, textShadow: "0 16px 60px rgba(37,215,242,.32)" }}>9,5–10 ĐIỂM</div></Pop>
    </div>
  </AbsoluteFill>
);

const MethodCards: React.FC = () => {
  const methods = ["PHƯƠNG PHÁP SÁNG TẠO", "ĐƠN GIẢN HÓA BÀI KHÓ", "LỘ TRÌNH 9 BƯỚC"];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 90 }}>
      <div style={{ width: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        <Pop><div style={{ color: "rgba(255,255,255,.75)", letterSpacing: 5, fontSize: 20, marginBottom: 4 }}>TRONG 3 BUỔI MIỄN PHÍ</div></Pop>
        {methods.map((method, index) => (
          <Pop key={method} delay={5 + index * 5}>
            <div style={{ ...glass, padding: "18px 24px", display: "flex", alignItems: "center", gap: 20, fontSize: 30, fontWeight: 700 }}>
              <span style={{ color: CYAN, fontSize: 20 }}>0{index + 1}</span><span>{method}</span>
            </div>
          </Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <AbsoluteFill style={{ background: "rgba(7,10,16,.78)", backdropFilter: "blur(16px)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 70%,rgba(255,105,59,.18),transparent 42%)" }} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <Pop><div style={{ color: "rgba(255,255,255,.62)", letterSpacing: 7, fontSize: 22 }}>CÂU LẠC BỘ TOÁN SƠ ĐỒ</div></Pop>
      <Pop delay={6}><div style={{ color: ORANGE, fontSize: 132, lineHeight: 1, fontWeight: 800 }}>3 BUỔI MIỄN PHÍ</div></Pop>
      <Pop delay={11}><div style={{ color: "white", fontSize: 54, fontWeight: 750 }}>HỌC THỬ TRỰC TIẾP CÙNG THẦY VINH</div></Pop>
      <Pop delay={16}><div style={{ ...glass, background: CYAN, color: "#071018", padding: "18px 48px", fontSize: 34, fontWeight: 800 }}>ĐĂNG KÝ NGAY TẠI ĐÂY</div></Pop>
    </div>
  </AbsoluteFill>
);

export const AdsVinhOptimized: React.FC = () => {
  useVietnameseFont();
  return (
    <AbsoluteFill style={{ background: "#0b0e14", color: "white", fontFamily: `'${VIETNAMESE_FONT_FAMILY}',Inter,sans-serif` }}>
      <style>{vietnameseFontFaceCss}</style>
      <Footage />
      <Sequence from={342} durationInFrames={180}><TopBadge eyebrow="CÂU LẠC BỘ TOÁN SƠ ĐỒ" title="3 BUỔI MIỄN PHÍ" accent={ORANGE} /></Sequence>
      <Sequence from={936} durationInFrames={504}><MethodCards /></Sequence>
      <Sequence from={1440} durationInFrames={96}><ProofMoment /></Sequence>
      <Sequence from={2118} durationInFrames={249}><TopBadge eyebrow="HỌC THỬ TRỰC TIẾP" title="THẦY SÁT SAO TỪNG BÀI" accent={CYAN} /></Sequence>
      <Sequence from={2385} durationInFrames={81}><Cta /></Sequence>
    </AbsoluteFill>
  );
};
