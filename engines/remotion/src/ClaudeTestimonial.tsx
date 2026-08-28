import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import transcript from "../../../video-projects/adasd/assets/transcript.cut.json";
import {
  VIETNAMESE_FONT_FAMILY,
  useVietnameseFont,
  vietnameseFontFaceCss,
} from "./components/vietnameseFont";

const CYAN = "#25d7f2";
const ORANGE = "#ff6b3d";
const GLASS = "rgba(17,20,27,.76)";
const cuts = [
  { start: 3.28, end: 8.18, zoom: 1.045 },
  { start: 17.2, end: 26.92, zoom: 1.065 },
  { start: 53.5, end: 62.7, zoom: 1.075 },
  { start: 69.1, end: 74.9, zoom: 1.035 },
  { start: 79.82, end: 87.92, zoom: 1.06 },
  { start: 92.88, end: 114.72, zoom: 1.045 },
];

const fullMoments = [
  { from: 3, duration: 78, kind: "hook" as const },
  { from: 715, duration: 89, kind: "turn" as const },
  { from: 1689, duration: 98, kind: "result" as const },
];

const glass: React.CSSProperties = {
  background: GLASS,
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 22,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 24px 70px rgba(0,0,0,.42)",
  backdropFilter: "blur(22px)",
};

const Footage: React.FC = () => {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {cuts.map((cut, index) => {
        const duration = Math.round((cut.end - cut.start) * fps);
        const startAt = from;
        from += duration;
        return (
          <Sequence key={index} from={startAt} durationInFrames={duration}>
            <Clip cut={cut} index={index} duration={duration} fps={fps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Clip: React.FC<{ cut: (typeof cuts)[number]; index: number; duration: number; fps: number }> = ({
  cut,
  index,
  duration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1, cut.zoom], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `scale(${zoom})` }}>
      <OffthreadVideo
        src={staticFile("staging/adasd-source.mp4")}
        startFrom={Math.round(cut.start * fps)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {index > 0 && frame < 4 ? (
        <AbsoluteFill
          style={{
            background: "white",
            opacity: interpolate(frame, [0, 4], [0.55, 0], { extrapolateRight: "clamp" }),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left";
  style?: React.CSSProperties;
}> = ({ children, delay = 0, direction = "up", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
  const x = direction === "left" ? interpolate(p, [0, 1], [70, 0]) : 0;
  const y = direction === "up" ? interpolate(p, [0, 1], [46, 0]) : 0;
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ opacity: p, transform: `translate3d(${x}px,${y}px,0) scale(${0.96 + p * 0.04})` }}>
        {children}
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: "rgba(255,255,255,.64)", fontSize: 24, letterSpacing: 7, fontWeight: 600 }}>
    {children}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; width?: number }> = ({ children, width = 860 }) => (
  <div style={{ ...glass, width, padding: "28px 42px", textAlign: "center", fontSize: 54, fontWeight: 700 }}>
    {children}
  </div>
);

const Sweep: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame - delay, [0, 18], [-500, 500], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: 22,
      }}
    >
      <div
        style={{
          width: 180,
          height: "180%",
          background: "linear-gradient(90deg,transparent,rgba(37,215,242,.2),transparent)",
          transform: `translateX(${x}px) rotate(14deg)`,
        }}
      />
    </div>
  );
};

const FullMoment: React.FC<{ kind: "hook" | "turn" | "result" }> = ({ kind }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 145 } });
  const dim = interpolate(enter, [0, 1], [0, 0.82]);
  const content =
    kind === "hook" ? (
      <>
        <Reveal delay={2}><Eyebrow>HÀNH TRÌNH THAY ĐỔI</Eyebrow></Reveal>
        <Reveal delay={7} direction="left">
          <div style={{ position: "relative" }}><Card>TỪ <span style={{ color: ORANGE }}>MẤT GỐC</span> HÌNH HỌC</Card><Sweep delay={16} /></div>
        </Reveal>
        <Reveal delay={13} direction="left">
          <Card width={600}>ĐẾN ĐIỂM TỐI ĐA <span style={{ color: CYAN }}>3,5/3,5</span></Card>
        </Reveal>
      </>
    ) : kind === "turn" ? (
      <>
        <Reveal delay={1}><Eyebrow>BƯỚC NGOẶT</Eyebrow></Reveal>
        <Reveal delay={6} direction="left"><Card width={650}>KHI HỌC <span style={{ color: CYAN }}>THẦY VINH</span></Card></Reveal>
        <Reveal delay={12}>
          <div style={{ color: ORANGE, fontSize: 132, lineHeight: 1, fontWeight: 800, textShadow: "0 18px 60px rgba(255,107,61,.28)" }}>THAY ĐỔI 360°</div>
        </Reveal>
      </>
    ) : (
      <>
        <Reveal delay={1}><Eyebrow>KẾT QUẢ SAU KHI THAY ĐỔI TƯ DUY</Eyebrow></Reveal>
        <div style={{ display: "flex", gap: 22 }}>
          <Reveal delay={6} direction="left"><Card width={520}>LÀM ĐƯỢC <span style={{ color: CYAN }}>BÀI HÌNH KHÓ</span></Card></Reveal>
          <Reveal delay={10} direction="left"><Card width={440}>ĐẠT ĐIỂM <span style={{ color: ORANGE }}>TỐI ĐA</span></Card></Reveal>
        </div>
        <Reveal delay={16}>
          <div style={{ color: ORANGE, fontSize: 154, lineHeight: 1, fontWeight: 800, textShadow: "0 18px 65px rgba(255,107,61,.32)" }}>3,5/3,5</div>
        </Reveal>
      </>
    );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ backdropFilter: "blur(16px)", background: `rgba(8,11,16,${dim})` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 18% 30%,rgba(37,215,242,.13),transparent 34%),radial-gradient(circle at 82% 70%,rgba(255,107,61,.12),transparent 38%)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>{content}</div>
    </AbsoluteFill>
  );
};

const KeyCard: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 190, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 84, pointerEvents: "none" }}>
      <div style={{ ...glass, padding: "18px 32px", transform: `translateY(${(1 - p) * -35}px) scale(${0.9 + p * 0.1})`, opacity: p, fontSize: 40, fontWeight: 750 }}>
        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 20, background: color, marginRight: 18, boxShadow: `0 0 24px ${color}` }} />
        <span style={{ color }}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

type Cue = (typeof transcript.segments)[number];
const Caption: React.FC<{ cue: Cue; from: number }> = ({ cue, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absFrame = frame + from;
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 210, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 88 }}>
      <div style={{ ...glass, padding: "20px 34px 22px", fontSize: 42, fontWeight: 650, transform: `translateY(${(1 - enter) * 24}px) scale(${0.97 + enter * 0.03})`, opacity: enter }}>
        {cue.words.map((word, index) => {
          const active = absFrame >= Math.round(word.start * fps) && absFrame <= Math.round(word.end * fps);
          const hot = /(không|thấp|thầy|vinh|360|3,5|tối đa)/i.test(word.word);
          return (
            <span key={index} style={{ display: "inline-block", margin: "0 .16em", color: active ? (hot ? ORANGE : CYAN) : "rgba(255,255,255,.94)", transform: `scale(${active ? 1.08 : 1})`, transition: "none", textShadow: active ? `0 0 24px ${hot ? "rgba(255,107,61,.5)" : "rgba(37,215,242,.45)"}` : "none" }}>
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ClaudeTestimonial: React.FC = () => {
  useVietnameseFont();
  const fps = 30;
  const inFull = (middle: number) => fullMoments.some((m) => middle >= m.from && middle <= m.from + m.duration);
  return (
    <AbsoluteFill style={{ background: "#0c0f14", color: "white", fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Inter, sans-serif` }}>
      <style>{vietnameseFontFaceCss}</style>
      <Footage />
      {fullMoments.map((m) => <Sequence key={m.kind} from={m.from} durationInFrames={m.duration}><FullMoment kind={m.kind} /></Sequence>)}
      <Sequence from={564} durationInFrames={120}><KeyCard text="ĐIỂM RẤT THẤP" color={ORANGE} /></Sequence>
      <Sequence from={1132} durationInFrames={84}><KeyCard text="BỎ ĐỊNH KIẾN" color={CYAN} /></Sequence>
      {transcript.segments.map((cue, index) => {
        const from = Math.round(cue.start * fps);
        const end = Math.round(cue.end * fps);
        if (inFull((from + end) / 2)) return null;
        return <Sequence key={index} from={from} durationInFrames={Math.max(2, end - from)}><Caption cue={cue} from={from} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};
