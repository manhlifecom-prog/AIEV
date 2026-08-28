import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  useVietnameseFont,
  VIETNAMESE_FONT_FAMILY,
  vietnameseFontFaceCss,
} from "./components/vietnameseFont";

export type BriskyCaptionWord = {
  text: string;
  start: number;
  end: number;
};

export type BriskyCaptionCue = {
  from: number;
  durationInFrames: number;
  words: BriskyCaptionWord[];
};

export type BriskyChapter = {
  from: number;
  durationInFrames: number;
  label: string;
};

export type BriskyFullVideoProps = {
  source: string;
  logo: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  captions: BriskyCaptionCue[];
  chapters: BriskyChapter[];
};

const palette = {
  forest: "#0D3B32",
  forestDeep: "#082A24",
  navy: "#0B1F3A",
  gold: "#C9A84C",
  ivory: "#FFFDF7",
};

const Intro: React.FC<{ logo: string }> = ({ logo }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const wipe = interpolate(frame, [0, 14, 25], [width, width * 0.32, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 7, 20, 26], [1, 1, 0.92, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          right: wipe,
          background: `linear-gradient(112deg, ${palette.forestDeep}, ${palette.forest})`,
        }}
      />
      <Img
        src={staticFile(logo)}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "34%",
          maxHeight: "24%",
          objectFit: "contain",
          transform: "translate(-50%, -50%)",
          filter: "drop-shadow(0 16px 32px rgba(0,0,0,.28))",
        }}
      />
    </AbsoluteFill>
  );
};

const BrandMark: React.FC<{ logo: string; title: string }> = ({ logo, title }) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const u = vertical ? width / 1080 : height / 1080;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: Math.round(34 * u),
          top: Math.round(30 * u),
          height: Math.round(66 * u),
          minWidth: Math.round(238 * u),
          padding: `${Math.round(9 * u)}px ${Math.round(18 * u)}px`,
          borderRadius: Math.round(16 * u),
          background: "rgba(8,42,36,.94)",
          boxShadow: "0 10px 28px rgba(0,0,0,.24), inset 0 0 0 1px rgba(201,168,76,.42)",
          display: "flex",
          alignItems: "center",
          gap: Math.round(12 * u),
        }}
      >
        <Img src={staticFile(logo)} style={{ height: "100%", width: "auto", objectFit: "contain" }} />
        <div style={{ width: Math.round(2 * u), height: "72%", background: palette.gold, opacity: 0.72 }} />
        <div
          style={{
            color: palette.ivory,
            fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif`,
            fontSize: Math.round(18 * u),
            fontWeight: 800,
            letterSpacing: ".09em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: Math.max(4, Math.round(5 * u)),
          background: `linear-gradient(90deg, ${palette.gold}, #F3D98A, ${palette.forest})`,
        }}
      />
    </>
  );
};

const CaptionCard: React.FC<{ cue: BriskyCaptionCue }> = ({ cue }) => {
  const localFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const frame = cue.from + localFrame;
  const vertical = height > width;
  const square = width === height;
  const u = vertical ? width / 1080 : height / 1080;
  const last = cue.durationInFrames - 1;
  const fade = Math.min(4, Math.max(1, Math.floor(last / 3)));
  const opacity = last <= 2
    ? 1
    : interpolate(localFrame, [0, fade, Math.max(fade + 1, last - fade), last], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const y = interpolate(localFrame, [0, 6], [18 * u, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bottom = vertical ? 126 : square ? 58 : 52;
  const fontSize = vertical ? 54 : square ? 47 : 46;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        padding: `0 ${Math.round((vertical ? 54 : 82) * u)}px ${Math.round(bottom * u)}px`,
        opacity,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: vertical ? "94%" : square ? "90%" : "78%",
          transform: `translateY(${y}px)`,
          borderRadius: Math.round(22 * u),
          overflow: "hidden",
          background: "linear-gradient(112deg, rgba(8,42,36,.96), rgba(11,31,58,.96))",
          boxShadow: "0 18px 44px rgba(0,0,0,.36), inset 0 0 0 1px rgba(255,255,255,.10)",
        }}
      >
        <div style={{ height: Math.max(4, Math.round(5 * u)), background: `linear-gradient(90deg, ${palette.gold}, #F4DEA0 52%, transparent)` }} />
        <div style={{ padding: `${Math.round(17 * u)}px ${Math.round(31 * u)}px ${Math.round(23 * u)}px` }}>
          <div
            style={{
              color: "rgba(244,222,160,.88)",
              fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif`,
              fontSize: Math.round(13 * u),
              fontWeight: 800,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              marginBottom: Math.round(7 * u),
            }}
          >
            Brisky Academy
          </div>
          <div
            style={{
              fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif`,
              fontSize: Math.round(fontSize * u),
              fontWeight: 850,
              lineHeight: 1.16,
              letterSpacing: "-.025em",
              textAlign: "left",
              color: palette.ivory,
              textShadow: "0 3px 12px rgba(0,0,0,.28)",
            }}
          >
            {cue.words.map((word, index) => {
              const active = frame >= word.start && frame <= word.end;
              const spoken = frame > word.end;
              return (
                <React.Fragment key={`${word.start}-${index}`}>
                  <span
                    style={{
                      color: active ? "#F3D98A" : spoken ? "#FFFFFF" : "rgba(255,255,255,.78)",
                      textShadow: active ? "0 0 18px rgba(201,168,76,.44)" : undefined,
                    }}
                  >
                    {word.text}
                  </span>{" "}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ChapterCard: React.FC<{ chapter: BriskyChapter }> = ({ chapter }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const u = vertical ? width / 1080 : height / 1080;
  const opacity = interpolate(frame, [0, 7, chapter.durationInFrames - 8, chapter.durationInFrames - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, 9], [45 * u, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        right: Math.round(38 * u),
        top: Math.round((vertical ? 128 : 36) * u),
        maxWidth: vertical ? "72%" : "42%",
        opacity,
        transform: `translateX(${x}px)`,
        padding: `${Math.round(15 * u)}px ${Math.round(22 * u)}px`,
        borderRadius: Math.round(15 * u),
        background: "rgba(255,253,247,.96)",
        boxShadow: "0 14px 35px rgba(0,0,0,.25), inset 5px 0 0 #C9A84C",
        color: palette.navy,
        fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif`,
        fontSize: Math.round((vertical ? 27 : 24) * u),
        fontWeight: 850,
        lineHeight: 1.15,
      }}
    >
      {chapter.label}
    </div>
  );
};

export const BriskyFullVideo: React.FC<BriskyFullVideoProps> = ({
  source,
  logo,
  title,
  captions,
  chapters,
}) => {
  useVietnameseFont();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <style>{vietnameseFontFaceCss}</style>
      <OffthreadVideo
        src={staticFile(source)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
      />
      <BrandMark logo={logo} title={title} />
      {captions.map((cue, index) => (
        <Sequence key={`caption-${index}`} from={cue.from} durationInFrames={cue.durationInFrames}>
          <CaptionCard cue={cue} />
        </Sequence>
      ))}
      {chapters.map((chapter, index) => (
        <Sequence key={`chapter-${index}`} from={chapter.from} durationInFrames={chapter.durationInFrames}>
          <ChapterCard chapter={chapter} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={27}>
        <Intro logo={logo} />
      </Sequence>
    </AbsoluteFill>
  );
};
