import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 30;

type Caption = {from: number; to: number; text: string; gold?: string};
type Broll = {from: number; to: number; src: string; label: string};
type Ad = {
  id: string;
  duration: number;
  hook: string;
  captions: Caption[];
  broll: Broll[];
};

const ads: Ad[] = [
  {
    id: "ad01", duration: 82.05, hook: "CON HỌC NHIỀU NHƯNG VẪN MẤT GỐC?",
    captions: [
      {from: 0, to: 7, text: "Cứ nhắc tới tiếng Anh là con sợ?", gold: "con sợ"},
      {from: 7, to: 16, text: "Học trước quên sau, kiểm tra lại rất nản", gold: "học trước quên sau"},
      {from: 16, to: 27.5, text: "Đừng vội nghĩ con lười hay kém", gold: "Đừng vội"},
      {from: 27.5, to: 39.1, text: "Học thêm nhiều nhưng điểm vẫn không lên", gold: "điểm vẫn không lên"},
      {from: 39.1, to: 48.7, text: "Con cần một lộ trình học lại bài bản", gold: "lộ trình"},
      {from: 48.7, to: 53.3, text: "BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC", gold: "SIÊU TỐC"},
      {from: 53.3, to: 66.5, text: "3 buổi Zoom cho cha mẹ có con lớp 3–9", gold: "3 buổi Zoom"},
      {from: 66.5, to: 82, text: "Nhấn đăng ký để được Brisky hỗ trợ", gold: "Nhấn đăng ký"},
    ],
    broll: [
      {from: 17, to: 21, src: "staging/brisky-generated-v3/01-vocabulary-forgotten.png", label: "HỌC TRƯỚC • QUÊN SAU"},
      {from: 37, to: 41, src: "staging/brisky-real/05-class-lesson.jpg", label: "HỌC ĐÚNG PHẦN CON ĐANG HỔNG"},
    ],
  },
  {
    id: "ad02", duration: 91.56, hook: "TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM",
    captions: [
      {from: 0, to: 8, text: "Một bạn lớp 7 từng mất gốc tiếng Anh", gold: "mất gốc"},
      {from: 8, to: 15, text: "Người mẹ từng rất lo lắng", gold: "rất lo lắng"},
      {from: 15, to: 25, text: "Cuối năm, con đạt 8 điểm tiếng Anh", gold: "8 điểm"},
      {from: 25, to: 33, text: "Đó là cả một quá trình nỗ lực", gold: "nỗ lực"},
      {from: 33, to: 52, text: "Ép học theo cách cũ có thể làm con sợ hơn", gold: "sợ hơn"},
      {from: 52, to: 72, text: "Brisky chia sẻ lộ trình trong 3 buổi Zoom", gold: "3 buổi Zoom"},
      {from: 72, to: 82, text: "Kiểm tra trình độ và lộ trình từ gốc", gold: "từ gốc"},
      {from: 82, to: 91.5, text: "Nhấn đăng ký chương trình bên dưới", gold: "đăng ký"},
    ],
    broll: [
      {from: 14, to: 19, src: "staging/brisky-generated-v2/03-confident-student.png", label: "TỰ TIN HƠN • ĐIỂM SỐ TỐT HƠN"},
      {from: 53, to: 58, src: "staging/brisky-real/07-brisky-students.jpg", label: "LỘ TRÌNH PHÙ HỢP TỪNG BẠN"},
    ],
  },
  {
    id: "ad03", duration: 96.84, hook: "5 DẤU HIỆU CON ĐANG HỔNG GỐC",
    captions: [
      {from: 0, to: 9, text: "Trước mỗi bài kiểm tra, cả con và mẹ đều lo?", gold: "đều lo"},
      {from: 9, to: 20, text: "Học từ vựng hôm nay, ngày mai đã quên", gold: "đã quên"},
      {from: 20, to: 28, text: "Gặp bài đọc dài là ngại", gold: "bài đọc dài"},
      {from: 28, to: 48, text: "Càng lên cao, bài dài và ngữ pháp nặng hơn", gold: "càng lên cao"},
      {from: 48, to: 58, text: "Điều đáng lo là con hình thành nỗi sợ", gold: "nỗi sợ"},
      {from: 58, to: 73, text: "3 buổi Zoom: Bí mật lấy gốc tiếng Anh", gold: "3 buổi Zoom"},
      {from: 73, to: 82, text: "Tặng kiểm tra trình độ hoàn toàn miễn phí", gold: "miễn phí"},
      {from: 82, to: 96.8, text: "Nhấn đăng ký để nhận lộ trình phù hợp", gold: "lộ trình"},
    ],
    broll: [
      {from: 18, to: 23, src: "staging/brisky-generated-v3/02-long-reading.png", label: "BÀI ĐỌC DÀI • KHÔNG BIẾT BẮT ĐẦU"},
      {from: 34, to: 39, src: "staging/brisky-generated-v3/03-grammar-application.png", label: "THUỘC CÔNG THỨC • KHÓ ÁP DỤNG"},
    ],
  },
  {
    id: "ad04", duration: 99.11, hook: "CON KHÔNG LƯỜI — CON ĐANG HỔNG ĐÚNG PHẦN",
    captions: [
      {from: 0, to: 15, text: "Rất nhiều bạn chưa được tiếp cận đúng cách", gold: "đúng cách"},
      {from: 15, to: 29, text: "Hổng từ vựng: học hôm nay, mai lại quên", gold: "Hổng từ vựng"},
      {from: 29, to: 38, text: "Biết từ nhưng chưa ghép được thành câu", gold: "ghép thành câu"},
      {from: 38, to: 57, text: "Biết từng câu nhưng chưa hiểu cả đoạn", gold: "hiểu cả đoạn"},
      {from: 57, to: 68, text: "Càng học thêm, con càng mệt và sợ", gold: "càng sợ"},
      {from: 68, to: 78, text: "Bí mật lấy gốc tiếng Anh cho con", gold: "lấy gốc"},
      {from: 78, to: 92, text: "3 buổi Zoom dành cho cha mẹ có con lớp 3–9", gold: "3 buổi Zoom"},
      {from: 92, to: 99.1, text: "Nhấn đăng ký để tham gia chương trình", gold: "đăng ký"},
    ],
    broll: [
      {from: 15, to: 20, src: "staging/brisky-generated-v3/01-vocabulary-forgotten.png", label: "XÁC ĐỊNH ĐÚNG PHẦN BỊ HỔNG"},
      {from: 39, to: 44, src: "staging/brisky-real/04-brisky-teachers.jpg", label: "GIÁO VIÊN ĐỒNG HÀNH ĐÚNG LỘ TRÌNH"},
    ],
  },
  {
    id: "ad05", duration: 98.58, hook: "ĐỪNG VỘI GẮN NHÃN CON LƯỜI",
    captions: [
      {from: 0, to: 10, text: "Điểm thấp không có nghĩa là con lười", gold: "không có nghĩa"},
      {from: 10, to: 22, text: "Con đã mất gốc quá lâu và thiếu định hướng", gold: "thiếu định hướng"},
      {from: 22, to: 31, text: "Kiến thức mới khiến con càng mông lung", gold: "mông lung"},
      {from: 31, to: 49, text: "Từ vựng và ngữ pháp cứ học rồi lại quên", gold: "lại quên"},
      {from: 49, to: 66, text: "3 buổi Zoom: Bí mật lấy gốc tiếng Anh", gold: "3 buổi Zoom"},
      {from: 66, to: 82, text: "Lộ trình từ cơ bản đến nâng cao", gold: "lộ trình"},
      {from: 82, to: 88, text: "Cha mẹ không cần phải giỏi tiếng Anh", gold: "không cần"},
      {from: 88, to: 98.5, text: "Nhấn đăng ký để Brisky tư vấn kỹ hơn", gold: "đăng ký"},
    ],
    broll: [
      {from: 12, to: 17, src: "staging/brisky-generated-v2/01-teacher-guiding-student.png", label: "HIỂU CON • KHÔNG GẮN NHÃN"},
      {from: 68, to: 73, src: "staging/brisky-generated-v3/04-level-assessment.png", label: "KIỂM TRA TRÌNH ĐỘ • XÂY LỘ TRÌNH"},
    ],
  },
];

const CaptionCard: React.FC<{caption: Caption}> = ({caption}) => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame % 150, [0, 8], [0.96, 1], {extrapolateRight: "clamp"});
  const goldIndex = caption.gold ? caption.text.toLocaleLowerCase("vi").indexOf(caption.gold.toLocaleLowerCase("vi")) : -1;
  const before = goldIndex >= 0 ? caption.text.slice(0, goldIndex) : caption.text;
  const highlighted = goldIndex >= 0 && caption.gold ? caption.text.slice(goldIndex, goldIndex + caption.gold.length) : "";
  const after = goldIndex >= 0 && caption.gold ? caption.text.slice(goldIndex + caption.gold.length) : "";
  return (
    <div style={{position: "absolute", left: 54, right: 54, bottom: 132, display: "flex", justifyContent: "center", transform: `scale(${pop})`}}>
      <div style={{maxWidth: 930, padding: "22px 30px", borderRadius: 26, color: "white", background: "linear-gradient(135deg,rgba(2,28,61,.94),rgba(6,47,96,.92))", border: "2px solid rgba(246,190,73,.65)", boxShadow: "0 16px 42px rgba(0,0,0,.38)", textAlign: "center", fontFamily: "Segoe UI, Arial, sans-serif", fontSize: 47, lineHeight: 1.18, fontWeight: 800, textShadow: "0 3px 9px rgba(0,0,0,.45)"}}>
        {highlighted ? <>{before}<span style={{color: "#F6BE49"}}>{highlighted}</span>{after}</> : caption.text}
      </div>
    </div>
  );
};

const BrollCard: React.FC<{item: Broll}> = ({item}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{opacity: enter, backgroundColor: "#031D3D"}}>
      <Img src={staticFile(item.src)} style={{width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + frame / 1500})`}} />
      <AbsoluteFill style={{background: "linear-gradient(180deg,rgba(2,24,52,.08) 45%,rgba(2,24,52,.88) 100%)"}} />
      <div style={{position: "absolute", left: 58, right: 58, bottom: 310, color: "white", fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: 48, textAlign: "center", letterSpacing: 1, textShadow: "0 4px 15px #00152c"}}>{item.label}</div>
    </AbsoluteFill>
  );
};

const BriskyAd: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const ad = ads[index];
  const seconds = frame / FPS;
  const motionPhase = Math.floor(seconds / 6) % 3;
  const local = (frame % (6 * FPS)) / (6 * FPS);
  const scale = interpolate(local, [0, 1], motionPhase === 1 ? [1.055, 1.015] : [1.01, 1.055]);
  const x = motionPhase === 2 ? interpolate(local, [0, 1], [-10, 12]) : 0;
  const activeCaption = ad.captions.find((c) => seconds >= c.from && seconds < c.to);
  const endStart = Math.max(0, Math.round((ad.duration - 5.5) * FPS));
  return (
    <AbsoluteFill style={{backgroundColor: "#031D3D", overflow: "hidden"}}>
      <Video src={staticFile(`staging/brisky-raw-ads/cuts/${ad.id}-cut.mp4`)} style={{width: "100%", height: "100%", objectFit: "cover", transform: `translateX(${x}px) scale(${scale})`}} />
      <Audio src={staticFile("staging/brisky-raw-ads/music.mp3")} volume={0.055} loop />
      <div style={{position: "absolute", top: 40, left: 42, right: 42, height: 7, borderRadius: 8, background: "rgba(255,255,255,.22)"}}>
        <div style={{height: "100%", width: `${Math.min(100, seconds / ad.duration * 100)}%`, background: "#F6BE49", borderRadius: 8}} />
      </div>
      <div style={{position: "absolute", top: 70, left: 46, padding: "12px 18px", borderRadius: 16, background: "rgba(2,28,61,.88)", color: "#F6BE49", fontFamily: "Arial, sans-serif", fontSize: 25, fontWeight: 900, letterSpacing: .5}}>BRISKY ACADEMY</div>
      <Sequence from={0} durationInFrames={90}>
        <div style={{position: "absolute", top: 160, left: 50, right: 50, color: "white", fontFamily: "Arial, sans-serif", fontSize: 57, lineHeight: 1.05, fontWeight: 950, textAlign: "center", textShadow: "0 5px 18px rgba(0,0,0,.8)"}}>{ad.hook}</div>
        <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.22} />
      </Sequence>
      {ad.broll.map((item, i) => <Sequence key={i} from={Math.round(item.from * FPS)} durationInFrames={Math.round((item.to-item.from)*FPS)}><BrollCard item={item}/><Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.16}/></Sequence>)}
      {activeCaption ? <CaptionCard caption={activeCaption} /> : null}
      <Sequence from={endStart} durationInFrames={Math.round(5.5 * FPS)}>
        <AbsoluteFill style={{background: "radial-gradient(circle at 50% 35%,#0A3970,#021A38)", alignItems: "center", justifyContent: "center"}}>
          <Img src={staticFile("staging/brisky-raw-ads/brisky-bimat-poster.png")} style={{width: "100%", height: "100%", objectFit: "contain"}} />
          <div style={{position: "absolute", bottom: 38, padding: "19px 42px", borderRadius: 999, background: "#F6BE49", color: "#05244B", fontFamily: "Arial, sans-serif", fontSize: 36, fontWeight: 950, boxShadow: "0 10px 28px rgba(0,0,0,.4)"}}>NHẤN ĐĂNG KÝ NGAY</div>
          <Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={0.22}/>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export const BRISKY_RAW_AD_DURATIONS = ads.map((ad) => Math.ceil(ad.duration * FPS));
export const BriskyRawAd01 = () => <BriskyAd index={0}/>;
export const BriskyRawAd02 = () => <BriskyAd index={1}/>;
export const BriskyRawAd03 = () => <BriskyAd index={2}/>;
export const BriskyRawAd04 = () => <BriskyAd index={3}/>;
export const BriskyRawAd05 = () => <BriskyAd index={4}/>;
