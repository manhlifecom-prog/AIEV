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
import {
  VIETNAMESE_FONT_FAMILY,
  useVietnameseFont,
  vietnameseFontFaceCss,
} from "./components/vietnameseFont";

const CYAN = "#28d7f4";
const ORANGE = "#ff6b3d";
type Cut = { start: number; end: number; zoom?: number };
type Overlay = {
  from: number;
  duration: number;
  kind: "banner" | "stat" | "cta" | "transition";
  eyebrow?: string;
  title: string;
  accent?: string;
  color?: string;
  placement?: "left";
};
type SourceSubtitle = { start: number; end: number; text: string };
type AdSubtitle = { from: number; duration: number; text: string };

const shortCuts: Cut[] = [
  { start: 0, end: 7.58, zoom: 1.035 },
  { start: 30.96, end: 40.1, zoom: 1.05 },
  { start: 40.48, end: 50.38, zoom: 1.035 },
  { start: 58.32, end: 75.88, zoom: 1.045 },
  { start: 75.88, end: 95.54, zoom: 1.025 },
];
const novCuts: Cut[] = [
  { start: 0, end: 13.6, zoom: 1.025 },
  { start: 41.9, end: 50.66, zoom: 1.035 },
  { start: 50.66, end: 65.94, zoom: 1.04 },
  { start: 72.56, end: 88.14, zoom: 1.03 },
  { start: 90.58, end: 98.82, zoom: 1.045 },
  { start: 129.78, end: 145.1, zoom: 1.025 },
];
const NOV_SPEED = 1.08;

// Transcript đã sửa các lỗi nhận dạng rõ ràng, chỉ giữ phần thực sự có trong
// sáu đoạn dựng của bản quảng cáo tháng 11.
const novSourceSubtitles: SourceSubtitle[] = [
  { start: 0, end: 3.32, text: "95% nguyên nhân học sinh học yếu Toán không phải do không thông minh" },
  { start: 3.42, end: 5.74, text: "mà là do chưa được dạy đúng cách" },
  { start: 5.74, end: 8.5, text: "Cha mẹ lo lắng khi thấy con đang tụt dần so với bạn bè" },
  { start: 8.58, end: 10.18, text: "dạy con mãi mà con không hiểu" },
  { start: 10.38, end: 13.6, text: "Đừng lo, thầy đã từng giúp hàng nghìn học sinh như vậy" },
  { start: 41.9, end: 46.38, text: "Bạn Mai Ngọc Minh là một học sinh rất xuất sắc với điểm tổng kết trên 9" },
  { start: 46.38, end: 50.66, text: "nhưng trăn trở mãi chưa tìm được cách đạt 9,9 đến 10 điểm môn Toán" },
  { start: 50.66, end: 53.92, text: "Khi gặp thầy, bạn đã đánh thức con người phi thường bên trong" },
  { start: 53.94, end: 57.08, text: "Bạn liên tục đột phá nhiều thành tích mới trong học tập" },
  { start: 57.08, end: 61.46, text: "đạt giải cao trong các cuộc thi học sinh giỏi Toán cấp thành phố" },
  { start: 61.54, end: 65.94, text: "điểm trung bình môn Toán thường xuyên ở mức 9,9 đến 10,0" },
  { start: 72.56, end: 75.9, text: "Vậy làm cách nào thầy không chỉ giúp những học sinh vừa rồi" },
  { start: 75.9, end: 79.38, text: "mà còn giúp hàng trăm nghìn học sinh tiến bộ vượt bậc môn Toán" },
  { start: 79.42, end: 83.32, text: "Tất cả bí quyết được thầy chia sẻ trong 3 buổi Zoom dành tặng cha mẹ" },
  { start: 83.6, end: 88.14, text: "3 buổi Zoom bật mí bí quyết giúp con yêu thích việc học" },
  { start: 90.58, end: 93.48, text: "Thầy hướng dẫn cha mẹ cách ứng dụng sơ đồ tư duy" },
  { start: 93.56, end: 97.5, text: "giúp con tổng hợp kiến thức của cả bốn năm học hoặc một học kỳ" },
  { start: 97.5, end: 98.82, text: "chỉ trong một trang giấy" },
  { start: 129.78, end: 131.3, text: "Hãy đăng ký ngay ở phía dưới" },
  { start: 131.3, end: 134.5, text: "để giữ một suất tham dự 3 buổi Zoom đặc biệt của thầy" },
  { start: 134.56, end: 136.12, text: "ở trong nhóm kín Zalo nhé" },
  { start: 136.38, end: 138.16, text: "Nếu cha mẹ bận không tham dự được" },
  { start: 138.2, end: 142.7, text: "vẫn hãy đăng ký để giữ trọn bộ video 3 buổi Zoom" },
  { start: 142.7, end: 145.1, text: "Hẹn gặp cha mẹ và các con trong những buổi Zoom bí mật" },
];

const splitSubtitle = (line: SourceSubtitle, cut: Cut, outputStart: number, fps: number): AdSubtitle[] => {
  const words = line.text.split(/\s+/);
  const chunkCount = Math.max(1, Math.ceil(words.length / 5));
  const chunkSize = Math.ceil(words.length / chunkCount);
  return Array.from({ length: chunkCount }, (_, index) => {
    const startWord = index * chunkSize;
    const endWord = Math.min(words.length, startWord + chunkSize);
    const sourceStart = line.start + ((line.end - line.start) * startWord) / words.length;
    const sourceEnd = line.start + ((line.end - line.start) * endWord) / words.length;
    const from = Math.round((outputStart + (sourceStart - cut.start) / NOV_SPEED) * fps);
    const end = Math.round((outputStart + (sourceEnd - cut.start) / NOV_SPEED) * fps);
    return { from, duration: Math.max(10, end - from), text: words.slice(startWord, endWord).join(" ") };
  });
};

const makeNovSubtitles = (fps: number): AdSubtitle[] => {
  let outputStart = 0;
  const cues: AdSubtitle[] = [];
  novCuts.forEach((cut) => {
    novSourceSubtitles
      .filter((line) => line.start >= cut.start - .01 && line.end <= cut.end + .01)
      .forEach((line) => cues.push(...splitSubtitle(line, cut, outputStart, fps)));
    outputStart += (cut.end - cut.start) / NOV_SPEED;
  });
  return cues;
};

const shortOverlays: Overlay[] = [
  { from: 4, duration: 80, kind: "banner", eyebrow: "CÂU HỎI CỦA RẤT NHIỀU CHA MẸ", title: "HỌC ONLINE", accent: "VẪN GIỎI TOÁN?" },
  { from: 510, duration: 110, kind: "banner", eyebrow: "KẾT QUẢ THỰC TẾ", title: "HÀNG CHỤC NGHÌN", accent: "HỌC SINH TIẾN BỘ" },
  { from: 1005, duration: 115, kind: "stat", eyebrow: "LỘ TRÌNH ĐÃ ĐƯỢC KIỂM CHỨNG", title: "TỪ MẤT GỐC", accent: "9–10 ĐIỂM" },
  { from: 1370, duration: 105, kind: "banner", eyebrow: "QUÀ TẶNG TỪ THẦY VINH", title: "HỌC HOÀN TOÀN", accent: "MIỄN PHÍ" },
  { from: 1740, duration: 160, kind: "cta", eyebrow: "NHẬN NGAY BỘ VIDEO BÀI GIẢNG", title: "ĐĂNG KÝ NGAY", accent: "NHÓM ZALO" },
];
const novOverlays: Overlay[] = [
  { from: 378, duration: 64, kind: "transition", eyebrow: "CÂU CHUYỆN THỰC TẾ", title: "TỪ HỌC YẾU", accent: "ĐẾN ĐỘT PHÁ" },
  { from: 455, duration: 82, kind: "banner", eyebrow: "CASE STUDY THỰC TẾ", title: "ĐIỂM TOÁN", accent: "9,9–10,0" },
  { from: 650, duration: 54, kind: "transition", eyebrow: "KHÔNG PHẢI MAY MẮN", title: "CÓ PHƯƠNG PHÁP", accent: "ĐÚNG" },
  { from: 800, duration: 96, kind: "stat", eyebrow: "KẾT QUẢ SAU KHI ĐƯỢC DẪN DẮT", title: "9,9–10,0", accent: "LIÊN TỤC ĐỘT PHÁ" },
  { from: 1035, duration: 56, kind: "transition", eyebrow: "GIẢI PHÁP CHO CHA MẸ", title: "CHỈ 3 BUỔI", accent: "ZOOM" },
  { from: 1100, duration: 86, kind: "banner", eyebrow: "BÍ QUYẾT DÀNH CHO CHA MẸ", title: "3 BUỔI ZOOM", accent: "ĐẶC BIỆT" },
  { from: 1415, duration: 54, kind: "transition", eyebrow: "HỌC NHANH HƠN", title: "NHỚ LÂU HƠN", accent: "DỄ ÁP DỤNG" },
  { from: 1510, duration: 90, kind: "banner", eyebrow: "TỔNG HỢP KIẾN THỨC NHANH", title: "SƠ ĐỒ", accent: "TƯ DUY" },
  { from: 1760, duration: 325, kind: "cta", eyebrow: "GIỮ TRỌN BỘ VIDEO 3 BUỔI ZOOM", title: "ĐĂNG KÝ NGAY", accent: "Ở PHÍA DƯỚI" },
];

const glass: React.CSSProperties = {
  background: "rgba(14,17,24,.78)",
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 26,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.1),0 26px 70px rgba(0,0,0,.42)",
  backdropFilter: "blur(20px)",
};

const Clip: React.FC<{ source: string; cut: Cut; duration: number; fps: number; index: number; speed: number }> = ({ source, cut, duration, fps, index, speed }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1, cut.zoom ?? 1.03], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `scale(${zoom})` }}>
      <OffthreadVideo src={staticFile(source)} startFrom={Math.round(cut.start * fps)} playbackRate={speed} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {index > 0 && frame < 4 ? <AbsoluteFill style={{ background: "white", opacity: interpolate(frame, [0, 4], [.5, 0], { extrapolateRight: "clamp" }) }} /> : null}
    </AbsoluteFill>
  );
};

const MotionOverlay: React.FC<{ item: Overlay }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 15, stiffness: 185, mass: .72 } });
  const floatY = Math.sin(frame / 7) * 2.2;
  const sweep = interpolate(frame, [10, 28], [-700, 700], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const isFull = item.kind === "stat" || item.kind === "transition";
  const isTransition = item.kind === "transition";
  const isLeft = item.placement === "left";
  return (
    <AbsoluteFill style={{ alignItems: isLeft ? "flex-start" : "center", justifyContent: isFull || isLeft ? "center" : item.kind === "cta" ? "flex-end" : "flex-start", paddingTop: isFull || isLeft ? 0 : 64, paddingLeft: isLeft ? 34 : 0, paddingBottom: item.kind === "cta" ? 62 : 0 }}>
      {isFull ? <AbsoluteFill style={{ background: `rgba(8,11,16,${(isTransition ? .67 : .76) * p})`, backdropFilter: `blur(${isTransition ? 7 : 14}px)` }} /> : null}
      <div style={{ ...glass, minWidth: isLeft ? 0 : isFull ? 760 : 640, width: isLeft ? 430 : undefined, maxWidth: isLeft ? 430 : 900, padding: isFull ? "42px 54px" : isLeft ? "28px 24px" : "24px 38px", textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * (isFull ? 48 : -36) + floatY}px) scale(${(isTransition ? .78 : .9) + p * (isTransition ? .22 : .1)}) rotate(${isTransition ? (1-p)*-2.2 : 0}deg)`, overflow: "hidden", position: "relative" }}>
        <div style={{ color: "rgba(255,255,255,.58)", fontSize: 20, fontWeight: 650, letterSpacing: 4, marginBottom: 12 }}>{item.eyebrow}</div>
        <div style={{ color: "white", fontSize: isTransition ? 82 : isFull ? 76 : isLeft ? 70 : 48, fontWeight: 800, lineHeight: 1.08 }}>{item.title}</div>
        <div style={{ color: item.color ?? (item.kind === "cta" ? CYAN : ORANGE), fontSize: isFull ? 54 : isLeft ? 28 : 40, fontWeight: 800, marginTop: 8, lineHeight: 1.15 }}>{item.accent}</div>
        <div style={{ position: "absolute", top: -100, bottom: -100, left: 0, width: 170, background: "linear-gradient(90deg,transparent,rgba(40,215,244,.22),transparent)", transform: `translateX(${sweep}px) rotate(13deg)` }} />
      </div>
    </AbsoluteFill>
  );
};

const subtitleKeywords = new Set([
  "95%", "không", "đúng", "toán", "9,9", "10,0", "zoom", "đột", "phá",
  "tiến", "bộ", "bí", "quyết", "đặc", "biệt", "đăng", "ký", "sơ", "đồ",
]);

const GlassSubtitle: React.FC<{ cue: AdSubtitle }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 230, mass: .68 } });
  const exit = interpolate(frame, [Math.max(0, cue.duration - 6), cue.duration], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const words = cue.text.split(/\s+/);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, background: "#090e16", boxShadow: "inset 0 1px 0 rgba(48,205,242,.28)" }} />
      <div style={{
        width: 980, maxWidth: 980,
        minHeight: 180, padding: "20px 34px 18px",
        background: "#090e16",
        opacity: enter * exit,
        transform: `translateY(${(1-enter) * 16}px) scale(${.97 + enter*.03})`,
        textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "rgba(224,235,243,.58)", fontSize: 14, fontWeight: 750, letterSpacing: 4.2, marginBottom: 7 }}>THẦY VINH CHIA SẺ</div>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.025em", color: "white" }}>
          {words.map((word, index) => {
            const clean = word.toLocaleLowerCase("vi").replace(/[.,!?;:]/g, "");
            const active = subtitleKeywords.has(clean);
            return <React.Fragment key={`${word}-${index}`}><span style={{ color: active ? (index % 2 ? CYAN : ORANGE) : "white" }}>{word}</span>{index < words.length - 1 ? " " : ""}</React.Fragment>;
          })}
        </div>
        <div style={{ width: 72, height: 3, borderRadius: 99, margin: "10px auto 0", background: `linear-gradient(90deg,${ORANGE},${CYAN})` }} />
      </div>
    </AbsoluteFill>
  );
};

const AdsComposition: React.FC<{ source: string; cuts: Cut[]; overlays: Overlay[]; speed?: number; subtitles?: boolean }> = ({ source, cuts, overlays, speed = 1, subtitles = false }) => {
  useVietnameseFont();
  const { fps } = useVideoConfig();
  let cursor = 0;
  return (
    <AbsoluteFill style={{ background: "#090c12", color: "white", fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Inter, sans-serif` }}>
      <style>{vietnameseFontFaceCss}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: subtitles ? 900 : "100%", overflow: "hidden" }}>
        {cuts.map((cut, index) => {
          const duration = Math.round(((cut.end - cut.start) * fps) / speed);
          const from = cursor;
          cursor += duration;
          return <Sequence key={index} from={from} durationInFrames={duration}><Clip source={source} cut={cut} duration={duration} fps={fps} index={index} speed={speed} /></Sequence>;
        })}
        {overlays.map((item, index) => <Sequence key={index} from={item.from} durationInFrames={item.duration}><MotionOverlay item={item} /></Sequence>)}
      </div>
      {subtitles ? makeNovSubtitles(fps).map((cue, index) => (
        <Sequence key={`ad-sub-${index}`} from={cue.from} durationInFrames={cue.duration}>
          <GlassSubtitle cue={cue} />
        </Sequence>
      )) : null}
    </AbsoluteFill>
  );
};

export const AdsShortOptimized: React.FC = () => <AdsComposition source="staging/ads-short-source.mp4" cuts={shortCuts} overlays={shortOverlays} />;
export const AdsNovemberOptimized: React.FC = () => <AdsComposition source="staging/ads-nov-source.mp4" cuts={novCuts} overlays={novOverlays} speed={NOV_SPEED} subtitles />;
