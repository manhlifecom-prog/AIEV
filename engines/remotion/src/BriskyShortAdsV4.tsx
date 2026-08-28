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

export const BRISKY_V4_FPS = 30000 / 1001;
export const BRISKY_V5_FPS = BRISKY_V4_FPS;
const AD_SPEED = 1.08;
const REFERENCE_FAST_SPEED = 1.14;
const VIDEO_HEIGHT = 1740;
const END_CARD_SECONDS = 3.6;
const CLEAR_CTA_START = 407.42;
const CLEAR_CTA_END = 409.9;
const CLEAR_CTA_SECONDS = (CLEAR_CTA_END - CLEAR_CTA_START) / AD_SPEED;
const NAVY = "#071426";
const GOLD = "#f5b942";
const CYAN = "#32d5f3";

type Segment = {
  start: number;
  end: number;
  transcript: string;
  cover: string;
  coverLabel: string;
  sourcePieces?: Array<[number, number]>;
  zoomFrom?: number;
  zoomTo?: number;
  captionPhrases?: string[];
  pauseAfterSeconds?: number;
};

type AdSpec = {
  id: string;
  source: string;
  speechAudio?: string;
  hook: string;
  voiceGain?: number;
  segments: Segment[];
};

type TimedSegment = Segment & {
  from: number;
  durationInFrames: number;
  contentDurationInFrames: number;
  pauseAfterInFrames: number;
  pieces: Array<{start: number; end: number; from: number; durationInFrames: number}>;
};

type CaptionCue = {
  from: number;
  durationInFrames: number;
  words: string[];
  kicker?: string;
  highlightText?: string;
  tone?: "orange" | "cyan";
};

type V10CaptionSpec = {
  segmentIndex: number;
  offsetSeconds: number;
  durationSeconds: number;
  text: string;
};

type V19CaptionSpec = V10CaptionSpec & {
  kicker: string;
  highlightText: string;
  tone: "orange" | "cyan";
  spokenText?: string;
  anchorSegment?: number;
  anchorOffset?: number;
};

const V10_CAPTIONS_BY_AD: Record<string, V10CaptionSpec[]> = {
  ad01: [
    {segmentIndex: 0, offsetSeconds: 0.45, durationSeconds: 1.9, text: "Cứ nhắc tới tiếng Anh là con sợ"},
    {segmentIndex: 0, offsetSeconds: 4.0, durationSeconds: 2.1, text: "Con học trước quên sau, gặp kiểm tra lại nản"},
    {segmentIndex: 0, offsetSeconds: 7.0, durationSeconds: 1.8, text: "Học thêm nhiều nơi vẫn chưa cải thiện"},
    {segmentIndex: 1, offsetSeconds: 0.8, durationSeconds: 1.8, text: "Đừng vội nghĩ con lười hay kém"},
    {segmentIndex: 1, offsetSeconds: 5.3, durationSeconds: 2.1, text: "Con không phải không có khả năng học tiếng Anh"},
    {segmentIndex: 1, offsetSeconds: 12.7, durationSeconds: 2.1, text: "Vấn đề là con đã hổng kiến thức quá lâu"},
    {segmentIndex: 2, offsetSeconds: 1.0, durationSeconds: 2.3, text: "Bí mật lấy gốc tiếng Anh siêu tốc cho con"},
    {segmentIndex: 3, offsetSeconds: 0.8, durationSeconds: 2.2, text: "3 buổi Zoom dành riêng cho ba mẹ"},
    {segmentIndex: 3, offsetSeconds: 5.4, durationSeconds: 2.2, text: "Dành cho gia đình có con từ lớp 3 đến lớp 9"},
    {segmentIndex: 4, offsetSeconds: 1.0, durationSeconds: 2.1, text: "Vì sao con học nhiều năm vẫn mất gốc?"},
    {segmentIndex: 4, offsetSeconds: 6.2, durationSeconds: 2.1, text: "Ba mẹ sẽ biết con đang hổng chính xác ở phần nào"},
    {segmentIndex: 5, offsetSeconds: 1.0, durationSeconds: 2.2, text: "Lộ trình giúp con học lại từ gốc"},
    {segmentIndex: 6, offsetSeconds: 2.1, durationSeconds: 2.2, text: "Giúp con tự giác hơn và chủ động hơn"},
    {segmentIndex: 7, offsetSeconds: 4.8, durationSeconds: 2.3, text: "Kiểm tra trình độ tiếng Anh hoàn toàn miễn phí"},
  ],
  ad02: [
    {segmentIndex: 0, offsetSeconds: 0.45, durationSeconds: 2.0, text: "Một học sinh lớp 7 từng mất gốc tiếng Anh"},
    {segmentIndex: 1, offsetSeconds: 0.55, durationSeconds: 2.1, text: "Kết thúc năm học, con đạt 8 điểm tiếng Anh"},
    {segmentIndex: 1, offsetSeconds: 4.15, durationSeconds: 2.0, text: "Niềm hạnh phúc sau một năm học nỗ lực"},
    {segmentIndex: 2, offsetSeconds: 0.7, durationSeconds: 2.2, text: "Từ 3–4 điểm lên 8 điểm là cả một quá trình"},
    {segmentIndex: 2, offsetSeconds: 6.2, durationSeconds: 2.0, text: "Kết quả đến từ nỗ lực đúng hướng"},
    {segmentIndex: 3, offsetSeconds: 0.8, durationSeconds: 2.2, text: "Lộ trình được đúc rút từ nhiều năm giảng dạy"},
    {segmentIndex: 3, offsetSeconds: 6.3, durationSeconds: 2.2, text: "Chia sẻ trong 3 buổi Zoom dành cho ba mẹ"},
    {segmentIndex: 3, offsetSeconds: 10.9, durationSeconds: 2.2, text: "Dành cho gia đình có con từ lớp 3 đến lớp 9"},
  ],
  ad03: [
    {segmentIndex: 0, offsetSeconds: 0.5, durationSeconds: 2.0, text: "Ba mẹ luôn lo con lại bị điểm kém"},
    {segmentIndex: 0, offsetSeconds: 4.5, durationSeconds: 2.0, text: "Mỗi kỳ thi tiếng Anh đều đầy áp lực"},
    {segmentIndex: 1, offsetSeconds: 0.65, durationSeconds: 2.1, text: "Học từ vựng hôm nay, ngày mai lại quên"},
    {segmentIndex: 1, offsetSeconds: 4.2, durationSeconds: 2.0, text: "Gặp bài đọc dài là con rất ngại"},
    {segmentIndex: 1, offsetSeconds: 7.6, durationSeconds: 2.1, text: "Làm bài chỉ biết khoanh theo cảm tính"},
    {segmentIndex: 1, offsetSeconds: 10.8, durationSeconds: 2.1, text: "Thuộc ngữ pháp nhưng không biết áp dụng"},
    {segmentIndex: 2, offsetSeconds: 0.8, durationSeconds: 2.2, text: "Thầy đã giúp nhiều học sinh lấy lại gốc"},
    {segmentIndex: 2, offsetSeconds: 6.3, durationSeconds: 2.2, text: "Chương trình Zoom 3 buổi dành cho ba mẹ"},
    {segmentIndex: 2, offsetSeconds: 11.1, durationSeconds: 2.1, text: "Dành cho con từ lớp 3 đến lớp 9"},
  ],
  ad04: [
    {segmentIndex: 0, offsetSeconds: 0.35, durationSeconds: 2.0, text: "Hổng từ vựng: học hôm nay, ngày mai lại quên"},
    {segmentIndex: 1, offsetSeconds: 0.4, durationSeconds: 2.0, text: "Biết từ nhưng không ghép được thành câu"},
    {segmentIndex: 2, offsetSeconds: 0.35, durationSeconds: 2.0, text: "Học ngữ pháp nhưng không biết áp dụng"},
    {segmentIndex: 3, offsetSeconds: 0.45, durationSeconds: 2.2, text: "Biết từng từ nhưng không hiểu cả đoạn"},
    {segmentIndex: 3, offsetSeconds: 3.9, durationSeconds: 2.0, text: "Đây là dấu hiệu con đang hổng đọc hiểu"},
    {segmentIndex: 4, offsetSeconds: 0.55, durationSeconds: 2.2, text: "Bí mật lấy gốc tiếng Anh siêu tốc cho con"},
    {segmentIndex: 5, offsetSeconds: 0.55, durationSeconds: 2.2, text: "3 buổi Zoom online dành riêng cho ba mẹ"},
    {segmentIndex: 5, offsetSeconds: 3.25, durationSeconds: 1.7, text: "Dành cho gia đình có con lớp 3–9"},
  ],
  ad05: [
    {segmentIndex: 0, offsetSeconds: 0.45, durationSeconds: 2.0, text: "Cứ nhắc đến tiếng Anh là con rất sợ"},
    {segmentIndex: 0, offsetSeconds: 3.8, durationSeconds: 2.0, text: "Ba mẹ đừng vội nghĩ con lười"},
    {segmentIndex: 0, offsetSeconds: 8.6, durationSeconds: 2.2, text: "Điểm thấp không có nghĩa là con lười"},
    {segmentIndex: 1, offsetSeconds: 0.7, durationSeconds: 2.2, text: "Nhiều con đã mất gốc và đang rất mông lung"},
    {segmentIndex: 2, offsetSeconds: 0.65, durationSeconds: 2.2, text: "Bí mật lấy gốc tiếng Anh siêu tốc cho con"},
    {segmentIndex: 2, offsetSeconds: 4.0, durationSeconds: 2.0, text: "3 buổi Zoom dành riêng cho ba mẹ"},
    {segmentIndex: 2, offsetSeconds: 7.2, durationSeconds: 2.0, text: "Dành cho gia đình có con lớp 3–9"},
    {segmentIndex: 3, offsetSeconds: 0.7, durationSeconds: 2.2, text: "Lộ trình từ cơ bản đến nâng cao"},
    {segmentIndex: 3, offsetSeconds: 4.6, durationSeconds: 2.2, text: "Giúp ba mẹ biết chính xác con đang ở đâu"},
  ],
};

// Compact idea cards based on the approved sharp CapCut reference: short phrases,
// visible gaps, and no attempt to subtitle every spoken word.
const REFERENCE_CAPTIONS_BY_AD: Record<string, V10CaptionSpec[]> = {
  ad02: [
    {segmentIndex: 0, offsetSeconds: 0.35, durationSeconds: 1.55, text: "Học sinh lớp 7 từng mất gốc"},
    {segmentIndex: 1, offsetSeconds: 0.35, durationSeconds: 1.55, text: "Cuối năm đạt 8 điểm tiếng Anh"},
    {segmentIndex: 1, offsetSeconds: 3.45, durationSeconds: 1.45, text: "Kết quả sau một năm nỗ lực"},
    {segmentIndex: 2, offsetSeconds: 0.45, durationSeconds: 1.55, text: "Từ 3–4 điểm lên 8 điểm"},
    {segmentIndex: 2, offsetSeconds: 5.2, durationSeconds: 1.45, text: "Nỗ lực đúng hướng tạo kết quả"},
    {segmentIndex: 3, offsetSeconds: 0.55, durationSeconds: 1.6, text: "Lộ trình từ kinh nghiệm giảng dạy"},
    {segmentIndex: 3, offsetSeconds: 6.0, durationSeconds: 1.55, text: "3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex: 3, offsetSeconds: 9.4, durationSeconds: 1.55, text: "Cha mẹ có con lớp 3–9"},
  ],
  ad03: [
    {segmentIndex: 0, offsetSeconds: 0.35, durationSeconds: 1.55, text: "Ba mẹ lo con lại bị điểm kém"},
    {segmentIndex: 0, offsetSeconds: 4.0, durationSeconds: 1.45, text: "Mỗi kỳ thi đều đầy áp lực"},
    {segmentIndex: 1, offsetSeconds: 0.4, durationSeconds: 1.55, text: "Học hôm nay, ngày mai lại quên"},
    {segmentIndex: 1, offsetSeconds: 3.65, durationSeconds: 1.45, text: "Gặp bài đọc dài là con ngại"},
    {segmentIndex: 1, offsetSeconds: 6.7, durationSeconds: 1.45, text: "Khoanh đáp án theo cảm tính"},
    {segmentIndex: 1, offsetSeconds: 9.55, durationSeconds: 1.45, text: "Thuộc ngữ pháp nhưng khó áp dụng"},
    {segmentIndex: 2, offsetSeconds: 0.45, durationSeconds: 1.55, text: "Giúp con lấy lại gốc đúng cách"},
    {segmentIndex: 2, offsetSeconds: 5.75, durationSeconds: 1.55, text: "3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex: 2, offsetSeconds: 9.4, durationSeconds: 1.5, text: "Dành cho cha mẹ có con lớp 3–9"},
  ],
  ad04: [
    {segmentIndex: 0, offsetSeconds: 0.25, durationSeconds: 1.45, text: "Hổng từ vựng: học rồi lại quên"},
    {segmentIndex: 1, offsetSeconds: 0.25, durationSeconds: 1.45, text: "Biết từ nhưng chưa ghép được câu"},
    {segmentIndex: 2, offsetSeconds: 0.25, durationSeconds: 1.45, text: "Thuộc ngữ pháp nhưng khó áp dụng"},
    {segmentIndex: 3, offsetSeconds: 0.3, durationSeconds: 1.55, text: "Biết từng từ, không hiểu cả đoạn"},
    {segmentIndex: 3, offsetSeconds: 3.4, durationSeconds: 1.45, text: "Con đang hổng phần đọc hiểu"},
    {segmentIndex: 4, offsetSeconds: 0.3, durationSeconds: 1.55, text: "Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex: 5, offsetSeconds: 0.3, durationSeconds: 1.55, text: "3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex: 5, offsetSeconds: 2.9, durationSeconds: 1.4, text: "Cha mẹ có con lớp 3–9"},
  ],
  ad05: [
    {segmentIndex: 0, offsetSeconds: 0.3, durationSeconds: 1.5, text: "Nhắc đến tiếng Anh là con sợ"},
    {segmentIndex: 0, offsetSeconds: 3.35, durationSeconds: 1.45, text: "Đừng vội nghĩ con lười"},
    {segmentIndex: 0, offsetSeconds: 7.55, durationSeconds: 1.5, text: "Điểm thấp không có nghĩa là lười"},
    {segmentIndex: 1, offsetSeconds: 0.4, durationSeconds: 1.55, text: "Con mất gốc và đang rất mông lung"},
    {segmentIndex: 2, offsetSeconds: 0.35, durationSeconds: 1.55, text: "Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex: 2, offsetSeconds: 3.45, durationSeconds: 1.5, text: "3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex: 2, offsetSeconds: 6.45, durationSeconds: 1.45, text: "Dành cho cha mẹ có con lớp 3–9"},
    {segmentIndex: 3, offsetSeconds: 0.4, durationSeconds: 1.55, text: "Lộ trình từ cơ bản đến nâng cao"},
    {segmentIndex: 3, offsetSeconds: 4.1, durationSeconds: 1.5, text: "Biết chính xác con đang ở đâu"},
  ],
};

const V13_CAPTIONS_BY_AD: Record<string, V10CaptionSpec[]> = {
  "ad02-v13": [
    {segmentIndex:0,offsetSeconds:.3,durationSeconds:1.55,text:"Học sinh lớp 7 từng mất gốc"},
    {segmentIndex:1,offsetSeconds:.35,durationSeconds:1.55,text:"Kết thúc năm học với 8 điểm"},
    {segmentIndex:1,offsetSeconds:3.9,durationSeconds:1.5,text:"Kết quả sau một năm nỗ lực"},
    {segmentIndex:2,offsetSeconds:.4,durationSeconds:1.6,text:"Từ 3–4 điểm lên 8 điểm"},
    {segmentIndex:2,offsetSeconds:5.8,durationSeconds:1.5,text:"Cả một hành trình đúng hướng"},
    {segmentIndex:3,offsetSeconds:.4,durationSeconds:1.55,text:"Ép học chỉ làm con thêm áp lực"},
    {segmentIndex:4,offsetSeconds:.45,durationSeconds:1.6,text:"Lộ trình từ kinh nghiệm giảng dạy"},
    {segmentIndex:4,offsetSeconds:7.1,durationSeconds:1.6,text:"3 buổi Zoom dành cho cha mẹ"},
    {segmentIndex:5,offsetSeconds:.4,durationSeconds:1.55,text:"Vì sao con vẫn hổng kiến thức?"},
    {segmentIndex:6,offsetSeconds:.45,durationSeconds:1.55,text:"Xây lại gốc, học chắc hơn"},
    {segmentIndex:6,offsetSeconds:5.0,durationSeconds:1.5,text:"Làm bài tốt, cải thiện điểm số"},
    {segmentIndex:7,offsetSeconds:.45,durationSeconds:1.55,text:"Kiểm tra trình độ hoàn toàn miễn phí"},
    {segmentIndex:7,offsetSeconds:5.2,durationSeconds:1.5,text:"Nhận lộ trình học tập từ gốc"},
  ],
  "ad03-v13": [
    {segmentIndex:0,offsetSeconds:.35,durationSeconds:1.55,text:"Ba mẹ lo con lại bị điểm kém"},
    {segmentIndex:0,offsetSeconds:4.3,durationSeconds:1.5,text:"Mỗi kỳ thi đều đầy áp lực"},
    {segmentIndex:1,offsetSeconds:.4,durationSeconds:1.5,text:"Học từ vựng rồi lại quên"},
    {segmentIndex:1,offsetSeconds:3.6,durationSeconds:1.5,text:"Gặp bài đọc dài là con ngại"},
    {segmentIndex:1,offsetSeconds:7.0,durationSeconds:1.5,text:"Khoanh đáp án theo cảm tính"},
    {segmentIndex:1,offsetSeconds:10.0,durationSeconds:1.5,text:"Thuộc ngữ pháp nhưng khó áp dụng"},
    {segmentIndex:2,offsetSeconds:.4,durationSeconds:1.55,text:"Càng học, con càng nản"},
    {segmentIndex:2,offsetSeconds:3.9,durationSeconds:1.5,text:"Con dễ tụt lại phía sau"},
    {segmentIndex:3,offsetSeconds:.45,durationSeconds:1.6,text:"3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex:3,offsetSeconds:7.2,durationSeconds:1.55,text:"Dành cho cha mẹ có con lớp 3–9"},
    {segmentIndex:4,offsetSeconds:.4,durationSeconds:1.55,text:"Hiểu đúng nguyên nhân mất gốc"},
    {segmentIndex:5,offsetSeconds:.45,durationSeconds:1.55,text:"Lộ trình giúp con học lại từ gốc"},
    {segmentIndex:5,offsetSeconds:5.4,durationSeconds:1.5,text:"Học chắc hơn, điểm tốt hơn"},
    {segmentIndex:6,offsetSeconds:.4,durationSeconds:1.6,text:"Kiểm tra trình độ hoàn toàn miễn phí"},
  ],
  "ad04-v13": [
    {segmentIndex:0,offsetSeconds:.35,durationSeconds:1.55,text:"Học nhiều năm vẫn sợ tiếng Anh"},
    {segmentIndex:0,offsetSeconds:5.2,durationSeconds:1.5,text:"Học trước quên sau, điểm chưa cao"},
    {segmentIndex:1,offsetSeconds:.35,durationSeconds:1.55,text:"Con chưa được học đúng phương pháp"},
    {segmentIndex:2,offsetSeconds:.3,durationSeconds:1.45,text:"Hổng từ vựng: học rồi lại quên"},
    {segmentIndex:3,offsetSeconds:.3,durationSeconds:1.45,text:"Biết từ nhưng chưa ghép được câu"},
    {segmentIndex:4,offsetSeconds:.3,durationSeconds:1.45,text:"Thuộc ngữ pháp nhưng khó áp dụng"},
    {segmentIndex:5,offsetSeconds:.35,durationSeconds:1.55,text:"Biết từng từ, không hiểu cả đoạn"},
    {segmentIndex:6,offsetSeconds:.4,durationSeconds:1.55,text:"Càng học, con càng đuối"},
    {segmentIndex:7,offsetSeconds:.35,durationSeconds:1.55,text:"Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex:8,offsetSeconds:.35,durationSeconds:1.55,text:"3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex:8,offsetSeconds:2.9,durationSeconds:1.4,text:"Cha mẹ có con lớp 3–9"},
    {segmentIndex:9,offsetSeconds:.4,durationSeconds:1.55,text:"Xác định đúng phần con đang hổng"},
    {segmentIndex:9,offsetSeconds:4.8,durationSeconds:1.55,text:"Nhận lộ trình học lại phù hợp"},
  ],
  "ad05-v13": [
    {segmentIndex:0,offsetSeconds:.35,durationSeconds:1.5,text:"Nhắc tiếng Anh là con sợ"},
    {segmentIndex:0,offsetSeconds:3.8,durationSeconds:1.5,text:"Đừng vội nghĩ con lười"},
    {segmentIndex:0,offsetSeconds:8.4,durationSeconds:1.55,text:"Điểm thấp không có nghĩa là lười"},
    {segmentIndex:1,offsetSeconds:.35,durationSeconds:1.55,text:"Con mất gốc và đang mông lung"},
    {segmentIndex:2,offsetSeconds:.4,durationSeconds:1.55,text:"Càng đuối, con càng chán nản"},
    {segmentIndex:2,offsetSeconds:5.2,durationSeconds:1.5,text:"Con không biết bắt đầu từ đâu"},
    {segmentIndex:3,offsetSeconds:.4,durationSeconds:1.55,text:"Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex:3,offsetSeconds:5.0,durationSeconds:1.5,text:"3 buổi Zoom dành cho cha mẹ"},
    {segmentIndex:4,offsetSeconds:.45,durationSeconds:1.55,text:"Từng bước giúp con lấy lại gốc"},
    {segmentIndex:4,offsetSeconds:6.5,durationSeconds:1.5,text:"Rèn lại kỹ năng đọc và viết"},
    {segmentIndex:5,offsetSeconds:.4,durationSeconds:1.55,text:"Lộ trình từ cơ bản đến nâng cao"},
    {segmentIndex:5,offsetSeconds:4.7,durationSeconds:1.5,text:"Biết chính xác con đang ở đâu"},
    {segmentIndex:6,offsetSeconds:.4,durationSeconds:1.55,text:"Kiểm tra trình độ hoàn toàn miễn phí"},
    {segmentIndex:6,offsetSeconds:4.1,durationSeconds:1.5,text:"Nhận bản đồ học tập phù hợp"},
  ],
  "ad06-v13": [
    {segmentIndex:0,offsetSeconds:.35,durationSeconds:1.55,text:"Học nhiều năm vẫn sợ tiếng Anh"},
    {segmentIndex:0,offsetSeconds:5.2,durationSeconds:1.5,text:"Học trước quên sau, điểm chưa cao"},
    {segmentIndex:1,offsetSeconds:.35,durationSeconds:1.55,text:"Con chưa được học đúng phương pháp"},
    {segmentIndex:2,offsetSeconds:.4,durationSeconds:1.55,text:"Càng học, con càng mệt"},
    {segmentIndex:2,offsetSeconds:3.5,durationSeconds:1.5,text:"Càng kiểm tra, con càng sợ"},
    {segmentIndex:3,offsetSeconds:.45,durationSeconds:1.55,text:"Lớp càng cao, bài càng dài"},
    {segmentIndex:3,offsetSeconds:4.7,durationSeconds:1.5,text:"Từ vựng và ngữ pháp nặng hơn"},
    {segmentIndex:3,offsetSeconds:8.6,durationSeconds:1.5,text:"Áp lực điểm số càng lớn"},
    {segmentIndex:4,offsetSeconds:.35,durationSeconds:1.55,text:"Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex:5,offsetSeconds:.45,durationSeconds:1.55,text:"3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex:5,offsetSeconds:5.8,durationSeconds:1.5,text:"Dành cho cha mẹ có con lớp 3–9"},
    {segmentIndex:6,offsetSeconds:.4,durationSeconds:1.55,text:"Xác định đúng phần con đang hổng"},
    {segmentIndex:6,offsetSeconds:4.8,durationSeconds:1.5,text:"Nhận lộ trình học lại phù hợp"},
  ],
};

// v14 follows the approved TDC reference: one complete idea per card,
// 3-7 words when possible, stable timing, and intentional gaps between cards.
const V14_CAPTIONS_BY_AD: Record<string, V10CaptionSpec[]> = {
  "ad02-v14": [
    {segmentIndex:0,offsetSeconds:.35,durationSeconds:1.6,text:"Học sinh lớp 7 từng mất gốc"},
    {segmentIndex:1,offsetSeconds:.35,durationSeconds:1.6,text:"Kết thúc năm học với 8 điểm"},
    {segmentIndex:1,offsetSeconds:3.9,durationSeconds:1.55,text:"Kết quả sau một năm nỗ lực"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:1.65,text:"Từ 3–4 điểm lên 8 điểm"},
    {segmentIndex:2,offsetSeconds:6.5,durationSeconds:1.55,text:"Cả một hành trình đúng hướng"},
    {segmentIndex:3,offsetSeconds:.4,durationSeconds:1.6,text:"Ép học chỉ làm con thêm áp lực"},
    {segmentIndex:4,offsetSeconds:.45,durationSeconds:1.65,text:"Lộ trình từ kinh nghiệm giảng dạy"},
    {segmentIndex:4,offsetSeconds:7.3,durationSeconds:1.6,text:"3 buổi Zoom dành cho cha mẹ"},
    {segmentIndex:4,offsetSeconds:11.8,durationSeconds:1.55,text:"Cha mẹ có con lớp 3–9"},
    {segmentIndex:5,offsetSeconds:.45,durationSeconds:1.6,text:"Vì sao con vẫn hổng kiến thức?"},
    {segmentIndex:6,offsetSeconds:.45,durationSeconds:1.6,text:"Xây lại gốc, học chắc hơn"},
    {segmentIndex:6,offsetSeconds:5.0,durationSeconds:1.55,text:"Làm bài tốt, cải thiện điểm số"},
    {segmentIndex:7,offsetSeconds:.45,durationSeconds:1.65,text:"Kiểm tra trình độ hoàn toàn miễn phí"},
    {segmentIndex:7,offsetSeconds:5.25,durationSeconds:1.55,text:"Nhận lộ trình học tập từ gốc"},
  ],
  "ad03-v14": [
    {segmentIndex:0,offsetSeconds:.4,durationSeconds:1.65,text:"Ba mẹ lo con lại bị điểm kém"},
    {segmentIndex:0,offsetSeconds:4.5,durationSeconds:1.55,text:"Mỗi kỳ thi đều đầy áp lực"},
    {segmentIndex:1,offsetSeconds:.4,durationSeconds:1.55,text:"Học từ vựng rồi lại quên"},
    {segmentIndex:1,offsetSeconds:3.5,durationSeconds:1.55,text:"Gặp bài đọc dài là con ngại"},
    {segmentIndex:1,offsetSeconds:7.1,durationSeconds:1.55,text:"Khoanh đáp án theo cảm tính"},
    {segmentIndex:1,offsetSeconds:10.4,durationSeconds:1.55,text:"Ngữ pháp khó áp dụng"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:1.6,text:"Càng học, con càng nản"},
    {segmentIndex:2,offsetSeconds:4.4,durationSeconds:1.55,text:"Con dễ tụt lại phía sau"},
    {segmentIndex:2,offsetSeconds:8.1,durationSeconds:1.65,text:"3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex:2,offsetSeconds:14.0,durationSeconds:1.55,text:"Cha mẹ có con lớp 3–9"},
    {segmentIndex:3,offsetSeconds:.45,durationSeconds:1.6,text:"Hiểu đúng nguyên nhân mất gốc"},
    {segmentIndex:3,offsetSeconds:7.0,durationSeconds:1.6,text:"Lộ trình giúp con học lại từ gốc"},
    {segmentIndex:3,offsetSeconds:12.6,durationSeconds:1.55,text:"Học chắc hơn, điểm tốt hơn"},
    {segmentIndex:4,offsetSeconds:.45,durationSeconds:1.65,text:"Kiểm tra trình độ hoàn toàn miễn phí"},
  ],
  "ad04-v14": [
    {segmentIndex:0,offsetSeconds:.4,durationSeconds:1.6,text:"Học nhiều năm vẫn sợ tiếng Anh"},
    {segmentIndex:0,offsetSeconds:4.9,durationSeconds:1.55,text:"Học trước quên sau, điểm chưa cao"},
    {segmentIndex:1,offsetSeconds:.4,durationSeconds:1.6,text:"Con chưa được học đúng phương pháp"},
    {segmentIndex:2,offsetSeconds:.35,durationSeconds:1.5,text:"Hổng từ vựng: học rồi lại quên"},
    {segmentIndex:3,offsetSeconds:.35,durationSeconds:1.5,text:"Biết từ nhưng chưa ghép được câu"},
    {segmentIndex:4,offsetSeconds:.35,durationSeconds:1.5,text:"Ngữ pháp học rồi khó áp dụng"},
    {segmentIndex:5,offsetSeconds:.4,durationSeconds:1.6,text:"Biết từng câu, không hiểu cả đoạn"},
    {segmentIndex:6,offsetSeconds:.45,durationSeconds:1.6,text:"Càng học, con càng đuối"},
    {segmentIndex:7,offsetSeconds:.4,durationSeconds:1.6,text:"Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex:8,offsetSeconds:.45,durationSeconds:1.65,text:"3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex:8,offsetSeconds:7.0,durationSeconds:1.55,text:"Cha mẹ có con lớp 3–9"},
    {segmentIndex:8,offsetSeconds:12.5,durationSeconds:1.55,text:"Học thêm nhiều vẫn chưa tiến bộ"},
    {segmentIndex:9,offsetSeconds:.45,durationSeconds:1.6,text:"Xác định đúng phần con đang hổng"},
    {segmentIndex:9,offsetSeconds:5.0,durationSeconds:1.55,text:"Nhận lộ trình học lại phù hợp"},
  ],
  "ad05-v14": [
    {segmentIndex:0,offsetSeconds:.4,durationSeconds:1.55,text:"Nhắc tiếng Anh là con sợ"},
    {segmentIndex:0,offsetSeconds:4.2,durationSeconds:1.55,text:"Đừng vội nghĩ con lười"},
    {segmentIndex:0,offsetSeconds:9.8,durationSeconds:1.6,text:"Điểm thấp không có nghĩa là lười"},
    {segmentIndex:1,offsetSeconds:.4,durationSeconds:1.6,text:"Con mất gốc và đang mông lung"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:1.6,text:"Càng đuối, con càng chán nản"},
    {segmentIndex:2,offsetSeconds:5.2,durationSeconds:1.55,text:"Con không biết bắt đầu từ đâu"},
    {segmentIndex:3,offsetSeconds:.45,durationSeconds:1.65,text:"Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex:3,offsetSeconds:5.0,durationSeconds:1.6,text:"3 buổi Zoom dành cho cha mẹ"},
    {segmentIndex:4,offsetSeconds:.4,durationSeconds:1.6,text:"Lựa chọn phương pháp phù hợp"},
    {segmentIndex:5,offsetSeconds:.45,durationSeconds:1.6,text:"Lộ trình từ cơ bản đến nâng cao"},
    {segmentIndex:5,offsetSeconds:5.1,durationSeconds:1.55,text:"Biết chính xác con đang ở đâu"},
    {segmentIndex:6,offsetSeconds:.45,durationSeconds:1.65,text:"Kiểm tra trình độ hoàn toàn miễn phí"},
    {segmentIndex:6,offsetSeconds:7.4,durationSeconds:1.55,text:"Nhận bản đồ học tập phù hợp"},
  ],
  "ad06-v14": [
    {segmentIndex:0,offsetSeconds:.4,durationSeconds:1.6,text:"Học nhiều năm vẫn sợ tiếng Anh"},
    {segmentIndex:0,offsetSeconds:4.9,durationSeconds:1.55,text:"Học trước quên sau, điểm chưa cao"},
    {segmentIndex:1,offsetSeconds:.4,durationSeconds:1.6,text:"Con chưa được học đúng phương pháp"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:1.6,text:"Càng học, con càng mệt"},
    {segmentIndex:2,offsetSeconds:3.5,durationSeconds:1.55,text:"Càng kiểm tra, con càng sợ"},
    {segmentIndex:3,offsetSeconds:.45,durationSeconds:1.6,text:"Lớp càng cao, bài càng dài"},
    {segmentIndex:3,offsetSeconds:5.0,durationSeconds:1.55,text:"Từ vựng và ngữ pháp nặng hơn"},
    {segmentIndex:3,offsetSeconds:9.7,durationSeconds:1.55,text:"Áp lực điểm số càng lớn"},
    {segmentIndex:4,offsetSeconds:.4,durationSeconds:1.6,text:"Bí mật lấy gốc tiếng Anh siêu tốc"},
    {segmentIndex:5,offsetSeconds:.45,durationSeconds:1.65,text:"3 buổi Zoom hoàn toàn miễn phí"},
    {segmentIndex:5,offsetSeconds:7.0,durationSeconds:1.55,text:"Cha mẹ có con lớp 3–9"},
    {segmentIndex:5,offsetSeconds:12.5,durationSeconds:1.55,text:"Học thêm nhiều vẫn chưa tiến bộ"},
    {segmentIndex:6,offsetSeconds:.45,durationSeconds:1.6,text:"Xác định đúng phần con đang hổng"},
    {segmentIndex:6,offsetSeconds:5.0,durationSeconds:1.55,text:"Nhận lộ trình học lại phù hợp"},
  ],
};

// v17 keeps the compact TDC card, but gives the opening and key ideas a more
// decisive advertising rhythm. Captions remain selective rather than verbatim.
const V17_CAPTIONS_BY_AD: Record<string, V10CaptionSpec[]> = {
  "ad02-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"TỪ MẤT GỐC ĐẾN 8 ĐIỂM"},
    {segmentIndex:1,offsetSeconds:.25,durationSeconds:1.7,text:"KẾT QUẢ SAU MỘT NĂM"},
    {segmentIndex:2,offsetSeconds:.25,durationSeconds:1.75,text:"TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.7,text:"ÉP HỌC CÀNG THÊM ÁP LỰC"},
    {segmentIndex:4,offsetSeconds:.25,durationSeconds:1.75,text:"LỘ TRÌNH TỪ KINH NGHIỆM THỰC TẾ"},
    {segmentIndex:4,offsetSeconds:5.5,durationSeconds:1.65,text:"3 BUỔI ZOOM CHO CHA MẸ"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.7,text:"CON ĐANG HỔNG Ở ĐÂU?"},
    {segmentIndex:6,offsetSeconds:.25,durationSeconds:1.75,text:"XÂY LẠI GỐC • HỌC CHẮC HƠN"},
    {segmentIndex:7,offsetSeconds:.25,durationSeconds:1.8,text:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad03-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"MỖI KỲ THI ĐỀU ÁP LỰC?"},
    {segmentIndex:1,offsetSeconds:.2,durationSeconds:1.65,text:"HỌC TỪ VỰNG RỒI LẠI QUÊN"},
    {segmentIndex:1,offsetSeconds:3.3,durationSeconds:1.65,text:"NGẠI BÀI ĐỌC DÀI"},
    {segmentIndex:1,offsetSeconds:6.4,durationSeconds:1.65,text:"KHOANH ĐÁP ÁN THEO CẢM TÍNH"},
    {segmentIndex:2,offsetSeconds:.2,durationSeconds:1.75,text:"CÀNG SỢ • CÀNG HỌC CÀNG NẢN"},
    {segmentIndex:2,offsetSeconds:6.1,durationSeconds:1.7,text:"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.75,text:"HIỂU ĐÚNG NGUYÊN NHÂN MẤT GỐC"},
    {segmentIndex:3,offsetSeconds:6.4,durationSeconds:1.75,text:"NHẬN LỘ TRÌNH HỌC LẠI TỪ GỐC"},
    {segmentIndex:4,offsetSeconds:.2,durationSeconds:1.8,text:"TẶNG KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad04-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"HỌC NHIỀU NĂM VẪN SỢ?"},
    {segmentIndex:1,offsetSeconds:.2,durationSeconds:1.7,text:"CON CHƯA HỌC ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:2,offsetSeconds:.2,durationSeconds:1.6,text:"HỔNG TỪ VỰNG"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.6,text:"HỔNG CÂU ĐƠN"},
    {segmentIndex:4,offsetSeconds:.2,durationSeconds:1.6,text:"HỔNG NGỮ PHÁP"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.65,text:"HỔNG ĐỌC HIỂU"},
    {segmentIndex:6,offsetSeconds:.2,durationSeconds:1.75,text:"CÀNG HỌC • CÀNG ĐUỐI"},
    {segmentIndex:7,offsetSeconds:.2,durationSeconds:1.8,text:"BÍ MẬT LẤY GỐC TIẾNG ANH"},
    {segmentIndex:8,offsetSeconds:.2,durationSeconds:1.8,text:"3 BUỔI ZOOM • CHA MẸ CÓ CON LỚP 3–9"},
    {segmentIndex:9,offsetSeconds:.2,durationSeconds:1.8,text:"BIẾT PHẦN HỔNG • NHẬN LỘ TRÌNH"},
  ],
  "ad05-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"CON SỢ TIẾNG ANH KHÔNG PHẢI VÌ LƯỜI"},
    {segmentIndex:1,offsetSeconds:.2,durationSeconds:1.7,text:"MẤT GỐC • MÔNG LUNG"},
    {segmentIndex:2,offsetSeconds:.2,durationSeconds:1.75,text:"CÀNG ĐUỐI • CÀNG CHÁN NẢN"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.8,text:"BÍ MẬT LẤY GỐC TIẾNG ANH"},
    {segmentIndex:3,offsetSeconds:5.2,durationSeconds:1.7,text:"3 BUỔI ZOOM CHO CHA MẸ"},
    {segmentIndex:4,offsetSeconds:.2,durationSeconds:1.7,text:"CHỌN ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.75,text:"LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
    {segmentIndex:6,offsetSeconds:.2,durationSeconds:1.8,text:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
};

// v19 retains every v17 timing, but describes the semantic highlight explicitly
// so the TDC card emphasizes meaning instead of coloring words by position.
const V19_CAPTIONS_BY_AD: Record<string, V19CaptionSpec[]> = {
  "ad02-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"Từ mất gốc đến 8 điểm",kicker:"HÀNH TRÌNH CỦA CON",highlightText:"8 điểm",tone:"cyan"},
    {segmentIndex:1,offsetSeconds:.25,durationSeconds:1.7,text:"Kết quả sau một năm",kicker:"KẾT QUẢ THỰC TẾ",highlightText:"một năm",tone:"cyan"},
    {segmentIndex:2,offsetSeconds:.25,durationSeconds:1.75,text:"Từ 3–4 điểm lên 8 điểm",kicker:"MỘT QUÁ TRÌNH NỖ LỰC",highlightText:"8 điểm",tone:"cyan"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.7,text:"Ép học chỉ thêm áp lực",kicker:"BA MẸ CẦN TRÁNH",highlightText:"thêm áp lực",tone:"orange"},
    {segmentIndex:4,offsetSeconds:.25,durationSeconds:1.75,text:"Lộ trình từ kinh nghiệm thực tế",kicker:"GIẢI PHÁP ĐÚNG HƯỚNG",highlightText:"kinh nghiệm thực tế",tone:"cyan"},
    {segmentIndex:4,offsetSeconds:5.5,durationSeconds:1.65,text:"3 buổi Zoom cho cha mẹ",kicker:"CHƯƠNG TRÌNH MIỄN PHÍ",highlightText:"3 buổi Zoom",tone:"cyan"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.7,text:"Con đang hổng ở đâu?",kicker:"HIỂU ĐÚNG NGUYÊN NHÂN",highlightText:"hổng ở đâu",tone:"orange"},
    {segmentIndex:6,offsetSeconds:.25,durationSeconds:1.75,text:"Xây lại gốc, học chắc hơn",kicker:"LỘ TRÌNH CHO CON",highlightText:"học chắc hơn",tone:"cyan"},
    {segmentIndex:7,offsetSeconds:.25,durationSeconds:1.8,text:"Kiểm tra trình độ miễn phí",kicker:"QUÀ TẶNG CHO CON",highlightText:"miễn phí",tone:"cyan"},
  ],
  "ad03-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"Mỗi kỳ thi đều áp lực?",kicker:"NỖI LO CỦA BA MẸ",highlightText:"đều áp lực",tone:"orange"},
    {segmentIndex:1,offsetSeconds:.2,durationSeconds:1.65,text:"Học từ vựng rồi lại quên",kicker:"DẤU HIỆU MẤT GỐC",highlightText:"lại quên",tone:"orange"},
    {segmentIndex:1,offsetSeconds:3.3,durationSeconds:1.65,text:"Gặp bài đọc dài là con ngại",kicker:"DẤU HIỆU PHỔ BIẾN",highlightText:"con ngại",tone:"orange"},
    {segmentIndex:1,offsetSeconds:6.4,durationSeconds:1.65,text:"Khoanh đáp án theo cảm tính",kicker:"KHI CON CHƯA HIỂU BÀI",highlightText:"theo cảm tính",tone:"orange"},
    {segmentIndex:2,offsetSeconds:.2,durationSeconds:1.75,text:"Càng sợ, con càng học càng nản",kicker:"VÒNG LẶP TIÊU CỰC",highlightText:"càng nản",tone:"orange"},
    {segmentIndex:2,offsetSeconds:6.1,durationSeconds:1.7,text:"3 buổi Zoom hoàn toàn miễn phí",kicker:"CHƯƠNG TRÌNH CHO BA MẸ",highlightText:"hoàn toàn miễn phí",tone:"cyan"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.75,text:"Hiểu đúng nguyên nhân mất gốc",kicker:"BẮT ĐẦU TỪ GỐC",highlightText:"đúng nguyên nhân",tone:"cyan"},
    {segmentIndex:3,offsetSeconds:6.4,durationSeconds:1.75,text:"Nhận lộ trình học lại từ gốc",kicker:"GIẢI PHÁP CHO CON",highlightText:"học lại từ gốc",tone:"cyan"},
    {segmentIndex:4,offsetSeconds:.2,durationSeconds:1.8,text:"Tặng kiểm tra trình độ miễn phí",kicker:"QUÀ TẶNG CHO CON",highlightText:"miễn phí",tone:"cyan"},
  ],
  "ad04-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"Học nhiều năm vẫn sợ?",kicker:"DẤU HIỆU MẤT GỐC",highlightText:"vẫn sợ",tone:"orange"},
    {segmentIndex:1,offsetSeconds:.2,durationSeconds:1.7,text:"Con chưa học đúng phương pháp",kicker:"NGUYÊN NHÂN THẬT",highlightText:"đúng phương pháp",tone:"cyan"},
    {segmentIndex:2,offsetSeconds:.2,durationSeconds:1.6,text:"Hổng từ vựng",kicker:"PHẦN HỔNG 01",highlightText:"Hổng từ vựng",tone:"orange"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.6,text:"Hổng câu đơn",kicker:"PHẦN HỔNG 02",highlightText:"Hổng câu đơn",tone:"orange"},
    {segmentIndex:4,offsetSeconds:.2,durationSeconds:1.6,text:"Hổng ngữ pháp",kicker:"PHẦN HỔNG 03",highlightText:"Hổng ngữ pháp",tone:"orange"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.65,text:"Hổng đọc hiểu",kicker:"PHẦN HỔNG 04",highlightText:"Hổng đọc hiểu",tone:"orange"},
    {segmentIndex:6,offsetSeconds:.2,durationSeconds:1.75,text:"Càng học, con càng đuối",kicker:"VÒNG LẶP TIÊU CỰC",highlightText:"càng đuối",tone:"orange"},
    {segmentIndex:7,offsetSeconds:.2,durationSeconds:1.8,text:"Bí mật lấy gốc tiếng Anh",kicker:"CHƯƠNG TRÌNH CHO BA MẸ",highlightText:"lấy gốc tiếng Anh",tone:"cyan"},
    {segmentIndex:8,offsetSeconds:.2,durationSeconds:1.8,text:"3 buổi Zoom cho cha mẹ lớp 3–9",kicker:"HOÀN TOÀN MIỄN PHÍ",highlightText:"3 buổi Zoom",tone:"cyan"},
    {segmentIndex:9,offsetSeconds:.2,durationSeconds:1.8,text:"Biết phần hổng, nhận lộ trình",kicker:"ĐỒNG HÀNH ĐÚNG CÁCH",highlightText:"nhận lộ trình",tone:"cyan"},
  ],
  "ad05-v14": [
    {segmentIndex:0,offsetSeconds:.2,durationSeconds:1.75,text:"Con sợ tiếng Anh không có nghĩa là lười",kicker:"ĐỪNG VỘI GẮN NHÃN",highlightText:"không có nghĩa là lười",tone:"orange"},
    {segmentIndex:1,offsetSeconds:.2,durationSeconds:1.7,text:"Mất gốc và đang mông lung",kicker:"NGUYÊN NHÂN THẬT",highlightText:"Mất gốc",tone:"orange"},
    {segmentIndex:2,offsetSeconds:.2,durationSeconds:1.75,text:"Càng đuối, con càng chán nản",kicker:"VÒNG LẶP TIÊU CỰC",highlightText:"càng chán nản",tone:"orange"},
    {segmentIndex:3,offsetSeconds:.2,durationSeconds:1.8,text:"Bí mật lấy gốc tiếng Anh",kicker:"CHƯƠNG TRÌNH CHO BA MẸ",highlightText:"lấy gốc tiếng Anh",tone:"cyan"},
    {segmentIndex:3,offsetSeconds:5.2,durationSeconds:1.7,text:"3 buổi Zoom cho cha mẹ",kicker:"HOÀN TOÀN MIỄN PHÍ",highlightText:"3 buổi Zoom",tone:"cyan"},
    {segmentIndex:4,offsetSeconds:.2,durationSeconds:1.7,text:"Chọn đúng phương pháp",kicker:"ĐỒNG HÀNH CÙNG CON",highlightText:"đúng phương pháp",tone:"cyan"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.75,text:"Lộ trình từ cơ bản đến nâng cao",kicker:"BIẾT CON ĐANG Ở ĐÂU",highlightText:"cơ bản đến nâng cao",tone:"cyan"},
    {segmentIndex:6,offsetSeconds:.2,durationSeconds:1.8,text:"Kiểm tra trình độ miễn phí",kicker:"QUÀ TẶNG CHO CON",highlightText:"miễn phí",tone:"cyan"},
  ],
};

const V19_HOOKS_BY_AD: Record<string, {kicker:string;text:string;highlightText:string;tone:"orange"|"cyan"}> = {
  "ad02-v14": {kicker:"CÂU CHUYỆN THẬT",text:"Từ 3–4 điểm lên 8 điểm",highlightText:"8 điểm",tone:"cyan"},
  "ad03-v14": {kicker:"DẤU HIỆU BA MẸ CẦN BIẾT",text:"Con đang hổng gốc?",highlightText:"hổng gốc",tone:"orange"},
  "ad04-v14": {kicker:"BỐN KHOẢNG HỔNG PHỔ BIẾN",text:"Con đang hổng phần nào?",highlightText:"hổng phần nào",tone:"orange"},
  "ad05-v14": {kicker:"BA MẸ CẦN BIẾT",text:"Đừng vội gắn nhãn con lười",highlightText:"con lười",tone:"orange"},
};

const v20Cue = (segmentIndex:number,offsetSeconds:number,durationSeconds:number,text:string,kicker:string,highlightText:string,tone:"orange"|"cyan"): V19CaptionSpec => ({
  segmentIndex,offsetSeconds,durationSeconds,text,kicker,highlightText,tone,
  spokenText:text,anchorSegment:segmentIndex,anchorOffset:offsetSeconds,
});

// v20 cues are written from the actual sentence at their anchor, not from a
// generic topic label. This keeps every visible phrase semantically in sync.
const V20_CAPTIONS_BY_AD: Record<string, V19CaptionSpec[]> = {
  "ad02-v14": [
    v20Cue(0,.18,1.85,"Học sinh lớp 7 từng mất gốc","CÂU CHUYỆN THẬT","từng mất gốc","orange"),
    v20Cue(1,.28,1.85,"Sau một năm, con được 8 điểm","KẾT QUẢ THỰC TẾ","8 điểm","cyan"),
    v20Cue(2,.25,1.85,"Từ 3–4 điểm lên 8 điểm","CẢ MỘT QUÁ TRÌNH","8 điểm","cyan"),
    v20Cue(3,.25,1.85,"Thúc ép con tạo thêm áp lực","BA MẸ CẦN TRÁNH","thêm áp lực","orange"),
    v20Cue(4,.3,1.9,"Cách học cũ khiến con sợ hãi","VẤN ĐỀ THẬT SỰ","con sợ hãi","orange"),
    v20Cue(5,.35,1.9,"Lộ trình được đúc rút từ thực tế","KINH NGHIỆM GIẢNG DẠY","đúc rút từ thực tế","cyan"),
    v20Cue(5,6.7,1.8,"Chia sẻ trong 3 buổi Zoom","CHƯƠNG TRÌNH CHO BA MẸ","3 buổi Zoom","cyan"),
    v20Cue(6,.3,1.85,"Con thường hổng kiến thức ở đâu?","HIỂU ĐÚNG NGUYÊN NHÂN","hổng kiến thức","orange"),
    v20Cue(7,.3,1.85,"Xây lại từ gốc, học chắc hơn","LỘ TRÌNH CHO CON","học chắc hơn","cyan"),
    v20Cue(7,4.2,1.75,"Làm bài tốt, đạt điểm cao hơn","KẾT QUẢ MỤC TIÊU","đạt điểm cao hơn","cyan"),
    v20Cue(8,.35,1.85,"Khơi gợi niềm yêu thích tiếng Anh","ĐỘNG LỰC BÊN TRONG","yêu thích tiếng Anh","cyan"),
    v20Cue(8,4.7,1.85,"Con tự giác và chủ động hơn","THAY ĐỔI BỀN VỮNG","tự giác và chủ động","cyan"),
    v20Cue(9,.35,1.9,"Kiểm tra trình độ hoàn toàn miễn phí","QUÀ TẶNG CHO CON","hoàn toàn miễn phí","cyan"),
    v20Cue(9,5.2,1.8,"Nhận lộ trình học tập từ gốc","SAU BUỔI KIỂM TRA","học tập từ gốc","cyan"),
  ],
  "ad03-v14": [
    v20Cue(0,.2,1.85,"Trước mỗi kỳ thi, ba mẹ rất lo","NỖI LO CỦA BA MẸ","rất lo","orange"),
    v20Cue(0,4.3,1.75,"Con lại bị điểm kém?","ÁP LỰC ĐIỂM SỐ","điểm kém","orange"),
    v20Cue(1,.25,1.75,"Học từ vựng rồi lại quên","DẤU HIỆU MẤT GỐC","lại quên","orange"),
    v20Cue(1,3.5,1.75,"Gặp bài đọc dài là con ngại","DẤU HIỆU PHỔ BIẾN","con ngại","orange"),
    v20Cue(1,7.0,1.75,"Khoanh đáp án theo cảm tính","KHI CON CHƯA HIỂU BÀI","theo cảm tính","orange"),
    v20Cue(1,10.3,1.75,"Không biết áp dụng ngữ pháp","PHẦN KIẾN THỨC BỊ HỔNG","áp dụng ngữ pháp","orange"),
    v20Cue(2,.25,1.85,"Lớp càng cao, bài đọc càng dài","ÁP LỰC TĂNG DẦN","càng dài","orange"),
    v20Cue(2,5.3,1.75,"Từ vựng ngày càng khó hơn","KIẾN THỨC NẶNG HƠN","khó hơn","orange"),
    v20Cue(3,.25,1.9,"Càng sợ, con càng học càng nản","VÒNG LẶP TIÊU CỰC","càng nản","orange"),
    v20Cue(3,7.0,1.85,"3 buổi Zoom dành cho cha mẹ","CHƯƠNG TRÌNH MIỄN PHÍ","3 buổi Zoom","cyan"),
    v20Cue(4,.25,1.85,"Hiểu nguyên nhân con mất gốc","BẮT ĐẦU TỪ GỐC","nguyên nhân","cyan"),
    v20Cue(4,7.0,1.85,"Nhận lộ trình học lại từ gốc","GIẢI PHÁP CHO CON","học lại từ gốc","cyan"),
    v20Cue(4,14.1,1.85,"Khơi lại động lực học tập","GIÚP CON TỰ GIÁC","động lực học tập","cyan"),
    v20Cue(5,.3,1.9,"Kiểm tra trình độ hoàn toàn miễn phí","QUÀ TẶNG CHO CON","hoàn toàn miễn phí","cyan"),
  ],
  "ad04-v14": [
    v20Cue(0,.2,1.85,"Học nhiều năm vẫn sợ tiếng Anh","DẤU HIỆU MẤT GỐC","vẫn sợ tiếng Anh","orange"),
    v20Cue(0,4.4,1.7,"Học trước rồi lại quên sau","VÒNG LẶP QUEN THUỘC","lại quên sau","orange"),
    v20Cue(1,.25,1.85,"Con chưa tiếp cận đúng phương pháp","NGUYÊN NHÂN THẬT","đúng phương pháp","cyan"),
    v20Cue(2,.2,1.7,"Hổng từ vựng, học rồi lại quên","PHẦN HỔNG 01","Hổng từ vựng","orange"),
    v20Cue(3,.2,1.7,"Biết từ nhưng chưa ghép được câu","PHẦN HỔNG 02","chưa ghép được câu","orange"),
    v20Cue(4,.2,1.7,"Học ngữ pháp nhưng không biết áp dụng","PHẦN HỔNG 03","không biết áp dụng","orange"),
    v20Cue(5,.2,1.75,"Biết từng câu nhưng không hiểu cả đoạn","PHẦN HỔNG 04","không hiểu cả đoạn","orange"),
    v20Cue(6,.25,1.85,"Càng học, con càng mệt và sợ","VÒNG LẶP TIÊU CỰC","càng mệt và sợ","orange"),
    v20Cue(7,.2,1.85,"Lớp 3–5 cần xây nền tảng chắc","GIAI ĐOẠN NỀN TẢNG","nền tảng chắc","cyan"),
    v20Cue(8,.2,1.9,"Bí mật lấy gốc tiếng Anh cho con","CHƯƠNG TRÌNH CHO BA MẸ","lấy gốc tiếng Anh","cyan"),
    v20Cue(9,.25,1.9,"3 buổi Zoom dành cho cha mẹ lớp 3–9","HOÀN TOÀN MIỄN PHÍ","3 buổi Zoom","cyan"),
    v20Cue(9,7.0,1.8,"Yếu, mất gốc, học trước quên sau","ĐÚNG ĐỐI TƯỢNG CẦN HỖ TRỢ","mất gốc","orange"),
    v20Cue(10,.2,1.85,"Nhận biết con đang hổng phần nào","NỘI DUNG 3 BUỔI","hổng phần nào","cyan"),
    v20Cue(11,.25,1.85,"Giúp con lấy lại gốc nhanh hơn","LỘ TRÌNH PHÙ HỢP","lấy lại gốc","cyan"),
    v20Cue(11,4.7,1.8,"Học chắc và làm bài tốt hơn","KẾT QUẢ MỤC TIÊU","làm bài tốt hơn","cyan"),
  ],
  "ad05-v14": [
    v20Cue(0,.2,1.85,"Cứ nhắc tiếng Anh là con sợ","DẤU HIỆU BA MẸ NHẬN THẤY","con sợ","orange"),
    v20Cue(0,5.1,1.85,"Đừng vội nghĩ con lười","ĐỪNG VỘI GẮN NHÃN","con lười","orange"),
    v20Cue(1,.2,1.85,"Con mất gốc và mông lung định hướng","NGUYÊN NHÂN THẬT","mất gốc","orange"),
    v20Cue(2,.2,1.8,"Học từ vựng rồi lại quên sau","BIỂU HIỆN CỤ THỂ","lại quên sau","orange"),
    v20Cue(2,5.4,1.8,"Học ngữ pháp này lại quên ngữ pháp kia","KIẾN THỨC KHÔNG LIÊN KẾT","lại quên","orange"),
    v20Cue(3,.2,1.85,"Càng đuối, con càng chán nản","VÒNG LẶP TIÊU CỰC","càng chán nản","orange"),
    v20Cue(4,.25,1.9,"Bí mật lấy gốc tiếng Anh cho con","CHƯƠNG TRÌNH CHO BA MẸ","lấy gốc tiếng Anh","cyan"),
    v20Cue(4,6.0,1.85,"3 buổi Zoom dành cho cha mẹ lớp 3–9","HOÀN TOÀN MIỄN PHÍ","3 buổi Zoom","cyan"),
    v20Cue(5,.25,1.85,"Từng bước chia sẻ phương pháp","NỘI DUNG 3 BUỔI","chia sẻ phương pháp","cyan"),
    v20Cue(5,5.0,1.8,"Giúp con dần lấy lại gốc","GIẢI PHÁP CHO CON","lấy lại gốc","cyan"),
    v20Cue(6,.2,1.75,"Lựa chọn phương pháp phù hợp","ĐỒNG HÀNH ĐÚNG CÁCH","phương pháp phù hợp","cyan"),
    v20Cue(7,.25,1.85,"Lộ trình từ cơ bản đến nâng cao","BIẾT CON ĐANG Ở ĐÂU","cơ bản đến nâng cao","cyan"),
    v20Cue(7,6.4,1.8,"Xác định mục tiêu phù hợp cho con","ĐÍCH ĐẾN RÕ RÀNG","mục tiêu phù hợp","cyan"),
    v20Cue(8,.25,1.9,"Kiểm tra trình độ, nhận bản đồ học tập","QUÀ TẶNG CHO CON","bản đồ học tập","cyan"),
  ],
};

const V22_CAPTIONS_BY_AD: Record<string, V19CaptionSpec[]> = {
  "ad04-v31":[
    v20Cue(0,.18,1.8,"Học nhiều năm vẫn sợ tiếng Anh","DẤU HIỆU MẤT GỐC","vẫn sợ tiếng Anh","orange"),
    v20Cue(0,3.9,1.7,"Học trước rồi lại quên sau","VÒNG LẶP QUEN THUỘC","lại quên sau","orange"),
    v20Cue(1,.2,1.8,"Con chưa học đúng phương pháp","NGUYÊN NHÂN THẬT","đúng phương pháp","cyan"),
    v20Cue(2,.15,1.65,"Hổng từ vựng, học rồi lại quên","PHẦN HỔNG 01","Hổng từ vựng","orange"),
    v20Cue(3,.15,1.65,"Biết từ nhưng chưa ghép được câu","PHẦN HỔNG 02","chưa ghép được câu","orange"),
    v20Cue(4,.15,1.65,"Học ngữ pháp nhưng không biết áp dụng","PHẦN HỔNG 03","không biết áp dụng","orange"),
    v20Cue(5,.12,1.65,"Học thêm nhiều, điểm vẫn không lên","HỆ QUẢ KÉO DÀI","điểm vẫn không lên","orange"),
    v20Cue(6,.18,1.85,"Bí mật lấy gốc tiếng Anh cho con","CHƯƠNG TRÌNH CHO BA MẸ","lấy gốc tiếng Anh","cyan"),
    v20Cue(7,.18,1.8,"3 buổi Zoom cho cha mẹ lớp 3–9","HOÀN TOÀN MIỄN PHÍ","3 buổi Zoom","cyan"),
    v20Cue(8,.18,1.75,"Nhận biết con đang yếu phần nào","NỘI DUNG 3 BUỔI","yếu phần nào","cyan"),
    v20Cue(9,.18,1.75,"Đọc, viết, ngữ pháp, kỹ năng làm bài","LỘ TRÌNH PHÙ HỢP","kỹ năng làm bài","cyan"),
  ],
  "ad04-v22":[
    v20Cue(0,.18,1.8,"Học nhiều năm vẫn sợ tiếng Anh","DẤU HIỆU MẤT GỐC","vẫn sợ tiếng Anh","orange"),
    v20Cue(0,3.9,1.7,"Học trước rồi lại quên sau","VÒNG LẶP QUEN THUỘC","lại quên sau","orange"),
    v20Cue(1,.2,1.8,"Con chưa học đúng phương pháp","NGUYÊN NHÂN THẬT","đúng phương pháp","cyan"),
    v20Cue(2,.15,1.65,"Hổng từ vựng, học rồi lại quên","PHẦN HỔNG 01","Hổng từ vựng","orange"),
    v20Cue(3,.15,1.65,"Biết từ nhưng chưa ghép được câu","PHẦN HỔNG 02","chưa ghép được câu","orange"),
    v20Cue(4,.15,1.65,"Học ngữ pháp nhưng không biết áp dụng","PHẦN HỔNG 03","không biết áp dụng","orange"),
    v20Cue(5,.15,1.75,"Biết từng câu nhưng không hiểu cả đoạn","PHẦN HỔNG 04","không hiểu cả đoạn","orange"),
    v20Cue(6,.12,1.65,"Lớp càng cao, con càng đuối","HỆ QUẢ KÉO DÀI","càng đuối","orange"),
    v20Cue(7,.18,1.85,"Bí mật lấy gốc tiếng Anh cho con","CHƯƠNG TRÌNH CHO BA MẸ","lấy gốc tiếng Anh","cyan"),
    v20Cue(8,.18,1.8,"3 buổi Zoom cho cha mẹ lớp 3–9","HOÀN TOÀN MIỄN PHÍ","3 buổi Zoom","cyan"),
    v20Cue(9,.18,1.75,"Nhận biết con đang yếu phần nào","NỘI DUNG 3 BUỔI","yếu phần nào","cyan"),
    v20Cue(10,.18,1.75,"Đọc, viết, ngữ pháp, kỹ năng làm bài","LỘ TRÌNH PHÙ HỢP","kỹ năng làm bài","cyan"),
  ],
  "ad05-v22":[
    v20Cue(0,.18,1.75,"Cứ nhắc tiếng Anh là con sợ","DẤU HIỆU BA MẸ NHẬN THẤY","con sợ","orange"),
    v20Cue(0,1.75,1.65,"Đừng vội nghĩ con lười","ĐỪNG VỘI GẮN NHÃN","con lười","orange"),
    v20Cue(1,.18,1.75,"Con mất gốc và mông lung định hướng","NGUYÊN NHÂN THẬT","mất gốc","orange"),
    v20Cue(2,.15,1.65,"Học từ vựng rồi lại quên sau","BIỂU HIỆN CỤ THỂ","lại quên sau","orange"),
    v20Cue(3,.15,1.65,"Càng đuối, con càng chán nản","VÒNG LẶP TIÊU CỰC","càng chán nản","orange"),
    v20Cue(4,.18,1.8,"Ba mẹ chưa biết làm sao để con yêu tiếng Anh","NỖI LO CỦA BA MẸ","yêu tiếng Anh","orange"),
    v20Cue(5,.18,1.85,"Bí mật lấy gốc tiếng Anh cho con","CHƯƠNG TRÌNH CHO BA MẸ","lấy gốc tiếng Anh","cyan"),
    v20Cue(5,5.2,1.75,"3 buổi Zoom cho cha mẹ lớp 3–9","HOÀN TOÀN MIỄN PHÍ","3 buổi Zoom","cyan"),
    v20Cue(6,.18,1.75,"Từng bước chia sẻ phương pháp","NỘI DUNG 3 BUỔI","chia sẻ phương pháp","cyan"),
    v20Cue(6,2.7,1.7,"Giúp con lấy lại gốc tiếng Anh","GIẢI PHÁP CHO CON","lấy lại gốc","cyan"),
    v20Cue(7,.18,1.8,"Lộ trình từ cơ bản đến nâng cao","BIẾT CON ĐANG Ở ĐÂU","cơ bản đến nâng cao","cyan"),
    v20Cue(8,.18,1.8,"Kiểm tra trình độ, nhận bản đồ học tập","QUÀ TẶNG CHO CON","bản đồ học tập","cyan"),
  ],
};

const V23_CAPTIONS_BY_AD: Record<string, V19CaptionSpec[]> = {
  "ad02-v23":[
    v20Cue(0,2.25,1.55,"Học sinh lớp 7 từng mất gốc tiếng Anh","CÂU CHUYỆN THẬT","mất gốc tiếng Anh","orange"),
    v20Cue(1,.18,1.5,"Sau một năm nỗ lực","HÀNH TRÌNH CỦA CON","một năm nỗ lực","cyan"),
    v20Cue(1,2.35,1.65,"Con đạt 8 điểm môn tiếng Anh","KẾT QUẢ THỰC TẾ","8 điểm môn tiếng Anh","cyan"),
    v20Cue(2,.15,1.55,"Từ 3–4 điểm lên 8 điểm","SỰ TIẾN BỘ RÕ RỆT","lên 8 điểm","cyan"),
    v20Cue(2,2.75,1.55,"Đó là cả một quá trình nỗ lực","KHÔNG CÓ ĐƯỜNG TẮT","quá trình nỗ lực","cyan"),
    v20Cue(3,.15,1.55,"Thúc ép chỉ tạo thêm áp lực","BA MẸ CẦN TRÁNH","thêm áp lực","orange"),
    v20Cue(4,.15,1.55,"Cách học cũ khiến con sợ hãi","SAI LẦM PHỔ BIẾN","con sợ hãi","orange"),
    v20Cue(4,3.15,1.55,"Con bị tâm lý trước mỗi kỳ thi","HỆ QUẢ KÉO DÀI","tâm lý trước mỗi kỳ thi","orange"),
    v20Cue(5,.18,1.55,"Lộ trình được đúc rút từ thực tế","KINH NGHIỆM GIẢNG DẠY","đúc rút từ thực tế","cyan"),
    v20Cue(5,3.25,1.55,"Chia sẻ trong 3 buổi Zoom","CHƯƠNG TRÌNH CHO BA MẸ","3 buổi Zoom","cyan"),
    v20Cue(5,7.05,1.55,"Dành cho cha mẹ có con lớp 3–9","ĐÚNG ĐỐI TƯỢNG","lớp 3–9","cyan"),
    v20Cue(5,10.2,1.55,"Yếu hoặc mất gốc tiếng Anh","VẤN ĐỀ CẦN GIẢI QUYẾT","mất gốc tiếng Anh","orange"),
    v20Cue(6,.15,1.55,"Vì sao học nhiều năm vẫn hổng?","HIỂU ĐÚNG NGUYÊN NHÂN","vẫn hổng","orange"),
    v20Cue(6,3.55,1.65,"Con đang hổng kiến thức ở phần nào?","XÁC ĐỊNH ĐÚNG CHỖ HỔNG","phần nào","orange"),
    v20Cue(7,.15,1.55,"Xây lại kiến thức từ gốc","LỘ TRÌNH CHO CON","từ gốc","cyan"),
    v20Cue(7,2.65,1.5,"Học chắc và làm bài tốt hơn","KẾT QUẢ MỤC TIÊU","tốt hơn","cyan"),
    v20Cue(7,5.15,1.55,"Tiến tới điểm số cao hơn","THAY ĐỔI RÕ RỆT","điểm số cao hơn","cyan"),
    v20Cue(8,.15,1.55,"Khơi gợi niềm yêu thích tiếng Anh","ĐỘNG LỰC BÊN TRONG","yêu thích tiếng Anh","cyan"),
    v20Cue(8,3.05,1.5,"Con tự giác và chủ động hơn","THAY ĐỔI BỀN VỮNG","tự giác và chủ động","cyan"),
    v20Cue(8,5.55,1.5,"Con yêu tiếng Anh hơn","KẾT QUẢ SAU CÙNG","yêu tiếng Anh hơn","cyan"),
    v20Cue(9,.15,1.6,"Kiểm tra trình độ hoàn toàn miễn phí","QUÀ TẶNG CHO CON","hoàn toàn miễn phí","cyan"),
    v20Cue(9,4.05,1.55,"Nhận lộ trình học tập từ gốc","SAU BUỔI KIỂM TRA","lộ trình học tập","cyan"),
  ],
};

const V20_HOOKS_BY_AD: typeof V19_HOOKS_BY_AD = {
  "ad02-v14": {kicker:"CÂU CHUYỆN THẬT",text:"Học sinh lớp 7 từng mất gốc",highlightText:"từng mất gốc",tone:"orange"},
  "ad03-v14": {kicker:"NỖI LO CỦA BA MẸ",text:"Trước mỗi kỳ thi, ba mẹ rất lo",highlightText:"rất lo",tone:"orange"},
  "ad04-v14": {kicker:"DẤU HIỆU MẤT GỐC",text:"Học nhiều năm vẫn sợ tiếng Anh",highlightText:"vẫn sợ tiếng Anh",tone:"orange"},
  "ad05-v14": {kicker:"ĐỪNG VỘI GẮN NHÃN",text:"Đừng vội nghĩ con lười",highlightText:"con lười",tone:"orange"},
  "ad04-v22": {kicker:"DẤU HIỆU MẤT GỐC",text:"Học nhiều năm vẫn sợ tiếng Anh",highlightText:"vẫn sợ tiếng Anh",tone:"orange"},
  "ad05-v22": {kicker:"ĐỪNG VỘI GẮN NHÃN",text:"Đừng vội nghĩ con lười",highlightText:"con lười",tone:"orange"},
};

const ads: AdSpec[] = [
  {
    id: "ad01",
    source: "staging/brisky-raw-ads/ad01.mp4",
    hook: "HỌC NHIỀU VẪN MẤT GỐC?",
    segments: [
      {
        start: 7.42,
        end: 18.1,
        transcript: "Cứ nhắc tới tiếng Anh là sợ, học trước quên sau, hay cứ gặp bài kiểm tra trên lớp lại rất nản. Ba mẹ cho con đi học thêm nhiều nơi rồi nhưng vẫn chưa cải thiện được tình hình.",
        cover: "staging/brisky-older-students/older-student-certificate.png",
        coverLabel: "HỌC NHIỀU NƠI • VẪN CHƯA TIẾN BỘ",
        zoomFrom: 1.01,
        zoomTo: 1.035,
        captionPhrases: [
          "Cứ nhắc tới tiếng Anh là con sợ",
          "Con học trước quên sau, gặp kiểm tra lại nản",
          "Ba mẹ cho con học thêm nhiều nơi nhưng vẫn chưa cải thiện",
        ],
      },
      {
        start: 20.22,
        end: 41.28,
        transcript: "Vậy thì ba mẹ đừng vội nghĩ là con lười hay kém nhé. Rất nhiều bạn không phải là không có khả năng học tiếng Anh. Vấn đề là con đã bị hổng kiến thức và mất gốc quá lâu rồi nhưng chưa được học lại một cách đúng đắn. Ví dụ như có bạn học từ vựng ngày hôm nay nhưng đến vài hôm sau, thậm chí đến ngày mai thôi là con đã quên sạch.",
        cover: "staging/brisky-older-students/teen-interview.png",
        coverLabel: "ĐỪNG VỘI GẮN NHÃN CON LƯỜI",
        zoomFrom: 1.035,
        zoomTo: 1.012,
        captionPhrases: [
          "Đừng vội nghĩ con lười hay kém",
          "Nhiều bạn không phải là không có khả năng học tiếng Anh",
          "Vấn đề là con đã hổng kiến thức quá lâu",
          "Con chưa được học lại đúng cách",
          "Con học từ vựng hôm nay, ngày mai đã quên",
        ],
      },
      {
        start: 124.16,
        end: 128.98,
        transcript: "Chính vì vậy, thầy cùng đội ngũ sẽ tổ chức một chương trình có tên là Bí mật lấy gốc tiếng Anh cho con.",
        cover: "staging/brisky-real/04-brisky-teachers.jpg",
        coverLabel: "LỘ TRÌNH LẤY GỐC ĐÚNG CÁCH",
        zoomFrom: 1.012,
        zoomTo: 1.035,
        captionPhrases: [
          "Thầy cùng đội ngũ tổ chức chương trình lấy lại gốc tiếng Anh",
          "Bí mật lấy gốc tiếng Anh siêu tốc cho con",
        ],
      },
      {
        start: 152.56,
        end: 165.72,
        transcript: "Đây là chương trình Zoom 3 buổi dành riêng cho ba mẹ có con từ lớp 3 đến lớp 9, đang yếu tiếng Anh, mất gốc hoặc điểm thấp. Dù ba mẹ đã cho con học thêm rất nhiều nhưng con vẫn chưa tiến bộ rõ rệt.",
        cover: "staging/brisky-older-students/zoom-class.png",
        coverLabel: "3 BUỔI ZOOM • CHA MẸ CÓ CON LỚP 3–9",
        zoomFrom: 1.035,
        zoomTo: 1.014,
        captionPhrases: [
          "Chương trình gồm 3 buổi Zoom dành riêng cho ba mẹ",
          "Dành cho gia đình có con từ lớp 3 đến lớp 9",
          "Phù hợp với con yếu tiếng Anh, mất gốc hoặc điểm thấp",
          "Dù đã học thêm nhiều, con vẫn chưa tiến bộ rõ rệt",
        ],
      },
      {
        start: 165.72,
        end: 176.96,
        transcript: "Trong 3 buổi này, thầy sẽ chia sẻ với ba mẹ vì sao con học tiếng Anh nhiều năm nhưng vẫn mất gốc, vẫn hổng kiến thức và con thường hổng ở những phần nào.",
        cover: "staging/brisky-older-students/teen-interview.png",
        coverLabel: "HIỂU ĐÚNG PHẦN CON ĐANG HỔNG",
        zoomFrom: 1.014,
        zoomTo: 1.036,
        captionPhrases: [
          "Trong 3 buổi, thầy sẽ giúp ba mẹ hiểu rõ nguyên nhân",
          "Vì sao con học nhiều năm vẫn mất gốc hoặc hổng kiến thức",
          "Ba mẹ sẽ biết con đang hổng chính xác ở phần nào",
        ],
      },
      {
        start: 178.16,
        end: 186.9,
        transcript: "Đặc biệt, thầy sẽ chia sẻ với ba mẹ một lộ trình giúp con học lại từ gốc, học chắc hơn, làm bài tốt hơn và đạt điểm cao trên trường.",
        cover: "staging/brisky-older-students/cambridge-results-group.png",
        coverLabel: "LỘ TRÌNH HỌC LẠI TỪ GỐC",
        zoomFrom: 1.014,
        zoomTo: 1.036,
        captionPhrases: [
          "Ba mẹ sẽ nhận lộ trình giúp con học lại từ gốc",
          "Giúp con học chắc hơn và làm bài tốt hơn",
          "Từng bước hướng tới điểm số cao hơn trên trường",
        ],
      },
      {
        start: 187.77,
        end: 196.89,
        transcript: "Đặc biệt nữa là làm thế nào để ba mẹ thúc đẩy động lực học tập bên trong con, giúp con tự giác hơn, chủ động hơn và yêu tiếng Anh hơn.",
        cover: "staging/brisky-older-students/older-student-certificate.png",
        coverLabel: "GIÚP CON TỰ GIÁC • CHỦ ĐỘNG HƠN",
        zoomFrom: 1.036,
        zoomTo: 1.015,
        captionPhrases: [
          "Ba mẹ sẽ biết cách thúc đẩy động lực học tập bên trong con",
          "Giúp con tự giác hơn và chủ động hơn",
          "Từng bước giúp con yêu tiếng Anh hơn",
        ],
      },
      {
        start: 212.41,
        end: 225.83,
        transcript: "Ba mẹ không cần phải giỏi tiếng Anh để tham gia. Thầy còn dành tặng con một buổi kiểm tra trình độ tiếng Anh hoàn toàn miễn phí cùng các thầy cô có chuyên môn cao.",
        cover: "staging/brisky-older-students/cambridge-results-group.png",
        coverLabel: "KIỂM TRA TRÌNH ĐỘ HOÀN TOÀN MIỄN PHÍ",
        zoomFrom: 1.015,
        zoomTo: 1.036,
        captionPhrases: [
          "Ba mẹ không cần giỏi tiếng Anh để tham gia",
          "Con được kiểm tra trình độ tiếng Anh hoàn toàn miễn phí",
          "Buổi kiểm tra có các thầy cô chuyên môn cao đồng hành",
        ],
      },
      {
        start: 235.83,
        end: 238.11,
        transcript: "Chỉ cần click vào cái link bên dưới.",
        cover: "staging/brisky-real/07-brisky-students.jpg",
        coverLabel: "3 BUỔI HOÀN TOÀN MIỄN PHÍ",
        zoomFrom: 1.035,
        zoomTo: 1.015,
      },
    ],
  },
  {
    id: "ad02",
    source: "staging/brisky-raw-ads/ad02.mp4",
    hook: "TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM",
    segments: [
      {
        start: 3.02,
        end: 7.94,
        transcript: "Trên đây là đoạn nói chuyện giữa thầy và một mẹ có con học lớp 7, bạn bị mất gốc tiếng Anh.",
        cover: "staging/brisky-real/07-brisky-students.jpg",
        coverLabel: "HỌC SINH LỚP 7 • MẤT GỐC TIẾNG ANH",
        zoomFrom: 1.01,
        zoomTo: 1.035,
      },
      {
        start: 15.21,
        end: 22.5,
        transcript: "Và dưới đây cũng chính là mẹ ấy chia sẻ với thầy niềm hạnh phúc sau khi con kết thúc năm học vừa rồi, con được 8 điểm môn tiếng Anh.",
        cover: "staging/brisky-real/06-student-activity.jpg",
        coverLabel: "KẾT QUẢ: 8 ĐIỂM TIẾNG ANH",
        zoomFrom: 1.035,
        zoomTo: 1.014,
      },
      {
        start: 30.0,
        end: 41.73,
        transcript: "Thế nhưng ba mẹ biết không, đối với một bạn đang mất gốc, từ 3–4 điểm mà lên được 8 điểm thì đấy là cả một quá trình và sự nỗ lực.",
        cover: "staging/brisky-generated-v3/04-level-assessment.png",
        coverLabel: "MỘT QUÁ TRÌNH NỖ LỰC ĐÚNG HƯỚNG",
        zoomFrom: 1.014,
        zoomTo: 1.038,
      },
      {
        start: 106.77,
        end: 121.95,
        transcript: "Và chính vì vậy, sau rất nhiều năm trực tiếp giảng dạy cho các bạn học sinh mất gốc, thầy đã đúc rút ra một lộ trình học tập cho con và sẽ chia sẻ lộ trình này trong 3 buổi Zoom dành riêng cho ba mẹ có con học từ lớp 3 đến lớp 9.",
        cover: "staging/brisky-real/04-brisky-teachers.jpg",
        coverLabel: "3 BUỔI ZOOM • CHA MẸ CÓ CON LỚP 3–9",
        zoomFrom: 1.038,
        zoomTo: 1.016,
      },
      {
        start: 212.78,
        end: 213.78,
        transcript: "Hãy nhấn vào link bên dưới.",
        cover: "staging/brisky-real/05-class-lesson.jpg",
        coverLabel: "NHẤN ĐĂNG KÝ ĐỂ NHẬN HƯỚNG DẪN",
        zoomFrom: 1.016,
        zoomTo: 1.035,
      },
    ],
  },
  {
    id: "ad03",
    source: "staging/brisky-raw-ads/ad03.mp4",
    hook: "DẤU HIỆU CON ĐANG HỔNG GỐC",
    segments: [
      {
        start: 6.13,
        end: 14.81,
        transcript: "Nếu trước mỗi kỳ thi học kỳ tiếng Anh hay những bài kiểm tra tiếng Anh mà ba mẹ rất hồi hộp, lo lắng, không biết con có làm được bài hay lại bị điểm kém.",
        cover: "staging/brisky-real/06-student-activity.jpg",
        coverLabel: "LO LẮNG TRƯỚC MỖI BÀI KIỂM TRA",
        zoomFrom: 1.01,
        zoomTo: 1.035,
      },
      {
        start: 25.04,
        end: 39.72,
        transcript: "Ví dụ như con học từ vựng ngày hôm nay nhưng ngày mai có thể quên luôn, gặp bài đọc dài là rất ngại, không muốn đọc. Con làm bài kiểm tra chỉ biết khoanh theo cảm tính, học thuộc ngữ pháp nhưng không biết áp dụng như thế nào.",
        cover: "staging/brisky-generated-v3/02-long-reading.png",
        coverLabel: "THUỘC NHƯNG KHÔNG BIẾT ÁP DỤNG",
        zoomFrom: 1.035,
        zoomTo: 1.013,
      },
      {
        start: 89.0,
        end: 104.98,
        transcript: "Và chính vì vậy, sau rất nhiều năm tháng trực tiếp giảng dạy cho các bạn mất gốc tiếng Anh và giúp các bạn lấy lại gốc, thầy quyết định tổ chức một chương trình Zoom trong vòng 3 buổi dành riêng cho ba mẹ có con từ lớp 3 đến lớp 9 đang gặp những vấn đề trên.",
        cover: "staging/brisky-real/04-brisky-teachers.jpg",
        coverLabel: "3 BUỔI ZOOM • LỘ TRÌNH LẤY GỐC",
        zoomFrom: 1.013,
        zoomTo: 1.038,
      },
      {
        start: 157.98,
        end: 162.0,
        transcript: "Nếu ba mẹ quan tâm, hãy comment ở dưới link.",
        cover: "staging/brisky-real/07-brisky-students.jpg",
        coverLabel: "NHẬN LỘ TRÌNH TỪ BRISKY",
        zoomFrom: 1.038,
        zoomTo: 1.016,
      },
    ],
  },
  {
    id: "ad04",
    source: "staging/brisky-raw-ads/ad04.mp4",
    hook: "CON ĐANG HỔNG PHẦN NÀO?",
    voiceGain: 0.88,
    segments: [
      {
        start: 115.56,
        end: 119.84,
        transcript: "Có bạn thì hổng từ vựng, cứ học hôm nay thì ngày mai lại quên.",
        cover: "staging/brisky-generated-v3/01-vocabulary-forgotten.png",
        coverLabel: "HỔNG TỪ VỰNG",
        zoomFrom: 1.01,
        zoomTo: 1.035,
      },
      {
        start: 133.38,
        end: 138.32,
        transcript: "Có bạn thì lại hổng câu đơn, biết từ vựng nhưng không biết làm thế nào để ghép được thành câu.",
        cover: "staging/brisky-real/05-class-lesson.jpg",
        coverLabel: "HỔNG CÂU ĐƠN",
        zoomFrom: 1.035,
        zoomTo: 1.013,
      },
      {
        start: 142.45,
        end: 146.86,
        transcript: "Có bạn thì lại hổng ngữ pháp, học được rồi nhưng không biết làm sao để có thể áp dụng.",
        cover: "staging/brisky-generated-v3/03-grammar-application.png",
        coverLabel: "HỔNG NGỮ PHÁP",
        zoomFrom: 1.013,
        zoomTo: 1.038,
      },
      {
        start: 154.0,
        end: 161.21,
        transcript: "Có bạn thì lại hổng phần đọc hiểu, biết từng từ, biết từng câu nhưng không biết làm thế nào để có thể hiểu được cả đoạn.",
        cover: "staging/brisky-generated-v3/02-long-reading.png",
        coverLabel: "HỔNG ĐỌC HIỂU",
        zoomFrom: 1.038,
        zoomTo: 1.015,
      },
      {
        start: 387.19,
        end: 392.3,
        transcript: "Chính vì vậy, thầy Quyền và đội ngũ đã tổ chức một chương trình có tên là Bí mật lấy gốc tiếng Anh cho con.",
        cover: "staging/brisky-real/04-brisky-teachers.jpg",
        coverLabel: "BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC",
        zoomFrom: 1.015,
        zoomTo: 1.036,
      },
      {
        start: 445.74,
        end: 451.02,
        transcript: "Đây là 3 buổi Zoom online dành cho ba mẹ đang có con trong độ tuổi từ lớp 3 đến lớp 9.",
        cover: "staging/brisky-real/02-community-class.jpg",
        coverLabel: "3 BUỔI HOÀN TOÀN MIỄN PHÍ",
        zoomFrom: 1.036,
        zoomTo: 1.014,
      },
      {
        start: 761.85,
        end: 765.27,
        transcript: "Ba mẹ hãy nhấn nút đăng ký và để lại thông tin để tham gia chương trình.",
        cover: "staging/brisky-real/07-brisky-students.jpg",
        coverLabel: "NHẤN ĐĂNG KÝ NGAY",
        zoomFrom: 1.014,
        zoomTo: 1.035,
      },
    ],
  },
  {
    id: "ad05",
    source: "staging/brisky-raw-ads/ad05.mp4",
    hook: "ĐỪNG VỘI GẮN NHÃN CON LƯỜI",
    segments: [
      {
        start: 32.94,
        end: 48.84,
        transcript: "Cứ nhắc đến tiếng Anh là con rất sợ. Tại sao lại như thế? Điều đầu tiên là ba mẹ đừng nghĩ các con lười, bởi vì không hẳn là con không học, không làm bài hay điểm kiểm tra thấp thì có nghĩa là con lười nhé ba mẹ.",
        cover: "staging/brisky-real/05-class-lesson.jpg",
        coverLabel: "ĐIỂM THẤP KHÔNG CÓ NGHĨA LÀ LƯỜI",
        zoomFrom: 1.01,
        zoomTo: 1.036,
      },
      {
        start: 50.49,
        end: 56.72,
        transcript: "Vấn đề ở đây là rất nhiều con đã bị mất gốc và đang mông lung về định hướng.",
        cover: "staging/brisky-generated-v3/04-level-assessment.png",
        coverLabel: "CON ĐANG THIẾU ĐỊNH HƯỚNG",
        zoomFrom: 1.036,
        zoomTo: 1.014,
      },
      {
        start: 153.19,
        end: 163.35,
        transcript: "Thầy tổ chức một chương trình có tên là Bí mật lấy gốc tiếng Anh cho con. Đây là chương trình Zoom được tổ chức trong 3 buổi dành cho ba mẹ có con từ lớp 3 đến lớp 9.",
        cover: "staging/brisky-real/04-brisky-teachers.jpg",
        coverLabel: "3 BUỔI ZOOM DÀNH CHO CHA MẸ",
        zoomFrom: 1.014,
        zoomTo: 1.038,
      },
      {
        start: 231.02,
        end: 240.22,
        transcript: "Và bên cạnh đó, thầy sẽ cung cấp cho ba mẹ một lộ trình từ cơ bản đến nâng cao để giúp ba mẹ biết được con đang ở đâu.",
        cover: "staging/brisky-real/06-student-activity.jpg",
        coverLabel: "LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO",
        zoomFrom: 1.038,
        zoomTo: 1.015,
      },
      {
        start: 407.42,
        end: 409.9,
        transcript: "Nếu ba mẹ quan tâm, hãy nhấn vào nút đăng ký bên dưới.",
        cover: "staging/brisky-real/07-brisky-students.jpg",
        coverLabel: "NHẤN ĐĂNG KÝ BÊN DƯỚI",
        zoomFrom: 1.015,
        zoomTo: 1.035,
      },
    ],
  },
];

const makeV13Segment = (
  sourcePieces: Array<[number, number]>,
  transcript: string,
  cover: string,
  coverLabel: string,
  zoomFrom: number,
  zoomTo: number,
): Segment => ({
  start: sourcePieces[0][0],
  end: sourcePieces[sourcePieces.length - 1][1],
  sourcePieces,
  transcript,
  cover,
  coverLabel,
  zoomFrom,
  zoomTo,
});

// v13 is rebuilt from non-overlapping source-word ranges. Production directions,
// false starts, filler takes and repeated sentence starts are intentionally absent.
const V13_ADS: AdSpec[] = [
  {
    id: "ad02-v13",
    source: "staging/brisky-raw-ads/ad02.mp4",
    hook: "TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM",
    segments: [
      makeV13Segment([[3.12, 7.80]], "Một học sinh lớp 7 từng mất gốc tiếng Anh.", "staging/brisky-older-students/teen-interview.png", "HỌC SINH LỚP 7 • TỪNG MẤT GỐC", 1.01, 1.034),
      makeV13Segment([[15.29, 22.37]], "Sau một năm nỗ lực, con kết thúc năm học với 8 điểm tiếng Anh.", "staging/brisky-older-students/older-student-certificate.png", "KẾT QUẢ • 8 ĐIỂM TIẾNG ANH", 1.034, 1.014),
      makeV13Segment([[30.09, 41.20]], "Từ mức 3–4 điểm lên 8 điểm là cả một quá trình và sự nỗ lực.", "staging/brisky-generated-v3/04-level-assessment.png", "MỘT HÀNH TRÌNH NỖ LỰC", 1.014, 1.04),
      makeV13Segment([[65.26, 70.52]], "Thúc ép con học theo cách cũ vô tình tạo thêm áp lực.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ÉP HỌC KHÔNG GIẢI QUYẾT GỐC RỄ", 1.04, 1.016),
      makeV13Segment([[106.87, 114.07], [114.07, 121.95]], "Từ kinh nghiệm giảng dạy, thầy đã đúc rút một lộ trình và chia sẻ trong 3 buổi Zoom cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "LỘ TRÌNH TỪ KINH NGHIỆM THỰC TẾ", 1.016, 1.042),
      makeV13Segment([[129.97, 137.27]], "Ba mẹ hiểu vì sao con học nhiều năm vẫn hổng kiến thức và con thường hổng ở đâu.", "staging/brisky-generated-v3/02-long-reading.png", "HIỂU ĐÚNG PHẦN CON ĐANG HỔNG", 1.042, 1.018),
      makeV13Segment([[137.61, 147.03]], "Ba mẹ nhận lộ trình giúp con xây lại từ gốc, học chắc và làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "XÂY LẠI GỐC • HỌC CHẮC HƠN", 1.018, 1.043),
      makeV13Segment([[198.48, 208.48]], "Con được kiểm tra trình độ miễn phí và nhận lộ trình học tập từ gốc.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.043, 1.017),
    ],
  },
  {
    id: "ad03-v13",
    source: "staging/brisky-raw-ads/ad03.mp4",
    hook: "DẤU HIỆU CON ĐANG HỔNG GỐC",
    segments: [
      makeV13Segment([[6.21, 14.67]], "Trước mỗi kỳ thi, ba mẹ lo con không làm được bài hoặc lại bị điểm kém.", "staging/brisky-real/06-student-activity.jpg", "LO LẮNG TRƯỚC MỖI KỲ THI", 1.01, 1.035),
      makeV13Segment([[25.12, 27.28], [27.66, 28.88], [29.38, 32.92], [32.92, 36.28], [36.48, 39.60]], "Con học từ vựng rồi quên, ngại bài đọc dài, khoanh theo cảm tính và không biết áp dụng ngữ pháp.", "staging/brisky-generated-v3/02-long-reading.png", "NHỮNG DẤU HIỆU HỔNG GỐC", 1.035, 1.014),
      makeV13Segment([[82.50, 89.64]], "Khi đã sợ tiếng Anh, con càng học càng nản và dễ tụt lại phía sau.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG NẢN", 1.014, 1.041),
      makeV13Segment([[89.64, 99.30], [99.30, 104.94]], "Thầy tổ chức chương trình Zoom 3 buổi dành cho cha mẹ có con lớp 3–9 đang gặp những vấn đề trên.", "staging/brisky-real/04-brisky-teachers.jpg", "3 BUỔI ZOOM • CHA MẸ CÓ CON LỚP 3–9", 1.041, 1.017),
      makeV13Segment([[105.50, 113.12]], "Ba mẹ sẽ hiểu vì sao con học nhiều năm vẫn mất gốc và hổng kiến thức.", "staging/brisky-generated-v3/04-level-assessment.png", "HIỂU ĐÚNG NGUYÊN NHÂN", 1.017, 1.041),
      makeV13Segment([[113.12, 123.54]], "Ba mẹ nhận lộ trình giúp con học lại từ gốc, học chắc hơn và đạt điểm tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "LỘ TRÌNH HỌC LẠI TỪ GỐC", 1.041, 1.016),
      makeV13Segment([[144.18, 150.80]], "Con còn được tặng một buổi kiểm tra trình độ tiếng Anh hoàn toàn miễn phí.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.016, 1.042),
    ],
  },
  {
    id: "ad04-v13",
    source: "staging/brisky-raw-ads/ad04.mp4",
    hook: "CON ĐANG HỔNG PHẦN NÀO?",
    voiceGain: 0.88,
    segments: [
      makeV13Segment([[49.18, 54.10], [54.64, 56.56]], "Con học nhiều năm nhưng vẫn sợ tiếng Anh, học trước quên sau và điểm số chưa cao.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH", 1.01, 1.036),
      makeV13Segment([[97.02, 99.62], [100.02, 102.64]], "Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.", "staging/brisky-real/05-class-lesson.jpg", "CON CẦN ĐÚNG PHƯƠNG PHÁP", 1.036, 1.014),
      makeV13Segment([[115.64, 119.70]], "Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.", "staging/brisky-generated-v3/01-vocabulary-forgotten.png", "HỔNG TỪ VỰNG", 1.014, 1.04),
      makeV13Segment([[133.46, 134.96], [135.32, 138.22]], "Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.", "staging/brisky-real/05-class-lesson.jpg", "HỔNG CÂU ĐƠN", 1.04, 1.016),
      makeV13Segment([[142.53, 144.07], [144.75, 146.73]], "Có bạn hổng ngữ pháp, đã học nhưng không biết áp dụng.", "staging/brisky-generated-v3/03-grammar-application.png", "HỔNG NGỮ PHÁP", 1.016, 1.041),
      makeV13Segment([[154.01, 156.55], [157.07, 161.11]], "Có bạn hổng đọc hiểu, biết từng từ từng câu nhưng không hiểu cả đoạn.", "staging/brisky-generated-v3/02-long-reading.png", "HỔNG ĐỌC HIỂU", 1.041, 1.016),
      makeV13Segment([[230.20, 236.44], [251.02, 256.42]], "Con càng học càng mệt, càng kiểm tra càng sợ; nếu nền tảng chưa chắc thì lên lớp 6 càng đuối.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG ĐUỐI", 1.016, 1.043),
      makeV13Segment([[387.27, 392.17]], "Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC TIẾNG ANH", 1.043, 1.017),
      makeV13Segment([[445.74, 451.02]], "Đây là 3 buổi Zoom dành cho cha mẹ có con từ lớp 3 đến lớp 9.", "staging/brisky-older-students/zoom-class.png", "3 BUỔI ZOOM • LỚP 3–9", 1.017, 1.041),
      makeV13Segment([[570.69, 579.89]], "Ba mẹ sẽ biết con đang hổng phần nào và nhận lộ trình phù hợp để đồng hành cùng con.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "BIẾT ĐÚNG PHẦN HỔNG • NHẬN ĐÚNG LỘ TRÌNH", 1.041, 1.016),
    ],
  },
  {
    id: "ad05-v13",
    source: "staging/brisky-raw-ads/ad05.mp4",
    hook: "ĐỪNG VỘI GẮN NHÃN CON LƯỜI",
    segments: [
      makeV13Segment([[32.94, 34.50], [34.90, 36.96], [38.22, 40.64], [41.04, 48.08]], "Cứ nhắc đến tiếng Anh là con sợ. Ba mẹ đừng vội nghĩ con lười; điểm thấp không có nghĩa là con lười.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ĐỪNG VỘI GẮN NHÃN CON LƯỜI", 1.01, 1.037),
      makeV13Segment([[50.57, 53.95], [54.67, 56.69]], "Nhiều con đã mất gốc và đang mông lung về định hướng.", "staging/brisky-generated-v3/04-level-assessment.png", "MẤT GỐC • MÔNG LUNG", 1.037, 1.014),
      makeV13Segment([[110.86, 114.54], [114.54, 120.96]], "Khi càng đuối, con càng chán nản và không biết thoát khỏi tình trạng đó như thế nào.", "staging/brisky-generated-v3/02-long-reading.png", "ĐUỐI → CHÁN NẢN → SỢ HỌC", 1.014, 1.041),
      makeV13Segment([[153.27, 156.97], [156.97, 163.25]], "Thầy tổ chức chương trình Bí mật lấy gốc tiếng Anh, gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM", 1.041, 1.017),
      makeV13Segment([[190.58, 192.02], [192.02, 195.46], [195.84, 196.38], [196.58, 200.06]], "Trong 3 buổi, thầy chia sẻ phương pháp giúp con từng bước lấy lại gốc từ kỹ năng đọc và viết.", "staging/brisky-older-students/zoom-class.png", "TỪNG BƯỚC LẤY LẠI GỐC", 1.017, 1.042),
      makeV13Segment([[231.10, 234.96], [234.96, 240.22]], "Ba mẹ nhận lộ trình từ cơ bản đến nâng cao và biết con đang ở đâu.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO", 1.042, 1.016),
      makeV13Segment([[327.57, 330.99], [330.99, 335.11]], "Con được kiểm tra trình độ để nhận bản đồ học tập phù hợp nhất.", "staging/brisky-older-students/older-student-certificate.png", "KIỂM TRA TRÌNH ĐỘ • NHẬN BẢN ĐỒ HỌC TẬP", 1.016, 1.042),
    ],
  },
  {
    id: "ad06-v13",
    source: "staging/brisky-raw-ads/ad04.mp4",
    hook: "HỌC NHIỀU NĂM VẪN SỢ TIẾNG ANH?",
    voiceGain: 0.88,
    segments: [
      makeV13Segment([[49.18, 54.10], [54.64, 56.56]], "Con học nhiều năm nhưng vẫn sợ tiếng Anh, học trước quên sau và điểm số chưa cao.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "HỌC NHIỀU NĂM • VẪN SỢ", 1.005, 1.035),
      makeV13Segment([[97.02, 99.62], [100.02, 102.64]], "Con chưa được tiếp cận đúng phương pháp.", "staging/brisky-real/05-class-lesson.jpg", "CON CẦN ĐÚNG PHƯƠNG PHÁP", 1.035, 1.012),
      makeV13Segment([[230.20, 236.44]], "Con càng học càng mệt, càng kiểm tra càng sợ và càng lên lớp cao càng đuối.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG ĐUỐI", 1.012, 1.042),
      makeV13Segment([[265.28, 271.74], [332.30, 335.28], [335.44, 336.80], [337.16, 338.30], [338.48, 342.32]], "Với học sinh lớp 6–9, ba mẹ không nên để lâu vì càng lên cao bài càng dài, từ vựng và ngữ pháp càng nặng, áp lực điểm số càng lớn.", "staging/brisky-generated-v3/02-long-reading.png", "LỚP CÀNG CAO • ÁP LỰC CÀNG LỚN", 1.042, 1.016),
      makeV13Segment([[387.27, 392.17]], "Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC TIẾNG ANH", 1.016, 1.043),
      makeV13Segment([[502.70, 514.10]], "Chương trình gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9 đang yếu hoặc mất gốc tiếng Anh.", "staging/brisky-older-students/zoom-class.png", "3 BUỔI ZOOM • CHA MẸ CÓ CON LỚP 3–9", 1.043, 1.017),
      makeV13Segment([[570.69, 579.89]], "Ba mẹ biết chính xác con đang hổng phần nào và nhận lộ trình phù hợp.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "XÁC ĐỊNH PHẦN HỔNG • NHẬN LỘ TRÌNH", 1.017, 1.042),
    ],
  },
];

// v14 uses wider, word-safe source ranges. Adjacent speech is kept continuous
// whenever possible so a render cannot start or stop inside a syllable.
const V14_ADS: AdSpec[] = [
  {
    id: "ad02-v14",
    source: "staging/brisky-raw-ads/ad02.mp4",
    hook: "TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM",
    segments: [
      makeV13Segment([[3.05, 7.90]], "Một học sinh lớp 7 từng mất gốc tiếng Anh.", "staging/brisky-older-students/teen-interview.png", "HỌC SINH LỚP 7 • TỪNG MẤT GỐC", 1.01, 1.034),
      makeV13Segment([[15.21, 22.49]], "Sau một năm nỗ lực, con kết thúc năm học với 8 điểm tiếng Anh.", "staging/brisky-older-students/older-student-certificate.png", "KẾT QUẢ • 8 ĐIỂM TIẾNG ANH", 1.034, 1.014),
      makeV13Segment([[30.09, 41.73]], "Từ mức 3–4 điểm lên 8 điểm là cả một quá trình và sự nỗ lực.", "staging/brisky-generated-v3/04-level-assessment.png", "MỘT HÀNH TRÌNH NỖ LỰC", 1.014, 1.04),
      makeV13Segment([[65.18, 70.64]], "Thúc ép con học theo cách cũ vô tình tạo thêm áp lực.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ÉP HỌC KHÔNG GIẢI QUYẾT GỐC RỄ", 1.04, 1.016),
      makeV13Segment([[106.79, 121.95]], "Từ kinh nghiệm giảng dạy, thầy đã đúc rút một lộ trình và chia sẻ trong 3 buổi Zoom cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "LỘ TRÌNH TỪ KINH NGHIỆM THỰC TẾ", 1.016, 1.042),
      makeV13Segment([[129.97, 137.39]], "Ba mẹ hiểu vì sao con học nhiều năm vẫn hổng kiến thức và con thường hổng ở đâu.", "staging/brisky-generated-v3/02-long-reading.png", "HIỂU ĐÚNG PHẦN CON ĐANG HỔNG", 1.042, 1.018),
      makeV13Segment([[137.53, 147.15]], "Ba mẹ nhận lộ trình giúp con xây lại từ gốc, học chắc và làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "XÂY LẠI GỐC • HỌC CHẮC HƠN", 1.018, 1.043),
      makeV13Segment([[198.40, 208.60]], "Con được kiểm tra trình độ miễn phí và nhận lộ trình học tập từ gốc.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.043, 1.017),
    ],
  },
  {
    id: "ad03-v14",
    source: "staging/brisky-raw-ads/ad03.mp4",
    hook: "DẤU HIỆU CON ĐANG HỔNG GỐC",
    segments: [
      makeV13Segment([[6.13, 14.79]], "Trước mỗi kỳ thi, ba mẹ lo con không làm được bài hoặc lại bị điểm kém.", "staging/brisky-real/06-student-activity.jpg", "LO LẮNG TRƯỚC MỖI KỲ THI", 1.01, 1.035),
      makeV13Segment([[25.04, 27.40], [27.58, 29.00], [29.30, 39.72]], "Con học từ vựng rồi quên, ngại bài đọc dài, khoanh theo cảm tính và không biết áp dụng ngữ pháp.", "staging/brisky-generated-v3/02-long-reading.png", "NHỮNG DẤU HIỆU HỔNG GỐC", 1.035, 1.014),
      makeV13Segment([[82.42, 105.04]], "Khi đã sợ tiếng Anh, con càng học càng nản, dễ tụt lại phía sau; vì vậy thầy tổ chức chương trình Zoom 3 buổi cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "CÀNG HỌC • CÀNG NẢN", 1.014, 1.041),
      makeV13Segment([[105.42, 123.54]], "Ba mẹ hiểu nguyên nhân mất gốc, phần kiến thức con đang hổng và nhận lộ trình giúp con học chắc, làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "HIỂU ĐÚNG NGUYÊN NHÂN • NHẬN LỘ TRÌNH", 1.041, 1.016),
      makeV13Segment([[144.10, 150.80]], "Con còn được tặng một buổi kiểm tra trình độ tiếng Anh hoàn toàn miễn phí.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.016, 1.042),
    ],
  },
  {
    id: "ad04-v14",
    source: "staging/brisky-raw-ads/ad04.mp4",
    hook: "CON ĐANG HỔNG PHẦN NÀO?",
    voiceGain: 0.88,
    segments: [
      makeV13Segment([[49.18, 56.66]], "Con học nhiều năm nhưng vẫn sợ tiếng Anh, học trước quên sau và điểm số chưa cao.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH", 1.01, 1.036),
      makeV13Segment([[96.94, 102.74]], "Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.", "staging/brisky-real/05-class-lesson.jpg", "CON CẦN ĐÚNG PHƯƠNG PHÁP", 1.036, 1.014),
      makeV13Segment([[115.56, 119.80]], "Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.", "staging/brisky-generated-v3/01-vocabulary-forgotten.png", "HỔNG TỪ VỰNG", 1.014, 1.04),
      makeV13Segment([[133.38, 138.32]], "Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.", "staging/brisky-real/05-class-lesson.jpg", "HỔNG CÂU ĐƠN", 1.04, 1.016),
      makeV13Segment([[142.45, 146.83]], "Có bạn hổng ngữ pháp, đã học nhưng không biết áp dụng.", "staging/brisky-generated-v3/03-grammar-application.png", "HỔNG NGỮ PHÁP", 1.016, 1.041),
      makeV13Segment([[153.93, 161.21]], "Có bạn hổng đọc hiểu, biết từng từ từng câu nhưng không hiểu cả đoạn.", "staging/brisky-generated-v3/02-long-reading.png", "HỔNG ĐỌC HIỂU", 1.041, 1.016),
      makeV13Segment([[230.12, 236.54]], "Con càng học càng mệt, càng kiểm tra càng sợ và càng lên lớp cao càng đuối.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG ĐUỐI", 1.016, 1.043),
      makeV13Segment([[387.19, 392.27]], "Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC TIẾNG ANH", 1.043, 1.017),
      makeV13Segment([[502.62, 520.60]], "Đây là 3 buổi Zoom dành cho cha mẹ có con lớp 3–9 đang yếu, mất gốc, học trước quên sau, điểm thấp hoặc học thêm nhiều nơi vẫn chưa tiến bộ.", "staging/brisky-older-students/zoom-class.png", "3 BUỔI ZOOM • LỚP 3–9", 1.017, 1.041),
      makeV13Segment([[570.61, 579.99]], "Ba mẹ sẽ biết con đang hổng phần nào và nhận lộ trình phù hợp để đồng hành cùng con.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "BIẾT ĐÚNG PHẦN HỔNG • NHẬN ĐÚNG LỘ TRÌNH", 1.041, 1.016),
    ],
  },
  {
    id: "ad05-v14",
    source: "staging/brisky-raw-ads/ad05.mp4",
    speechAudio: "staging/brisky-v14-audio/ad05-dialogue.wav",
    hook: "ĐỪNG VỘI GẮN NHÃN CON LƯỜI",
    segments: [
      makeV13Segment([[32.94, 34.62], [37.86, 48.34]], "Cứ nhắc đến tiếng Anh là con sợ. Điều đầu tiên là ba mẹ đừng vội nghĩ con lười; điểm thấp không có nghĩa là con lười.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ĐỪNG VỘI GẮN NHÃN CON LƯỜI", 1.01, 1.037),
      makeV13Segment([[50.49, 56.72]], "Nhiều con đã mất gốc và đang mông lung về định hướng.", "staging/brisky-generated-v3/04-level-assessment.png", "MẤT GỐC • MÔNG LUNG", 1.037, 1.014),
      makeV13Segment([[110.86, 120.96]], "Khi càng đuối, con càng chán nản và không biết thoát khỏi tình trạng đó như thế nào.", "staging/brisky-generated-v3/02-long-reading.png", "ĐUỐI → CHÁN NẢN → SỢ HỌC", 1.014, 1.041),
      makeV13Segment([[147.03, 163.35]], "Chính bởi những điều như vậy, thầy cùng đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh, gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM", 1.041, 1.017),
      makeV13Segment([[209.42, 213.90]], "Từ đó, ba mẹ có thể lựa chọn những phương pháp phù hợp.", "staging/brisky-older-students/zoom-class.png", "LỰA CHỌN PHƯƠNG PHÁP PHÙ HỢP", 1.017, 1.042),
      makeV13Segment([[231.02, 240.22]], "Ba mẹ nhận lộ trình từ cơ bản đến nâng cao và biết con đang ở đâu.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO", 1.042, 1.016),
      makeV13Segment([[320.93, 326.69], [327.49, 335.11]], "Ngoài 3 buổi Zoom, con được kiểm tra trình độ để nhận bản đồ học tập phù hợp nhất.", "staging/brisky-older-students/older-student-certificate.png", "KIỂM TRA TRÌNH ĐỘ • NHẬN BẢN ĐỒ HỌC TẬP", 1.016, 1.042),
    ],
  },
  {
    id: "ad06-v14",
    source: "staging/brisky-raw-ads/ad04.mp4",
    hook: "HỌC NHIỀU NĂM VẪN SỢ TIẾNG ANH?",
    voiceGain: 0.88,
    segments: [
      makeV13Segment([[49.18, 56.66]], "Con học nhiều năm nhưng vẫn sợ tiếng Anh, học trước quên sau và điểm số chưa cao.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "HỌC NHIỀU NĂM • VẪN SỢ", 1.005, 1.035),
      makeV13Segment([[96.94, 102.74]], "Con chưa được tiếp cận đúng phương pháp.", "staging/brisky-real/05-class-lesson.jpg", "CON CẦN ĐÚNG PHƯƠNG PHÁP", 1.035, 1.012),
      makeV13Segment([[230.12, 236.54]], "Con càng học càng mệt, càng kiểm tra càng sợ và càng lên lớp cao càng đuối.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG ĐUỐI", 1.012, 1.042),
      makeV13Segment([[328.34, 342.42]], "Với học sinh lớp 7–9, ba mẹ không nên để lâu vì càng lên cao bài càng dài, từ vựng và ngữ pháp càng nặng, áp lực điểm số càng lớn.", "staging/brisky-generated-v3/02-long-reading.png", "LỚP CÀNG CAO • ÁP LỰC CÀNG LỚN", 1.042, 1.016),
      makeV13Segment([[387.19, 392.27]], "Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC TIẾNG ANH", 1.016, 1.043),
      makeV13Segment([[502.62, 520.60]], "Chương trình gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9 đang yếu, mất gốc, học trước quên sau, điểm thấp hoặc học thêm nhiều nơi vẫn chưa tiến bộ.", "staging/brisky-older-students/zoom-class.png", "3 BUỔI ZOOM • CHA MẸ CÓ CON LỚP 3–9", 1.043, 1.017),
      makeV13Segment([[570.61, 579.99]], "Ba mẹ biết chính xác con đang hổng phần nào và nhận lộ trình phù hợp.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "XÁC ĐỊNH PHẦN HỔNG • NHẬN LỘ TRÌNH", 1.017, 1.042),
    ],
  },
];

// v16 re-trims every spoken phrase against source word timestamps. Boundaries
// keep a short bed of room tone where available and avoid carrying the first
// phoneme of the following filler/repeated word into the edit.
const V16_ADS: AdSpec[] = [
  {
    ...V14_ADS[0],
    segments: [
      makeV13Segment([[3.00, 7.98]], "Một học sinh lớp 7 từng mất gốc tiếng Anh.", "staging/brisky-older-students/teen-interview.png", "HỌC SINH LỚP 7 • TỪNG MẤT GỐC", 1.01, 1.034),
      makeV13Segment([[15.17, 22.55]], "Sau một năm nỗ lực, con kết thúc năm học với 8 điểm tiếng Anh.", "staging/brisky-older-students/older-student-certificate.png", "KẾT QUẢ • 8 ĐIỂM TIẾNG ANH", 1.034, 1.014),
      makeV13Segment([[31.77, 41.81]], "Từ mức 3–4 điểm lên 8 điểm là cả một quá trình và sự nỗ lực.", "staging/brisky-generated-v3/04-level-assessment.png", "MỘT HÀNH TRÌNH NỖ LỰC", 1.014, 1.04),
      makeV13Segment([[65.14, 70.70]], "Thúc ép con học theo cách cũ vô tình tạo thêm áp lực.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ÉP HỌC KHÔNG GIẢI QUYẾT GỐC RỄ", 1.04, 1.016),
      makeV13Segment([[107.91, 126.47]], "Từ kinh nghiệm giảng dạy, thầy đã đúc rút một lộ trình và chia sẻ trong 3 buổi Zoom cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "LỘ TRÌNH TỪ KINH NGHIỆM THỰC TẾ", 1.016, 1.042),
      makeV13Segment([[129.95, 137.43]], "Ba mẹ hiểu vì sao con học nhiều năm vẫn hổng kiến thức và con thường hổng ở đâu.", "staging/brisky-generated-v3/02-long-reading.png", "HIỂU ĐÚNG PHẦN CON ĐANG HỔNG", 1.042, 1.018),
      makeV13Segment([[137.49, 147.13]], "Ba mẹ nhận lộ trình giúp con xây lại từ gốc, học chắc và làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "XÂY LẠI GỐC • HỌC CHẮC HƠN", 1.018, 1.043),
      makeV13Segment([[198.36, 208.64]], "Con được kiểm tra trình độ miễn phí và nhận lộ trình học tập từ gốc.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.043, 1.017),
    ],
  },
  {
    ...V14_ADS[1],
    segments: [
      makeV13Segment([[6.09, 14.83]], "Trước mỗi kỳ thi, ba mẹ lo con không làm được bài hoặc lại bị điểm kém.", "staging/brisky-real/06-student-activity.jpg", "LO LẮNG TRƯỚC MỖI KỲ THI", 1.01, 1.035),
      makeV13Segment([[25.00, 39.78]], "Con học từ vựng rồi quên, ngại bài đọc dài, khoanh theo cảm tính và không biết áp dụng ngữ pháp.", "staging/brisky-generated-v3/02-long-reading.png", "NHỮNG DẤU HIỆU HỔNG GỐC", 1.035, 1.014),
      makeV13Segment([[82.38, 105.12]], "Khi đã sợ tiếng Anh, con càng học càng nản, dễ tụt lại phía sau; vì vậy thầy tổ chức chương trình Zoom 3 buổi cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "CÀNG HỌC • CÀNG NẢN", 1.014, 1.041),
      makeV13Segment([[105.38, 129.13]], "Ba mẹ hiểu nguyên nhân mất gốc, phần kiến thức con đang hổng và nhận lộ trình giúp con học chắc, làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "HIỂU ĐÚNG NGUYÊN NHÂN • NHẬN LỘ TRÌNH", 1.041, 1.016),
      makeV13Segment([[144.06, 157.98]], "Con còn được tặng một buổi kiểm tra trình độ tiếng Anh hoàn toàn miễn phí.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.016, 1.042),
    ],
  },
  {
    ...V14_ADS[2],
    segments: [
      makeV13Segment([[49.16, 56.74]], "Con học nhiều năm nhưng vẫn sợ tiếng Anh, học trước quên sau và điểm số chưa cao.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH", 1.01, 1.036),
      makeV13Segment([[96.92, 102.82]], "Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.", "staging/brisky-real/05-class-lesson.jpg", "CON CẦN ĐÚNG PHƯƠNG PHÁP", 1.036, 1.014),
      makeV13Segment([[115.54, 119.88]], "Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.", "staging/brisky-generated-v3/01-vocabulary-forgotten.png", "HỔNG TỪ VỰNG", 1.014, 1.04),
      makeV13Segment([[133.36, 138.40]], "Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.", "staging/brisky-real/05-class-lesson.jpg", "HỔNG CÂU ĐƠN", 1.04, 1.016),
      makeV13Segment([[142.43, 146.91]], "Có bạn hổng ngữ pháp, đã học nhưng không biết áp dụng.", "staging/brisky-generated-v3/03-grammar-application.png", "HỔNG NGỮ PHÁP", 1.016, 1.041),
      makeV13Segment([[153.91, 161.29]], "Có bạn hổng đọc hiểu, biết từng từ từng câu nhưng không hiểu cả đoạn.", "staging/brisky-generated-v3/02-long-reading.png", "HỔNG ĐỌC HIỂU", 1.041, 1.016),
      makeV13Segment([[230.10, 236.62]], "Con càng học càng mệt, càng kiểm tra càng sợ và càng lên lớp cao càng đuối.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG ĐUỐI", 1.016, 1.043),
      makeV13Segment([[387.83, 392.35]], "Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC TIẾNG ANH", 1.043, 1.017),
      makeV13Segment([[502.60, 508.30], [508.36, 514.28], [514.50, 517.26]], "Đây là 3 buổi Zoom dành cho cha mẹ có con lớp 3–9 đang yếu, mất gốc, học trước quên sau, điểm thấp hoặc học thêm nhiều nơi vẫn chưa tiến bộ.", "staging/brisky-older-students/zoom-class.png", "3 BUỔI ZOOM • LỚP 3–9", 1.017, 1.041),
      makeV13Segment([[570.57, 575.31], [575.45, 579.99]], "Ba mẹ sẽ biết con đang hổng phần nào và nhận lộ trình phù hợp để đồng hành cùng con.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "BIẾT ĐÚNG PHẦN HỔNG • NHẬN ĐÚNG LỘ TRÌNH", 1.041, 1.016),
    ],
  },
  {
    ...V14_ADS[3],
    speechAudio: "staging/brisky-v16-audio/ad05-dialogue.wav",
    segments: [
      makeV13Segment([[32.90, 34.68], [37.52, 40.82], [40.92, 48.08]], "Cứ nhắc đến tiếng Anh là con sợ. Ba mẹ đừng vội nghĩ con lười; điểm thấp không có nghĩa là con lười.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ĐỪNG VỘI GẮN NHÃN CON LƯỜI", 1.01, 1.037),
      makeV13Segment([[50.47, 56.69]], "Vấn đề là nhiều con đã mất gốc và đang mông lung về định hướng.", "staging/brisky-generated-v3/04-level-assessment.png", "MẤT GỐC • MÔNG LUNG", 1.037, 1.014),
      makeV13Segment([[110.86, 120.96]], "Khi càng đuối, con càng chán nản và không biết thoát khỏi tình trạng đó như thế nào.", "staging/brisky-generated-v3/02-long-reading.png", "ĐUỐI → CHÁN NẢN → SỢ HỌC", 1.014, 1.041),
      makeV13Segment([[149.17, 152.65], [153.15, 163.43]], "Thầy cùng đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh, gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM", 1.041, 1.017),
      makeV13Segment([[209.42, 213.90]], "Từ đó, ba mẹ có thể lựa chọn những phương pháp phù hợp.", "staging/brisky-older-students/zoom-class.png", "LỰA CHỌN PHƯƠNG PHÁP PHÙ HỢP", 1.017, 1.042),
      makeV13Segment([[231.00, 240.22]], "Ba mẹ nhận lộ trình từ cơ bản đến nâng cao và biết con đang ở đâu.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO", 1.042, 1.016),
      makeV13Segment([[322.09, 326.77], [327.47, 335.11]], "Ngoài 3 buổi Zoom, con được kiểm tra trình độ để nhận bản đồ học tập phù hợp nhất.", "staging/brisky-older-students/older-student-certificate.png", "KIỂM TRA TRÌNH ĐỘ • NHẬN BẢN ĐỒ HỌC TẬP", 1.016, 1.042),
    ],
  },
];

// v17 removes discourse fillers at word boundaries and uses dedicated dialogue
// tracks. The picture still comes directly from the same source ranges.
const V17_ADS: AdSpec[] = [
  {
    ...V14_ADS[0],
    speechAudio: "staging/brisky-v17-audio/ad02-dialogue.wav",
    segments: [
      makeV13Segment([[3.00,7.98]], "Một học sinh lớp 7 từng mất gốc tiếng Anh.", "staging/brisky-older-students/teen-interview.png", "TỪ MẤT GỐC ĐẾN 8 ĐIỂM", 1.01, 1.045),
      makeV13Segment([[15.17,22.55]], "Sau một năm nỗ lực, con kết thúc năm học với 8 điểm tiếng Anh.", "staging/brisky-older-students/older-student-certificate.png", "KẾT QUẢ • 8 ĐIỂM", 1.045, 1.015),
      makeV13Segment([[36.17,41.81]], "Con từ 3–4 điểm lên 8 điểm là cả một quá trình và sự nỗ lực.", "staging/brisky-generated-v3/04-level-assessment.png", "TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM", 1.015, 1.047),
      makeV13Segment([[65.74,70.70]], "Thúc ép con học theo cách cũ vô tình tạo thêm áp lực.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "ÉP HỌC CÀNG THÊM ÁP LỰC", 1.047, 1.016),
      makeV13Segment([[112.53,126.47]], "Thầy đúc rút một lộ trình và chia sẻ trong 3 buổi Zoom cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "3 BUỔI ZOOM • LỘ TRÌNH THỰC TẾ", 1.016, 1.048),
      makeV13Segment([[129.95,137.43]], "Ba mẹ hiểu vì sao con học nhiều năm vẫn hổng kiến thức và con thường hổng ở đâu.", "staging/brisky-generated-v3/02-long-reading.png", "CON ĐANG HỔNG Ở ĐÂU?", 1.048, 1.018),
      makeV13Segment([[139.23,147.13]], "Ba mẹ nhận lộ trình giúp con xây lại từ gốc, học chắc và làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "XÂY LẠI GỐC • HỌC CHẮC HƠN", 1.018, 1.048),
      makeV13Segment([[198.84,208.64]], "Con được kiểm tra trình độ miễn phí và nhận lộ trình học tập từ gốc.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.048, 1.017),
    ],
  },
  {
    ...V14_ADS[1],
    speechAudio: "staging/brisky-v17-audio/ad03-dialogue.wav",
    segments: [
      makeV13Segment([[6.97,14.83]], "Trước mỗi kỳ thi, ba mẹ lo con không làm được bài hoặc lại bị điểm kém.", "staging/brisky-real/06-student-activity.jpg", "MỖI KỲ THI ĐỀU ÁP LỰC", 1.01, 1.046),
      makeV13Segment([[25.88,29.06],[29.58,39.78]], "Con học từ vựng rồi quên, ngại bài đọc dài, khoanh theo cảm tính và không biết áp dụng ngữ pháp.", "staging/brisky-generated-v3/02-long-reading.png", "DẤU HIỆU HỔNG GỐC", 1.046, 1.015),
      makeV13Segment([[82.82,89.32],[91.80,105.12]], "Khi đã sợ tiếng Anh, con càng học càng nản, dễ tụt lại; thầy tổ chức chương trình Zoom 3 buổi cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "CÀNG SỢ • CÀNG NẢN", 1.015, 1.048),
      makeV13Segment([[106.98,108.12],[108.62,129.13]], "Ba mẹ hiểu nguyên nhân mất gốc, phần kiến thức con đang hổng và nhận lộ trình giúp con học chắc, làm bài tốt hơn.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "HIỂU NGUYÊN NHÂN • NHẬN LỘ TRÌNH", 1.048, 1.016),
      makeV13Segment([[144.54,157.98]], "Con được tặng một buổi kiểm tra trình độ tiếng Anh hoàn toàn miễn phí.", "staging/brisky-older-students/zoom-class.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.016, 1.048),
    ],
  },
  {
    ...V14_ADS[2],
    speechAudio: "staging/brisky-v17-audio/ad04-dialogue.wav",
    segments: [
      makeV13Segment([[49.16,56.74]], "Con học nhiều năm nhưng vẫn sợ tiếng Anh, học trước quên sau và điểm số chưa cao.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "HỌC NHIỀU NĂM • VẪN SỢ", 1.01, 1.046),
      makeV13Segment([[97.02,102.82]], "Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.", "staging/brisky-real/05-class-lesson.jpg", "CON CẦN ĐÚNG PHƯƠNG PHÁP", 1.046, 1.014),
      makeV13Segment([[115.64,119.88]], "Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.", "staging/brisky-generated-v3/01-vocabulary-forgotten.png", "HỔNG TỪ VỰNG", 1.014, 1.045),
      makeV13Segment([[133.46,138.40]], "Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.", "staging/brisky-real/05-class-lesson.jpg", "HỔNG CÂU ĐƠN", 1.045, 1.016),
      makeV13Segment([[142.53,146.91]], "Có bạn hổng ngữ pháp, đã học nhưng không biết áp dụng.", "staging/brisky-generated-v3/03-grammar-puzzle.png", "HỔNG NGỮ PHÁP", 1.016, 1.046),
      makeV13Segment([[154.01,161.29]], "Có bạn hổng đọc hiểu, biết từng từ từng câu nhưng không hiểu cả đoạn.", "staging/brisky-generated-v3/02-long-reading.png", "HỔNG ĐỌC HIỂU", 1.046, 1.016),
      makeV13Segment([[230.20,236.62]], "Con càng học càng mệt, càng kiểm tra càng sợ và càng lên lớp cao càng đuối.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "CÀNG HỌC • CÀNG ĐUỐI", 1.016, 1.048),
      makeV13Segment([[387.93,392.35]], "Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC TIẾNG ANH", 1.048, 1.017),
      makeV13Segment([[502.70,508.30],[508.46,514.28],[514.60,517.26]], "Đây là 3 buổi Zoom dành cho cha mẹ có con lớp 3–9 đang yếu, mất gốc, học trước quên sau, điểm thấp hoặc học thêm nhiều nơi vẫn chưa tiến bộ.", "staging/brisky-older-students/zoom-class.png", "3 BUỔI ZOOM • LỚP 3–9", 1.017, 1.047),
      makeV13Segment([[570.87,575.31],[575.55,579.99]], "Ba mẹ biết con đang hổng phần nào và nhận lộ trình phù hợp để đồng hành cùng con.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "BIẾT PHẦN HỔNG • NHẬN LỘ TRÌNH", 1.047, 1.016),
    ],
  },
  {
    ...V14_ADS[3],
    speechAudio: "staging/brisky-v17-audio/ad05-dialogue.wav",
    segments: [
      makeV13Segment([[33.02,34.68],[38.98,48.08]], "Cứ nhắc đến tiếng Anh là con sợ. Ba mẹ đừng vội nghĩ con lười; điểm thấp không có nghĩa là con lười.", "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", "KHÔNG PHẢI VÌ CON LƯỜI", 1.01, 1.047),
      makeV13Segment([[51.79,56.69]], "Nhiều con đã mất gốc và đang mông lung về định hướng.", "staging/brisky-generated-v3/04-level-assessment.png", "MẤT GỐC • MÔNG LUNG", 1.047, 1.014),
      makeV13Segment([[111.46,120.96]], "Càng đuối, con càng chán nản và không biết thoát khỏi tình trạng đó như thế nào.", "staging/brisky-generated-v3/02-long-reading.png", "CÀNG ĐUỐI • CÀNG CHÁN NẢN", 1.014, 1.048),
      makeV13Segment([[149.59,152.65],[153.27,163.43]], "Thầy cùng đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh, gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9.", "staging/brisky-real/04-brisky-teachers.jpg", "BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM", 1.048, 1.017),
      makeV13Segment([[209.42,213.90]], "Ba mẹ có thể lựa chọn những phương pháp phù hợp.", "staging/brisky-older-students/zoom-class.png", "CHỌN ĐÚNG PHƯƠNG PHÁP", 1.017, 1.048),
      makeV13Segment([[231.92,244.72]], "Ba mẹ nhận lộ trình từ cơ bản đến nâng cao, biết con đang ở đâu và cần đạt mục tiêu nào.", "staging/brisky-generated-v10/02-parent-student-roadmap.png", "LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO", 1.048, 1.016),
      makeV13Segment([[322.21,326.77],[327.57,335.11]], "Ngoài 3 buổi Zoom, con được kiểm tra trình độ để nhận bản đồ học tập phù hợp nhất.", "staging/brisky-older-students/older-student-certificate.png", "KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ", 1.016, 1.048),
    ],
  },
];

// v20 restores the connective ideas needed for a complete advertisement while
// keeping every source range word-safe and free of production directions.
const V20_ADS: AdSpec[] = [
  {
    ...V17_ADS[0],
    speechAudio:"staging/brisky-v20-audio/ad02-dialogue.wav",
    segments:[
      V17_ADS[0].segments[0],V17_ADS[0].segments[1],V17_ADS[0].segments[2],V17_ADS[0].segments[3],
      makeV13Segment([[81.98,89.90]],"Bắt con học theo cách cũ càng khiến con sợ hãi và tâm lý trước mỗi kỳ thi.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","CÁCH HỌC CŨ KHIẾN CON SỢ HÃI",1.016,1.046),
      V17_ADS[0].segments[4],V17_ADS[0].segments[5],V17_ADS[0].segments[6],
      makeV13Segment([[165.41,171.93],[172.17,174.33]],"Thầy chia sẻ cách khơi gợi niềm yêu thích tiếng Anh để con tự giác, chủ động hơn.","staging/brisky-generated-v10/03-confident-student.png","TỰ GIÁC • CHỦ ĐỘNG • YÊU TIẾNG ANH",1.018,1.047),
      V17_ADS[0].segments[7],
    ],
  },
  {
    ...V17_ADS[1],
    speechAudio:"staging/brisky-v20-audio/ad03-dialogue.wav",
    segments:[
      V17_ADS[1].segments[0],V17_ADS[1].segments[1],
      makeV13Segment([[59.54,69.98]],"Càng lên lớp cao, bài đọc càng dài, cấu trúc nhiều hơn, từ vựng khó hơn và con học ngày càng vất vả.","staging/brisky-generated-v3/02-long-reading.png","LỚP CÀNG CAO • BÀI CÀNG KHÓ",1.015,1.046),
      V17_ADS[1].segments[2],V17_ADS[1].segments[3],V17_ADS[1].segments[4],
    ],
  },
  {
    ...V17_ADS[2],
    speechAudio:"staging/brisky-v20-audio/ad04-dialogue.wav",
    segments:[
      V17_ADS[2].segments[0],V17_ADS[2].segments[1],V17_ADS[2].segments[2],V17_ADS[2].segments[3],V17_ADS[2].segments[4],V17_ADS[2].segments[5],V17_ADS[2].segments[6],
      makeV13Segment([[251.02,256.42]],"Đặc biệt với học sinh lớp 3–5, nếu gốc chưa chắc thì lên lớp 6 con càng đuối.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","LỚP 3–5 CẦN XÂY NỀN TẢNG CHẮC",1.048,1.017),
      V17_ADS[2].segments[7],V17_ADS[2].segments[8],V17_ADS[2].segments[9],
      makeV13Segment([[600.66,603.04],[603.30,610.90]],"Lộ trình giúp con lấy lại gốc, tự tin hơn, học chắc hơn, làm bài tốt hơn và đạt điểm cao trên trường.","staging/brisky-generated-v10/03-confident-student.png","LẤY LẠI GỐC • HỌC CHẮC HƠN",1.016,1.045),
    ],
  },
  {
    ...V17_ADS[3],
    speechAudio:"staging/brisky-v20-audio/ad05-dialogue.wav",
    segments:[
      V17_ADS[3].segments[0],V17_ADS[3].segments[1],
      makeV13Segment([[79.13,82.51],[83.31,89.77]],"Có bạn học từ vựng trước quên sau, học cấu trúc ngữ pháp này lại quên cấu trúc kia.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","TỪ VỰNG • NGỮ PHÁP KHÔNG LIÊN KẾT",1.014,1.046),
      V17_ADS[3].segments[2],V17_ADS[3].segments[3],
      makeV13Segment([[187.02,188.68],[189.08,190.46],[190.66,193.44],[193.88,195.70],[195.92,196.66]],"Trong 3 buổi, thầy từng bước chia sẻ phương pháp giúp con dần lấy lại gốc tiếng Anh.","staging/brisky-real/04-brisky-teachers.jpg","NỘI DUNG 3 BUỔI ZOOM",1.017,1.046),
      V17_ADS[3].segments[4],V17_ADS[3].segments[5],V17_ADS[3].segments[6],
    ],
  },
];

// v22 keeps Videos 2–3 structurally stable, repairs the two clipped "Anh"
// endings in Video 2, and rebuilds Videos 4–5 as shorter 1.12x ads.
const V22_ADS: AdSpec[] = [
  {
    ...V20_ADS[0],
    speechAudio:"staging/brisky-v22-audio/ad02-dialogue.wav",
    segments:[
      makeV13Segment([[3.00,8.16]],"Một học sinh lớp 7 từng mất gốc tiếng Anh.","staging/brisky-older-students/teen-interview.png","TỪ MẤT GỐC ĐẾN 8 ĐIỂM",1.01,1.045),
      makeV13Segment([[15.17,22.72]],"Sau một năm nỗ lực, con kết thúc năm học với 8 điểm môn tiếng Anh.","staging/brisky-older-students/older-student-certificate.png","KẾT QUẢ • 8 ĐIỂM TIẾNG ANH",1.045,1.015),
      ...V20_ADS[0].segments.slice(2),
    ],
  },
  {...V20_ADS[1]},
  {
    ...V20_ADS[2],
    id:"ad04-v22",
    speechAudio:"staging/brisky-v22-audio/ad04-dialogue.wav",
    segments:[
      makeV13Segment([[49.18,56.70]],"Con học tiếng Anh nhiều năm nhưng vẫn sợ, học trước quên sau và điểm số chưa cao.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU NĂM • VẪN SỢ",1.012,1.052),
      makeV13Segment([[96.94,102.78]],"Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.","staging/brisky-real/05-class-lesson.jpg","CON CẦN ĐÚNG PHƯƠNG PHÁP",1.052,1.016),
      makeV13Segment([[115.56,119.84]],"Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỔNG TỪ VỰNG",1.016,1.054),
      makeV13Segment([[133.38,138.36]],"Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.","staging/brisky-real/05-class-lesson.jpg","HỔNG CÂU ĐƠN",1.054,1.017),
      makeV13Segment([[142.45,146.87]],"Có bạn hổng ngữ pháp, học rồi nhưng không biết áp dụng.","staging/brisky-generated-v3/03-grammar-application.png","HỔNG NGỮ PHÁP",1.017,1.053),
      makeV13Segment([[157.89,161.25]],"Biết từng câu nhưng không hiểu cả đoạn.","staging/brisky-generated-v3/02-long-reading.png","HỔNG ĐỌC HIỂU",1.053,1.016),
      makeV13Segment([[234.16,236.58]],"Và càng lên lớp cao, con càng đuối.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","LỚP CÀNG CAO • CON CÀNG ĐUỐI",1.016,1.056),
      makeV13Segment([[387.19,392.31]],"Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH",1.056,1.017),
      makeV13Segment([[502.62,508.26]],"Đây là 3 buổi Zoom dành cho cha mẹ có con từ lớp 3 đến lớp 9.","staging/brisky-older-students/zoom-class.png","3 BUỔI ZOOM • LỚP 3–9",1.017,1.054),
      makeV13Segment([[570.61,575.27]],"Ba mẹ dễ dàng nhận biết con đang yếu phần nào.","staging/brisky-generated-v10/02-parent-student-roadmap.png","NHẬN BIẾT ĐÚNG PHẦN CON HỔNG",1.054,1.016),
      makeV13Segment([[575.47,580.03]],"Ví dụ phần đọc, phần viết, ngữ pháp hoặc kỹ năng làm bài.","staging/brisky-generated-v3/04-level-assessment.png","NHẬN LỘ TRÌNH PHÙ HỢP",1.016,1.052),
    ],
  },
  {
    ...V20_ADS[3],
    id:"ad05-v22",
    speechAudio:"staging/brisky-v22-audio/ad05-dialogue.wav",
    segments:[
      makeV13Segment([[33.02,34.68],[38.98,40.78]],"Cứ nhắc đến tiếng Anh là con sợ. Ba mẹ đừng vội nghĩ con lười.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","ĐỪNG VỘI GẮN NHÃN CON LƯỜI",1.012,1.054),
      makeV13Segment([[51.71,56.83]],"Nhiều con đã mất gốc và đang mông lung về định hướng.","staging/brisky-generated-v3/04-level-assessment.png","MẤT GỐC • MÔNG LUNG",1.054,1.016),
      makeV13Segment([[79.13,82.51]],"Có bạn học từ vựng trước quên sau.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỌC TRƯỚC • QUÊN SAU",1.016,1.053),
      makeV13Segment([[111.46,114.54]],"Khi càng đuối, con càng chán nản trong học tập.","staging/brisky-generated-v3/02-long-reading.png","CÀNG ĐUỐI • CÀNG CHÁN NẢN",1.053,1.017),
      makeV13Segment([[181.04,183.52],[183.72,186.24]],"Ba mẹ không biết làm thế nào để con có thể yêu tiếng Anh.","staging/brisky-generated-v10/02-parent-student-roadmap.png","LÀM SAO ĐỂ CON YÊU TIẾNG ANH?",1.017,1.052),
      makeV13Segment([[153.19,163.39]],"Thầy cùng đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh, gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3–9.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM",1.017,1.055),
      makeV13Segment([[189.08,189.68],[190.66,193.44],[195.92,196.50]],"Thầy từng bước chia sẻ phương pháp giúp con lấy lại gốc tiếng Anh.","staging/brisky-real/05-class-lesson.jpg","NỘI DUNG 3 BUỔI ZOOM",1.055,1.016),
      makeV13Segment([[231.10,234.96],[234.96,237.74],[238.60,240.22]],"Thầy cung cấp lộ trình từ cơ bản đến nâng cao để ba mẹ biết con đang ở đâu.","staging/brisky-generated-v10/02-parent-student-roadmap.png","LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO",1.016,1.054),
      makeV13Segment([[322.21,326.59],[327.57,329.35],[331.89,335.11]],"Ngoài 3 buổi Zoom, con được kiểm tra trình độ để nhận bản đồ học tập phù hợp.","staging/brisky-older-students/older-student-certificate.png","KIỂM TRA TRÌNH ĐỘ • NHẬN BẢN ĐỒ",1.054,1.017),
    ],
  },
];

// Dedicated Video 2 review cut. Both sentence endings retain a quiet safety
// tail so the final Vietnamese syllables are never touched by a fade.
const V23_VIDEO2_AD: AdSpec = {
  ...V22_ADS[0],
  id:"ad02-v23",
  speechAudio:"staging/brisky-v23-audio/ad02-dialogue.wav",
  segments:[
    ...V22_ADS[0].segments.slice(0,6),
    makeV13Segment([[129.95,137.58]],"Ba mẹ hiểu vì sao con học nhiều năm vẫn hổng kiến thức và con thường hổng ở phần nào.","staging/brisky-generated-v3/04-level-assessment.png","CON ĐANG HỔNG PHẦN NÀO?",1.016,1.052),
    V22_ADS[0].segments[7],
    makeV13Segment([[165.41,171.93],[172.17,174.65]],"Thầy chia sẻ cách khơi gợi niềm yêu thích tiếng Anh để con tự giác, chủ động và yêu tiếng Anh hơn.","staging/brisky-generated-v10/03-confident-student.png","TỰ GIÁC • CHỦ ĐỘNG • YÊU TIẾNG ANH HƠN",1.052,1.016),
    V22_ADS[0].segments[9],
  ],
};

// Word-guarded micro-cuts. Pauses over 220ms are removed, while each kept
// phrase retains roughly 80ms before the first word and 120ms after the last.
const tightCuts: Record<string, Array<Array<[number, number]>>> = {
  ad01: [
    [[7.42, 9.12], [9.26, 10.32], [10.5, 13.42], [13.86, 18.08]],
    [[20.22, 24.2], [25.26, 27.82], [28, 34.7], [35.22, 37.8], [37.86, 41.26]],
    [[124.16, 128.96]],
    [[152.56, 153.64], [153.86, 159.74], [160.06, 160.78], [161.02, 161.6], [162.08, 164.06], [164.34, 165.72]],
    [[165.64, 167.2], [167.36, 168.68], [168.82, 171.72], [171.78, 172.7], [172.86, 173.94], [174.34, 177.04]],
    [[178.16, 184.06], [184.36, 185.36], [185.84, 186.9]],
    [[187.69, 192.61], [192.89, 194.85], [194.99, 196.97]],
    [[212.33, 215.67], [218.51, 224.21], [224.67, 225.91]],
    [[235.83, 238.11]],
  ],
  ad02: [
    [[3.04, 7.92]],
    [[15.21, 22.49]],
    [[30, 31.75], [31.81, 41.73]],
    [[106.79, 107.75], [107.95, 121.95]],
    [[212.78, 213.78]],
  ],
  ad03: [
    [[6.13, 13.01], [13.17, 14.79]],
    [[25.04, 27.4], [27.58, 29], [29.3, 38.04], [38.14, 39.72]],
    [[89, 91.66], [91.72, 104.08], [104.16, 104.98]],
    [[157.98, 162.0]],
  ],
  ad04: [
    [[115.56, 117.44], [117.46, 119.82]],
    [[133.38, 135.08], [135.24, 138.32]],
    [[142.45, 144.19], [144.67, 146.85]],
    [[154, 156.67], [156.99, 157.83], [157.89, 161.21]],
    [[387.19, 387.81], [387.85, 392.29]],
    [[445.74, 451.02]],
    [[761.85, 765.27]],
  ],
  ad05: [
    [[32.94, 34.62], [34.82, 37.08], [37.56, 40.76], [40.96, 44.36], [44.64, 45.58], [45.86, 48.84]],
    [[50.49, 56.72]],
    [[153.19, 163.35]],
    [[231.02, 240.22]],
    [[407.42, 409.9]],
  ],
};

const secToFrames = (seconds: number) => Math.max(1, Math.round(seconds * BRISKY_V4_FPS));

const getTimedSegments = (ad: AdSpec, speed = AD_SPEED): TimedSegment[] => {
  let from = 0;
  return ad.segments.map((segment, segmentIndex) => {
    let pieceFrom = 0;
    const pieces = (segment.sourcePieces ?? tightCuts[ad.id]?.[segmentIndex] ?? [[segment.start, segment.end]]).map(([start, end]) => {
      const durationInFrames = Math.max(1, Math.round(((end - start) * BRISKY_V4_FPS) / speed));
      const piece = {start, end, from: pieceFrom, durationInFrames};
      pieceFrom += durationInFrames;
      return piece;
    });
    const contentDurationInFrames = pieces.reduce((sum, piece) => sum + piece.durationInFrames, 0);
    const pauseAfterInFrames = segment.pauseAfterSeconds && segment.pauseAfterSeconds > 0
      ? Math.max(1, Math.round(segment.pauseAfterSeconds * BRISKY_V4_FPS))
      : 0;
    const durationInFrames = contentDurationInFrames + pauseAfterInFrames;
    const timed = {...segment, from, durationInFrames, contentDurationInFrames, pauseAfterInFrames, pieces};
    from += durationInFrames;
    return timed;
  });
};

const cleanWord = (word: string) =>
  word.toLocaleLowerCase("vi").replace(/[.,!?;:–—]/g, "");

const highlighted = new Set([
  "sợ", "mất", "gốc", "hổng", "lười", "kém", "8", "điểm", "ngữ", "pháp",
  "đọc", "hiểu", "3", "buổi", "zoom", "lộ", "trình", "miễn", "phí", "đăng", "ký",
]);

const splitCaptionWords = (text: string): string[][] => {
  const words = text.trim().split(/\s+/);
  const chunkCount = Math.max(1, Math.ceil(words.length / 5));
  const chunkSize = Math.ceil(words.length / chunkCount);
  return Array.from({length: chunkCount}, (_, index) =>
    words.slice(index * chunkSize, Math.min(words.length, (index + 1) * chunkSize)),
  ).filter((chunk) => chunk.length > 0);
};

const makeCaptionCues = (segments: TimedSegment[]): CaptionCue[] => {
  const cues: CaptionCue[] = [];
  for (const segment of segments) {
    const chunks = segment.captionPhrases
      ? segment.captionPhrases.map((phrase) => phrase.trim().split(/\s+/))
      : splitCaptionWords(segment.transcript);
    const weights = chunks.map((chunk) => chunk.reduce((sum, word) => sum + Math.max(2, word.length), 0));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    let cursor = segment.from;
    let cumulativeWeight = 0;
    chunks.forEach((words, index) => {
      const isLast = index === chunks.length - 1;
      cumulativeWeight += weights[index];
      const next = isLast
        ? segment.from + segment.durationInFrames
        : segment.from + Math.round(segment.durationInFrames * (cumulativeWeight / totalWeight));
      const durationInFrames = Math.max(1, next - cursor);
      cues.push({from: cursor, durationInFrames, words});
      cursor = next;
    });
  }
  return cues;
};

const makeV10CaptionCues = (adId: string, segments: TimedSegment[]): CaptionCue[] =>
  (V10_CAPTIONS_BY_AD[adId] ?? []).flatMap((spec) => {
    const segment = segments[spec.segmentIndex];
    if (!segment) return [];
    const from = segment.from + secToFrames(spec.offsetSeconds);
    const requestedDuration = secToFrames(spec.durationSeconds);
    const durationInFrames = Math.max(
      1,
      Math.min(requestedDuration, segment.from + segment.durationInFrames - from),
    );
    return [{from, durationInFrames, words: spec.text.trim().split(/\s+/)}];
  });

const makeReferenceCaptionCues = (adId: string, segments: TimedSegment[]): CaptionCue[] =>
  (REFERENCE_CAPTIONS_BY_AD[adId] ?? V10_CAPTIONS_BY_AD[adId] ?? []).flatMap((spec) => {
    const segment = segments[spec.segmentIndex];
    if (!segment) return [];
    const from = segment.from + secToFrames(spec.offsetSeconds);
    const durationInFrames = Math.max(1, Math.min(secToFrames(spec.durationSeconds), segment.from + segment.durationInFrames - from));
    return [{from, durationInFrames, words: spec.text.trim().split(/\s+/)}];
  });

const makeV13CaptionCues = (adId: string, segments: TimedSegment[]): CaptionCue[] =>
  (V13_CAPTIONS_BY_AD[adId] ?? []).flatMap((spec) => {
    const segment = segments[spec.segmentIndex];
    if (!segment) return [];
    const from = segment.from + secToFrames(spec.offsetSeconds);
    const remaining = segment.from + segment.durationInFrames - from;
    if (remaining <= 0) return [];
    return [{from, durationInFrames: Math.max(1, Math.min(secToFrames(spec.durationSeconds), remaining)), words: spec.text.trim().split(/\s+/)}];
  });

const makeV14CaptionCues = (adId: string, segments: TimedSegment[]): CaptionCue[] =>
  (V14_CAPTIONS_BY_AD[adId] ?? []).flatMap((spec) => {
    const segment = segments[spec.segmentIndex];
    if (!segment) return [];
    const from = segment.from + secToFrames(spec.offsetSeconds);
    const remaining = segment.from + segment.durationInFrames - from;
    if (remaining <= 0) return [];
    return [{from, durationInFrames: Math.max(1, Math.min(secToFrames(spec.durationSeconds), remaining)), words: spec.text.trim().split(/\s+/)}];
  });

const VoiceSegment: React.FC<{segment: TimedSegment; source: string; index: number; voiceGain: number; speed?: number; enhancedMotion?: boolean; intentMotion?: boolean}> = ({
  segment,
  source,
  index,
  voiceGain,
  speed = AD_SPEED,
  enhancedMotion = false,
  intentMotion = false,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(
    frame,
    [0, Math.max(1, segment.durationInFrames - 1)],
    [segment.zoomFrom ?? 1.01, segment.zoomTo ?? 1.035],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  const motionScale = intentMotion
    ? 1 + (scale - 1) * 1.5
    : enhancedMotion
    ? 1.018
      + (0.5 - 0.5 * Math.cos((frame / Math.max(1, BRISKY_V4_FPS * 4.2)) * Math.PI * 2)) * 0.045
    : scale;

  return (
    <AbsoluteFill style={{overflow: "hidden", background: "#02070d"}}>
      <div
        style={{
          position: "absolute",
          inset: -20,
          transform: `scale(${motionScale})`,
          transformOrigin: index % 2 === 0 ? "47% 43%" : "53% 47%",
        }}
      >
        {segment.pieces.map((piece, pieceIndex) => {
          const startFrom = secToFrames(piece.start);
          const endAt = secToFrames(piece.end);
          return (
            <Sequence key={`video-piece-${pieceIndex}`} from={piece.from} durationInFrames={piece.durationInFrames}>
              <OffthreadVideo
                src={staticFile(source)}
                startFrom={startFrom}
                endAt={endAt}
                playbackRate={speed}
                muted
                style={{width: "100%", height: "100%", objectFit: "cover"}}
              />
              {pieceIndex > 0 ? (
                <AbsoluteFill
                  style={{
                    background: "white",
                    opacity: interpolate(frame - piece.from, [0, 3], [0.38, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                />
              ) : null}
            </Sequence>
          );
        })}
        {segment.pauseAfterInFrames > 0 ? (
          <Sequence from={segment.contentDurationInFrames} durationInFrames={segment.pauseAfterInFrames}>
            <Img
              src={staticFile(segment.cover)}
              style={{width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.04) saturate(1.06)"}}
            />
            <AbsoluteFill style={{background: "linear-gradient(180deg,rgba(2,12,28,.05),rgba(2,12,28,.38))"}} />
          </Sequence>
        ) : null}
      </div>
      <AbsoluteFill
        style={{
          background: "linear-gradient(90deg,rgba(3,12,24,.16),transparent 22%,transparent 78%,rgba(3,12,24,.16))",
        }}
      />
      {segment.pieces.map((piece, pieceIndex) => {
        const startFrom = secToFrames(piece.start);
        const endAt = secToFrames(piece.end);
        const voiceVolume = (localFrame: number) => {
          const fadeIn = interpolate(localFrame, [0, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(
            localFrame,
            [Math.max(0, piece.durationInFrames - 2), piece.durationInFrames - 1],
            [1, 0],
            {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
          );
          return Math.min(fadeIn, fadeOut) * voiceGain;
        };
        return (
          <Sequence key={`audio-piece-${pieceIndex}`} from={piece.from} durationInFrames={piece.durationInFrames}>
            <Audio
              src={staticFile(source)}
              startFrom={startFrom}
              endAt={endAt}
              playbackRate={speed}
              volume={voiceVolume}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const JoinCover: React.FC<{segment: TimedSegment}> = ({segment}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duration = Math.round(1.46 * fps);
  const opacity = interpolate(frame, [0, 5, duration - 5, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entrance = spring({frame, fps, config: {damping: 18, stiffness: 190, mass: 0.72}});
  return (
    <AbsoluteFill style={{opacity, background: NAVY, overflow: "hidden"}}>
      <Img
        src={staticFile(segment.cover)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${1.05 + frame * 0.00035})`,
          filter: "contrast(1.04) saturate(1.06)",
        }}
      />
      <AbsoluteFill style={{background: "linear-gradient(180deg,rgba(0,16,38,.02) 38%,rgba(0,16,38,.92) 100%)"}} />
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          bottom: 80,
          padding: "22px 30px",
          borderRadius: 24,
          background: "rgba(4,22,47,.83)",
          border: `2px solid ${GOLD}`,
          color: "white",
          fontSize: 44,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.08,
          textShadow: "0 4px 16px rgba(0,0,0,.75)",
          transform: `translateY(${(1 - entrance) * 30}px) scale(${0.94 + entrance * 0.06})`,
        }}
      >
        {segment.coverLabel}
      </div>
    </AbsoluteFill>
  );
};

type IconKind = "alert" | "book" | "chart" | "video" | "route" | "cursor" | "search" | "target" | "gift" | "spark";

const iconKindFor = (label: string): IconKind => {
  const normalized = label.toLocaleUpperCase("vi");
  if (normalized.includes("ĐĂNG KÝ") || normalized.includes("NHẤN")) return "cursor";
  if (normalized.includes("ZOOM") || normalized.includes("3 BUỔI")) return "video";
  if (normalized.includes("ĐIỂM") || normalized.includes("KẾT QUẢ")) return "chart";
  if (normalized.includes("LỘ TRÌNH") || normalized.includes("ĐÚNG CÁCH")) return "route";
  return "book";
};

const IconGlyph: React.FC<{kind: IconKind}> = ({kind}) => {
  if (kind === "alert") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M32 8 58 54H6z"/><path d="M32 23v14"/><path d="M32 46h.01"/></svg>;
  }
  if (kind === "video") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="17" width="34" height="30" rx="6"/><path d="M42 27l14-8v26l-14-8z"/></svg>;
  }
  if (kind === "chart") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 50h44"/><path d="M15 43l11-12 9 7 15-20"/><path d="M40 18h10v10"/></svg>;
  }
  if (kind === "route") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><circle cx="14" cy="48" r="6"/><circle cx="50" cy="16" r="6"/><path d="M20 48c16 0 5-26 24-31"/><path d="M27 25l7 7 13-14"/></svg>;
  }
  if (kind === "cursor") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 9l33 27-17 3-7 16z"/><path d="M35 40l10 13"/></svg>;
  }
  if (kind === "search") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><circle cx="28" cy="28" r="15"/><path d="m39 39 13 13"/><path d="M22 28h12"/><path d="M28 22v12"/></svg>;
  }
  if (kind === "target") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><circle cx="30" cy="34" r="19"/><circle cx="30" cy="34" r="9"/><path d="m38 26 17-17"/><path d="M45 9h10v10"/></svg>;
  }
  if (kind === "gift") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 25h46v12H9z"/><path d="M13 37h38v19H13z"/><path d="M32 25v31"/><path d="M32 25H21c-7 0-7-11 0-11 6 0 11 11 11 11Z"/><path d="M32 25h11c7 0 7-11 0-11-6 0-11 11-11 11Z"/></svg>;
  }
  if (kind === "spark") {
    return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="m30 7 4 13 13 4-13 4-4 13-4-13-13-4 13-4z"/><path d="m49 39 2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>;
  }
  return <svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14c10-3 18 0 24 6v34c-6-6-14-9-24-6z"/><path d="M56 14c-10-3-18 0-24 6v34c6-6 14-9 24-6z"/></svg>;
};

const MotionInfoCard: React.FC<{segment: TimedSegment; side: "left" | "right"}> = ({segment, side}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 16, stiffness: 205, mass: 0.7}});
  const sweep = interpolate(frame, [5, 28], [-220, 760], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: side === "left" ? 42 : undefined,
        right: side === "right" ? 42 : undefined,
        bottom: 70,
        width: 650,
        minHeight: 128,
        padding: "20px 26px",
        boxSizing: "border-box",
        borderRadius: 26,
        background: "rgba(5,24,51,.88)",
        border: "1px solid rgba(255,255,255,.16)",
        boxShadow: "0 24px 62px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.12)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        overflow: "hidden",
        opacity: p,
        transform: `translateX(${(1 - p) * (side === "left" ? -70 : 70)}px) scale(${0.94 + p * 0.06})`,
      }}
    >
      <div style={{width: 88, height: 88, flex: "0 0 88px", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY, background: `linear-gradient(145deg,${GOLD},#ffe08a)`, boxShadow: "0 10px 30px rgba(245,185,66,.28)"}}>
        <IconGlyph kind={iconKindFor(segment.coverLabel)} />
      </div>
      <div>
        <div style={{fontSize: 15, letterSpacing: 3.6, color: "rgba(220,236,248,.64)", fontWeight: 850, marginBottom: 7}}>BRISKY ACADEMY</div>
        <div style={{fontSize: 34, lineHeight: 1.08, color: "white", fontWeight: 950}}>{segment.coverLabel}</div>
      </div>
      <div style={{position: "absolute", top: -80, bottom: -80, left: 0, width: 150, background: "linear-gradient(90deg,transparent,rgba(50,213,243,.22),transparent)", transform: `translateX(${sweep}px) rotate(14deg)`}} />
    </div>
  );
};

type V10IconCalloutSpec = {
  segmentIndex: number;
  offsetSeconds: number;
  durationSeconds: number;
  side: "left" | "right";
  icon: IconKind;
  kicker: string;
  title: string;
};

const V10_ICON_CALLOUTS_BY_AD: Record<string, V10IconCalloutSpec[]> = {
  ad01: [
    {segmentIndex: 0, offsetSeconds: 2.45, durationSeconds: 1.65, side: "right", icon: "alert", kicker: "DẤU HIỆU", title: "HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex: 1, offsetSeconds: 2.9, durationSeconds: 1.7, side: "left", icon: "book", kicker: "ĐỪNG GẮN NHÃN", title: "CON LƯỜI HAY KÉM"},
    {segmentIndex: 2, offsetSeconds: 0.35, durationSeconds: 1.75, side: "right", icon: "spark", kicker: "CHƯƠNG TRÌNH", title: "BÍ MẬT LẤY GỐC"},
    {segmentIndex: 3, offsetSeconds: 7.8, durationSeconds: 1.7, side: "left", icon: "video", kicker: "DÀNH CHO CHA MẸ", title: "3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex: 4, offsetSeconds: 3.85, durationSeconds: 1.75, side: "right", icon: "search", kicker: "XÁC ĐỊNH ĐÚNG", title: "CON ĐANG HỔNG PHẦN NÀO"},
    {segmentIndex: 5, offsetSeconds: 0.45, durationSeconds: 1.75, side: "left", icon: "route", kicker: "LỘ TRÌNH", title: "HỌC LẠI TỪ GỐC"},
    {segmentIndex: 6, offsetSeconds: 0.45, durationSeconds: 1.75, side: "right", icon: "target", kicker: "KHƠI DẬY ĐỘNG LỰC", title: "TỰ GIÁC • CHỦ ĐỘNG"},
    {segmentIndex: 7, offsetSeconds: 7.45, durationSeconds: 1.7, side: "left", icon: "gift", kicker: "QUÀ TẶNG", title: "KIỂM TRA MIỄN PHÍ"},
  ],
  ad02: [
    {segmentIndex: 0, offsetSeconds: 2.55, durationSeconds: 1.55, side: "right", icon: "alert", kicker: "ĐIỂM XUẤT PHÁT", title: "LỚP 7 • MẤT GỐC"},
    {segmentIndex: 1, offsetSeconds: 2.7, durationSeconds: 1.65, side: "left", icon: "target", kicker: "KẾT QUẢ", title: "8 ĐIỂM TIẾNG ANH"},
    {segmentIndex: 2, offsetSeconds: 3.8, durationSeconds: 1.7, side: "right", icon: "chart", kicker: "HÀNH TRÌNH", title: "3–4 ĐIỂM → 8 ĐIỂM"},
    {segmentIndex: 3, offsetSeconds: 3.75, durationSeconds: 1.7, side: "left", icon: "route", kicker: "KINH NGHIỆM THỰC TẾ", title: "LỘ TRÌNH ĐÚNG HƯỚNG"},
    {segmentIndex: 3, offsetSeconds: 9.1, durationSeconds: 1.65, side: "right", icon: "video", kicker: "CHƯƠNG TRÌNH", title: "3 BUỔI ZOOM • LỚP 3–9"},
  ],
  ad03: [
    {segmentIndex: 0, offsetSeconds: 2.65, durationSeconds: 1.65, side: "right", icon: "alert", kicker: "NỖI LO CỦA BA MẸ", title: "CON LẠI BỊ ĐIỂM KÉM?"},
    {segmentIndex: 1, offsetSeconds: 2.95, durationSeconds: 1.65, side: "left", icon: "book", kicker: "TỪ VỰNG", title: "HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex: 1, offsetSeconds: 6.25, durationSeconds: 1.65, side: "right", icon: "search", kicker: "BÀI ĐỌC DÀI", title: "CON NGẠI VÀ KHÔNG MUỐN ĐỌC"},
    {segmentIndex: 1, offsetSeconds: 9.55, durationSeconds: 1.65, side: "left", icon: "target", kicker: "LÀM BÀI", title: "KHOANH THEO CẢM TÍNH"},
    {segmentIndex: 2, offsetSeconds: 3.75, durationSeconds: 1.7, side: "right", icon: "route", kicker: "LẤY LẠI GỐC", title: "LỘ TRÌNH ĐÚNG CÁCH"},
    {segmentIndex: 2, offsetSeconds: 9.15, durationSeconds: 1.65, side: "left", icon: "video", kicker: "DÀNH CHO CHA MẸ", title: "3 BUỔI ZOOM • LỚP 3–9"},
  ],
  ad04: [
    {segmentIndex: 0, offsetSeconds: 2.25, durationSeconds: 1.45, side: "right", icon: "book", kicker: "PHẦN HỔNG 01", title: "TỪ VỰNG"},
    {segmentIndex: 1, offsetSeconds: 2.45, durationSeconds: 1.45, side: "left", icon: "spark", kicker: "PHẦN HỔNG 02", title: "CÂU ĐƠN"},
    {segmentIndex: 2, offsetSeconds: 2.15, durationSeconds: 1.45, side: "right", icon: "search", kicker: "PHẦN HỔNG 03", title: "NGỮ PHÁP"},
    {segmentIndex: 3, offsetSeconds: 3.0, durationSeconds: 1.55, side: "left", icon: "alert", kicker: "PHẦN HỔNG 04", title: "ĐỌC HIỂU"},
    {segmentIndex: 4, offsetSeconds: 2.7, durationSeconds: 1.55, side: "right", icon: "gift", kicker: "CHƯƠNG TRÌNH", title: "BÍ MẬT LẤY GỐC"},
    {segmentIndex: 5, offsetSeconds: 2.75, durationSeconds: 1.55, side: "left", icon: "video", kicker: "DÀNH CHO CHA MẸ", title: "3 BUỔI ZOOM • LỚP 3–9"},
  ],
  ad05: [
    {segmentIndex: 0, offsetSeconds: 2.45, durationSeconds: 1.65, side: "right", icon: "alert", kicker: "DẤU HIỆU", title: "NHẮC TIẾNG ANH LÀ CON SỢ"},
    {segmentIndex: 0, offsetSeconds: 6.4, durationSeconds: 1.65, side: "left", icon: "book", kicker: "ĐỪNG GẮN NHÃN", title: "CON LƯỜI"},
    {segmentIndex: 1, offsetSeconds: 3.2, durationSeconds: 1.65, side: "right", icon: "search", kicker: "NGUYÊN NHÂN THẬT", title: "MẤT GỐC • MÔNG LUNG"},
    {segmentIndex: 2, offsetSeconds: 2.35, durationSeconds: 1.65, side: "left", icon: "gift", kicker: "CHƯƠNG TRÌNH", title: "BÍ MẬT LẤY GỐC"},
    {segmentIndex: 2, offsetSeconds: 6.25, durationSeconds: 1.65, side: "right", icon: "video", kicker: "DÀNH CHO CHA MẸ", title: "3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex: 3, offsetSeconds: 3.05, durationSeconds: 1.65, side: "left", icon: "route", kicker: "LỘ TRÌNH", title: "CƠ BẢN → NÂNG CAO"},
  ],
};

const V13_ICON_CALLOUTS_BY_AD: Record<string, V10IconCalloutSpec[]> = {
  "ad02-v13": [
    {segmentIndex:0,offsetSeconds:2.2,durationSeconds:1.45,side:"right",icon:"alert",kicker:"ĐIỂM XUẤT PHÁT",title:"LỚP 7 • MẤT GỐC"},
    {segmentIndex:1,offsetSeconds:4.6,durationSeconds:1.45,side:"left",icon:"target",kicker:"KẾT QUẢ",title:"8 ĐIỂM TIẾNG ANH"},
    {segmentIndex:3,offsetSeconds:2.1,durationSeconds:1.45,side:"right",icon:"alert",kicker:"SAI LẦM",title:"ÉP CON HỌC CÁCH CŨ"},
    {segmentIndex:5,offsetSeconds:3.7,durationSeconds:1.45,side:"left",icon:"search",kicker:"XÁC ĐỊNH",title:"CON ĐANG HỔNG Ở ĐÂU"},
    {segmentIndex:7,offsetSeconds:6.7,durationSeconds:1.45,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA MIỄN PHÍ"},
  ],
  "ad03-v13": [
    {segmentIndex:0,offsetSeconds:2.3,durationSeconds:1.45,side:"right",icon:"alert",kicker:"NỖI LO",title:"CON LẠI BỊ ĐIỂM KÉM?"},
    {segmentIndex:1,offsetSeconds:5.5,durationSeconds:1.45,side:"left",icon:"book",kicker:"DẤU HIỆU",title:"HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex:2,offsetSeconds:3.0,durationSeconds:1.45,side:"right",icon:"alert",kicker:"HỆ QUẢ",title:"CÀNG HỌC • CÀNG NẢN"},
    {segmentIndex:4,offsetSeconds:3.8,durationSeconds:1.45,side:"left",icon:"search",kicker:"NGUYÊN NHÂN",title:"VÌ SAO CON MẤT GỐC"},
    {segmentIndex:6,offsetSeconds:3.6,durationSeconds:1.45,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA MIỄN PHÍ"},
  ],
  "ad04-v13": [
    {segmentIndex:1,offsetSeconds:2.2,durationSeconds:1.4,side:"left",icon:"route",kicker:"NGUYÊN NHÂN",title:"CHƯA ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:2,offsetSeconds:1.9,durationSeconds:1.35,side:"right",icon:"book",kicker:"PHẦN HỔNG 01",title:"TỪ VỰNG"},
    {segmentIndex:4,offsetSeconds:1.7,durationSeconds:1.35,side:"left",icon:"search",kicker:"PHẦN HỔNG 03",title:"NGỮ PHÁP"},
    {segmentIndex:6,offsetSeconds:3.0,durationSeconds:1.4,side:"right",icon:"alert",kicker:"HỆ QUẢ",title:"CÀNG HỌC • CÀNG ĐUỐI"},
    {segmentIndex:8,offsetSeconds:2.7,durationSeconds:1.4,side:"left",icon:"video",kicker:"DÀNH CHO CHA MẸ",title:"3 BUỔI ZOOM • LỚP 3–9"},
  ],
  "ad05-v13": [
    {segmentIndex:0,offsetSeconds:5.7,durationSeconds:1.45,side:"left",icon:"alert",kicker:"ĐỪNG GẮN NHÃN",title:"CON LƯỜI"},
    {segmentIndex:1,offsetSeconds:2.7,durationSeconds:1.4,side:"right",icon:"search",kicker:"NGUYÊN NHÂN",title:"MẤT GỐC • MÔNG LUNG"},
    {segmentIndex:2,offsetSeconds:5.8,durationSeconds:1.45,side:"left",icon:"alert",kicker:"HỆ QUẢ",title:"CON KHÔNG BIẾT BẮT ĐẦU TỪ ĐÂU"},
    {segmentIndex:4,offsetSeconds:7.9,durationSeconds:1.45,side:"right",icon:"book",kicker:"NỘI DUNG",title:"KỸ NĂNG ĐỌC • VIẾT"},
    {segmentIndex:6,offsetSeconds:4.7,durationSeconds:1.4,side:"left",icon:"gift",kicker:"QUÀ TẶNG",title:"BẢN ĐỒ HỌC TẬP"},
  ],
  "ad06-v13": [
    {segmentIndex:1,offsetSeconds:2.4,durationSeconds:1.4,side:"left",icon:"route",kicker:"NGUYÊN NHÂN",title:"CHƯA ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:2,offsetSeconds:3.0,durationSeconds:1.4,side:"right",icon:"alert",kicker:"VÒNG LẶP",title:"MỆT • SỢ • ĐUỐI"},
    {segmentIndex:3,offsetSeconds:6.6,durationSeconds:1.45,side:"left",icon:"book",kicker:"LỚP CÀNG CAO",title:"KIẾN THỨC CÀNG NẶNG"},
    {segmentIndex:5,offsetSeconds:6.5,durationSeconds:1.4,side:"right",icon:"video",kicker:"DÀNH CHO CHA MẸ",title:"3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex:6,offsetSeconds:5.3,durationSeconds:1.4,side:"left",icon:"route",kicker:"NHẬN LỘ TRÌNH",title:"PHÙ HỢP VỚI CON"},
  ],
};

type V10BrollSpec = {
  segmentIndex: number;
  offsetSeconds: number;
  durationSeconds: number;
  src: string;
  portrait: boolean;
  icon: IconKind;
  title: string;
};

const V10_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  ad01: [
    {segmentIndex: 0, offsetSeconds: 3.15, durationSeconds: 3.0, src: "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", portrait: true, icon: "alert", title: "HỌC NHIỀU NHƯNG VẪN MÔNG LUNG"},
    {segmentIndex: 3, offsetSeconds: 3.2, durationSeconds: 2.65, src: "staging/brisky-older-students/zoom-class.png", portrait: false, icon: "video", title: "3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex: 5, offsetSeconds: 3.65, durationSeconds: 2.8, src: "staging/brisky-generated-v10/02-parent-student-roadmap.png", portrait: true, icon: "route", title: "LỘ TRÌNH PHÙ HỢP VỚI PHẦN CON ĐANG HỔNG"},
    {segmentIndex: 6, offsetSeconds: 4.7, durationSeconds: 2.8, src: "staging/brisky-generated-v10/03-confident-student.png", portrait: true, icon: "target", title: "TỰ GIÁC • CHỦ ĐỘNG • YÊU TIẾNG ANH"},
  ],
  ad02: [
    {segmentIndex: 0, offsetSeconds: 1.8, durationSeconds: 2.6, src: "staging/brisky-older-students/teen-interview.png", portrait: true, icon: "alert", title: "HỌC SINH LỚP 7 TỪNG MẤT GỐC"},
    {segmentIndex: 1, offsetSeconds: 2.8, durationSeconds: 2.8, src: "staging/brisky-older-students/older-student-certificate.png", portrait: false, icon: "target", title: "KẾT QUẢ SAU MỘT NĂM NỖ LỰC"},
    {segmentIndex: 3, offsetSeconds: 4.0, durationSeconds: 2.8, src: "staging/brisky-generated-v10/02-parent-student-roadmap.png", portrait: true, icon: "route", title: "LỘ TRÌNH ĐƯỢC ĐÚC RÚT TỪ THỰC TẾ"},
  ],
  ad03: [
    {segmentIndex: 0, offsetSeconds: 3.0, durationSeconds: 2.6, src: "staging/brisky-real/06-student-activity.jpg", portrait: false, icon: "alert", title: "ÁP LỰC TRƯỚC MỖI KỲ KIỂM TRA"},
    {segmentIndex: 1, offsetSeconds: 3.1, durationSeconds: 2.7, src: "staging/brisky-generated-v3/02-long-reading.png", portrait: true, icon: "book", title: "GẶP BÀI ĐỌC DÀI LÀ CON RẤT NGẠI"},
    {segmentIndex: 2, offsetSeconds: 6.5, durationSeconds: 2.7, src: "staging/brisky-older-students/zoom-class.png", portrait: false, icon: "video", title: "3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
  ],
  ad04: [
    {segmentIndex: 0, offsetSeconds: 1.35, durationSeconds: 2.45, src: "staging/brisky-generated-v3/01-vocabulary-forgotten.png", portrait: true, icon: "book", title: "HỔNG TỪ VỰNG"},
    {segmentIndex: 1, offsetSeconds: 1.55, durationSeconds: 2.5, src: "staging/brisky-real/05-class-lesson.jpg", portrait: false, icon: "spark", title: "BIẾT TỪ NHƯNG CHƯA GHÉP ĐƯỢC CÂU"},
    {segmentIndex: 2, offsetSeconds: 1.35, durationSeconds: 2.45, src: "staging/brisky-generated-v3/03-grammar-application.png", portrait: true, icon: "search", title: "HỔNG NGỮ PHÁP"},
    {segmentIndex: 3, offsetSeconds: 2.1, durationSeconds: 2.7, src: "staging/brisky-generated-v3/02-long-reading.png", portrait: true, icon: "alert", title: "HỔNG ĐỌC HIỂU"},
    {segmentIndex: 4, offsetSeconds: 1.7, durationSeconds: 2.5, src: "staging/brisky-real/04-brisky-teachers.jpg", portrait: false, icon: "gift", title: "BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC"},
  ],
  ad05: [
    {segmentIndex: 0, offsetSeconds: 3.15, durationSeconds: 2.8, src: "staging/brisky-generated-v10/01-student-vocabulary-struggle.png", portrait: true, icon: "alert", title: "CON SỢ TIẾNG ANH KHÔNG CÓ NGHĨA LÀ CON LƯỜI"},
    {segmentIndex: 1, offsetSeconds: 2.0, durationSeconds: 2.7, src: "staging/brisky-generated-v3/04-level-assessment.png", portrait: true, icon: "search", title: "CON ĐANG MẤT GỐC VÀ MÔNG LUNG"},
    {segmentIndex: 2, offsetSeconds: 3.35, durationSeconds: 2.7, src: "staging/brisky-real/04-brisky-teachers.jpg", portrait: false, icon: "video", title: "3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex: 3, offsetSeconds: 3.1, durationSeconds: 2.8, src: "staging/brisky-generated-v10/02-parent-student-roadmap.png", portrait: true, icon: "route", title: "LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
  ],
};

const V13_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  "ad02-v13": [
    {segmentIndex:0,offsetSeconds:1.55,durationSeconds:2.35,src:"staging/brisky-older-students/teen-interview.png",portrait:true,icon:"alert",title:"HỌC SINH LỚP 7 TỪNG MẤT GỐC"},
    {segmentIndex:2,offsetSeconds:4.0,durationSeconds:2.55,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"target",title:"TỪ 3–4 ĐIỂM LÊN 8 ĐIỂM"},
    {segmentIndex:4,offsetSeconds:5.2,durationSeconds:2.55,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"LỘ TRÌNH ĐÚC RÚT TỪ THỰC TẾ"},
    {segmentIndex:7,offsetSeconds:2.6,durationSeconds:2.45,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad03-v13": [
    {segmentIndex:1,offsetSeconds:2.4,durationSeconds:2.5,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"GẶP BÀI ĐỌC DÀI LÀ CON NGẠI"},
    {segmentIndex:2,offsetSeconds:2.0,durationSeconds:2.4,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG HỌC • CÀNG NẢN"},
    {segmentIndex:3,offsetSeconds:6.1,durationSeconds:2.55,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex:6,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad04-v13": [
    {segmentIndex:2,offsetSeconds:.9,durationSeconds:2.3,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỔNG TỪ VỰNG"},
    {segmentIndex:4,offsetSeconds:.65,durationSeconds:2.25,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"search",title:"HỔNG NGỮ PHÁP"},
    {segmentIndex:5,offsetSeconds:2.0,durationSeconds:2.5,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"alert",title:"HỔNG ĐỌC HIỂU"},
    {segmentIndex:7,offsetSeconds:1.2,durationSeconds:2.4,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"gift",title:"BÍ MẬT LẤY GỐC TIẾNG ANH"},
    {segmentIndex:9,offsetSeconds:2.9,durationSeconds:2.5,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"NHẬN LỘ TRÌNH PHÙ HỢP"},
  ],
  "ad05-v13": [
    {segmentIndex:0,offsetSeconds:2.6,durationSeconds:2.45,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CON SỢ TIẾNG ANH KHÔNG CÓ NGHĨA LÀ LƯỜI"},
    {segmentIndex:2,offsetSeconds:2.2,durationSeconds:2.5,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"CON KHÔNG BIẾT BẮT ĐẦU TỪ ĐÂU"},
    {segmentIndex:4,offsetSeconds:4.0,durationSeconds:2.55,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"PHƯƠNG PHÁP GIÚP CON LẤY LẠI GỐC"},
    {segmentIndex:5,offsetSeconds:3.0,durationSeconds:2.5,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
  ],
  "ad06-v13": [
    {segmentIndex:0,offsetSeconds:3.8,durationSeconds:2.5,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"HỌC NHIỀU NĂM NHƯNG VẪN SỢ"},
    {segmentIndex:3,offsetSeconds:3.2,durationSeconds:2.5,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"LỚP CÀNG CAO • BÀI CÀNG KHÓ"},
    {segmentIndex:5,offsetSeconds:3.4,durationSeconds:2.55,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex:6,offsetSeconds:2.2,durationSeconds:2.5,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"XÁC ĐỊNH PHẦN HỔNG • NHẬN LỘ TRÌNH"},
  ],
};

const V10IconCallout: React.FC<{spec: V10IconCalloutSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 17, stiffness: 220, mass: 0.68}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 6), durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <div style={{position: "absolute", top: 225, left: spec.side === "left" ? 34 : undefined, right: spec.side === "right" ? 34 : undefined, width: 390, padding: "16px 18px", boxSizing: "border-box", borderRadius: 24, background: "rgba(9,18,31,.90)", border: "1px solid rgba(255,255,255,.18)", boxShadow: "0 20px 48px rgba(0,0,0,.38)", display: "flex", alignItems: "center", gap: 16, opacity: enter * exit, transform: `translateX(${(1 - enter) * (spec.side === "left" ? -55 : 55)}px) scale(${0.92 + enter * 0.08})`}}>
      <div style={{width: 72, height: 72, flex: "0 0 72px", borderRadius: 20, display: "grid", placeItems: "center", color: NAVY, background: `linear-gradient(145deg,#ffe49a,${GOLD})`, boxShadow: "0 10px 28px rgba(245,185,66,.28)"}}>
        <IconGlyph kind={spec.icon} />
      </div>
      <div>
        <div style={{fontSize: 13, letterSpacing: 2.3, color: "rgba(235,240,246,.62)", fontWeight: 850, marginBottom: 5}}>{spec.kicker}</div>
        <div style={{fontSize: 27, lineHeight: 1.08, color: "white", fontWeight: 950}}>{spec.title}</div>
      </div>
    </div>
  );
};

const V10Broll: React.FC<{spec: V10BrollSpec;tdcStyle?:boolean}> = ({spec,tdcStyle=false}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 185, mass: 0.75}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 7), durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const image = staticFile(spec.src);
  const compactLabel = /8 ĐIỂM/.test(spec.title) ? "Đạt 8 điểm" : /TỰ GIÁC/.test(spec.title) ? "Tự giác hơn" : /KIỂM TRA/.test(spec.title) ? "Kiểm tra miễn phí" : /BÀI ĐỌC|ĐỌC HIỂU/.test(spec.title) ? "Bài đọc dài" : /TỪ VỰNG/.test(spec.title) ? "Hổng từ vựng" : /NGỮ PHÁP/.test(spec.title) ? "Hổng ngữ pháp" : /LỘ TRÌNH/.test(spec.title) ? "Đúng lộ trình" : /MẤT GỐC/.test(spec.title) ? "Đang mất gốc" : "Cha mẹ cần biết";
  return (
    <AbsoluteFill style={{background: NAVY, overflow: "hidden", opacity: tdcStyle ? 1 : enter * exit}}>
      {spec.portrait ? (
        <Img src={image} style={{width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.015 + frame * 0.00028})`, filter: "contrast(1.025) saturate(1.03)"}} />
      ) : (
        <>
          <Img src={image} style={{position: "absolute", inset: -70, width: 1220, height: 2060, objectFit: "cover", filter: "blur(32px) brightness(.28) saturate(.85)", transform: "scale(1.08)"}} />
          <div style={{position: "absolute", left: 54, right: 54, top: 425, height: 590, borderRadius: 32, overflow: "hidden", border: `2px solid rgba(245,185,66,.55)`, boxShadow: "0 30px 80px rgba(0,0,0,.45)", background: "#030a12", transform: `scale(${0.94 + enter * 0.06})`}}>
            <Img src={image} style={{width: "100%", height: "100%", objectFit: "contain"}} />
          </div>
        </>
      )}
      <AbsoluteFill style={{background: spec.portrait ? "linear-gradient(180deg,rgba(2,12,28,.12) 45%,rgba(2,12,28,.88) 100%)" : "linear-gradient(180deg,rgba(2,12,28,.18),rgba(2,12,28,.52))"}} />
      <div style={{position:"absolute",left:tdcStyle?undefined:70,right:tdcStyle?54:70,top:tdcStyle?230:112,width:tdcStyle?220:undefined,display:"flex",flexDirection:tdcStyle?"column":"row",alignItems:"center",justifyContent:"center",gap:tdcStyle?6:18,padding:tdcStyle?"13px 12px":"18px 24px",borderRadius:tdcStyle?16:24,background:tdcStyle?"linear-gradient(135deg,rgba(34,30,29,.92),rgba(12,14,17,.94))":"rgba(6,18,36,.86)",border:"1px solid rgba(255,255,255,.14)",boxShadow:"0 18px 46px rgba(0,0,0,.34)",transform:`translateY(${(1-enter)*(tdcStyle?-12:-30)}px) scale(${tdcStyle ? .94+enter*.06 : 1})`}}>
        <div style={{width:tdcStyle?50:66,height:tdcStyle?50:66,flex:`0 0 ${tdcStyle?50:66}px`,borderRadius:tdcStyle?14:19,display:"grid",placeItems:"center",color:tdcStyle?"#ffb43c":NAVY,background:tdcStyle?"rgba(255,180,60,.1)":GOLD,transform:tdcStyle?"scale(.78)":undefined}}><IconGlyph kind={spec.icon} /></div>
        <div style={{fontSize:tdcStyle?16:31,lineHeight:1.08,color:"white",fontWeight:950,textAlign:tdcStyle?"center":undefined}}>{tdcStyle?compactLabel:spec.title}</div>
      </div>
    </AbsoluteFill>
  );
};

type V10InfographicSpec = {
  segmentIndex: number;
  offsetSeconds: number;
  durationSeconds: number;
  eyebrow: string;
  title: string;
  items: Array<{icon: IconKind; text: string}>;
};

const V10_INFOGRAPHICS_BY_AD: Record<string, V10InfographicSpec[]> = {
  ad01: [
    {segmentIndex: 1, offsetSeconds: 8.65, durationSeconds: 2.7, eyebrow: "VÒNG LẶP MẤT GỐC", title: "Học nhiều nhưng chưa đúng cách", items: [{icon: "book", text: "Học nhiều năm"}, {icon: "alert", text: "Hổng kiến thức"}, {icon: "chart", text: "Học trước • quên sau"}]},
    {segmentIndex: 7, offsetSeconds: 1.15, durationSeconds: 2.85, eyebrow: "LỘ TRÌNH CÁ NHÂN HÓA", title: "Biết đúng điểm xuất phát của con", items: [{icon: "target", text: "Kiểm tra trình độ"}, {icon: "search", text: "Xác định phần hổng"}, {icon: "route", text: "Nhận lộ trình phù hợp"}]},
  ],
  ad02: [
    {segmentIndex: 2, offsetSeconds: 2.7, durationSeconds: 2.8, eyebrow: "HÀNH TRÌNH TIẾN BỘ", title: "Kết quả không đến trong một ngày", items: [{icon: "alert", text: "Xuất phát 3–4 điểm"}, {icon: "route", text: "Nỗ lực đúng hướng"}, {icon: "target", text: "Chạm mốc 8 điểm"}]},
    {segmentIndex: 3, offsetSeconds: 8.05, durationSeconds: 2.75, eyebrow: "LỘ TRÌNH BRISKY", title: "Đồng hành đúng cách cùng con", items: [{icon: "book", text: "Kinh nghiệm giảng dạy"}, {icon: "route", text: "Lộ trình lấy lại gốc"}, {icon: "video", text: "Chia sẻ trong 3 buổi"}]},
  ],
  ad03: [
    {segmentIndex: 1, offsetSeconds: 6.5, durationSeconds: 2.75, eyebrow: "DẤU HIỆU HỔNG GỐC", title: "Con đang học nhưng chưa hiểu", items: [{icon: "book", text: "Học trước • quên sau"}, {icon: "search", text: "Ngại bài đọc dài"}, {icon: "alert", text: "Khoanh theo cảm tính"}]},
    {segmentIndex: 2, offsetSeconds: 9.45, durationSeconds: 2.7, eyebrow: "GIẢI PHÁP CHO BA MẸ", title: "Bắt đầu từ đúng phần con đang hổng", items: [{icon: "search", text: "Nhận diện vấn đề"}, {icon: "route", text: "Lộ trình lấy lại gốc"}, {icon: "video", text: "3 buổi Zoom"}]},
  ],
  ad04: [
    {segmentIndex: 3, offsetSeconds: 0.1, durationSeconds: 2.65, eyebrow: "4 KHOẢNG HỔNG PHỔ BIẾN", title: "Con đang mắc ở phần nào?", items: [{icon: "book", text: "Từ vựng và câu đơn"}, {icon: "search", text: "Ngữ pháp ứng dụng"}, {icon: "alert", text: "Đọc hiểu cả đoạn"}]},
    {segmentIndex: 5, offsetSeconds: 0.15, durationSeconds: 2.65, eyebrow: "BÍ MẬT LẤY GỐC", title: "Ba mẹ có một lộ trình rõ ràng", items: [{icon: "search", text: "Xác định phần hổng"}, {icon: "route", text: "Học lại đúng thứ tự"}, {icon: "video", text: "3 buổi Zoom miễn phí"}]},
  ],
  ad05: [
    {segmentIndex: 1, offsetSeconds: 0.1, durationSeconds: 2.65, eyebrow: "ĐỪNG VỘI GẮN NHÃN", title: "Điểm thấp không đồng nghĩa với lười", items: [{icon: "alert", text: "Con đang sợ"}, {icon: "search", text: "Con bị mất gốc"}, {icon: "route", text: "Con thiếu định hướng"}]},
    {segmentIndex: 3, offsetSeconds: 5.9, durationSeconds: 2.7, eyebrow: "LỘ TRÌNH RÕ RÀNG", title: "Giúp ba mẹ biết con đang ở đâu", items: [{icon: "target", text: "Xác định điểm xuất phát"}, {icon: "book", text: "Học từ cơ bản"}, {icon: "route", text: "Tiến tới nâng cao"}]},
  ],
};

const V13_INFOGRAPHICS_BY_AD: Record<string, V10InfographicSpec[]> = {
  "ad02-v13": [
    {segmentIndex:2,offsetSeconds:6.8,durationSeconds:2.55,eyebrow:"HÀNH TRÌNH TIẾN BỘ",title:"3–4 điểm → 8 điểm",items:[{icon:"target",text:"Xác định điểm xuất phát"},{icon:"route",text:"Học theo lộ trình"},{icon:"chart",text:"Tiến bộ từng bước"}]},
    {segmentIndex:6,offsetSeconds:5.7,durationSeconds:2.55,eyebrow:"LỘ TRÌNH LẤY LẠI GỐC",title:"Bắt đầu từ đúng phần con hổng",items:[{icon:"search",text:"Xác định phần hổng"},{icon:"book",text:"Học lại đúng thứ tự"},{icon:"target",text:"Cải thiện điểm số"}]},
  ],
  "ad03-v13": [
    {segmentIndex:1,offsetSeconds:8.9,durationSeconds:2.55,eyebrow:"DẤU HIỆU PHỔ BIẾN",title:"Con đang hổng ở nhiều mắt xích",items:[{icon:"book",text:"Từ vựng mau quên"},{icon:"search",text:"Ngại bài đọc dài"},{icon:"target",text:"Ngữ pháp khó áp dụng"}]},
    {segmentIndex:5,offsetSeconds:6.4,durationSeconds:2.55,eyebrow:"GIẢI PHÁP CHO BA MẸ",title:"Một lộ trình rõ ràng",items:[{icon:"search",text:"Hiểu đúng nguyên nhân"},{icon:"route",text:"Học lại từ gốc"},{icon:"target",text:"Tiến bộ bền vững"}]},
  ],
  "ad04-v13": [
    {segmentIndex:5,offsetSeconds:3.25,durationSeconds:2.55,eyebrow:"4 KHOẢNG HỔNG PHỔ BIẾN",title:"Con đang mắc ở phần nào?",items:[{icon:"book",text:"Từ vựng và câu đơn"},{icon:"search",text:"Ngữ pháp ứng dụng"},{icon:"alert",text:"Đọc hiểu cả đoạn"}]},
    {segmentIndex:9,offsetSeconds:5.65,durationSeconds:2.55,eyebrow:"3 BUỔI ZOOM DÀNH CHO BA MẸ",title:"Biết đúng để đồng hành đúng",items:[{icon:"search",text:"Xác định phần hổng"},{icon:"route",text:"Nhận lộ trình phù hợp"},{icon:"target",text:"Giúp con tiến bộ"}]},
  ],
  "ad05-v13": [
    {segmentIndex:2,offsetSeconds:6.5,durationSeconds:2.55,eyebrow:"ĐỪNG VỘI GẮN NHÃN",title:"Lười có thể chỉ là hệ quả",items:[{icon:"alert",text:"Con bị mất gốc"},{icon:"search",text:"Con thiếu định hướng"},{icon:"route",text:"Con cần đúng phương pháp"}]},
    {segmentIndex:5,offsetSeconds:5.55,durationSeconds:2.55,eyebrow:"LỘ TRÌNH RÕ RÀNG",title:"Ba mẹ biết con đang ở đâu",items:[{icon:"target",text:"Xác định điểm đầu"},{icon:"book",text:"Học từ cơ bản"},{icon:"route",text:"Tiến tới nâng cao"}]},
  ],
  "ad06-v13": [
    {segmentIndex:3,offsetSeconds:8.8,durationSeconds:2.55,eyebrow:"KHI CON CÀNG LÊN CAO",title:"Áp lực ngày càng lớn",items:[{icon:"book",text:"Bài đọc dài hơn"},{icon:"search",text:"Ngữ pháp nặng hơn"},{icon:"alert",text:"Điểm số áp lực hơn"}]},
    {segmentIndex:6,offsetSeconds:5.55,durationSeconds:2.55,eyebrow:"SAU 3 BUỔI ZOOM",title:"Ba mẹ có hướng đi rõ ràng",items:[{icon:"search",text:"Biết phần con hổng"},{icon:"route",text:"Nhận lộ trình phù hợp"},{icon:"target",text:"Đồng hành đúng cách"}]},
  ],
};

const V14_ICON_CALLOUTS_BY_AD: Record<string, V10IconCalloutSpec[]> = {
  "ad02-v14": V13_ICON_CALLOUTS_BY_AD["ad02-v13"],
  "ad03-v14": [
    {segmentIndex:0,offsetSeconds:2.3,durationSeconds:1.45,side:"right",icon:"alert",kicker:"NỖI LO",title:"CON LẠI BỊ ĐIỂM KÉM?"},
    {segmentIndex:1,offsetSeconds:5.5,durationSeconds:1.45,side:"left",icon:"book",kicker:"DẤU HIỆU",title:"HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex:2,offsetSeconds:3.0,durationSeconds:1.45,side:"right",icon:"alert",kicker:"HỆ QUẢ",title:"CÀNG HỌC • CÀNG NẢN"},
    {segmentIndex:3,offsetSeconds:3.8,durationSeconds:1.45,side:"left",icon:"search",kicker:"NGUYÊN NHÂN",title:"VÌ SAO CON MẤT GỐC"},
    {segmentIndex:4,offsetSeconds:3.6,durationSeconds:1.45,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA MIỄN PHÍ"},
  ],
  "ad04-v14": V13_ICON_CALLOUTS_BY_AD["ad04-v13"],
  "ad05-v14": [
    {segmentIndex:0,offsetSeconds:5.4,durationSeconds:1.45,side:"left",icon:"alert",kicker:"ĐỪNG GẮN NHÃN",title:"CON LƯỜI"},
    {segmentIndex:1,offsetSeconds:2.7,durationSeconds:1.4,side:"right",icon:"search",kicker:"NGUYÊN NHÂN",title:"MẤT GỐC • MÔNG LUNG"},
    {segmentIndex:2,offsetSeconds:5.8,durationSeconds:1.45,side:"left",icon:"alert",kicker:"HỆ QUẢ",title:"CON KHÔNG BIẾT BẮT ĐẦU TỪ ĐÂU"},
    {segmentIndex:4,offsetSeconds:1.5,durationSeconds:1.4,side:"right",icon:"book",kicker:"PHƯƠNG PHÁP",title:"PHÙ HỢP VỚI CON"},
    {segmentIndex:6,offsetSeconds:4.7,durationSeconds:1.4,side:"left",icon:"gift",kicker:"QUÀ TẶNG",title:"BẢN ĐỒ HỌC TẬP"},
  ],
  "ad06-v14": V13_ICON_CALLOUTS_BY_AD["ad06-v13"],
};

const V14_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  "ad02-v14": V13_BROLLS_BY_AD["ad02-v13"],
  "ad03-v14": [
    {segmentIndex:1,offsetSeconds:2.4,durationSeconds:2.5,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"GẶP BÀI ĐỌC DÀI LÀ CON NGẠI"},
    {segmentIndex:2,offsetSeconds:2.0,durationSeconds:2.4,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG HỌC • CÀNG NẢN"},
    {segmentIndex:2,offsetSeconds:8.2,durationSeconds:2.55,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex:4,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad04-v14": V13_BROLLS_BY_AD["ad04-v13"],
  "ad05-v14": [
    {segmentIndex:0,offsetSeconds:1.2,durationSeconds:2.6,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CON SỢ TIẾNG ANH KHÔNG CÓ NGHĨA LÀ LƯỜI"},
    {segmentIndex:2,offsetSeconds:2.2,durationSeconds:2.5,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"CON KHÔNG BIẾT BẮT ĐẦU TỪ ĐÂU"},
    {segmentIndex:4,offsetSeconds:1.0,durationSeconds:2.5,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"LỰA CHỌN PHƯƠNG PHÁP PHÙ HỢP"},
    {segmentIndex:5,offsetSeconds:3.0,durationSeconds:2.5,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
  ],
  "ad06-v14": V13_BROLLS_BY_AD["ad06-v13"],
};

const V14_INFOGRAPHICS_BY_AD: Record<string, V10InfographicSpec[]> = {
  "ad02-v14": V13_INFOGRAPHICS_BY_AD["ad02-v13"],
  "ad03-v14": [
    {segmentIndex:1,offsetSeconds:8.9,durationSeconds:2.55,eyebrow:"DẤU HIỆU PHỔ BIẾN",title:"Con đang hổng ở nhiều mắt xích",items:[{icon:"book",text:"Từ vựng mau quên"},{icon:"search",text:"Ngại bài đọc dài"},{icon:"target",text:"Ngữ pháp khó áp dụng"}]},
    {segmentIndex:3,offsetSeconds:9.2,durationSeconds:2.55,eyebrow:"GIẢI PHÁP CHO BA MẸ",title:"Một lộ trình rõ ràng",items:[{icon:"search",text:"Hiểu đúng nguyên nhân"},{icon:"route",text:"Học lại từ gốc"},{icon:"target",text:"Tiến bộ bền vững"}]},
  ],
  "ad04-v14": V13_INFOGRAPHICS_BY_AD["ad04-v13"],
  "ad05-v14": V13_INFOGRAPHICS_BY_AD["ad05-v13"],
  "ad06-v14": V13_INFOGRAPHICS_BY_AD["ad06-v13"],
};

const V20_ICON_CALLOUTS_BY_AD: Record<string, V10IconCalloutSpec[]> = {
  "ad02-v14":[
    {segmentIndex:1,offsetSeconds:3.4,durationSeconds:1.45,side:"left",icon:"target",kicker:"KẾT QUẢ",title:"8 ĐIỂM TIẾNG ANH"},
    {segmentIndex:4,offsetSeconds:3.2,durationSeconds:1.45,side:"right",icon:"alert",kicker:"HỆ QUẢ",title:"CON SỢ TRƯỚC KỲ THI"},
    {segmentIndex:5,offsetSeconds:7.1,durationSeconds:1.45,side:"left",icon:"video",kicker:"CHƯƠNG TRÌNH",title:"3 BUỔI ZOOM"},
    {segmentIndex:8,offsetSeconds:4.8,durationSeconds:1.45,side:"right",icon:"spark",kicker:"ĐỘNG LỰC",title:"TỰ GIÁC • CHỦ ĐỘNG"},
    {segmentIndex:9,offsetSeconds:3.0,durationSeconds:1.45,side:"left",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA MIỄN PHÍ"},
  ],
  "ad03-v14":[
    {segmentIndex:0,offsetSeconds:4.3,durationSeconds:1.45,side:"right",icon:"alert",kicker:"NỖI LO",title:"CON BỊ ĐIỂM KÉM?"},
    {segmentIndex:1,offsetSeconds:3.5,durationSeconds:1.45,side:"left",icon:"book",kicker:"DẤU HIỆU",title:"NGẠI BÀI ĐỌC DÀI"},
    {segmentIndex:3,offsetSeconds:7.2,durationSeconds:1.45,side:"right",icon:"video",kicker:"CHƯƠNG TRÌNH",title:"3 BUỔI ZOOM"},
    {segmentIndex:4,offsetSeconds:7.2,durationSeconds:1.45,side:"left",icon:"route",kicker:"GIẢI PHÁP",title:"HỌC LẠI TỪ GỐC"},
    {segmentIndex:5,offsetSeconds:3.0,durationSeconds:1.45,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA MIỄN PHÍ"},
  ],
  "ad04-v14":[
    {segmentIndex:2,offsetSeconds:.8,durationSeconds:1.4,side:"right",icon:"book",kicker:"PHẦN HỔNG 01",title:"TỪ VỰNG"},
    {segmentIndex:4,offsetSeconds:.8,durationSeconds:1.4,side:"left",icon:"search",kicker:"PHẦN HỔNG 03",title:"NGỮ PHÁP"},
    {segmentIndex:6,offsetSeconds:3.0,durationSeconds:1.4,side:"right",icon:"alert",kicker:"HỆ QUẢ",title:"CÀNG HỌC • CÀNG ĐUỐI"},
    {segmentIndex:9,offsetSeconds:1.2,durationSeconds:1.45,side:"left",icon:"video",kicker:"DÀNH CHO CHA MẸ",title:"3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex:11,offsetSeconds:4.7,durationSeconds:1.45,side:"right",icon:"target",kicker:"KẾT QUẢ",title:"HỌC CHẮC • LÀM BÀI TỐT"},
  ],
  "ad05-v14":[
    {segmentIndex:0,offsetSeconds:5.1,durationSeconds:1.45,side:"left",icon:"alert",kicker:"ĐỪNG GẮN NHÃN",title:"CON LƯỜI"},
    {segmentIndex:2,offsetSeconds:1.2,durationSeconds:1.45,side:"right",icon:"book",kicker:"BIỂU HIỆN",title:"HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex:4,offsetSeconds:6.0,durationSeconds:1.45,side:"left",icon:"video",kicker:"CHƯƠNG TRÌNH",title:"3 BUỔI ZOOM"},
    {segmentIndex:7,offsetSeconds:3.1,durationSeconds:1.45,side:"right",icon:"route",kicker:"LỘ TRÌNH",title:"CƠ BẢN → NÂNG CAO"},
    {segmentIndex:8,offsetSeconds:4.0,durationSeconds:1.45,side:"left",icon:"gift",kicker:"QUÀ TẶNG",title:"BẢN ĐỒ HỌC TẬP"},
  ],
};

const V20_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  "ad02-v14":[
    {segmentIndex:0,offsetSeconds:1.7,durationSeconds:2.35,src:"staging/brisky-older-students/teen-interview.png",portrait:true,icon:"alert",title:"HỌC SINH LỚP 7 TỪNG MẤT GỐC"},
    {segmentIndex:1,offsetSeconds:2.8,durationSeconds:2.45,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"target",title:"SAU MỘT NĂM • ĐẠT 8 ĐIỂM"},
    {segmentIndex:8,offsetSeconds:2.1,durationSeconds:2.45,src:"staging/brisky-generated-v10/03-confident-student.png",portrait:true,icon:"spark",title:"TỰ GIÁC • CHỦ ĐỘNG • YÊU TIẾNG ANH"},
  ],
  "ad03-v14":[
    {segmentIndex:1,offsetSeconds:3.0,durationSeconds:2.5,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"GẶP BÀI ĐỌC DÀI LÀ CON NGẠI"},
    {segmentIndex:2,offsetSeconds:1.7,durationSeconds:2.5,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"LỚP CÀNG CAO • BÀI CÀNG DÀI"},
    {segmentIndex:5,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad04-v14":[
    {segmentIndex:2,offsetSeconds:.8,durationSeconds:2.35,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỔNG TỪ VỰNG • HỌC RỒI LẠI QUÊN"},
    {segmentIndex:5,offsetSeconds:1.7,durationSeconds:2.45,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"BIẾT TỪNG CÂU • KHÔNG HIỂU CẢ ĐOẠN"},
    {segmentIndex:11,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-generated-v10/03-confident-student.png",portrait:true,icon:"target",title:"LẤY LẠI GỐC • HỌC CHẮC HƠN"},
  ],
  "ad05-v14":[
    {segmentIndex:0,offsetSeconds:2.4,durationSeconds:2.45,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CON SỢ TIẾNG ANH KHÔNG CÓ NGHĨA LÀ LƯỜI"},
    {segmentIndex:2,offsetSeconds:1.0,durationSeconds:2.45,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex:7,offsetSeconds:3.0,durationSeconds:2.45,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
  ],
};

// Denser, sentence-anchored visual coverage for the TDC-style v21 cut.
const V21_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  "ad02-v14":[
    {segmentIndex:0,offsetSeconds:1.1,durationSeconds:2.35,src:"staging/brisky-older-students/teen-interview.png",portrait:true,icon:"alert",title:"HỌC SINH LỚP 7 TỪNG MẤT GỐC"},
    {segmentIndex:1,offsetSeconds:2.2,durationSeconds:2.45,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"target",title:"SAU MỘT NĂM • ĐẠT 8 ĐIỂM"},
    {segmentIndex:2,offsetSeconds:.9,durationSeconds:2.35,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"target",title:"TỪ 3–4 ĐIỂM • TIẾN TỚI 8 ĐIỂM"},
    {segmentIndex:3,offsetSeconds:1.15,durationSeconds:2.35,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"THÚC ÉP CÀNG TẠO ÁP LỰC"},
    {segmentIndex:4,offsetSeconds:1.2,durationSeconds:2.4,src:"staging/brisky-real/06-student-activity.jpg",portrait:false,icon:"alert",title:"CÁCH HỌC CŨ KHIẾN CON SỢ HÃI"},
    {segmentIndex:5,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"LỘ TRÌNH TRONG 3 BUỔI ZOOM"},
    {segmentIndex:7,offsetSeconds:.65,durationSeconds:2.3,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"XÂY LẠI ĐÚNG PHẦN BỊ HỔNG"},
    {segmentIndex:8,offsetSeconds:2.0,durationSeconds:2.4,src:"staging/brisky-generated-v10/03-confident-student.png",portrait:true,icon:"spark",title:"TỰ GIÁC • CHỦ ĐỘNG • YÊU TIẾNG ANH"},
  ],
  "ad03-v14":[
    {segmentIndex:0,offsetSeconds:1.4,durationSeconds:2.35,src:"staging/brisky-real/06-student-activity.jpg",portrait:false,icon:"alert",title:"ÁP LỰC TRƯỚC MỖI KỲ THI"},
    {segmentIndex:1,offsetSeconds:2.4,durationSeconds:2.45,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TỪ VỰNG RỒI LẠI QUÊN"},
    {segmentIndex:1,offsetSeconds:6.0,durationSeconds:2.35,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"search",title:"THUỘC NGỮ PHÁP • KHÔNG BIẾT ÁP DỤNG"},
    {segmentIndex:2,offsetSeconds:1.6,durationSeconds:2.4,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"LỚP CÀNG CAO • BÀI ĐỌC CÀNG DÀI"},
    {segmentIndex:3,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG SỢ • CÀNG HỌC CÀNG NẢN"},
    {segmentIndex:4,offsetSeconds:2.0,durationSeconds:2.4,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"HỌC LẠI THEO ĐÚNG LỘ TRÌNH"},
    {segmentIndex:4,offsetSeconds:6.4,durationSeconds:2.35,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex:5,offsetSeconds:2.0,durationSeconds:2.45,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
  "ad04-v14":[
    {segmentIndex:0,offsetSeconds:1.2,durationSeconds:2.35,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH"},
    {segmentIndex:1,offsetSeconds:1.0,durationSeconds:2.35,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"route",title:"CON CẦN ĐƯỢC HỌC ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:2,offsetSeconds:.7,durationSeconds:2.3,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỔNG TỪ VỰNG • HỌC RỒI LẠI QUÊN"},
    {segmentIndex:3,offsetSeconds:.8,durationSeconds:2.3,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"book",title:"BIẾT TỪ NHƯNG KHÔNG GHÉP ĐƯỢC CÂU"},
    {segmentIndex:4,offsetSeconds:.7,durationSeconds:2.3,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"search",title:"HỌC NGỮ PHÁP • KHÔNG BIẾT ÁP DỤNG"},
    {segmentIndex:5,offsetSeconds:1.5,durationSeconds:2.4,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"BIẾT TỪNG CÂU • KHÔNG HIỂU CẢ ĐOẠN"},
    {segmentIndex:6,offsetSeconds:2.1,durationSeconds:2.4,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG LÊN LỚP CAO • CÀNG ĐUỐI"},
    {segmentIndex:8,offsetSeconds:1.0,durationSeconds:2.35,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH"},
    {segmentIndex:10,offsetSeconds:1.2,durationSeconds:2.4,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"BIẾT PHẦN HỔNG • NHẬN LỘ TRÌNH"},
    {segmentIndex:11,offsetSeconds:1.8,durationSeconds:2.45,src:"staging/brisky-generated-v10/03-confident-student.png",portrait:true,icon:"target",title:"LẤY LẠI GỐC • HỌC CHẮC HƠN"},
  ],
  "ad05-v14":[
    {segmentIndex:0,offsetSeconds:1.6,durationSeconds:2.4,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CON SỢ TIẾNG ANH KHÔNG CÓ NGHĨA LÀ LƯỜI"},
    {segmentIndex:1,offsetSeconds:1.0,durationSeconds:2.35,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"MẤT GỐC • MÔNG LUNG VỀ ĐỊNH HƯỚNG"},
    {segmentIndex:2,offsetSeconds:1.1,durationSeconds:2.4,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"TỪ VỰNG • NGỮ PHÁP KHÔNG LIÊN KẾT"},
    {segmentIndex:3,offsetSeconds:2.0,durationSeconds:2.4,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"alert",title:"CÀNG ĐUỐI • CÀNG CHÁN NẢN"},
    {segmentIndex:4,offsetSeconds:1.7,durationSeconds:2.4,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"3 BUỔI ZOOM DÀNH CHO CHA MẸ"},
    {segmentIndex:5,offsetSeconds:1.0,durationSeconds:2.35,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"book",title:"TỪNG BƯỚC LẤY LẠI GỐC"},
    {segmentIndex:6,offsetSeconds:.8,durationSeconds:2.25,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"route",title:"CHỌN ĐÚNG PHƯƠNG PHÁP CHO CON"},
    {segmentIndex:7,offsetSeconds:2.6,durationSeconds:2.45,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
    {segmentIndex:8,offsetSeconds:1.8,durationSeconds:2.4,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ • NHẬN BẢN ĐỒ HỌC TẬP"},
  ],
};

const V22_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  "ad04-v31":[
    {segmentIndex:0,offsetSeconds:1.0,durationSeconds:2.2,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH"},
    {segmentIndex:1,offsetSeconds:1.0,durationSeconds:2.2,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"route",title:"CON CẦN ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:2.05,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỔNG TỪ VỰNG"},
    {segmentIndex:3,offsetSeconds:.55,durationSeconds:2.1,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"book",title:"HỔNG CÂU ĐƠN"},
    {segmentIndex:4,offsetSeconds:.4,durationSeconds:2.05,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"search",title:"HỔNG NGỮ PHÁP"},
    {segmentIndex:5,offsetSeconds:1.0,durationSeconds:2.2,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"HỌC THÊM NHIỀU • ĐIỂM VẪN KHÔNG LÊN"},
    {segmentIndex:6,offsetSeconds:1.0,durationSeconds:2.25,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH"},
    {segmentIndex:7,offsetSeconds:1.0,durationSeconds:2.25,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex:8,offsetSeconds:.8,durationSeconds:2.2,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"NHẬN BIẾT ĐÚNG PHẦN CON HỔNG"},
  ],
  "ad04-v22":[
    {segmentIndex:0,offsetSeconds:1.0,durationSeconds:2.2,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH"},
    {segmentIndex:1,offsetSeconds:1.0,durationSeconds:2.2,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"route",title:"CON CẦN ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:2.05,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỔNG TỪ VỰNG"},
    {segmentIndex:3,offsetSeconds:.55,durationSeconds:2.1,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"book",title:"HỔNG CÂU ĐƠN"},
    {segmentIndex:4,offsetSeconds:.4,durationSeconds:2.05,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"search",title:"HỔNG NGỮ PHÁP"},
    {segmentIndex:5,offsetSeconds:.9,durationSeconds:2.2,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"book",title:"HỔNG ĐỌC HIỂU"},
    {segmentIndex:7,offsetSeconds:1.0,durationSeconds:2.25,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH"},
    {segmentIndex:8,offsetSeconds:1.0,durationSeconds:2.25,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex:9,offsetSeconds:.8,durationSeconds:2.2,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"NHẬN BIẾT ĐÚNG PHẦN CON HỔNG"},
  ],
  "ad05-v22":[
    {segmentIndex:0,offsetSeconds:.7,durationSeconds:2.15,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"ĐỪNG VỘI GẮN NHÃN CON LƯỜI"},
    {segmentIndex:1,offsetSeconds:.8,durationSeconds:2.2,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"MẤT GỐC • MÔNG LUNG"},
    {segmentIndex:2,offsetSeconds:.45,durationSeconds:2.1,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TRƯỚC • QUÊN SAU"},
    {segmentIndex:3,offsetSeconds:.45,durationSeconds:2.05,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"alert",title:"CÀNG ĐUỐI • CÀNG CHÁN NẢN"},
    {segmentIndex:4,offsetSeconds:.7,durationSeconds:2.2,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"alert",title:"BA MẸ CHƯA BIẾT LÀM SAO ĐỂ CON YÊU TIẾNG ANH"},
    {segmentIndex:5,offsetSeconds:1.2,durationSeconds:2.25,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM"},
    {segmentIndex:6,offsetSeconds:.65,durationSeconds:2.2,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"route",title:"PHƯƠNG PHÁP GIÚP CON LẤY LẠI GỐC"},
    {segmentIndex:7,offsetSeconds:1.0,durationSeconds:2.2,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"LỘ TRÌNH TỪ CƠ BẢN ĐẾN NÂNG CAO"},
    {segmentIndex:8,offsetSeconds:1.0,durationSeconds:2.25,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ • NHẬN BẢN ĐỒ"},
  ],
};

const V23_BROLLS_BY_AD: Record<string, V10BrollSpec[]> = {
  "ad02-v23":[
    {segmentIndex:0,offsetSeconds:.55,durationSeconds:1.9,src:"staging/brisky-older-students/teen-interview.png",portrait:true,icon:"alert",title:"HỌC SINH LỚP 7 TỪNG MẤT GỐC"},
    {segmentIndex:1,offsetSeconds:.55,durationSeconds:1.85,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"spark",title:"MỘT NĂM KIÊN TRÌ ĐÚNG HƯỚNG"},
    {segmentIndex:1,offsetSeconds:3.45,durationSeconds:1.95,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"target",title:"KẾT QUẢ • 8 ĐIỂM TIẾNG ANH"},
    {segmentIndex:2,offsetSeconds:.65,durationSeconds:1.9,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"target",title:"TỪ 3–4 ĐIỂM • TIẾN TỚI 8 ĐIỂM"},
    {segmentIndex:3,offsetSeconds:.7,durationSeconds:1.9,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"THÚC ÉP CÀNG TẠO ÁP LỰC"},
    {segmentIndex:4,offsetSeconds:.65,durationSeconds:1.9,src:"staging/brisky-real/06-student-activity.jpg",portrait:false,icon:"alert",title:"CÁCH HỌC CŨ KHIẾN CON SỢ"},
    {segmentIndex:4,offsetSeconds:4.15,durationSeconds:1.9,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"TÂM LÝ TRƯỚC MỖI KỲ THI"},
    {segmentIndex:5,offsetSeconds:.75,durationSeconds:1.9,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"route",title:"LỘ TRÌNH ĐÚC RÚT TỪ THỰC TẾ"},
    {segmentIndex:5,offsetSeconds:6.9,durationSeconds:1.95,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM • CHA MẸ LỚP 3–9"},
    {segmentIndex:6,offsetSeconds:.65,durationSeconds:1.9,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"CON ĐANG HỔNG Ở PHẦN NÀO?"},
    {segmentIndex:7,offsetSeconds:.75,durationSeconds:1.9,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"XÂY LẠI KIẾN THỨC TỪ GỐC"},
    {segmentIndex:8,offsetSeconds:.75,durationSeconds:1.9,src:"staging/brisky-generated-v10/03-confident-student.png",portrait:true,icon:"spark",title:"TỰ GIÁC • CHỦ ĐỘNG • YÊU TIẾNG ANH"},
    {segmentIndex:9,offsetSeconds:.75,durationSeconds:1.95,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ MIỄN PHÍ"},
  ],
};

const V22_INFOGRAPHICS_BY_AD: Record<string, V10InfographicSpec[]> = {
  "ad04-v31":[
    {segmentIndex:5,offsetSeconds:1.6,durationSeconds:2.35,eyebrow:"HỆ QUẢ KÉO DÀI",title:"Càng học càng đuối",items:[{icon:"book",text:"Học thêm nhiều"},{icon:"alert",text:"Điểm vẫn không lên"},{icon:"target",text:"Lớp cao càng đuối"}]},
    {segmentIndex:9,offsetSeconds:.4,durationSeconds:2.35,eyebrow:"SAU 3 BUỔI ZOOM",title:"Ba mẹ có hướng đi rõ ràng",items:[{icon:"search",text:"Biết phần con hổng"},{icon:"route",text:"Nhận lộ trình phù hợp"},{icon:"target",text:"Đồng hành đúng cách"}]},
  ],
  "ad04-v22":[
    {segmentIndex:5,offsetSeconds:3.0,durationSeconds:2.35,eyebrow:"4 PHẦN HỔNG PHỔ BIẾN",title:"Con đang mắc ở đâu?",items:[{icon:"book",text:"Từ vựng và câu đơn"},{icon:"search",text:"Ngữ pháp ứng dụng"},{icon:"alert",text:"Đọc hiểu cả đoạn"}]},
    {segmentIndex:10,offsetSeconds:.4,durationSeconds:2.35,eyebrow:"SAU 3 BUỔI ZOOM",title:"Ba mẹ có hướng đi rõ ràng",items:[{icon:"search",text:"Biết phần con hổng"},{icon:"route",text:"Nhận lộ trình phù hợp"},{icon:"target",text:"Đồng hành đúng cách"}]},
  ],
  "ad05-v22":[
    {segmentIndex:6,offsetSeconds:1.4,durationSeconds:2.35,eyebrow:"NỘI DUNG 3 BUỔI",title:"Từng bước lấy lại gốc",items:[{icon:"route",text:"Phương pháp phù hợp"},{icon:"book",text:"Xây lại kiến thức gốc"},{icon:"target",text:"Yêu lại tiếng Anh"}]},
    {segmentIndex:8,offsetSeconds:4.2,durationSeconds:2.35,eyebrow:"QUÀ TẶNG CHO CON",title:"Biết đúng điểm xuất phát",items:[{icon:"search",text:"Kiểm tra trình độ"},{icon:"target",text:"Xác định phần hổng"},{icon:"route",text:"Nhận bản đồ học tập"}]},
  ],
};

const V23_INFOGRAPHICS_BY_AD: Record<string, V10InfographicSpec[]> = {
  "ad02-v23":[
    {segmentIndex:2,offsetSeconds:2.55,durationSeconds:2.05,eyebrow:"HÀNH TRÌNH TIẾN BỘ",title:"Từ mất gốc đến 8 điểm",items:[{icon:"alert",text:"Xuất phát 3–4 điểm"},{icon:"route",text:"Nỗ lực đúng hướng"},{icon:"target",text:"Đạt 8 điểm tiếng Anh"}]},
    {segmentIndex:6,offsetSeconds:3.95,durationSeconds:2.1,eyebrow:"BƯỚC ĐẦU TIÊN",title:"Biết đúng phần con hổng",items:[{icon:"search",text:"Tìm nguyên nhân"},{icon:"book",text:"Xác định phần hổng"},{icon:"route",text:"Chọn đúng lộ trình"}]},
    {segmentIndex:9,offsetSeconds:5.75,durationSeconds:2.1,eyebrow:"QUÀ TẶNG CHO CON",title:"Có điểm xuất phát rõ ràng",items:[{icon:"search",text:"Kiểm tra miễn phí"},{icon:"target",text:"Biết trình độ hiện tại"},{icon:"route",text:"Nhận lộ trình từ gốc"}]},
  ],
};

const V22_ICON_CALLOUTS_BY_AD: Record<string, V10IconCalloutSpec[]> = {
  "ad04-v31":[
    {segmentIndex:1,offsetSeconds:3.1,durationSeconds:1.35,side:"right",icon:"route",kicker:"NGUYÊN NHÂN",title:"CHƯA ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:5,offsetSeconds:.2,durationSeconds:1.35,side:"left",icon:"alert",kicker:"HỆ QUẢ",title:"HỌC NHIỀU • ĐIỂM KHÔNG LÊN"},
    {segmentIndex:7,offsetSeconds:3.0,durationSeconds:1.35,side:"right",icon:"video",kicker:"DÀNH CHO CHA MẸ",title:"3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex:8,offsetSeconds:2.4,durationSeconds:1.35,side:"left",icon:"search",kicker:"NỘI DUNG",title:"CON ĐANG HỔNG PHẦN NÀO"},
  ],
  "ad04-v22":[
    {segmentIndex:1,offsetSeconds:3.1,durationSeconds:1.35,side:"right",icon:"route",kicker:"NGUYÊN NHÂN",title:"CHƯA ĐÚNG PHƯƠNG PHÁP"},
    {segmentIndex:6,offsetSeconds:.2,durationSeconds:1.35,side:"left",icon:"alert",kicker:"HỆ QUẢ",title:"LÊN LỚP CAO • CÀNG ĐUỐI"},
    {segmentIndex:8,offsetSeconds:3.0,durationSeconds:1.35,side:"right",icon:"video",kicker:"DÀNH CHO CHA MẸ",title:"3 BUỔI ZOOM • LỚP 3–9"},
    {segmentIndex:9,offsetSeconds:2.4,durationSeconds:1.35,side:"left",icon:"search",kicker:"NỘI DUNG",title:"CON ĐANG HỔNG PHẦN NÀO"},
  ],
  "ad05-v22":[
    {segmentIndex:0,offsetSeconds:1.9,durationSeconds:1.35,side:"left",icon:"alert",kicker:"ĐỪNG GẮN NHÃN",title:"CON LƯỜI"},
    {segmentIndex:1,offsetSeconds:2.3,durationSeconds:1.35,side:"right",icon:"search",kicker:"NGUYÊN NHÂN",title:"MẤT GỐC • MÔNG LUNG"},
    {segmentIndex:4,offsetSeconds:2.5,durationSeconds:1.35,side:"right",icon:"alert",kicker:"NỖI LO BA MẸ",title:"LÀM SAO ĐỂ CON YÊU TIẾNG ANH?"},
    {segmentIndex:5,offsetSeconds:5.0,durationSeconds:1.35,side:"left",icon:"video",kicker:"CHƯƠNG TRÌNH",title:"3 BUỔI ZOOM"},
    {segmentIndex:7,offsetSeconds:3.3,durationSeconds:1.35,side:"right",icon:"route",kicker:"LỘ TRÌNH",title:"CƠ BẢN → NÂNG CAO"},
  ],
};

const V23_ICON_CALLOUTS_BY_AD: Record<string, V10IconCalloutSpec[]> = {
  "ad02-v23":[
    {segmentIndex:1,offsetSeconds:5.35,durationSeconds:1.25,side:"right",icon:"target",kicker:"KẾT QUẢ",title:"8 ĐIỂM TIẾNG ANH"},
    {segmentIndex:3,offsetSeconds:2.65,durationSeconds:1.25,side:"left",icon:"alert",kicker:"BA MẸ CẦN TRÁNH",title:"TẠO THÊM ÁP LỰC"},
    {segmentIndex:5,offsetSeconds:4.65,durationSeconds:1.25,side:"right",icon:"video",kicker:"CHƯƠNG TRÌNH",title:"3 BUỔI ZOOM"},
    {segmentIndex:7,offsetSeconds:3.85,durationSeconds:1.25,side:"left",icon:"route",kicker:"LỘ TRÌNH",title:"XÂY LẠI TỪ GỐC"},
    {segmentIndex:8,offsetSeconds:5.7,durationSeconds:1.25,side:"right",icon:"spark",kicker:"ĐỘNG LỰC",title:"YÊU TIẾNG ANH HƠN"},
  ],
};

V22_CAPTIONS_BY_AD["ad04-v32"]=[
  v20Cue(0,.18,1.65,"Học nhiều năm vẫn sợ tiếng Anh","DẤU HIỆU MẤT GỐC","vẫn sợ tiếng Anh","orange"),v20Cue(0,3.45,1.55,"Học trước rồi lại quên sau","VÒNG LẶP QUEN THUỘC","quên sau","orange"),v20Cue(0,5.65,1.25,"Điểm số trên trường chưa cao","KẾT QUẢ HIỆN TẠI","chưa cao","orange"),
  v20Cue(1,.15,1.65,"Con chưa học đúng phương pháp","NGUYÊN NHÂN THẬT","đúng phương pháp","cyan"),v20Cue(2,.12,1.55,"Hổng từ vựng, học rồi lại quên","PHẦN HỔNG 01","Hổng từ vựng","orange"),v20Cue(2,2.55,1.45,"Ngày mai lại quên","HỌC TRƯỚC • QUÊN SAU","lại quên","orange"),
  v20Cue(3,.12,1.45,"Con đang hổng câu đơn","PHẦN HỔNG 02","hổng câu đơn","orange"),v20Cue(3,2.15,1.5,"Không ghép được thành câu","BIỂU HIỆN CỤ THỂ","không ghép được","orange"),v20Cue(4,.12,1.5,"Hổng ngữ pháp","PHẦN HỔNG 03","Hổng ngữ pháp","orange"),v20Cue(4,2.1,1.45,"Không biết cách áp dụng","HỌC NHƯNG CHƯA DÙNG ĐƯỢC","không biết áp dụng","orange"),
  v20Cue(5,.12,1.55,"Học thêm nhiều, điểm vẫn không lên","HỆ QUẢ KÉO DÀI","điểm vẫn không lên","orange"),v20Cue(5,3.25,1.55,"Lớp càng cao, con càng đuối","NỖI LO CỦA BA MẸ","càng đuối","orange"),v20Cue(6,.15,1.7,"Bí mật lấy gốc tiếng Anh cho con","CHƯƠNG TRÌNH CHO BA MẸ","lấy gốc tiếng Anh","cyan"),v20Cue(7,.15,1.65,"3 buổi Zoom cho cha mẹ lớp 3–9","HOÀN TOÀN MIỄN PHÍ","3 buổi Zoom","cyan"),v20Cue(8,.15,1.6,"Nhận biết con đang yếu phần nào","NỘI DUNG 3 BUỔI","yếu phần nào","cyan"),v20Cue(9,.15,1.6,"Đọc, viết, ngữ pháp, kỹ năng làm bài","LỘ TRÌNH PHÙ HỢP","kỹ năng làm bài","cyan"),
];
V22_BROLLS_BY_AD["ad04-v32"]=[
  {segmentIndex:0,offsetSeconds:.75,durationSeconds:2.0,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"HỌC NHIỀU NĂM • VẪN SỢ"},{segmentIndex:0,offsetSeconds:4.35,durationSeconds:2.0,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TRƯỚC • QUÊN SAU"},
  {segmentIndex:1,offsetSeconds:.8,durationSeconds:2.0,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"route",title:"CẦN ĐÚNG PHƯƠNG PHÁP"},{segmentIndex:2,offsetSeconds:.3,durationSeconds:1.9,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỔNG TỪ VỰNG"},
  {segmentIndex:3,offsetSeconds:.08,durationSeconds:1.75,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"book",title:"HỔNG CÂU ĐƠN"},{segmentIndex:3,offsetSeconds:1.95,durationSeconds:1.85,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"book",title:"KHÔNG GHÉP ĐƯỢC THÀNH CÂU"},
  {segmentIndex:4,offsetSeconds:.08,durationSeconds:1.65,src:"staging/brisky-generated-v3/03-grammar-application.png",portrait:true,icon:"search",title:"HỔNG NGỮ PHÁP"},{segmentIndex:4,offsetSeconds:1.92,durationSeconds:1.75,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"search",title:"KHÔNG BIẾT CÁCH ÁP DỤNG"},
  {segmentIndex:5,offsetSeconds:.35,durationSeconds:1.8,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"ĐIỂM VẪN KHÔNG LÊN"},{segmentIndex:6,offsetSeconds:.7,durationSeconds:2.0,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH"},{segmentIndex:7,offsetSeconds:.7,durationSeconds:2.0,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM • LỚP 3–9"},{segmentIndex:8,offsetSeconds:.55,durationSeconds:1.85,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"search",title:"CON ĐANG YẾU PHẦN NÀO?"},{segmentIndex:9,offsetSeconds:.45,durationSeconds:1.85,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"route",title:"NHẬN LỘ TRÌNH PHÙ HỢP"},
];
V22_INFOGRAPHICS_BY_AD["ad04-v32"]=[{segmentIndex:5,offsetSeconds:2.45,durationSeconds:2.25,eyebrow:"HỆ QUẢ KÉO DÀI",title:"Càng học càng đuối",items:[{icon:"book",text:"Học thêm nhiều"},{icon:"alert",text:"Điểm vẫn không lên"},{icon:"target",text:"Lớp cao càng đuối"}]},{segmentIndex:9,offsetSeconds:2.35,durationSeconds:2.15,eyebrow:"SAU 3 BUỔI ZOOM",title:"Ba mẹ có hướng đi rõ ràng",items:[{icon:"search",text:"Biết phần con hổng"},{icon:"route",text:"Nhận lộ trình phù hợp"},{icon:"target",text:"Đồng hành đúng cách"}]}];
V22_ICON_CALLOUTS_BY_AD["ad04-v32"]=[
  {segmentIndex:0,offsetSeconds:2.9,durationSeconds:1.2,side:"right",icon:"alert",kicker:"DẤU HIỆU",title:"VẪN SỢ TIẾNG ANH"},{segmentIndex:1,offsetSeconds:3.15,durationSeconds:1.25,side:"left",icon:"route",kicker:"NGUYÊN NHÂN",title:"CHƯA ĐÚNG PHƯƠNG PHÁP"},{segmentIndex:2,offsetSeconds:2.45,durationSeconds:1.25,side:"right",icon:"book",kicker:"PHẦN HỔNG",title:"TỪ VỰNG"},{segmentIndex:4,offsetSeconds:2.0,durationSeconds:1.25,side:"left",icon:"search",kicker:"PHẦN HỔNG",title:"NGỮ PHÁP"},{segmentIndex:6,offsetSeconds:3.05,durationSeconds:1.25,side:"right",icon:"video",kicker:"CHƯƠNG TRÌNH",title:"BÍ MẬT LẤY GỐC"},{segmentIndex:7,offsetSeconds:3.05,durationSeconds:1.25,side:"left",icon:"video",kicker:"DÀNH CHO CHA MẸ",title:"3 BUỔI ZOOM • LỚP 3–9"},{segmentIndex:8,offsetSeconds:2.65,durationSeconds:1.25,side:"right",icon:"search",kicker:"NHẬN BIẾT",title:"CON ĐANG HỔNG PHẦN NÀO"},{segmentIndex:9,offsetSeconds:2.6,durationSeconds:1.25,side:"left",icon:"route",kicker:"GIẢI PHÁP",title:"LỘ TRÌNH PHÙ HỢP"},
];

const V20_INFOGRAPHICS_BY_AD: Record<string, V10InfographicSpec[]> = {
  "ad02-v14":[
    {segmentIndex:2,offsetSeconds:2.4,durationSeconds:2.5,eyebrow:"HÀNH TRÌNH TIẾN BỘ",title:"Từ mất gốc đến 8 điểm",items:[{icon:"alert",text:"Xuất phát 3–4 điểm"},{icon:"route",text:"Nỗ lực đúng hướng"},{icon:"target",text:"Đạt 8 điểm tiếng Anh"}]},
    {segmentIndex:7,offsetSeconds:3.5,durationSeconds:2.5,eyebrow:"LỘ TRÌNH CHO CON",title:"Xây lại từ đúng phần bị hổng",items:[{icon:"search",text:"Xác định phần hổng"},{icon:"book",text:"Học chắc từ gốc"},{icon:"target",text:"Làm bài tốt hơn"}]},
  ],
  "ad03-v14":[
    {segmentIndex:1,offsetSeconds:8.7,durationSeconds:2.5,eyebrow:"DẤU HIỆU HỔNG GỐC",title:"Con đang mắc ở nhiều mắt xích",items:[{icon:"book",text:"Từ vựng mau quên"},{icon:"search",text:"Khoanh theo cảm tính"},{icon:"target",text:"Ngữ pháp khó áp dụng"}]},
    {segmentIndex:4,offsetSeconds:10.5,durationSeconds:2.5,eyebrow:"LỘ TRÌNH HỌC LẠI",title:"Từ hiểu nguyên nhân đến tự giác",items:[{icon:"search",text:"Biết phần con hổng"},{icon:"route",text:"Học lại từ gốc"},{icon:"spark",text:"Khơi lại động lực"}]},
  ],
  "ad04-v14":[
    {segmentIndex:5,offsetSeconds:3.1,durationSeconds:2.5,eyebrow:"4 PHẦN HỔNG PHỔ BIẾN",title:"Con đang hổng ở đâu?",items:[{icon:"book",text:"Từ vựng và câu đơn"},{icon:"search",text:"Ngữ pháp ứng dụng"},{icon:"alert",text:"Đọc hiểu cả đoạn"}]},
    {segmentIndex:10,offsetSeconds:3.0,durationSeconds:2.5,eyebrow:"NỘI DUNG 3 BUỔI",title:"Biết đúng để đồng hành đúng",items:[{icon:"search",text:"Nhận biết phần hổng"},{icon:"route",text:"Nhận lộ trình phù hợp"},{icon:"target",text:"Giúp con tiến bộ"}]},
  ],
  "ad05-v14":[
    {segmentIndex:3,offsetSeconds:4.8,durationSeconds:2.5,eyebrow:"ĐỪNG VỘI GẮN NHÃN",title:"Lười có thể chỉ là hệ quả",items:[{icon:"alert",text:"Con đang chán nản"},{icon:"search",text:"Con bị mất gốc"},{icon:"route",text:"Con cần đúng phương pháp"}]},
    {segmentIndex:7,offsetSeconds:7.8,durationSeconds:2.5,eyebrow:"LỘ TRÌNH RÕ RÀNG",title:"Ba mẹ biết con đang ở đâu",items:[{icon:"target",text:"Xác định điểm đầu"},{icon:"book",text:"Học từ cơ bản"},{icon:"route",text:"Tiến tới nâng cao"}]},
  ],
};

const V10Infographic: React.FC<{spec: V10InfographicSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 195, mass: 0.78}});
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 7), durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{background: "radial-gradient(circle at 18% 10%,#133e59 0%,#091521 38%,#070b12 100%)", padding: "250px 70px 180px", boxSizing: "border-box", opacity: enter * exit}}>
      <div style={{textAlign: "center", transform: `translateY(${(1 - enter) * 35}px)`}}>
        <div style={{fontSize: 20, letterSpacing: 5.5, color: GOLD, fontWeight: 900}}>{spec.eyebrow}</div>
        <div style={{fontSize: 58, lineHeight: 1.06, color: "white", fontWeight: 950, marginTop: 20}}>{spec.title}</div>
        <div style={{width: 92, height: 5, borderRadius: 99, margin: "24px auto 50px", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: 22}}>
        {spec.items.map((item, index) => {
          const itemEnter = spring({frame: frame - index * 6, fps, config: {damping: 18, stiffness: 205, mass: 0.7}});
          return (
            <div key={item.text} style={{height: 142, borderRadius: 28, padding: "0 28px", display: "flex", alignItems: "center", gap: 24, background: "rgba(255,255,255,.075)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 18px 50px rgba(0,0,0,.28)", opacity: itemEnter, transform: `translateX(${(1 - itemEnter) * 70}px)`}}>
              <div style={{width: 82, height: 82, flex: "0 0 82px", borderRadius: 23, display: "grid", placeItems: "center", color: NAVY, background: `linear-gradient(145deg,#ffe69d,${GOLD})`}}><IconGlyph kind={item.icon} /></div>
              <div style={{fontSize: 42, lineHeight: 1.08, color: "white", fontWeight: 930}}>{item.text}</div>
              <div style={{marginLeft: "auto", color: "rgba(255,255,255,.34)", fontSize: 28, fontWeight: 900}}>0{index + 1}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{cue: CaptionCue}> = ({cue}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({frame, fps, config: {damping: 19, stiffness: 235, mass: 0.68}});
  const exit = interpolate(
    frame,
    [Math.max(0, cue.durationInFrames - 5), cue.durationInFrames],
    [1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  return (
    <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", pointerEvents: "none"}}>
      <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 180, background: "#090e16", boxShadow: "inset 0 1px 0 rgba(50,213,243,.28)"}} />
      <div
        style={{
          width: 980,
          maxWidth: 980,
          minHeight: 180,
          boxSizing: "border-box",
          padding: "20px 34px 18px",
          background: "#090e16",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          opacity: entrance * exit,
          transform: `translateY(${(1 - entrance) * 16}px) scale(${0.97 + entrance * 0.03})`,
        }}
      >
        <div style={{fontSize: 14, letterSpacing: 4.2, fontWeight: 750, color: "rgba(224,235,243,.58)", marginBottom: 7}}>
          THẦY QUYỀN CHIA SẺ
        </div>
        <div style={{fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-.025em", color: "white"}}>
          {cue.words.map((word, index) => {
            const isKeyword = highlighted.has(cleanWord(word));
            return (
              <React.Fragment key={`${word}-${index}`}>
                <span
                  style={{
                    color: isKeyword ? (index % 2 ? CYAN : GOLD) : "white",
                  }}
                >
                  {word}
                </span>
                {index < cue.words.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{width: 72, height: 3, borderRadius: 99, margin: "10px auto 0", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
      </div>
    </AbsoluteFill>
  );
};

const TdcCaption: React.FC<{cue: CaptionCue}> = ({cue}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 210, mass: 0.7}});
  const exit = interpolate(
    frame,
    [Math.max(0, cue.durationInFrames - 6), cue.durationInFrames],
    [1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  return (
    <AbsoluteFill style={{alignItems: "center", justifyContent: "flex-end", paddingBottom: 250, pointerEvents: "none"}}>
      <div
        style={{
          width: 920,
          maxWidth: 920,
          padding: "20px 34px 22px",
          boxSizing: "border-box",
          borderRadius: 24,
          background: "rgba(14,18,25,.82)",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 22px 58px rgba(0,0,0,.43),inset 0 1px 0 rgba(255,255,255,.08)",
          textAlign: "center",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 24}px) scale(${0.95 + enter * 0.05})`,
        }}
      >
        <div style={{fontSize: 15, letterSpacing: 4.1, fontWeight: 800, color: "rgba(232,237,244,.62)", marginBottom: 9}}>
          THẦY QUYỀN CHIA SẺ
        </div>
        <div style={{fontSize: 46, lineHeight: 1.14, fontWeight: 900, letterSpacing: "-.025em", color: "white"}}>
          {cue.words.map((word, index) => {
            const isKeyword = highlighted.has(cleanWord(word));
            return (
              <React.Fragment key={`${word}-${index}`}>
                <span style={{color: isKeyword ? GOLD : "white"}}>{word}</span>
                {index < cue.words.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{width: 92, height: 4, borderRadius: 99, margin: "13px auto 0", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
      </div>
    </AbsoluteFill>
  );
};

const V10Caption: React.FC<{cue: CaptionCue}> = ({cue}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 17, stiffness: 225, mass: 0.68}});
  const exit = interpolate(
    frame,
    [Math.max(0, cue.durationInFrames - 7), cue.durationInFrames],
    [1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  return (
    <AbsoluteFill style={{alignItems: "center", justifyContent: "flex-end", paddingBottom: 255, pointerEvents: "none"}}>
      <div
        style={{
          width: 850,
          padding: "18px 30px 20px",
          boxSizing: "border-box",
          borderRadius: 24,
          background: "linear-gradient(145deg,rgba(7,17,32,.91),rgba(10,24,42,.86))",
          border: "1px solid rgba(255,255,255,.16)",
          boxShadow: "0 22px 58px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.08)",
          textAlign: "center",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 25}px) scale(${0.94 + enter * 0.06})`,
        }}
      >
        <div style={{fontSize: 43, lineHeight: 1.14, fontWeight: 930, letterSpacing: "-.024em", color: "white"}}>
          {cue.words.map((word, index) => {
            const isKeyword = highlighted.has(cleanWord(word));
            return (
              <React.Fragment key={`${word}-${index}`}>
                <span style={{color: isKeyword ? (index % 2 === 0 ? GOLD : CYAN) : "white"}}>{word}</span>
                {index < cue.words.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{width: 84, height: 4, borderRadius: 99, margin: "12px auto 0", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
      </div>
    </AbsoluteFill>
  );
};

const ReferenceCaption: React.FC<{cue: CaptionCue; top?: number}> = ({cue, top = 1010}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 17, stiffness: 310, mass: 0.54}});
  const exit = interpolate(frame, [Math.max(0, cue.durationInFrames - 4), cue.durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{alignItems: "center", justifyContent: "flex-start", paddingTop: top, pointerEvents: "none"}}>
      <div style={{maxWidth: 690, padding: "10px 22px 12px", boxSizing: "border-box", borderRadius: 13, background: "rgba(5,9,15,.91)", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 12px 34px rgba(0,0,0,.48)", textAlign: "center", opacity: enter * exit, transform: `translateY(${(1 - enter) * 13}px) scale(${0.95 + enter * 0.05})`}}>
        <div style={{fontSize: 9, letterSpacing: 3.4, fontWeight: 850, color: "rgba(229,236,244,.57)", marginBottom: 5}}>BRISKY ACADEMY</div>
        <div style={{fontSize: 40, lineHeight: 1.08, fontWeight: 950, letterSpacing: "-.024em", color: "white"}}>
          {cue.words.map((word, index) => {
            const isKeyword = highlighted.has(cleanWord(word));
            return <React.Fragment key={`${word}-${index}`}><span style={{color: isKeyword ? (index % 2 === 0 ? GOLD : CYAN) : "white"}}>{word}</span>{index < cue.words.length - 1 ? " " : ""}</React.Fragment>;
          })}
        </div>
        <div style={{width: 52, height: 3, borderRadius: 99, margin: "7px auto 0", background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
      </div>
    </AbsoluteFill>
  );
};

const ImpactCaption: React.FC<{cue: CaptionCue; top?: number; cueIndex: number}> = ({cue, top = 1370, cueIndex}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 13, stiffness: 430, mass: 0.44}});
  const exit = interpolate(frame, [Math.max(0, cue.durationInFrames - 5), cue.durationInFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const direction = cueIndex % 2 === 0 ? -1 : 1;
  return (
    <AbsoluteFill style={{alignItems:"center",justifyContent:"flex-start",paddingTop:top,pointerEvents:"none"}}>
      <div style={{position:"relative",maxWidth:780,padding:"13px 28px 15px",boxSizing:"border-box",borderRadius:15,background:"rgba(3,8,15,.96)",border:`2px solid ${cueIndex % 2 === 0 ? GOLD : CYAN}`,boxShadow:`0 15px 42px rgba(0,0,0,.54),0 0 22px ${cueIndex % 2 === 0 ? "rgba(245,185,66,.20)" : "rgba(50,213,243,.18)"}`,textAlign:"center",opacity:enter*exit,transform:`translateX(${direction*(1-enter)*36}px) scale(${0.88+enter*.12})`}}>
        <div style={{position:"absolute",left:18,top:-5,width:66,height:7,borderRadius:99,background:`linear-gradient(90deg,${GOLD},${CYAN})`}} />
        <div style={{fontSize:10,letterSpacing:4,fontWeight:950,color:GOLD,marginBottom:6}}>BRISKY ACADEMY</div>
        <div style={{fontSize:46,lineHeight:1.04,fontWeight:950,letterSpacing:"-.032em",color:"white",textShadow:"0 3px 10px rgba(0,0,0,.45)"}}>
          {cue.words.map((word,index) => {
            const isKeyword = highlighted.has(cleanWord(word));
            const color = isKeyword ? (index % 2 === 0 ? GOLD : CYAN) : "white";
            return <React.Fragment key={`${word}-${index}`}><span style={{color,display:"inline-block",transform:isKeyword?`scale(${.98+enter*.04})`:undefined}}>{word}</span>{index<cue.words.length-1?" ":""}</React.Fragment>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// v18 mirrors the supplied reference: a warm black card, a short orange lead,
// a white completion line, and one compact contextual icon card.
const SampleCaption: React.FC<{cue: CaptionCue; top?: number; cueIndex: number}> = ({cue, top = 1360, cueIndex}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config:{damping:14,stiffness:390,mass:.48}});
  const exit = interpolate(frame,[Math.max(0,cue.durationInFrames-5),cue.durationInFrames],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const splitAt = Math.max(1, Math.min(cue.words.length - 1, Math.ceil(cue.words.length * .52)));
  const lead = cue.words.slice(0, splitAt).join(" ");
  const rest = cue.words.slice(splitAt).join(" ");
  const phrase = cue.words.join(" ");
  const icon = iconKindFor(phrase);
  const iconLabel = /ZOOM|BUỔI/.test(phrase) ? "3 buổi miễn phí" : /ĐIỂM|KẾT QUẢ/.test(phrase) ? "Mục tiêu rõ ràng" : /HỔNG|MẤT GỐC/.test(phrase) ? "Nhận diện phần hổng" : /LỘ TRÌNH|PHƯƠNG PHÁP/.test(phrase) ? "Học đúng lộ trình" : /KIỂM TRA/.test(phrase) ? "Kiểm tra miễn phí" : "Cha mẹ cần biết";
  return (
    <AbsoluteFill style={{alignItems:"center",justifyContent:"flex-start",paddingTop:top,pointerEvents:"none"}}>
      <div style={{position:"relative",width:680,display:"flex",justifyContent:"center",opacity:enter*exit,transform:`translateY(${(1-enter)*24}px) scale(${.9+enter*.1})`}}>
        <div style={{minWidth:520,maxWidth:680,padding:"18px 30px 21px",boxSizing:"border-box",borderRadius:18,background:"linear-gradient(135deg,rgba(35,25,22,.94),rgba(4,7,11,.96))",boxShadow:"0 18px 46px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08)",textAlign:"center"}}>
          <div style={{fontSize:10,letterSpacing:4.2,fontWeight:900,color:"rgba(236,225,216,.7)",marginBottom:8}}>BRISKY ACADEMY</div>
          <div style={{fontSize:45,lineHeight:1.03,fontWeight:950,letterSpacing:"-.035em",textShadow:"0 3px 12px rgba(0,0,0,.5)"}}>
            <div style={{color:"#ff7438"}}>{lead}</div>
            {rest ? <div style={{color:"white",marginTop:2}}>{rest}</div> : null}
          </div>
          <div style={{width:54,height:4,borderRadius:99,margin:"10px auto 0",background:`linear-gradient(90deg,#ff7438,${CYAN})`}} />
        </div>
        <div style={{position:"absolute",right:-110,top:-88,width:200,minHeight:128,padding:"15px 13px",boxSizing:"border-box",borderRadius:18,background:"linear-gradient(145deg,rgba(4,29,44,.96),rgba(14,20,27,.96))",border:"1px solid rgba(80,220,242,.34)",boxShadow:"0 14px 35px rgba(0,0,0,.44)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,transform:`translateX(${(1-enter)*32}px) scale(${.88+enter*.12})`}}>
          <div style={{color:CYAN,transform:"scale(.78)",height:47,display:"flex",alignItems:"center"}}><IconGlyph kind={icon} /></div>
          <div style={{color:"white",fontSize:16,lineHeight:1.12,fontWeight:850,textAlign:"center"}}>{iconLabel}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SemanticText: React.FC<{text:string;highlightText?:string;tone?:"orange"|"cyan"}> = ({text,highlightText,tone="cyan"}) => {
  if (!highlightText) return <>{text}</>;
  const start = text.toLocaleLowerCase("vi").indexOf(highlightText.toLocaleLowerCase("vi"));
  if (start < 0) return <>{text}</>;
  const color = tone === "orange" ? "#ff7046" : "#26cfea";
  return <>{text.slice(0,start)}<span style={{color}}>{text.slice(start,start+highlightText.length)}</span>{text.slice(start+highlightText.length)}</>;
};

const TdcReferenceCard: React.FC<{kicker:string;text:string;highlightText?:string;tone?:"orange"|"cyan";top:number;durationInFrames:number}> = ({kicker,text,highlightText,tone="cyan",top,durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame,fps,config:{damping:16,stiffness:300,mass:.55}});
  const exit = interpolate(frame,[Math.max(0,durationInFrames-5),durationInFrames],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const accent = tone === "orange" ? "#ff7046" : "#26cfea";
  return (
    <AbsoluteFill style={{alignItems:"center",justifyContent:"flex-start",paddingTop:top,pointerEvents:"none"}}>
      <div style={{width:"fit-content",minWidth:460,maxWidth:560,padding:"15px 25px 17px",boxSizing:"border-box",borderRadius:15,background:"linear-gradient(135deg,rgba(34,30,29,.91),rgba(12,14,17,.93))",border:"1px solid rgba(255,255,255,.1)",boxShadow:"0 16px 38px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06)",textAlign:"center",opacity:enter*exit,transform:`translateY(${(1-enter)*12}px) scale(${.94+enter*.06})`}}>
        <div style={{fontSize:13,lineHeight:1,letterSpacing:3.1,fontWeight:850,color:"rgba(224,222,220,.66)",marginBottom:8}}>{kicker}</div>
        <div style={{fontSize:45,lineHeight:1.04,fontWeight:950,letterSpacing:"-.034em",color:"white",textShadow:"0 3px 10px rgba(0,0,0,.48)"}}>
          <SemanticText text={text} highlightText={highlightText} tone={tone} />
        </div>
        <div style={{width:54,height:4,borderRadius:99,margin:"10px auto 0",background:accent}} />
      </div>
    </AbsoluteFill>
  );
};

const TdcReferenceCaption: React.FC<{cue:CaptionCue;top?:number}> = ({cue,top=1120}) => (
  <TdcReferenceCard kicker={cue.kicker ?? "BRISKY ACADEMY"} text={cue.words.join(" ")} highlightText={cue.highlightText} tone={cue.tone} top={top} durationInFrames={cue.durationInFrames} />
);

const TdcReferenceHook: React.FC<{adId:string;top:number;semanticAlignedMode?:boolean}> = ({adId,top,semanticAlignedMode=false}) => {
  const hook = (semanticAlignedMode ? V20_HOOKS_BY_AD : V19_HOOKS_BY_AD)[adId];
  if (!hook) return null;
  return <TdcReferenceCard {...hook} top={top} durationInFrames={secToFrames(2.15)} />;
};

const TdcReferenceIconCard: React.FC<{spec:V10IconCalloutSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps,durationInFrames} = useVideoConfig();
  const enter = spring({frame,fps,config:{damping:17,stiffness:280,mass:.56}});
  const exit = interpolate(frame,[Math.max(0,durationInFrames-5),durationInFrames],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const warning = spec.icon === "alert";
  const accent = warning ? "#ff7046" : "#26cfea";
  return (
    <div style={{position:"absolute",top:875,[spec.side]:58,width:190,minHeight:122,padding:"14px 14px 13px",boxSizing:"border-box",borderRadius:16,background:"linear-gradient(145deg,rgba(26,28,31,.93),rgba(11,14,18,.95))",border:`1px solid ${warning?"rgba(255,112,70,.34)":"rgba(38,207,234,.34)"}`,boxShadow:"0 14px 34px rgba(0,0,0,.43)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,opacity:enter*exit,transform:`translateY(${(1-enter)*12}px) scale(${.93+enter*.07})`}}>
      <div style={{height:42,color:accent,display:"flex",alignItems:"center",transform:"scale(.7)"}}><IconGlyph kind={spec.icon} /></div>
      <div style={{fontSize:10,letterSpacing:2.2,fontWeight:900,color:"rgba(225,225,225,.62)",textAlign:"center"}}>{spec.kicker}</div>
      <div style={{fontSize:16,lineHeight:1.08,fontWeight:900,color:"white",textAlign:"center"}}>{spec.title}</div>
    </div>
  );
};

const Hook: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 15, stiffness: 220, mass: 0.7}});
  return (
    <div
      style={{
        position: "absolute",
        left: 42,
        right: 42,
        top: 54,
        display: "flex",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * -26}px) scale(${0.93 + p * 0.07})`,
      }}
    >
      <div
        style={{
          padding: "17px 28px",
          borderRadius: 999,
          background: "rgba(4,22,47,.86)",
          border: `2px solid ${GOLD}`,
          boxShadow: "0 12px 35px rgba(0,0,0,.34)",
          color: "white",
          fontSize: 42,
          fontWeight: 900,
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const ImpactHook: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config:{damping:11,stiffness:390,mass:.52}});
  const punch = interpolate(frame,[0,5,11,20],[.82,1.08,1,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return (
    <div style={{position:"absolute",left:36,right:36,top:46,display:"flex",justifyContent:"center",opacity:p,transform:`translateY(${(1-p)*-40}px) scale(${punch})`}}>
      <div style={{width:"100%",padding:"18px 28px 22px",borderRadius:22,background:"linear-gradient(135deg,rgba(2,17,40,.97),rgba(5,42,75,.96))",border:`3px solid ${GOLD}`,boxShadow:"0 18px 50px rgba(0,0,0,.46),0 0 30px rgba(245,185,66,.24)",textAlign:"center"}}>
        <div style={{display:"inline-flex",padding:"6px 16px",borderRadius:999,background:GOLD,color:NAVY,fontSize:15,fontWeight:950,letterSpacing:2.6,marginBottom:10}}>CHA MẸ CẦN BIẾT</div>
        <div style={{color:"white",fontSize:54,fontWeight:950,lineHeight:1.02,letterSpacing:"-.035em",textShadow:"0 4px 16px rgba(0,0,0,.48)"}}>{text}</div>
        <div style={{width:150,height:7,borderRadius:99,margin:"13px auto 0",background:`linear-gradient(90deg,${GOLD},${CYAN})`}} />
      </div>
    </div>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 17, stiffness: 190, mass: 0.75}});
  return (
    <AbsoluteFill style={{background: "#052044"}}>
      <div style={{position: "absolute", inset: 0, bottom: 180, overflow: "hidden"}}>
        <Img
          src={staticFile("staging/brisky-raw-ads/brisky-bimat-poster.png")}
          style={{width: "100%", height: "100%", objectFit: "contain"}}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 180,
          background: NAVY,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          transform: `translateY(${(1 - p) * 22}px)`,
        }}
      >
        <div style={{color: GOLD, fontSize: 42, fontWeight: 950}}>3 BUỔI HOÀN TOÀN MIỄN PHÍ</div>
        <div style={{color: "white", fontSize: 27, fontWeight: 800, marginTop: 7}}>CHA MẸ CÓ CON LỚP 3–9 • NHẤN ĐĂNG KÝ NGAY</div>
      </div>
    </AbsoluteFill>
  );
};

const ClearCta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 16, stiffness: 205, mass: 0.72}});
  const pulse = 1 + Math.sin(frame / 4.5) * 0.018;
  return (
    <AbsoluteFill style={{background: NAVY, overflow: "hidden", alignItems: "center", justifyContent: "center"}}>
      <Img
        src={staticFile("staging/brisky-older-students/older-student-certificate.png")}
        style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.28) saturate(.9)", transform: `scale(${1.08 + frame * 0.0004})`}}
      />
      <AbsoluteFill style={{background: "linear-gradient(180deg,rgba(3,17,40,.55),rgba(3,17,40,.92))"}} />
      <div style={{position: "relative", width: 900, textAlign: "center", transform: `scale(${0.92 + p * 0.08})`, opacity: p}}>
        <div style={{color: "white", fontSize: 39, fontWeight: 850, letterSpacing: 1.5}}>BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC</div>
        <div style={{color: GOLD, fontSize: 67, lineHeight: 1.06, fontWeight: 950, marginTop: 24}}>3 BUỔI HOÀN TOÀN MIỄN PHÍ</div>
        <div style={{color: "white", fontSize: 35, lineHeight: 1.25, fontWeight: 800, marginTop: 22}}>DÀNH CHO CHA MẸ CÓ CON LỚP 3–9</div>
        <div style={{display: "inline-flex", alignItems: "center", gap: 18, marginTop: 48, padding: "23px 38px", borderRadius: 999, background: GOLD, color: NAVY, fontSize: 43, fontWeight: 950, boxShadow: "0 16px 46px rgba(245,185,66,.38)", transform: `scale(${pulse})`}}>
          <IconGlyph kind="cursor" /> NHẤN NÚT ĐĂNG KÝ BÊN DƯỚI
        </div>
      </div>
    </AbsoluteFill>
  );
};

const BriskyShortV4: React.FC<{index: number; tdcCaptionMode?: boolean; tdcSegmentCount?: number; clearCtaMode?: boolean; visualV10Mode?: boolean; referenceFastMode?: boolean; v13Ad?: AdSpec; v14Ad?: AdSpec; v17Ad?: AdSpec; sampleCaptionMode?: boolean; tdcReferenceMode?: boolean; semanticAlignedMode?: boolean; enhancedVisualMode?: boolean; v22Mode?: boolean; intentMotionMode?: boolean; playbackSpeedOverride?: number; musicSrc?: string; musicBaseVolume?: number; musicCtaVolume?: number; musicEndVolume?: number; captionTop?: number; clearCtaStart?: number; clearCtaEnd?: number}> = ({index, tdcCaptionMode = false, tdcSegmentCount = 3, clearCtaMode = false, visualV10Mode = false, referenceFastMode = false, v13Ad, v14Ad, v17Ad, sampleCaptionMode = false, tdcReferenceMode = false, semanticAlignedMode = false, enhancedVisualMode = false, v22Mode = false, intentMotionMode = false, playbackSpeedOverride, musicSrc, musicBaseVolume = 0.12, musicCtaVolume, musicEndVolume = 0.32, captionTop = 1010, clearCtaStart = CLEAR_CTA_START, clearCtaEnd = CLEAR_CTA_END}) => {
  useVietnameseFont();
  const frame = useCurrentFrame();
  const ad = v17Ad ?? v14Ad ?? v13Ad ?? ads[index];
  const v13Mode = Boolean(v13Ad);
  const v14Mode = Boolean(v14Ad);
  const v17Mode = Boolean(v17Ad);
  const customAdMode = v13Mode || v14Mode || v17Mode;
  const renderAd = customAdMode ? ad : tdcCaptionMode ? {...ad, segments: ad.segments.slice(0, tdcSegmentCount)} : ad;
  const playbackSpeed = playbackSpeedOverride ?? (referenceFastMode ? REFERENCE_FAST_SPEED : AD_SPEED);
  const segments = getTimedSegments(renderAd, playbackSpeed);
  const selectedCaptionSpecs = v22Mode
    ? (V23_CAPTIONS_BY_AD[ad.id] ?? V22_CAPTIONS_BY_AD[ad.id] ?? V20_CAPTIONS_BY_AD[ad.id] ?? [])
    : semanticAlignedMode
      ? (V20_CAPTIONS_BY_AD[ad.id] ?? [])
      : tdcReferenceMode
        ? (V19_CAPTIONS_BY_AD[ad.id] ?? [])
        : (V17_CAPTIONS_BY_AD[ad.id] ?? []);
  const cues = v17Mode ? selectedCaptionSpecs.flatMap((spec) => {
    const segment = segments[spec.segmentIndex];
    if (!segment) return [];
    const from = segment.from + secToFrames(spec.offsetSeconds);
    const durationInFrames = Math.min(secToFrames(spec.durationSeconds), Math.max(1, segment.from + segment.durationInFrames - from));
    const semanticSpec = spec as V19CaptionSpec;
    return durationInFrames > 0 ? [{from,durationInFrames,words:spec.text.split(/\s+/),kicker:semanticSpec.kicker,highlightText:semanticSpec.highlightText,tone:semanticSpec.tone}] : [];
  }).filter((cue) => !tdcReferenceMode || cue.from >= secToFrames(2.15)) : v14Mode ? makeV14CaptionCues(ad.id, segments) : v13Mode ? makeV13CaptionCues(ad.id, segments) : referenceFastMode ? makeReferenceCaptionCues(ad.id, segments) : visualV10Mode ? makeV10CaptionCues(ad.id, segments) : makeCaptionCues(segments);
  const visualKey = ad.id;
  const v10Brolls = v22Mode ? (V23_BROLLS_BY_AD[visualKey] ?? V22_BROLLS_BY_AD[visualKey] ?? V21_BROLLS_BY_AD[visualKey] ?? []) : enhancedVisualMode ? (V21_BROLLS_BY_AD[visualKey] ?? []) : semanticAlignedMode ? (V20_BROLLS_BY_AD[visualKey] ?? []) : (v17Mode || v14Mode) ? (V14_BROLLS_BY_AD[visualKey] ?? []) : v13Mode ? (V13_BROLLS_BY_AD[visualKey] ?? []) : (V10_BROLLS_BY_AD[visualKey] ?? []);
  const v10Infographics = v22Mode ? (V23_INFOGRAPHICS_BY_AD[visualKey] ?? V22_INFOGRAPHICS_BY_AD[visualKey] ?? V20_INFOGRAPHICS_BY_AD[visualKey] ?? []) : semanticAlignedMode ? (V20_INFOGRAPHICS_BY_AD[visualKey] ?? []) : (v17Mode || v14Mode) ? (V14_INFOGRAPHICS_BY_AD[visualKey] ?? []) : v13Mode ? (V13_INFOGRAPHICS_BY_AD[visualKey] ?? []) : (V10_INFOGRAPHICS_BY_AD[visualKey] ?? []);
  const rawV10IconCallouts = sampleCaptionMode ? [] : v22Mode ? (V23_ICON_CALLOUTS_BY_AD[visualKey] ?? V22_ICON_CALLOUTS_BY_AD[visualKey] ?? V20_ICON_CALLOUTS_BY_AD[visualKey] ?? []) : semanticAlignedMode ? (V20_ICON_CALLOUTS_BY_AD[visualKey] ?? []) : (v17Mode || v14Mode) ? (V14_ICON_CALLOUTS_BY_AD[visualKey] ?? []) : v13Mode ? (V13_ICON_CALLOUTS_BY_AD[visualKey] ?? []) : (V10_ICON_CALLOUTS_BY_AD[visualKey] ?? []);
  const v10IconCallouts = ad.id === "ad01" ? rawV10IconCallouts : rawV10IconCallouts.filter((callout) => {
    const calloutEnd = callout.offsetSeconds + callout.durationSeconds;
    const overlapsBroll = v10Brolls.some((broll) =>
      broll.segmentIndex === callout.segmentIndex
      && callout.offsetSeconds < broll.offsetSeconds + broll.durationSeconds
      && calloutEnd > broll.offsetSeconds,
    );
    const overlapsInfographic = v10Infographics.some((infographic) =>
      infographic.segmentIndex === callout.segmentIndex
      && callout.offsetSeconds < infographic.offsetSeconds + infographic.durationSeconds
      && calloutEnd > infographic.offsetSeconds,
    );
    return !overlapsBroll && !overlapsInfographic;
  });
  const speechFrames = segments.reduce((sum, segment) => sum + segment.durationInFrames, 0);
  const clearCtaFrames = clearCtaMode ? secToFrames((clearCtaEnd - clearCtaStart) / playbackSpeed) : 0;
  const endCardFrom = speechFrames + clearCtaFrames;
  const totalFrames = endCardFrom + secToFrames(END_CARD_SECONDS);
  const musicVolume = (musicFrame: number) => {
    const fadeIn = interpolate(musicFrame, [0, secToFrames(0.5)], [0, musicBaseVolume], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const ctaLevel = musicCtaVolume == null ? musicBaseVolume : interpolate(
      musicFrame,
      [Math.max(0, speechFrames - secToFrames(0.55)), speechFrames + secToFrames(0.25)],
      [musicBaseVolume, musicCtaVolume],
      {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
    );
    const endRise = interpolate(
      musicFrame,
      [Math.max(0, endCardFrom - secToFrames(0.35)), endCardFrom + secToFrames(0.35)],
      [musicCtaVolume ?? musicBaseVolume, musicEndVolume],
      {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
    );
    const fadeOut = interpolate(
      musicFrame,
      [Math.max(0, totalFrames - secToFrames(1)), totalFrames],
      [1, 0],
      {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
    );
    return Math.min(Math.max(fadeIn, ctaLevel, endRise), musicEndVolume) * fadeOut;
  };

  return (
    <AbsoluteFill style={{background: NAVY, color: "white", fontFamily: `'${VIETNAMESE_FONT_FAMILY}', Arial, sans-serif`}}>
      <style>{vietnameseFontFaceCss}</style>
      <div style={{position: "absolute", top: 0, left: 0, right: 0, height: tdcCaptionMode ? 1920 : VIDEO_HEIGHT, overflow: "hidden"}}>
        {segments.map((segment, segmentIndex) => (
          <Sequence key={`${ad.id}-segment-${segmentIndex}`} from={segment.from} durationInFrames={segment.durationInFrames}>
            <VoiceSegment segment={segment} source={ad.source} index={segmentIndex} voiceGain={ad.speechAudio ? 0 : (ad.voiceGain ?? 1)} speed={playbackSpeed} enhancedMotion={enhancedVisualMode} intentMotion={intentMotionMode} />
          </Sequence>
        ))}
        {ad.speechAudio ? <Audio src={staticFile(ad.speechAudio)} volume={ad.voiceGain ?? 1} /> : null}
        <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 6, background: "rgba(255,255,255,.1)"}}>
          <div style={{height: "100%", width: `${Math.min(100, (frame / Math.max(1, totalFrames - 1)) * 100)}%`, background: `linear-gradient(90deg,${GOLD},${CYAN})`}} />
        </div>
        <Sequence from={0} durationInFrames={secToFrames(2.15)}>
          {tdcReferenceMode ? <TdcReferenceHook adId={ad.id} top={captionTop} semanticAlignedMode={semanticAlignedMode} /> : v17Mode ? <ImpactHook text={ad.hook} /> : <Hook text={ad.hook} />}
          <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={tdcReferenceMode ? 0.2 : v17Mode ? 0.34 : 0.22} />
          {v17Mode ? <Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} startFrom={4} volume={tdcReferenceMode ? 0.1 : 0.2} /> : null}
        </Sequence>
        {!visualV10Mode ? segments.slice(1).map((segment, joinIndex) => {
          const duration = secToFrames(1.46);
          const from = Math.max(0, segment.from - Math.round(duration / 2));
          return (
            <Sequence key={`${ad.id}-cover-${joinIndex}`} from={from} durationInFrames={duration}>
              <JoinCover segment={segment} />
              <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.17} />
            </Sequence>
          );
        }) : null}
        {!visualV10Mode ? segments.map((segment, segmentIndex) => {
          if (tdcCaptionMode) return null;
          const duration = Math.min(secToFrames(1.85), Math.max(secToFrames(1.1), Math.round(segment.durationInFrames * 0.32)));
          const from = segment.from + Math.min(
            Math.max(secToFrames(1.1), Math.round(segment.durationInFrames * 0.25)),
            Math.max(0, segment.durationInFrames - duration),
          );
          return (
            <Sequence key={`${ad.id}-info-${segmentIndex}`} from={from} durationInFrames={duration}>
              <MotionInfoCard segment={segment} side={segmentIndex % 2 === 0 ? "left" : "right"} />
              <Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={0.12} />
            </Sequence>
          );
        }) : null}
        {visualV10Mode ? v10Brolls.map((spec, index) => {
          const segment = segments[spec.segmentIndex];
          const from = segment.from + secToFrames(spec.offsetSeconds);
          return (
            <Sequence key={`v10-broll-${index}`} from={from} durationInFrames={secToFrames(spec.durationSeconds)}>
              <V10Broll spec={spec} tdcStyle={semanticAlignedMode} />
              <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.13} />
            </Sequence>
          );
        }) : null}
        {visualV10Mode ? v10Infographics.map((spec, index) => {
          const segment = segments[spec.segmentIndex];
          const from = segment.from + secToFrames(spec.offsetSeconds);
          return (
            <Sequence key={`v10-infographic-${index}`} from={from} durationInFrames={secToFrames(spec.durationSeconds)}>
              <V10Infographic spec={spec} />
              <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.15} />
            </Sequence>
          );
        }) : null}
        {visualV10Mode ? v10IconCallouts.map((spec, index) => {
          const segment = segments[spec.segmentIndex];
          const from = segment.from + secToFrames(spec.offsetSeconds);
          return (
            <Sequence key={`v10-icon-${index}`} from={from} durationInFrames={secToFrames(spec.durationSeconds)}>
              {tdcReferenceMode ? <TdcReferenceIconCard spec={spec} /> : <V10IconCallout spec={spec} />}
              <Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={0.11} />
            </Sequence>
          );
        }) : null}
        {!visualV10Mode ? segments.map((segment, segmentIndex) => {
          if (segment.durationInFrames < secToFrames(5.2)) return null;
          const duration = secToFrames(1.46);
          const center = segment.from + Math.round(segment.durationInFrames * 0.62);
          const from = Math.min(
            segment.from + segment.durationInFrames - duration,
            Math.max(segment.from, center - Math.round(duration / 2)),
          );
          return (
            <Sequence key={`${ad.id}-broll-${segmentIndex}`} from={from} durationInFrames={duration}>
              <JoinCover segment={segment} />
              <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.14} />
            </Sequence>
          );
        }) : null}
      </div>
      {!tdcCaptionMode ? <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 180, background: NAVY, boxShadow: `inset 0 1px 0 rgba(50,213,243,.35)`}} /> : null}
      {cues.map((cue, cueIndex) => (
        <Sequence key={`${ad.id}-caption-${cueIndex}`} from={cue.from} durationInFrames={cue.durationInFrames}>
          {tdcReferenceMode ? <TdcReferenceCaption cue={cue} top={captionTop} /> : sampleCaptionMode ? <SampleCaption cue={cue} top={captionTop} cueIndex={cueIndex} /> : v17Mode ? <ImpactCaption cue={cue} top={captionTop} cueIndex={cueIndex} /> : referenceFastMode || customAdMode ? <ReferenceCaption cue={cue} top={captionTop} /> : visualV10Mode ? <V10Caption cue={cue} /> : tdcCaptionMode ? <TdcCaption cue={cue} /> : <Caption cue={cue} />}
        </Sequence>
      ))}
      {clearCtaMode ? (
        <Sequence from={speechFrames} durationInFrames={clearCtaFrames}>
          <ClearCta />
          <Audio
            src={staticFile("staging/brisky-raw-ads/ad05.mp4")}
            startFrom={secToFrames(clearCtaStart)}
            endAt={secToFrames(clearCtaEnd)}
            playbackRate={playbackSpeed}
            volume={1}
          />
          <Audio src={staticFile("staging/brisky-raw-ads/swoosh.mp3")} volume={0.17} />
        </Sequence>
      ) : null}
      <Sequence from={endCardFrom} durationInFrames={secToFrames(END_CARD_SECONDS)}>
        <EndCard />
        <Audio src={staticFile("staging/brisky-raw-ads/ting.mp3")} volume={0.24} />
      </Sequence>
      <Audio src={staticFile(musicSrc ?? (enhancedVisualMode ? "staging/brisky-raw-ads/music-driving-ambition-mixkit.mp3" : "staging/brisky-raw-ads/music.mp3"))} volume={musicVolume} loop />
    </AbsoluteFill>
  );
};

export const BRISKY_SHORT_V4_DURATIONS = ads.map((ad) =>
  getTimedSegments(ad).reduce((sum, segment) => sum + segment.durationInFrames, 0) + secToFrames(END_CARD_SECONDS),
);

export const BriskyShortV401 = () => <BriskyShortV4 index={0} />;
export const BriskyShortV402 = () => <BriskyShortV4 index={1} />;
export const BriskyShortV403 = () => <BriskyShortV4 index={2} />;
export const BriskyShortV404 = () => <BriskyShortV4 index={3} />;
export const BriskyShortV405 = () => <BriskyShortV4 index={4} />;
export const BRISKY_SHORT_V5_DURATIONS = BRISKY_SHORT_V4_DURATIONS;
export const BriskyShortV501 = () => <BriskyShortV4 index={0} />;
export const BriskyShortV502 = () => <BriskyShortV4 index={1} />;
export const BriskyShortV503 = () => <BriskyShortV4 index={2} />;
export const BriskyShortV504 = () => <BriskyShortV4 index={3} />;
export const BriskyShortV505 = () => <BriskyShortV4 index={4} />;
export const BRISKY_SHORT_V6_DURATIONS = BRISKY_SHORT_V5_DURATIONS;
export const BriskyShortV601 = () => <BriskyShortV4 index={0} />;
export const BriskyShortV602 = () => <BriskyShortV4 index={1} />;
export const BriskyShortV603 = () => <BriskyShortV4 index={2} />;
export const BriskyShortV604 = () => <BriskyShortV4 index={3} />;
export const BriskyShortV605 = () => <BriskyShortV4 index={4} />;
export const BRISKY_SHORT_V7_VIDEO1_DURATION =
  getTimedSegments({...ads[0], segments: ads[0].segments.slice(0, 3)}).reduce((sum, segment) => sum + segment.durationInFrames, 0) + secToFrames(END_CARD_SECONDS);
export const BriskyShortV7Video1 = () => <BriskyShortV4 index={0} tdcCaptionMode />;
export const BRISKY_SHORT_V8_VIDEO1_DURATION =
  getTimedSegments({...ads[0], segments: ads[0].segments.slice(0, 5)}).reduce((sum, segment) => sum + segment.durationInFrames, 0) + secToFrames(END_CARD_SECONDS);
export const BriskyShortV8Video1 = () => <BriskyShortV4 index={0} tdcCaptionMode tdcSegmentCount={5} />;
export const BRISKY_SHORT_V9_VIDEO1_DURATION =
  getTimedSegments({...ads[0], segments: ads[0].segments.slice(0, 8)}).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames(CLEAR_CTA_SECONDS)
  + secToFrames(END_CARD_SECONDS);
export const BriskyShortV9Video1 = () => <BriskyShortV4 index={0} tdcCaptionMode tdcSegmentCount={8} clearCtaMode />;
const V10_SEGMENT_COUNTS = [8, 4, 3, 6, 4];
export const BRISKY_SHORT_V10_DURATIONS = ads.map((ad, index) =>
  getTimedSegments({...ad, segments: ad.segments.slice(0, V10_SEGMENT_COUNTS[index])}).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames(CLEAR_CTA_SECONDS)
  + secToFrames(END_CARD_SECONDS),
);
export const BRISKY_SHORT_V10_VIDEO1_DURATION = BRISKY_SHORT_V10_DURATIONS[0];
export const BriskyShortV10Video1 = () => <BriskyShortV4 index={0} tdcCaptionMode tdcSegmentCount={8} clearCtaMode visualV10Mode />;
export const BriskyShortV10Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode tdcSegmentCount={4} clearCtaMode visualV10Mode />;
export const BriskyShortV10Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode tdcSegmentCount={3} clearCtaMode visualV10Mode />;
export const BriskyShortV10Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode tdcSegmentCount={6} clearCtaMode visualV10Mode />;
export const BriskyShortV10Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode tdcSegmentCount={4} clearCtaMode visualV10Mode />;

const V12_SEGMENT_COUNTS = [8, 4, 3, 6, 4];
export const BRISKY_SHORT_V12_DURATIONS = ads.map((ad, index) =>
  getTimedSegments({...ad, segments: ad.segments.slice(0, V12_SEGMENT_COUNTS[index])}, REFERENCE_FAST_SPEED).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames((CLEAR_CTA_END - CLEAR_CTA_START) / REFERENCE_FAST_SPEED)
  + secToFrames(END_CARD_SECONDS),
);
export const BriskyShortV12Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode tdcSegmentCount={4} clearCtaMode visualV10Mode referenceFastMode />;
export const BriskyShortV12Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode tdcSegmentCount={3} clearCtaMode visualV10Mode referenceFastMode />;
export const BriskyShortV12Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode tdcSegmentCount={6} clearCtaMode visualV10Mode referenceFastMode />;
export const BriskyShortV12Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode tdcSegmentCount={4} clearCtaMode visualV10Mode referenceFastMode />;

export const BRISKY_SHORT_V13_DURATIONS = V13_ADS.map((ad) =>
  getTimedSegments(ad, AD_SPEED).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames(CLEAR_CTA_SECONDS)
  + secToFrames(END_CARD_SECONDS),
);
export const BriskyShortV13Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v13Ad={V13_ADS[0]} />;
export const BriskyShortV13Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v13Ad={V13_ADS[1]} />;
export const BriskyShortV13Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v13Ad={V13_ADS[2]} />;
export const BriskyShortV13Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v13Ad={V13_ADS[3]} />;
export const BriskyShortV13Video6 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v13Ad={V13_ADS[4]} />;

export const BRISKY_SHORT_V14_DURATIONS = V14_ADS.map((ad) =>
  getTimedSegments(ad, AD_SPEED).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames(CLEAR_CTA_SECONDS)
  + secToFrames(END_CARD_SECONDS),
);
export const BriskyShortV14Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[0]} />;
export const BriskyShortV14Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[1]} />;
export const BriskyShortV14Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[2]} />;
export const BriskyShortV14Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[3]} />;
export const BriskyShortV14Video6 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[4]} />;

// v15 keeps the approved v14 edit/audio intact and only moves the compact TDC
// caption cards below the speaker's face. Close-up shots use a slightly higher
// chest position than standing shots so the cards remain readable and face-safe.
export const BRISKY_SHORT_V15_DURATIONS = BRISKY_SHORT_V14_DURATIONS;
export const BriskyShortV15Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[0]} captionTop={1370} />;
export const BriskyShortV15Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[1]} captionTop={1370} />;
export const BriskyShortV15Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[2]} captionTop={1410} />;
export const BriskyShortV15Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[3]} captionTop={1370} />;
export const BriskyShortV15Video6 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V14_ADS[4]} captionTop={1410} />;

const V16_CTA_START = 407.30;
const V16_CTA_END = 410.08;
export const BRISKY_SHORT_V16_DURATIONS = V16_ADS.map((ad) =>
  getTimedSegments(ad, AD_SPEED).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames((V16_CTA_END - V16_CTA_START) / AD_SPEED)
  + secToFrames(END_CARD_SECONDS),
);
export const BriskyShortV16Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V16_ADS[0]} captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV16Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V16_ADS[1]} captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV16Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V16_ADS[2]} captionTop={1410} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV16Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v14Ad={V16_ADS[3]} captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

export const BRISKY_SHORT_V17_DURATIONS = V17_ADS.map((ad) =>
  getTimedSegments(ad, AD_SPEED).reduce((sum, segment) => sum + segment.durationInFrames, 0)
  + secToFrames((V16_CTA_END - V16_CTA_START) / AD_SPEED)
  + secToFrames(END_CARD_SECONDS),
);
export const BriskyShortV17Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[0]} captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV17Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[1]} captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV17Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[2]} captionTop={1410} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV17Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[3]} captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v18 is visual-only: it reuses the QC-locked v17 cuts and dialogue tracks.
export const BRISKY_SHORT_V18_DURATIONS = BRISKY_SHORT_V17_DURATIONS;
export const BriskyShortV18Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[0]} sampleCaptionMode captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV18Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[1]} sampleCaptionMode captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV18Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[2]} sampleCaptionMode captionTop={1410} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV18Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[3]} sampleCaptionMode captionTop={1370} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v19 is a visual-only replacement for v18. It preserves the QC-locked v17
// edit/audio and applies the measured TDC card system at a face-safe position.
export const BRISKY_SHORT_V19_DURATIONS = BRISKY_SHORT_V17_DURATIONS;
export const BriskyShortV19Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[0]} tdcReferenceMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV19Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[1]} tdcReferenceMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV19Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[2]} tdcReferenceMode captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV19Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V17_ADS[3]} tdcReferenceMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

export const BRISKY_SHORT_V20_DURATIONS = V20_ADS.map((ad) =>
  getTimedSegments(ad,AD_SPEED).reduce((sum,segment)=>sum+segment.durationInFrames,0)
  + secToFrames((V16_CTA_END-V16_CTA_START)/AD_SPEED)
  + secToFrames(END_CARD_SECONDS),
);
export const BriskyShortV20Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[0]} tdcReferenceMode semanticAlignedMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV20Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[1]} tdcReferenceMode semanticAlignedMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV20Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[2]} tdcReferenceMode semanticAlignedMode captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV20Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[3]} tdcReferenceMode semanticAlignedMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v21 preserves the word-safe v20 dialogue and upgrades the visual/music layer.
export const BRISKY_SHORT_V21_DURATIONS = BRISKY_SHORT_V20_DURATIONS;
export const BriskyShortV21Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[0]} tdcReferenceMode semanticAlignedMode enhancedVisualMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV21Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[1]} tdcReferenceMode semanticAlignedMode enhancedVisualMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV21Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[2]} tdcReferenceMode semanticAlignedMode enhancedVisualMode captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV21Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V20_ADS[3]} tdcReferenceMode semanticAlignedMode enhancedVisualMode captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

const V22_SPEEDS = [1.08,1.08,1.12,1.12];
export const BRISKY_SHORT_V22_DURATIONS = V22_ADS.map((ad,index) =>
  getTimedSegments(ad,V22_SPEEDS[index]).reduce((sum,segment)=>sum+segment.durationInFrames,0)
  + secToFrames((V16_CTA_END-V16_CTA_START)/V22_SPEEDS[index])
  + secToFrames(END_CARD_SECONDS),
);
const V22_MUSIC = "staging/brisky-raw-ads/music-dreaming-big-mixkit.mp3";
export const BriskyShortV22Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[0]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode playbackSpeedOverride={V22_SPEEDS[0]} musicSrc={V22_MUSIC} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV22Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[1]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode playbackSpeedOverride={V22_SPEEDS[1]} musicSrc={V22_MUSIC} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV22Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[2]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V22_SPEEDS[2]} musicSrc={V22_MUSIC} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV22Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[3]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V22_SPEEDS[3]} musicSrc={V22_MUSIC} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

const V23_VIDEO2_SPEED = 1.10;
const V23_VIDEO2_MUSIC = "staging/brisky-raw-ads/music-epical-drums-05-mixkit.mp3";
export const BRISKY_SHORT_V23_VIDEO2_DURATION =
  getTimedSegments(V23_VIDEO2_AD,V23_VIDEO2_SPEED).reduce((sum,segment)=>sum+segment.durationInFrames,0)
  + secToFrames((V16_CTA_END-V16_CTA_START)/V23_VIDEO2_SPEED)
  + secToFrames(END_CARD_SECONDS);
export const BriskyShortV23Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V23_VIDEO2_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V23_VIDEO2_SPEED} musicSrc={V23_VIDEO2_MUSIC} musicBaseVolume={0.16} musicEndVolume={0.38} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v24 keeps the word-safe v23 edit and changes only the music bed to the
// exact Fairy Tail / SkyX Music sound supplied by the user.
const V24_VIDEO2_MUSIC = "staging/brisky-raw-ads/music-fairy-tail-skyx-tiktok-bed.mp3";
export const BRISKY_SHORT_V24_VIDEO2_DURATION = BRISKY_SHORT_V23_VIDEO2_DURATION;
export const BriskyShortV24Video2 = () => <BriskyShortV4 index={1} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V23_VIDEO2_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V23_VIDEO2_SPEED} musicSrc={V24_VIDEO2_MUSIC} musicBaseVolume={0.15} musicEndVolume={0.36} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v25 keeps Video 3's v22 dialogue and visual edit, changing only the music
// to the exact Wake - OAO Remix TikTok sound supplied by the user.
const V25_VIDEO3_MUSIC = "staging/brisky-raw-ads/music-wake-oao-remix-tnightcore-tiktok.mp3";
export const BRISKY_SHORT_V25_VIDEO3_DURATION = BRISKY_SHORT_V22_DURATIONS[1];
export const BriskyShortV25Video3 = () => <BriskyShortV4 index={2} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[1]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V22_SPEEDS[1]} musicSrc={V25_VIDEO3_MUSIC} musicBaseVolume={0.14} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v26 keeps Video 4's short v22 edit and changes only the music to the exact
// Spectre / Shin Music TikTok sound supplied by the user.
const V26_VIDEO4_MUSIC = "staging/brisky-raw-ads/music-spectre-shin-music-tiktok.mp3";
export const BRISKY_SHORT_V26_VIDEO4_DURATION = BRISKY_SHORT_V22_DURATIONS[2];
export const BriskyShortV26Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[2]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V22_SPEEDS[2]} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v27 keeps Video 5's short v22 edit. Its selected TikTok track is restrained
// under the story, rises into the spoken CTA, then peaks on the end card.
const V27_VIDEO5_MUSIC = "staging/brisky-raw-ads/music-ntp-vinahouse-motivation-tiktok.mp3";
export const BRISKY_SHORT_V27_VIDEO5_DURATION = BRISKY_SHORT_V22_DURATIONS[3];
export const BriskyShortV27Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V22_ADS[3]} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V22_SPEEDS[3]} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

// v28 rebuilds the dialogue directly from the camera originals. The source
// pieces keep word-safe handles and never overlap; visuals retain the v22 TDC
// profile while being retimed by the new segment durations.
const V28_SPEED = 1.12;
const V28_VIDEO4_AD: AdSpec = {
  ...V22_ADS[2],
  speechAudio:"staging/brisky-v28-audio/ad04-dialogue.wav",
  segments:[
    makeV13Segment([[49.18,52.38],[52.72,54.24],[54.56,56.70]],"Con học tiếng Anh nhiều năm nhưng vẫn sợ, học trước quên sau và điểm số chưa cao.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU NĂM • VẪN SỢ",1.012,1.052),
    makeV13Segment([[96.94,102.78]],"Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.","staging/brisky-real/05-class-lesson.jpg","CON CẦN ĐÚNG PHƯƠNG PHÁP",1.052,1.016),
    makeV13Segment([[115.56,119.96]],"Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỔNG TỪ VỰNG",1.016,1.054),
    makeV13Segment([[125.13,126.85],[135.24,138.36]],"Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.","staging/brisky-real/05-class-lesson.jpg","HỔNG CÂU ĐƠN",1.054,1.017),
    makeV13Segment([[142.45,144.21],[144.67,146.93]],"Có bạn hổng ngữ pháp, học rồi nhưng không biết áp dụng.","staging/brisky-generated-v3/03-grammar-application.png","HỔNG NGỮ PHÁP",1.017,1.053),
    makeV13Segment([[156.99,159.65],[160.39,161.25]],"Biết từng câu nhưng không hiểu cả đoạn.","staging/brisky-generated-v3/02-long-reading.png","HỔNG ĐỌC HIỂU",1.053,1.016),
    ...V22_ADS[2].segments.slice(6),
  ],
};

const V28_VIDEO5_AD: AdSpec = {
  ...V22_ADS[3],
  speechAudio:"staging/brisky-v28-audio/ad05-dialogue.wav",
  segments:[
    makeV13Segment([[32.94,34.70],[38.98,40.84]],"Cứ nhắc đến tiếng Anh là con sợ. Ba mẹ đừng vội nghĩ con lười.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","ĐỪNG VỘI GẮN NHÃN CON LƯỜI",1.012,1.054),
    makeV13Segment([[51.71,56.69]],"Nhiều con đã mất gốc và đang mông lung về định hướng.","staging/brisky-generated-v3/04-level-assessment.png","MẤT GỐC • MÔNG LUNG",1.054,1.016),
    makeV13Segment([[80.21,82.51]],"Học từ vựng trước rồi lại quên sau.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỌC TRƯỚC • QUÊN SAU",1.016,1.053),
    makeV13Segment([[111.46,114.54]],"Khi càng đuối, con càng chán nản trong học tập.","staging/brisky-generated-v3/02-long-reading.png","CÀNG ĐUỐI • CÀNG CHÁN NẢN",1.053,1.017),
    makeV13Segment([[181.04,183.52],[183.72,186.24]],"Ba mẹ không biết làm thế nào để con có thể yêu tiếng Anh.","staging/brisky-generated-v10/02-parent-student-roadmap.png","LÀM SAO ĐỂ CON YÊU TIẾNG ANH?",1.017,1.052),
    makeV13Segment([[154.19,163.25]],"Chương trình Bí mật lấy gốc tiếng Anh gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3 đến lớp 9.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM",1.017,1.055),
    makeV13Segment([[189.08,189.68],[190.66,193.44],[209.42,213.90],[311.59,320.93]],"Thầy từng bước chia sẻ phương pháp để ba mẹ lựa chọn cách phù hợp. Sau chương trình, ba mẹ có định hướng rõ ràng để con không còn học trong trạng thái mơ hồ.","staging/brisky-real/05-class-lesson.jpg","NỘI DUNG 3 BUỔI ZOOM",1.055,1.016),
    makeV13Segment([[383.49,386.11]],"Từ đó ba mẹ biết lộ trình của con sẽ như thế nào.","staging/brisky-generated-v10/02-parent-student-roadmap.png","LỘ TRÌNH PHÙ HỢP",1.016,1.054),
    makeV13Segment([[374.17,377.67],[378.21,383.07]],"Ngoài 3 buổi Zoom, ba mẹ có thể đăng ký cho con trải nghiệm và kiểm tra trình độ để biết con đang ở đâu.","staging/brisky-older-students/older-student-certificate.png","KIỂM TRA TRÌNH ĐỘ",1.054,1.017),
  ],
};

export const BRISKY_SHORT_V28_VIDEO4_DURATION =
  getTimedSegments(V28_VIDEO4_AD,V28_SPEED).reduce((sum,segment)=>sum+segment.durationInFrames,0)
  + secToFrames((V16_CTA_END-V16_CTA_START)/V28_SPEED)
  + secToFrames(END_CARD_SECONDS);
export const BRISKY_SHORT_V28_VIDEO5_DURATION =
  getTimedSegments(V28_VIDEO5_AD,V28_SPEED).reduce((sum,segment)=>sum+segment.durationInFrames,0)
  + secToFrames((V16_CTA_END-V16_CTA_START)/V28_SPEED)
  + secToFrames(END_CARD_SECONDS);
export const BriskyShortV28Video4 = () => <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V28_VIDEO4_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V28_SPEED} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;
export const BriskyShortV28Video5 = () => <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V28_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V28_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END} />;

const V29_SPEED = 1.08;
const V29_VIDEO4_AD: AdSpec = {
  ...V22_ADS[2], speechAudio:"staging/brisky-v29-audio/ad04-dialogue.wav",
  segments:[
    makeV13Segment([[49.10,56.72]],"Con học tiếng Anh nhiều năm nhưng vẫn sợ, học trước quên sau và điểm số chưa cao.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU NĂM • VẪN SỢ",1.012,1.052),
    makeV13Segment([[96.94,102.80]],"Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.","staging/brisky-real/05-class-lesson.jpg","CON CẦN ĐÚNG PHƯƠNG PHÁP",1.052,1.016),
    makeV13Segment([[115.56,119.86]],"Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỔNG TỪ VỰNG",1.016,1.054),
    makeV13Segment([[125.13,126.81],[135.24,138.38]],"Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.","staging/brisky-real/05-class-lesson.jpg","HỔNG CÂU ĐƠN",1.054,1.017),
    makeV13Segment([[142.45,144.23],[144.67,146.89]],"Có bạn hổng ngữ pháp, học rồi nhưng không biết áp dụng.","staging/brisky-generated-v3/03-grammar-application.png","HỔNG NGỮ PHÁP",1.017,1.053),
    makeV13Segment([[150.01,153.83]],"Có bạn hổng đọc hiểu, biết từng từ nhưng không hiểu cả đoạn.","staging/brisky-generated-v3/02-long-reading.png","HỔNG ĐỌC HIỂU",1.053,1.016),
    makeV13Segment([[234.16,236.60]],"Càng lên lớp cao, con càng đuối.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","LỚP CÀNG CAO • CON CÀNG ĐUỐI",1.016,1.056),
    makeV13Segment([[387.11,392.45]],"Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH",1.052,1.017),
    makeV13Segment([[502.54,508.40]],"Đây là 3 buổi Zoom dành cho cha mẹ có con từ lớp 3 đến lớp 9.","staging/brisky-older-students/zoom-class.png","3 BUỔI ZOOM • LỚP 3–9",1.017,1.054),
    makeV13Segment([[570.53,575.41]],"Ba mẹ dễ dàng nhận biết con đang yếu phần nào.","staging/brisky-generated-v10/02-parent-student-roadmap.png","NHẬN BIẾT ĐÚNG PHẦN CON HỔNG",1.054,1.016),
    makeV13Segment([[575.39,580.17]],"Ví dụ phần đọc, phần viết, ngữ pháp hoặc kỹ năng làm bài.","staging/brisky-generated-v3/04-level-assessment.png","NHẬN LỘ TRÌNH PHÙ HỢP",1.016,1.052),
  ],
};
const V29_VIDEO5_AD: AdSpec = {
  ...V22_ADS[3], speechAudio:"staging/brisky-v29-audio/ad05-dialogue.wav",
  segments:[
    makeV13Segment([[32.94,34.70],[38.74,40.84]],"Cứ nhắc đến tiếng Anh là con sợ. Ba mẹ đừng vội nghĩ con lười.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","ĐỪNG VỘI GẮN NHÃN CON LƯỜI",1.012,1.054),
    makeV13Segment([[51.71,60.50]],"Nhiều con mất gốc, mông lung về định hướng và đã trải qua thời gian mất gốc quá lâu.","staging/brisky-generated-v3/04-level-assessment.png","MẤT GỐC • MÔNG LUNG",1.054,1.016),
    makeV13Segment([[79.13,82.51]],"Có bạn học từ vựng trước rồi lại quên sau.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỌC TRƯỚC • QUÊN SAU",1.016,1.053),
    makeV13Segment([[110.86,114.54]],"Khi càng đuối, con càng chán nản trong học tập.","staging/brisky-generated-v3/02-long-reading.png","CÀNG ĐUỐI • CÀNG CHÁN NẢN",1.053,1.017),
    makeV13Segment([[176.98,186.40]],"Con vẫn sợ tiếng Anh, không biết bắt đầu từ đâu; ba mẹ chưa biết làm sao để con yêu tiếng Anh.","staging/brisky-generated-v10/02-parent-student-roadmap.png","LÀM SAO ĐỂ CON YÊU TIẾNG ANH?",1.017,1.052),
    makeV13Segment([[153.19,163.41]],"Chương trình Bí mật lấy gốc tiếng Anh gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3 đến lớp 9.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC • 3 BUỔI ZOOM",1.017,1.055),
    makeV13Segment([[190.66,193.60],[209.42,213.90],[311.51,320.93]],"Thầy từng bước chia sẻ phương pháp phù hợp. Sau chương trình, ba mẹ có định hướng rõ ràng để con không còn học mơ hồ.","staging/brisky-real/05-class-lesson.jpg","NỘI DUNG 3 BUỔI ZOOM",1.055,1.016),
    makeV13Segment([[383.41,386.27]],"Từ đó ba mẹ biết lộ trình của con sẽ như thế nào.","staging/brisky-generated-v10/02-parent-student-roadmap.png","LỘ TRÌNH PHÙ HỢP",1.016,1.054),
    makeV13Segment([[374.09,383.27]],"Ngoài 3 buổi Zoom, ba mẹ có thể đăng ký trải nghiệm và kiểm tra trình độ để biết con đang ở đâu.","staging/brisky-older-students/older-student-certificate.png","KIỂM TRA TRÌNH ĐỘ",1.054,1.017),
  ],
};
export const BRISKY_SHORT_V29_VIDEO4_DURATION=getTimedSegments(V29_VIDEO4_AD,V29_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V29_SPEED)+secToFrames(END_CARD_SECONDS);
export const BRISKY_SHORT_V29_VIDEO5_DURATION=getTimedSegments(V29_VIDEO5_AD,V29_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V29_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV29Video4=()=> <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V29_VIDEO4_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V29_SPEED} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;
export const BriskyShortV29Video5=()=> <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V29_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V29_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

const V30_SPEED = 1.04;
const V30_VIDEO4_AD: AdSpec = {
  ...V22_ADS[2], speechAudio:"staging/brisky-v30-audio/ad04-dialogue.wav",
  segments:[
    makeV13Segment([[21.44,26.64],[54.56,56.72]],"Con học tiếng Anh nhiều năm rồi, nhưng đến giờ vẫn sợ tiếng Anh. Cứ học trước thì lại quên sau. Và điểm số trên trường thì chưa cao.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH",1.008,1.042),
    makeV13Segment([[96.94,102.80]],"Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.","staging/brisky-real/05-class-lesson.jpg","CON CẦN ĐÚNG PHƯƠNG PHÁP",1.042,1.014),
    makeV13Segment([[115.48,120.02]],"Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỔNG TỪ VỰNG • HỌC TRƯỚC QUÊN SAU",1.014,1.046),
    makeV13Segment([[125.05,126.93],[135.16,138.50]],"Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.","staging/brisky-real/05-class-lesson.jpg","HỔNG CÂU ĐƠN",1.046,1.016),
    makeV13Segment([[142.37,144.35],[144.59,147.01]],"Có bạn hổng ngữ pháp, học rồi nhưng không biết áp dụng.","staging/brisky-generated-v3/03-grammar-application.png","HỔNG NGỮ PHÁP",1.016,1.045),
    makeV13Segment([[149.93,153.95]],"Có bạn hổng đọc hiểu, biết từng từ nhưng không hiểu cả đoạn.","staging/brisky-generated-v3/02-long-reading.png","HỔNG ĐỌC HIỂU",1.045,1.015),
    makeV13Segment([[222.58,225.56],[234.16,236.56]],"Vì vậy con học thêm càng nhiều nhưng điểm vẫn không lên; và càng lên lớp cao thì lại càng đuối.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC THÊM NHIỀU • ĐIỂM VẪN KHÔNG LÊN",1.015,1.052),
    ...V22_ADS[2].segments.slice(7),
  ],
};
export const BRISKY_SHORT_V30_VIDEO4_DURATION=getTimedSegments(V30_VIDEO4_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV30Video4=()=> <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V30_VIDEO4_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

const V31_VIDEO4_AD: AdSpec={
  ...V22_ADS[2],id:"ad04-v31",speechAudio:"staging/brisky-v31-audio/ad04-dialogue.wav",
  segments:[
    makeV13Segment([[21.44,26.64],[54.56,56.72]],"Con học tiếng Anh nhiều năm rồi, nhưng đến giờ vẫn sợ tiếng Anh. Cứ học trước thì lại quên sau. Và điểm số trên trường thì chưa cao.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH",1.008,1.042),
    makeV13Segment([[96.94,102.80]],"Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.","staging/brisky-real/05-class-lesson.jpg","CON CẦN ĐÚNG PHƯƠNG PHÁP",1.042,1.014),
    makeV13Segment([[115.48,120.02]],"Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỔNG TỪ VỰNG • HỌC TRƯỚC QUÊN SAU",1.014,1.046),
    makeV13Segment([[125.13,126.77],[135.24,138.34]],"Có bạn hổng câu đơn, biết từ nhưng không ghép được thành câu.","staging/brisky-real/05-class-lesson.jpg","HỔNG CÂU ĐƠN",1.046,1.016),
    makeV13Segment([[142.37,144.35],[144.59,147.01]],"Có bạn hổng ngữ pháp, học rồi nhưng không biết áp dụng.","staging/brisky-generated-v3/03-grammar-application.png","HỔNG NGỮ PHÁP",1.016,1.045),
    makeV13Segment([[222.58,225.56],[234.16,236.56]],"Vì vậy con học thêm càng nhiều nhưng điểm vẫn không lên; và càng lên lớp cao thì lại càng đuối.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC THÊM NHIỀU • ĐIỂM VẪN KHÔNG LÊN",1.015,1.052),
    makeV13Segment([[387.11,392.45]],"Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH",1.052,1.017),
    makeV13Segment([[502.54,508.40]],"Đây là 3 buổi Zoom dành cho cha mẹ có con từ lớp 3 đến lớp 9.","staging/brisky-older-students/zoom-class.png","3 BUỔI ZOOM • LỚP 3–9",1.017,1.054),
    makeV13Segment([[570.53,575.41]],"Ba mẹ dễ dàng nhận biết con đang yếu phần nào.","staging/brisky-generated-v10/02-parent-student-roadmap.png","NHẬN BIẾT ĐÚNG PHẦN CON HỔNG",1.054,1.016),
    makeV13Segment([[575.39,580.17]],"Ví dụ phần đọc, phần viết, ngữ pháp hoặc kỹ năng làm bài.","staging/brisky-generated-v3/04-level-assessment.png","NHẬN LỘ TRÌNH PHÙ HỢP",1.016,1.052),
  ],
};
export const BRISKY_SHORT_V31_VIDEO4_DURATION=getTimedSegments(V31_VIDEO4_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV31Video4=()=> <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V31_VIDEO4_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

const V32_VIDEO4_AD:AdSpec={...V22_ADS[2],id:"ad04-v32",speechAudio:"staging/brisky-v32-audio/ad04-dialogue.wav",segments:[
  makeV13Segment([[21.44,26.64],[54.56,56.72]],"Con học tiếng Anh nhiều năm rồi, nhưng đến giờ vẫn sợ tiếng Anh. Cứ học trước thì lại quên sau. Và điểm số trên trường thì chưa cao.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU NĂM • VẪN SỢ TIẾNG ANH",1.018,1.068),
  makeV13Segment([[96.94,102.80]],"Con không phải không thể học tiếng Anh mà là chưa được tiếp cận đúng phương pháp.","staging/brisky-real/05-class-lesson.jpg","CON CẦN ĐÚNG PHƯƠNG PHÁP",1.068,1.024),makeV13Segment([[115.48,120.02]],"Có bạn hổng từ vựng, học hôm nay thì ngày mai lại quên.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỔNG TỪ VỰNG • HỌC TRƯỚC QUÊN SAU",1.024,1.072),
  makeV13Segment([[125.13,126.77],[135.24,136.50],[137.10,138.30]],"Có bạn hổng câu đơn, biết từ vựng nhưng không biết ghép được thành câu.","staging/brisky-real/05-class-lesson.jpg","HỔNG CÂU ĐƠN",1.072,1.026),makeV13Segment([[142.45,144.23],[144.67,146.85]],"Có bạn hổng ngữ pháp, học rồi nhưng không biết áp dụng.","staging/brisky-generated-v3/03-grammar-application.png","HỔNG NGỮ PHÁP",1.026,1.074),
  makeV13Segment([[222.58,225.56],[234.16,236.56]],"Vì vậy con học thêm càng nhiều nhưng điểm vẫn không lên; và càng lên lớp cao thì lại càng đuối.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC THÊM NHIỀU • ĐIỂM VẪN KHÔNG LÊN",1.074,1.025),makeV13Segment([[387.11,392.45]],"Thầy Quyền và đội ngũ tổ chức chương trình Bí mật lấy gốc tiếng Anh cho con.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH",1.025,1.07),makeV13Segment([[502.54,508.40]],"Đây là 3 buổi Zoom dành cho cha mẹ có con từ lớp 3 đến lớp 9.","staging/brisky-older-students/zoom-class.png","3 BUỔI ZOOM • LỚP 3–9",1.07,1.026),makeV13Segment([[570.53,575.41]],"Ba mẹ dễ dàng nhận biết con đang yếu phần nào.","staging/brisky-generated-v10/02-parent-student-roadmap.png","NHẬN BIẾT ĐÚNG PHẦN CON HỔNG",1.026,1.068),makeV13Segment([[575.39,580.17]],"Ví dụ phần đọc, phần viết, ngữ pháp hoặc kỹ năng làm bài.","staging/brisky-generated-v3/04-level-assessment.png","NHẬN LỘ TRÌNH PHÙ HỢP",1.068,1.026),
]};
export const BRISKY_SHORT_V32_VIDEO4_DURATION=getTimedSegments(V32_VIDEO4_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV32Video4=()=> <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V32_VIDEO4_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

V22_CAPTIONS_BY_AD["ad04-v33"]=[
  ...V22_CAPTIONS_BY_AD["ad04-v32"].filter((cue)=>cue.segmentIndex!==6&&cue.segmentIndex!==7),
  v20Cue(6,.12,3.15,"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC","TÊN CHƯƠNG TRÌNH","LẤY GỐC TIẾNG ANH SIÊU TỐC","cyan"),
  v20Cue(7,.12,2.25,"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ","QUYỀN LỢI THAM GIA","HOÀN TOÀN MIỄN PHÍ","cyan"),
  v20Cue(7,2.7,2.55,"DÀNH CHO CHA MẸ CÓ CON LỚP 3 – LỚP 9","ĐÚNG ĐỐI TƯỢNG","LỚP 3 – LỚP 9","cyan"),
];
V22_BROLLS_BY_AD["ad04-v33"]=V22_BROLLS_BY_AD["ad04-v32"].map((spec)=>spec.segmentIndex===6?{...spec,title:"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC"}:spec.segmentIndex===7?{...spec,title:"3 BUỔI MIỄN PHÍ • LỚP 3 – LỚP 9"}:spec);
V22_INFOGRAPHICS_BY_AD["ad04-v33"]=V22_INFOGRAPHICS_BY_AD["ad04-v32"];
V22_ICON_CALLOUTS_BY_AD["ad04-v33"]=V22_ICON_CALLOUTS_BY_AD["ad04-v32"].map((spec)=>spec.segmentIndex===6?{...spec,kicker:"TÊN CHƯƠNG TRÌNH",title:"LẤY GỐC TIẾNG ANH SIÊU TỐC"}:spec.segmentIndex===7?{...spec,kicker:"HOÀN TOÀN MIỄN PHÍ",title:"LỚP 3 – LỚP 9"}:spec);
const V33_VIDEO4_AD:AdSpec={...V32_VIDEO4_AD,id:"ad04-v33"};
export const BRISKY_SHORT_V33_VIDEO4_DURATION=BRISKY_SHORT_V32_VIDEO4_DURATION;
export const BriskyShortV33Video4=()=> <BriskyShortV4 index={3} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V33_VIDEO4_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V26_VIDEO4_MUSIC} musicBaseVolume={0.13} musicEndVolume={0.32} captionTop={1280} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

V22_CAPTIONS_BY_AD["ad05-v34"]=[
  v20Cue(0,.12,1.45,"Cứ nhắc tiếng Anh là con sợ","DẤU HIỆU BA MẸ NHẬN THẤY","con sợ","orange"),v20Cue(0,1.85,1.5,"Đừng vội nghĩ con lười","ĐỪNG VỘI GẮN NHÃN","con lười","orange"),
  v20Cue(1,.12,1.6,"Nhiều con đã mất gốc","NGUYÊN NHÂN THẬT","mất gốc","orange"),v20Cue(1,3.1,1.55,"Mông lung về định hướng","CON CHƯA BIẾT BẮT ĐẦU","mông lung","orange"),v20Cue(2,.12,1.55,"Học từ vựng rồi lại quên sau","BIỂU HIỆN CỤ THỂ","quên sau","orange"),
  v20Cue(3,.12,1.55,"Lên lớp 6, kiến thức khó hơn","CÀNG LÊN LỚP CAO","khó hơn","orange"),v20Cue(3,4.8,1.55,"Càng đuối, con càng chán nản","VÒNG LẶP TIÊU CỰC","càng chán nản","orange"),v20Cue(4,.12,1.7,"Con không biết bắt đầu từ đâu","NỖI LO CỦA BA MẸ","bắt đầu từ đâu","orange"),
  v20Cue(5,.12,3.15,"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC","TÊN CHƯƠNG TRÌNH","LẤY GỐC TIẾNG ANH SIÊU TỐC","cyan"),v20Cue(5,4.1,2.1,"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ","QUYỀN LỢI THAM GIA","HOÀN TOÀN MIỄN PHÍ","cyan"),v20Cue(5,7.0,2.45,"DÀNH CHO CHA MẸ CÓ CON LỚP 3 – LỚP 9","ĐÚNG ĐỐI TƯỢNG","LỚP 3 – LỚP 9","cyan"),
  v20Cue(6,.12,1.55,"Từng bước chia sẻ phương pháp","NỘI DUNG 3 BUỔI","chia sẻ phương pháp","cyan"),v20Cue(6,4.65,1.55,"Lựa chọn phương pháp phù hợp","ĐỒNG HÀNH ĐÚNG CÁCH","phương pháp phù hợp","cyan"),v20Cue(7,.12,1.65,"Đăng ký trải nghiệm kiểm tra trình độ","QUÀ TẶNG CHO CON","kiểm tra trình độ","cyan"),v20Cue(7,5.1,1.6,"Biết năng lực hiện tại của con","BIẾT ĐÚNG ĐIỂM XUẤT PHÁT","năng lực hiện tại","cyan"),
];
V22_BROLLS_BY_AD["ad05-v34"]=[
  {segmentIndex:0,offsetSeconds:.25,durationSeconds:1.45,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CỨ NHẮC TIẾNG ANH LÀ CON SỢ"},{segmentIndex:0,offsetSeconds:1.85,durationSeconds:1.45,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"alert",title:"ĐỪNG VỘI NGHĨ CON LƯỜI"},
  {segmentIndex:1,offsetSeconds:.45,durationSeconds:1.9,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"MẤT GỐC • MÔNG LUNG"},{segmentIndex:2,offsetSeconds:.35,durationSeconds:1.9,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TRƯỚC • QUÊN SAU"},
  {segmentIndex:3,offsetSeconds:.2,durationSeconds:2.0,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"alert",title:"LỚP 6 • KIẾN THỨC KHÓ HƠN"},{segmentIndex:3,offsetSeconds:4.6,durationSeconds:2.0,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG ĐUỐI • CÀNG CHÁN NẢN"},
  {segmentIndex:4,offsetSeconds:.35,durationSeconds:2.0,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"search",title:"KHÔNG BIẾT BẮT ĐẦU TỪ ĐÂU"},{segmentIndex:5,offsetSeconds:.65,durationSeconds:2.25,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC"},{segmentIndex:5,offsetSeconds:4.15,durationSeconds:2.1,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ"},
  {segmentIndex:6,offsetSeconds:.45,durationSeconds:1.9,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"route",title:"TỪNG BƯỚC CHIA SẺ PHƯƠNG PHÁP"},{segmentIndex:6,offsetSeconds:4.25,durationSeconds:1.9,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"PHƯƠNG PHÁP PHÙ HỢP"},{segmentIndex:7,offsetSeconds:.45,durationSeconds:2.0,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ"},{segmentIndex:7,offsetSeconds:5.0,durationSeconds:2.0,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"target",title:"BIẾT ĐÚNG NĂNG LỰC CỦA CON"},
];
V22_INFOGRAPHICS_BY_AD["ad05-v34"]=[{segmentIndex:3,offsetSeconds:2.25,durationSeconds:2.15,eyebrow:"VÒNG LẶP TIÊU CỰC",title:"Càng học càng đuối",items:[{icon:"book",text:"Kiến thức khó hơn"},{icon:"alert",text:"Con dần chán nản"},{icon:"target",text:"Mất phương hướng"}]},{segmentIndex:7,offsetSeconds:2.55,durationSeconds:2.15,eyebrow:"KIỂM TRA TRÌNH ĐỘ",title:"Biết đúng điểm xuất phát",items:[{icon:"search",text:"Đánh giá năng lực"},{icon:"target",text:"Xác định phần hổng"},{icon:"route",text:"Nhận hướng đi phù hợp"}]}];
V22_ICON_CALLOUTS_BY_AD["ad05-v34"]=[{segmentIndex:0,offsetSeconds:1.65,durationSeconds:1.15,side:"left",icon:"alert",kicker:"ĐỪNG GẮN NHÃN",title:"CON LƯỜI"},{segmentIndex:1,offsetSeconds:2.7,durationSeconds:1.2,side:"right",icon:"search",kicker:"NGUYÊN NHÂN",title:"MẤT GỐC"},{segmentIndex:2,offsetSeconds:2.15,durationSeconds:1.15,side:"left",icon:"book",kicker:"BIỂU HIỆN",title:"HỌC TRƯỚC • QUÊN SAU"},{segmentIndex:4,offsetSeconds:2.45,durationSeconds:1.2,side:"right",icon:"search",kicker:"NỖI LO",title:"BẮT ĐẦU TỪ ĐÂU?"},{segmentIndex:5,offsetSeconds:3.05,durationSeconds:1.2,side:"left",icon:"video",kicker:"TÊN CHƯƠNG TRÌNH",title:"LẤY GỐC TIẾNG ANH SIÊU TỐC"},{segmentIndex:5,offsetSeconds:6.45,durationSeconds:1.2,side:"right",icon:"video",kicker:"HOÀN TOÀN MIỄN PHÍ",title:"LỚP 3 – LỚP 9"},{segmentIndex:6,offsetSeconds:2.65,durationSeconds:1.2,side:"left",icon:"route",kicker:"NỘI DUNG",title:"PHƯƠNG PHÁP PHÙ HỢP"},{segmentIndex:7,offsetSeconds:7.15,durationSeconds:1.2,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA TRÌNH ĐỘ"}];
const V34_VIDEO5_AD:AdSpec={...V22_ADS[3],id:"ad05-v34",speechAudio:"staging/brisky-v34-audio/ad05-dialogue.wav",segments:[
  makeV13Segment([[32.94,34.70],[38.98,40.84]],"Cứ nhắc đến tiếng Anh là con rất sợ. Ba mẹ đừng vội nghĩ con lười.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","ĐỪNG VỘI GẮN NHÃN CON LƯỜI",1.02,1.068),makeV13Segment([[50.49,56.81]],"Vấn đề là nhiều con đã mất gốc và đang mông lung về định hướng.","staging/brisky-generated-v3/04-level-assessment.png","MẤT GỐC • MÔNG LUNG",1.068,1.024),makeV13Segment([[79.13,82.51]],"Có bạn học từ vựng trước rồi lại quên sau.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỌC TRƯỚC • QUÊN SAU",1.024,1.07),
  makeV13Segment([[106.04,110.86],[111.32,114.54]],"Khi con lên lớp 6, kiến thức dài hơn, khó hơn thì con cảm thấy đuối. Từ khi đuối, con rất chán nản trong học tập.","staging/brisky-generated-v3/02-long-reading.png","CÀNG ĐUỐI • CÀNG CHÁN NẢN",1.07,1.025),makeV13Segment([[176.98,181.04]],"Con vẫn sợ tiếng Anh và không biết cần bắt đầu từ đâu.","staging/brisky-generated-v10/02-parent-student-roadmap.png","BẮT ĐẦU TỪ ĐÂU?",1.025,1.068),makeV13Segment([[153.19,163.37]],"Chương trình Bí mật lấy gốc tiếng Anh gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3 đến lớp 9.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC",1.068,1.024),
  makeV13Segment([[187.50,188.80],[189.08,189.68],[190.66,193.56],[209.42,213.90]],"Trong 3 buổi tối, thầy sẽ từng bước chia sẻ với ba mẹ về các phương pháp. Từ đó ba mẹ lựa chọn được phương pháp phù hợp.","staging/brisky-real/05-class-lesson.jpg","PHƯƠNG PHÁP PHÙ HỢP",1.024,1.07),makeV13Segment([[374.09,377.79],[378.13,383.19]],"Ngoài 3 buổi Zoom, ba mẹ có thể đăng ký cho con trải nghiệm bài kiểm tra trình độ để biết năng lực của con đang ở đâu.","staging/brisky-older-students/older-student-certificate.png","KIỂM TRA TRÌNH ĐỘ • BIẾT ĐIỂM XUẤT PHÁT",1.07,1.025),
]};
export const BRISKY_SHORT_V34_VIDEO5_DURATION=getTimedSegments(V34_VIDEO5_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV34Video5=()=> <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V34_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

V22_CAPTIONS_BY_AD["ad05-v35"]=[
  v20Cue(0,.12,1.45,"Cứ nhắc tiếng Anh là con sợ","DẤU HIỆU BA MẸ NHẬN THẤY","con sợ","orange"),v20Cue(0,1.85,1.5,"Đừng vội nghĩ con lười","ĐỪNG VỘI GẮN NHÃN","con lười","orange"),
  v20Cue(1,.12,1.6,"Nhiều con đã mất gốc","NGUYÊN NHÂN THẬT","mất gốc","orange"),v20Cue(1,3.1,1.55,"Mông lung về định hướng","CON CHƯA BIẾT BẮT ĐẦU","mông lung","orange"),v20Cue(2,.12,1.7,"Học trước rồi lại quên sau","BIỂU HIỆN CỤ THỂ","quên sau","orange"),
  v20Cue(3,.12,1.55,"Lên lớp 6, kiến thức khó hơn","CÀNG LÊN LỚP CAO","khó hơn","orange"),v20Cue(3,4.8,1.55,"Càng đuối, con càng chán nản","VÒNG LẶP TIÊU CỰC","càng chán nản","orange"),v20Cue(4,.12,1.8,"Con không biết bắt đầu từ đâu","NỖI LO CỦA BA MẸ","bắt đầu từ đâu","orange"),
  v20Cue(5,.12,3.15,"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC","TÊN CHƯƠNG TRÌNH","LẤY GỐC TIẾNG ANH SIÊU TỐC","cyan"),v20Cue(5,4.1,2.1,"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ","QUYỀN LỢI THAM GIA","HOÀN TOÀN MIỄN PHÍ","cyan"),v20Cue(5,7.0,2.45,"DÀNH CHO CHA MẸ CÓ CON LỚP 3 – LỚP 9","ĐÚNG ĐỐI TƯỢNG","LỚP 3 – LỚP 9","cyan"),
  v20Cue(6,.12,1.75,"Từng bước chia sẻ cách lấy lại gốc","NỘI DUNG 3 BUỔI","lấy lại gốc","cyan"),v20Cue(7,.12,1.65,"Đăng ký trải nghiệm kiểm tra trình độ","QUÀ TẶNG CHO CON","kiểm tra trình độ","cyan"),v20Cue(7,5.1,1.6,"Biết năng lực hiện tại của con","BIẾT ĐÚNG ĐIỂM XUẤT PHÁT","năng lực hiện tại","cyan"),
];
V22_BROLLS_BY_AD["ad05-v35"]=[
  {segmentIndex:0,offsetSeconds:.25,durationSeconds:1.45,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CỨ NHẮC TIẾNG ANH LÀ CON SỢ"},{segmentIndex:0,offsetSeconds:1.85,durationSeconds:1.45,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"alert",title:"ĐỪNG VỘI NGHĨ CON LƯỜI"},
  {segmentIndex:1,offsetSeconds:.45,durationSeconds:1.9,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"MẤT GỐC • MÔNG LUNG"},{segmentIndex:2,offsetSeconds:.35,durationSeconds:2.15,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TRƯỚC • QUÊN SAU"},
  {segmentIndex:3,offsetSeconds:.2,durationSeconds:2.0,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"alert",title:"LỚP 6 • KIẾN THỨC KHÓ HƠN"},{segmentIndex:3,offsetSeconds:4.6,durationSeconds:2.0,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG ĐUỐI • CÀNG CHÁN NẢN"},
  {segmentIndex:4,offsetSeconds:.25,durationSeconds:2.65,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"search",title:"CON CẦN MỘT ĐIỂM BẮT ĐẦU ĐÚNG"},{segmentIndex:5,offsetSeconds:.65,durationSeconds:2.25,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC"},{segmentIndex:5,offsetSeconds:4.15,durationSeconds:2.1,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ"},
  {segmentIndex:6,offsetSeconds:.45,durationSeconds:2.2,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"TỪNG BƯỚC LẤY LẠI GỐC"},{segmentIndex:7,offsetSeconds:.45,durationSeconds:2.0,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ"},{segmentIndex:7,offsetSeconds:5.0,durationSeconds:2.0,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"target",title:"BIẾT ĐÚNG NĂNG LỰC CỦA CON"},
];
V22_INFOGRAPHICS_BY_AD["ad05-v35"]=[{segmentIndex:3,offsetSeconds:2.25,durationSeconds:2.15,eyebrow:"VÒNG LẶP TIÊU CỰC",title:"Càng học càng đuối",items:[{icon:"book",text:"Kiến thức khó hơn"},{icon:"alert",text:"Con dần chán nản"},{icon:"target",text:"Mất phương hướng"}]},{segmentIndex:7,offsetSeconds:2.55,durationSeconds:2.15,eyebrow:"KIỂM TRA TRÌNH ĐỘ",title:"Biết đúng điểm xuất phát",items:[{icon:"search",text:"Đánh giá năng lực"},{icon:"target",text:"Xác định phần hổng"},{icon:"route",text:"Nhận hướng đi phù hợp"}]}];
V22_ICON_CALLOUTS_BY_AD["ad05-v35"]=[{segmentIndex:0,offsetSeconds:1.65,durationSeconds:1.15,side:"left",icon:"alert",kicker:"ĐỪNG GẮN NHÃN",title:"CON LƯỜI"},{segmentIndex:1,offsetSeconds:2.7,durationSeconds:1.2,side:"right",icon:"search",kicker:"NGUYÊN NHÂN",title:"MẤT GỐC"},{segmentIndex:2,offsetSeconds:2.15,durationSeconds:1.15,side:"left",icon:"book",kicker:"BIỂU HIỆN",title:"HỌC TRƯỚC • QUÊN SAU"},{segmentIndex:4,offsetSeconds:2.45,durationSeconds:1.2,side:"right",icon:"search",kicker:"ĐIỂM BẮT ĐẦU",title:"ĐÚNG VỚI CON"},{segmentIndex:5,offsetSeconds:3.05,durationSeconds:1.2,side:"left",icon:"video",kicker:"TÊN CHƯƠNG TRÌNH",title:"LẤY GỐC TIẾNG ANH SIÊU TỐC"},{segmentIndex:5,offsetSeconds:6.45,durationSeconds:1.2,side:"right",icon:"video",kicker:"HOÀN TOÀN MIỄN PHÍ",title:"LỚP 3 – LỚP 9"},{segmentIndex:6,offsetSeconds:2.65,durationSeconds:1.2,side:"left",icon:"route",kicker:"NỘI DUNG",title:"TỪNG BƯỚC LẤY LẠI GỐC"},{segmentIndex:7,offsetSeconds:7.15,durationSeconds:1.2,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA TRÌNH ĐỘ"}];
const V35_VIDEO5_AD:AdSpec={...V22_ADS[3],id:"ad05-v35",speechAudio:"staging/brisky-v35-audio/ad05-dialogue.wav",segments:[
  {...makeV13Segment([[32.94,34.70],[38.98,40.84]],"Cứ nhắc đến tiếng Anh là con rất sợ. Ba mẹ đừng vội nghĩ con lười.","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","ĐỪNG VỘI GẮN NHÃN CON LƯỜI",1.02,1.068),pauseAfterSeconds:.14},{...makeV13Segment([[50.49,56.81]],"Vấn đề là nhiều con đã mất gốc và đang mông lung về định hướng.","staging/brisky-generated-v3/04-level-assessment.png","MẤT GỐC • MÔNG LUNG",1.068,1.024),pauseAfterSeconds:.22},{...makeV13Segment([[79.13,82.51]],"Có bạn học từ vựng trước rồi lại quên sau.","staging/brisky-generated-v3/01-vocabulary-forgotten.png","HỌC TRƯỚC • QUÊN SAU",1.024,1.07),pauseAfterSeconds:.38},
  {...makeV13Segment([[106.04,110.86],[111.32,114.54]],"Khi con lên lớp 6, kiến thức dài hơn, khó hơn thì con cảm thấy đuối. Từ khi đuối, con rất chán nản trong học tập.","staging/brisky-generated-v3/02-long-reading.png","CÀNG ĐUỐI • CÀNG CHÁN NẢN",1.07,1.025),pauseAfterSeconds:.24},{...makeV13Segment([[176.98,181.04]],"Con vẫn sợ tiếng Anh và không biết cần bắt đầu từ đâu.","staging/brisky-generated-v10/02-parent-student-roadmap.png","CON CẦN MỘT ĐIỂM BẮT ĐẦU ĐÚNG",1.025,1.068),pauseAfterSeconds:.5},{...makeV13Segment([[153.19,163.37]],"Chương trình Bí mật lấy gốc tiếng Anh gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3 đến lớp 9.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC",1.068,1.024),pauseAfterSeconds:.22},
  {...makeV13Segment([[187.50,188.80],[189.08,189.68],[190.66,193.56],[195.92,196.50]],"Trong 3 buổi tối, thầy sẽ từng bước chia sẻ cách giúp con lấy lại gốc.","staging/brisky-generated-v10/02-parent-student-roadmap.png","TỪNG BƯỚC LẤY LẠI GỐC",1.024,1.07),pauseAfterSeconds:.24},makeV13Segment([[374.09,377.79],[378.13,383.19]],"Ngoài 3 buổi Zoom, ba mẹ có thể đăng ký cho con trải nghiệm bài kiểm tra trình độ để biết năng lực của con đang ở đâu.","staging/brisky-older-students/older-student-certificate.png","KIỂM TRA TRÌNH ĐỘ • BIẾT ĐIỂM XUẤT PHÁT",1.07,1.025),
]};
export const BRISKY_SHORT_V35_VIDEO5_DURATION=getTimedSegments(V35_VIDEO5_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV35Video5=()=> <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V35_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

V22_CAPTIONS_BY_AD["ad05-v36"]=[
  v20Cue(0,.12,1.8,"Cứ nhắc tiếng Anh là con sợ","NỖI ĐAU KÉO DÀI","con sợ","orange"),v20Cue(0,2.05,1.9,"Học trước quên sau, điểm số thấp","CÀNG HỌC CÀNG BẾ TẮC","điểm số thấp","orange"),v20Cue(0,4.35,2.15,"Tìm nhiều thầy cô vẫn chưa cải thiện","BA MẸ ĐÃ RẤT NỖ LỰC","chưa cải thiện","orange"),v20Cue(0,7.55,1.75,"Tại sao con vẫn sợ tiếng Anh?","CÂU HỎI CỦA BA MẸ","vẫn sợ tiếng Anh","orange"),
  v20Cue(1,.12,1.55,"Đừng vội nghĩ con lười","ĐỪNG VỘI GẮN NHÃN","con lười","orange"),v20Cue(1,2.05,1.7,"Nhiều con đã mất gốc","NGUYÊN NHÂN THẬT","mất gốc","orange"),v20Cue(1,5.0,1.65,"Mông lung về định hướng","CON CHƯA BIẾT BẮT ĐẦU","mông lung","orange"),
  v20Cue(2,.12,1.55,"Lên lớp 6, kiến thức khó hơn","CÀNG LÊN LỚP CAO","khó hơn","orange"),v20Cue(2,4.8,1.55,"Càng đuối, con càng chán nản","VÒNG LẶP TIÊU CỰC","càng chán nản","orange"),v20Cue(3,.12,1.8,"Con không biết bắt đầu từ đâu","NỖI LO CỦA BA MẸ","bắt đầu từ đâu","orange"),
  v20Cue(4,.12,3.15,"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC","TÊN CHƯƠNG TRÌNH","LẤY GỐC TIẾNG ANH SIÊU TỐC","cyan"),v20Cue(4,4.1,2.1,"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ","QUYỀN LỢI THAM GIA","HOÀN TOÀN MIỄN PHÍ","cyan"),v20Cue(4,7.0,2.45,"DÀNH CHO CHA MẸ CÓ CON LỚP 3 – LỚP 9","ĐÚNG ĐỐI TƯỢNG","LỚP 3 – LỚP 9","cyan"),
  v20Cue(5,.12,1.75,"Từng bước chia sẻ cách lấy lại gốc","NỘI DUNG 3 BUỔI","lấy lại gốc","cyan"),v20Cue(6,.12,1.65,"Đăng ký trải nghiệm kiểm tra trình độ","QUÀ TẶNG CHO CON","kiểm tra trình độ","cyan"),v20Cue(6,5.1,1.6,"Biết năng lực hiện tại của con","BIẾT ĐÚNG ĐIỂM XUẤT PHÁT","năng lực hiện tại","cyan"),
];
V22_BROLLS_BY_AD["ad05-v36"]=[
  {segmentIndex:0,offsetSeconds:.15,durationSeconds:2.0,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CỨ NHẮC TIẾNG ANH LÀ CON SỢ"},{segmentIndex:0,offsetSeconds:2.15,durationSeconds:2.0,src:"staging/brisky-generated-v3/01-vocabulary-forgotten.png",portrait:true,icon:"book",title:"HỌC TRƯỚC • QUÊN SAU • ĐIỂM THẤP"},{segmentIndex:0,offsetSeconds:4.35,durationSeconds:2.2,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"alert",title:"TÌM NHIỀU NƠI • VẪN CHƯA CẢI THIỆN"},
  {segmentIndex:1,offsetSeconds:.25,durationSeconds:1.55,src:"staging/brisky-real/05-class-lesson.jpg",portrait:false,icon:"alert",title:"ĐỪNG VỘI NGHĨ CON LƯỜI"},{segmentIndex:1,offsetSeconds:2.0,durationSeconds:2.15,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"search",title:"MẤT GỐC • MÔNG LUNG"},
  {segmentIndex:2,offsetSeconds:.2,durationSeconds:2.0,src:"staging/brisky-generated-v3/02-long-reading.png",portrait:true,icon:"alert",title:"LỚP 6 • KIẾN THỨC KHÓ HƠN"},{segmentIndex:2,offsetSeconds:4.6,durationSeconds:2.0,src:"staging/brisky-generated-v10/01-student-vocabulary-struggle.png",portrait:true,icon:"alert",title:"CÀNG ĐUỐI • CÀNG CHÁN NẢN"},
  {segmentIndex:3,offsetSeconds:.25,durationSeconds:2.65,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"search",title:"CON CẦN MỘT ĐIỂM BẮT ĐẦU ĐÚNG"},{segmentIndex:4,offsetSeconds:.65,durationSeconds:2.25,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"video",title:"BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC"},{segmentIndex:4,offsetSeconds:4.15,durationSeconds:2.1,src:"staging/brisky-older-students/zoom-class.png",portrait:false,icon:"video",title:"3 BUỔI ZOOM HOÀN TOÀN MIỄN PHÍ"},
  {segmentIndex:5,offsetSeconds:.45,durationSeconds:2.2,src:"staging/brisky-generated-v10/02-parent-student-roadmap.png",portrait:true,icon:"route",title:"TỪNG BƯỚC LẤY LẠI GỐC"},{segmentIndex:6,offsetSeconds:.45,durationSeconds:2.0,src:"staging/brisky-older-students/older-student-certificate.png",portrait:false,icon:"gift",title:"KIỂM TRA TRÌNH ĐỘ"},{segmentIndex:6,offsetSeconds:5.0,durationSeconds:2.0,src:"staging/brisky-generated-v3/04-level-assessment.png",portrait:true,icon:"target",title:"BIẾT ĐÚNG NĂNG LỰC CỦA CON"},
];
V22_INFOGRAPHICS_BY_AD["ad05-v36"]=[{segmentIndex:2,offsetSeconds:2.25,durationSeconds:2.15,eyebrow:"VÒNG LẶP TIÊU CỰC",title:"Càng học càng đuối",items:[{icon:"book",text:"Kiến thức khó hơn"},{icon:"alert",text:"Con dần chán nản"},{icon:"target",text:"Mất phương hướng"}]},{segmentIndex:6,offsetSeconds:2.55,durationSeconds:2.15,eyebrow:"KIỂM TRA TRÌNH ĐỘ",title:"Biết đúng điểm xuất phát",items:[{icon:"search",text:"Đánh giá năng lực"},{icon:"target",text:"Xác định phần hổng"},{icon:"route",text:"Nhận hướng đi phù hợp"}]}];
V22_ICON_CALLOUTS_BY_AD["ad05-v36"]=[{segmentIndex:0,offsetSeconds:1.75,durationSeconds:1.15,side:"left",icon:"alert",kicker:"NỖI ĐAU",title:"CON SỢ TIẾNG ANH"},{segmentIndex:0,offsetSeconds:6.65,durationSeconds:1.2,side:"right",icon:"alert",kicker:"KẾT QUẢ",title:"CHƯA CẢI THIỆN"},{segmentIndex:1,offsetSeconds:2.7,durationSeconds:1.2,side:"right",icon:"search",kicker:"NGUYÊN NHÂN",title:"MẤT GỐC"},{segmentIndex:3,offsetSeconds:2.45,durationSeconds:1.2,side:"right",icon:"search",kicker:"ĐIỂM BẮT ĐẦU",title:"ĐÚNG VỚI CON"},{segmentIndex:4,offsetSeconds:3.05,durationSeconds:1.2,side:"left",icon:"video",kicker:"TÊN CHƯƠNG TRÌNH",title:"LẤY GỐC TIẾNG ANH SIÊU TỐC"},{segmentIndex:4,offsetSeconds:6.45,durationSeconds:1.2,side:"right",icon:"video",kicker:"HOÀN TOÀN MIỄN PHÍ",title:"LỚP 3 – LỚP 9"},{segmentIndex:5,offsetSeconds:2.65,durationSeconds:1.2,side:"left",icon:"route",kicker:"NỘI DUNG",title:"TỪNG BƯỚC LẤY LẠI GỐC"},{segmentIndex:6,offsetSeconds:7.15,durationSeconds:1.2,side:"right",icon:"gift",kicker:"QUÀ TẶNG",title:"KIỂM TRA TRÌNH ĐỘ"}];
const V36_VIDEO5_AD:AdSpec={...V22_ADS[3],id:"ad05-v36",speechAudio:"staging/brisky-v36-audio/ad05-dialogue.wav",segments:[
  {...makeV13Segment([[32.94,34.70],[17.20,19.69],[20.11,24.00],[26.47,27.78],[34.82,37.04]],"Cứ nhắc đến tiếng Anh là con rất sợ. Học trước quên sau, điểm số trên trường thấp. Dù ba mẹ đã tìm nhiều lớp học thêm cho con, nhưng kết quả vẫn không cải thiện. Tại sao lại như thế?","staging/brisky-generated-v10/01-student-vocabulary-struggle.png","HỌC NHIỀU • VẪN SỢ • ĐIỂM THẤP",1.02,1.07),pauseAfterSeconds:.32},
  {...makeV13Segment([[38.95,40.84],[50.49,56.81]],"Ba mẹ đừng vội nghĩ con lười. Vấn đề là nhiều con đã mất gốc và đang mông lung về định hướng.","staging/brisky-generated-v3/04-level-assessment.png","ĐỪNG GẮN NHÃN • CON ĐÃ MẤT GỐC",1.07,1.024),pauseAfterSeconds:.26},
  {...makeV13Segment([[106.04,110.86],[111.32,114.54]],"Khi con lên lớp 6, kiến thức dài hơn, khó hơn thì con cảm thấy đuối. Từ khi đuối, con rất chán nản trong học tập.","staging/brisky-generated-v3/02-long-reading.png","CÀNG ĐUỐI • CÀNG CHÁN NẢN",1.024,1.07),pauseAfterSeconds:.24},{...makeV13Segment([[176.98,181.04]],"Con vẫn sợ tiếng Anh và không biết cần bắt đầu từ đâu.","staging/brisky-generated-v10/02-parent-student-roadmap.png","CON CẦN MỘT ĐIỂM BẮT ĐẦU ĐÚNG",1.07,1.025),pauseAfterSeconds:.5},{...makeV13Segment([[153.19,163.37]],"Chương trình Bí mật lấy gốc tiếng Anh gồm 3 buổi Zoom dành cho cha mẹ có con lớp 3 đến lớp 9.","staging/brisky-real/04-brisky-teachers.jpg","BÍ MẬT LẤY GỐC TIẾNG ANH SIÊU TỐC",1.025,1.068),pauseAfterSeconds:.22},
  {...makeV13Segment([[187.50,188.80],[189.08,189.68],[190.66,193.56],[195.92,196.50]],"Trong 3 buổi tối, thầy sẽ từng bước chia sẻ cách giúp con lấy lại gốc.","staging/brisky-generated-v10/02-parent-student-roadmap.png","TỪNG BƯỚC LẤY LẠI GỐC",1.068,1.024),pauseAfterSeconds:.24},makeV13Segment([[374.09,377.79],[378.13,383.19]],"Ngoài 3 buổi Zoom, ba mẹ có thể đăng ký cho con trải nghiệm bài kiểm tra trình độ để biết năng lực của con đang ở đâu.","staging/brisky-older-students/older-student-certificate.png","KIỂM TRA TRÌNH ĐỘ • BIẾT ĐIỂM XUẤT PHÁT",1.024,1.07),
]};
export const BRISKY_SHORT_V36_VIDEO5_DURATION=getTimedSegments(V36_VIDEO5_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV36Video5=()=> <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V36_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

const shiftAfterVideo5Reason = <T extends {segmentIndex:number}>(spec:T):T => spec.segmentIndex >= 4 ? {...spec,segmentIndex:spec.segmentIndex+1} : spec;
V22_CAPTIONS_BY_AD["ad05-v37"]=[
  ...(V22_CAPTIONS_BY_AD["ad05-v36"]??[]).map(shiftAfterVideo5Reason),
  v20Cue(4,.12,2.4,"Chính vì những vấn đề đó","LÝ DO TỔ CHỨC 3 BUỔI","những vấn đề đó","orange"),
  v20Cue(4,2.65,2.15,"Thầy cùng đội ngũ đúc rút giải pháp","TỪ KINH NGHIỆM THỰC TẾ","đúc rút giải pháp","cyan"),
].sort((a,b)=>a.segmentIndex-b.segmentIndex||a.offsetSeconds-b.offsetSeconds);
V22_BROLLS_BY_AD["ad05-v37"]=[
  ...(V22_BROLLS_BY_AD["ad05-v36"]??[]).map(shiftAfterVideo5Reason),
  {segmentIndex:4,offsetSeconds:.2,durationSeconds:4.35,src:"staging/brisky-real/04-brisky-teachers.jpg",portrait:false,icon:"route",title:"TỪ NỖI ĐAU THỰC TẾ • ĐÚC RÚT GIẢI PHÁP"} as V10BrollSpec,
].sort((a,b)=>a.segmentIndex-b.segmentIndex||a.offsetSeconds-b.offsetSeconds);
V22_INFOGRAPHICS_BY_AD["ad05-v37"]=(V22_INFOGRAPHICS_BY_AD["ad05-v36"]??[]).map(shiftAfterVideo5Reason);
V22_ICON_CALLOUTS_BY_AD["ad05-v37"]=[
  ...(V22_ICON_CALLOUTS_BY_AD["ad05-v36"]??[]).map(shiftAfterVideo5Reason),
  {segmentIndex:4,offsetSeconds:2.45,durationSeconds:1.35,side:"left",icon:"route",kicker:"LÝ DO TỔ CHỨC",title:"ĐÚC RÚT GIẢI PHÁP"} as V10IconCalloutSpec,
].sort((a,b)=>a.segmentIndex-b.segmentIndex||a.offsetSeconds-b.offsetSeconds);
const V37_VIDEO5_REASON_SEGMENT:Segment={...makeV13Segment([[146.43,149.11],[149.19,149.97],[150.15,152.55]],"Chính bởi vì những điều như vậy, thầy cùng đội ngũ đã đúc rút lại.","staging/brisky-real/04-brisky-teachers.jpg","LÝ DO TỔ CHỨC 3 BUỔI ZOOM",1.025,1.068),pauseAfterSeconds:.28};
const V37_VIDEO5_AD:AdSpec={...V36_VIDEO5_AD,id:"ad05-v37",speechAudio:"staging/brisky-v37-audio/ad05-dialogue.wav",segments:[...V36_VIDEO5_AD.segments.slice(0,4),V37_VIDEO5_REASON_SEGMENT,...V36_VIDEO5_AD.segments.slice(4)]};
export const BRISKY_SHORT_V37_VIDEO5_DURATION=getTimedSegments(V37_VIDEO5_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV37Video5=()=> <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V37_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;

V22_CAPTIONS_BY_AD["ad05-v38"]=V22_CAPTIONS_BY_AD["ad05-v37"];
V22_BROLLS_BY_AD["ad05-v38"]=V22_BROLLS_BY_AD["ad05-v37"];
V22_INFOGRAPHICS_BY_AD["ad05-v38"]=V22_INFOGRAPHICS_BY_AD["ad05-v37"];
V22_ICON_CALLOUTS_BY_AD["ad05-v38"]=V22_ICON_CALLOUTS_BY_AD["ad05-v37"];
const V38_VIDEO5_AD:AdSpec={...V37_VIDEO5_AD,id:"ad05-v38",speechAudio:"staging/brisky-v38-audio/ad05-dialogue.wav",segments:V37_VIDEO5_AD.segments.map((segment,index)=>index===6?{...segment,sourcePieces:[[187.50,188.80],[189.08,189.68],[190.66,193.56],[195.92,196.69]]}:segment)};
export const BRISKY_SHORT_V38_VIDEO5_DURATION=getTimedSegments(V38_VIDEO5_AD,V30_SPEED).reduce((s,x)=>s+x.durationInFrames,0)+secToFrames((V16_CTA_END-V16_CTA_START)/V30_SPEED)+secToFrames(END_CARD_SECONDS);
export const BriskyShortV38Video5=()=> <BriskyShortV4 index={4} tdcCaptionMode clearCtaMode visualV10Mode v17Ad={V38_VIDEO5_AD} tdcReferenceMode semanticAlignedMode enhancedVisualMode v22Mode intentMotionMode playbackSpeedOverride={V30_SPEED} musicSrc={V27_VIDEO5_MUSIC} musicBaseVolume={0.06} musicCtaVolume={0.15} musicEndVolume={0.34} captionTop={1120} clearCtaStart={V16_CTA_START} clearCtaEnd={V16_CTA_END}/>;
