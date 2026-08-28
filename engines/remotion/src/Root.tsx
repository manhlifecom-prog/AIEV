import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { Assemble } from "./Assemble";
import {
  manifestSchema,
  totalDurationInFrames,
  type Manifest,
} from "./manifest";
import { Poster } from "./Poster";
import {
  POSTER_DIMENSIONS,
  posterSchema,
  type PosterProps,
} from "./posterManifest";
import { Thumbnail } from "./Thumbnail";
import {
  THUMBNAIL_DIMENSIONS,
  thumbnailSchema,
  type ThumbnailProps,
} from "./thumbnailManifest";
import { ClaudeTestimonial } from "./ClaudeTestimonial";
import { AdsNovemberOptimized, AdsShortOptimized } from "./OptimizedAds";
import { AdsVinhOptimized } from "./AdsVinhOptimized";
import { BriskyFullVideo, type BriskyFullVideoProps } from "./BriskyFullVideo";
import { BriskyAds02Premium } from "./BriskyAds02Premium";
import { BriskyAds02Fast, BRISKY_ADS_02_FAST_DURATION } from "./BriskyAds02Fast";
import { BriskyRawAd01, BriskyRawAd02, BriskyRawAd03, BriskyRawAd04, BriskyRawAd05, BRISKY_RAW_AD_DURATIONS } from "./BriskyRawAds";
import {BriskyShortV201,BriskyShortV202,BriskyShortV203,BriskyShortV204,BriskyShortV205,BRISKY_SHORT_V2_DURATIONS} from "./BriskyShortAdsV2";
import {BriskyShortV301,BriskyShortV302,BriskyShortV303,BriskyShortV304,BriskyShortV305,BRISKY_SHORT_V3_DURATIONS} from "./BriskyShortAdsV3";
import {BriskyShortV401,BriskyShortV402,BriskyShortV403,BriskyShortV404,BriskyShortV405,BRISKY_SHORT_V4_DURATIONS,BRISKY_V4_FPS,BriskyShortV501,BriskyShortV502,BriskyShortV503,BriskyShortV504,BriskyShortV505,BRISKY_SHORT_V5_DURATIONS,BRISKY_V5_FPS,BriskyShortV601,BriskyShortV602,BriskyShortV603,BriskyShortV604,BriskyShortV605,BRISKY_SHORT_V6_DURATIONS,BriskyShortV7Video1,BRISKY_SHORT_V7_VIDEO1_DURATION,BriskyShortV8Video1,BRISKY_SHORT_V8_VIDEO1_DURATION,BriskyShortV9Video1,BRISKY_SHORT_V9_VIDEO1_DURATION,BriskyShortV10Video1,BriskyShortV10Video2,BriskyShortV10Video3,BriskyShortV10Video4,BriskyShortV10Video5,BRISKY_SHORT_V10_VIDEO1_DURATION,BRISKY_SHORT_V10_DURATIONS,BriskyShortV12Video2,BriskyShortV12Video3,BriskyShortV12Video4,BriskyShortV12Video5,BRISKY_SHORT_V12_DURATIONS,BriskyShortV13Video2,BriskyShortV13Video3,BriskyShortV13Video4,BriskyShortV13Video5,BriskyShortV13Video6,BRISKY_SHORT_V13_DURATIONS,BriskyShortV14Video2,BriskyShortV14Video3,BriskyShortV14Video4,BriskyShortV14Video5,BriskyShortV14Video6,BRISKY_SHORT_V14_DURATIONS,BriskyShortV15Video2,BriskyShortV15Video3,BriskyShortV15Video4,BriskyShortV15Video5,BriskyShortV15Video6,BRISKY_SHORT_V15_DURATIONS,BriskyShortV16Video2,BriskyShortV16Video3,BriskyShortV16Video4,BriskyShortV16Video5,BRISKY_SHORT_V16_DURATIONS,BriskyShortV17Video2,BriskyShortV17Video3,BriskyShortV17Video4,BriskyShortV17Video5,BRISKY_SHORT_V17_DURATIONS,BriskyShortV18Video2,BriskyShortV18Video3,BriskyShortV18Video4,BriskyShortV18Video5,BRISKY_SHORT_V18_DURATIONS,BriskyShortV19Video2,BriskyShortV19Video3,BriskyShortV19Video4,BriskyShortV19Video5,BRISKY_SHORT_V19_DURATIONS,BriskyShortV20Video2,BriskyShortV20Video3,BriskyShortV20Video4,BriskyShortV20Video5,BRISKY_SHORT_V20_DURATIONS} from "./BriskyShortAdsV4";
import {BriskyShortV11Video6,BriskyShortV12Video6,BRISKY_STANDING_V11_DURATION,BRISKY_STANDING_V12_DURATION,BRISKY_STANDING_V11_FPS} from "./BriskyStandingV11";
import {BriskyShortV21Video2,BriskyShortV21Video3,BriskyShortV21Video4,BriskyShortV21Video5,BRISKY_SHORT_V21_DURATIONS} from "./BriskyShortAdsV4";
import {BriskyShortV22Video2,BriskyShortV22Video3,BriskyShortV22Video4,BriskyShortV22Video5,BRISKY_SHORT_V22_DURATIONS} from "./BriskyShortAdsV4";
import {BriskyShortV23Video2,BRISKY_SHORT_V23_VIDEO2_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV24Video2,BRISKY_SHORT_V24_VIDEO2_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV25Video3,BRISKY_SHORT_V25_VIDEO3_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV26Video4,BRISKY_SHORT_V26_VIDEO4_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV27Video5,BRISKY_SHORT_V27_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV28Video4,BriskyShortV28Video5,BRISKY_SHORT_V28_VIDEO4_DURATION,BRISKY_SHORT_V28_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV29Video4,BriskyShortV29Video5,BRISKY_SHORT_V29_VIDEO4_DURATION,BRISKY_SHORT_V29_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV30Video4,BRISKY_SHORT_V30_VIDEO4_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV31Video4,BRISKY_SHORT_V31_VIDEO4_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV32Video4,BRISKY_SHORT_V32_VIDEO4_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV33Video4,BRISKY_SHORT_V33_VIDEO4_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV34Video5,BRISKY_SHORT_V34_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV35Video5,BRISKY_SHORT_V35_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV36Video5,BRISKY_SHORT_V36_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV37Video5,BRISKY_SHORT_V37_VIDEO5_DURATION} from "./BriskyShortAdsV4";
import {BriskyShortV38Video5,BRISKY_SHORT_V38_VIDEO5_DURATION} from "./BriskyShortAdsV4";

const demoBriskyFullVideo: BriskyFullVideoProps = {
  source: "staging/brisky-full/01-bi-mat-lay-goc.mp4",
  logo: "staging/brisky-full/brisky-logo.png",
  title: "Brisky Academy",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 300,
  captions: [],
  chapters: [],
};

const calculateBriskyMetadata: CalculateMetadataFunction<BriskyFullVideoProps> = ({ props }) => ({
  props,
  width: props.width,
  height: props.height,
  fps: props.fps,
  durationInFrames: props.durationInFrames,
});

/**
 * Manifest demo tối thiểu — chỉ để mở `remotion studio` mà không cần props.
 * Không có `render`/`srcVideo` nên SceneClip hiện placeholder, không đòi file
 * trong public/staging. Render thật luôn truyền --props=<props.resolved.json>.
 */
const demoManifest: Manifest = {
  id: "demo-gioi-thieu",
  name: "Demo giới thiệu hệ thống",
  width: 1080,
  height: 1920,
  fps: 30,
  status: "draft",
  scenes: [
    { id: "s01-logo", src: "compositions/s01-logo.html", durationInFrames: 90, srcImage: null },
    { id: "s02-tagline", src: "compositions/s02-tagline.html", durationInFrames: 120, srcImage: null },
  ],
  audio: { sfx: [], music: null },
  captions: [],
  overlays: [],
  // Demo không có phụ đề dịch - `subtitles` có default [] khi parse, nhưng
  // literal này khai theo KIỂU ĐÃ PARSE nên phải ghi đủ trường.
  subtitles: [],
  // Studio demo không có file logo trong public/ - để null, còn render thật thì
  // server tự chèn từ Style Design (xem jobs/assemble.ts)
  watermark: null,
  output: null,
};

/**
 * width/height/fps/durationInFrames lấy từ manifest (không hardcode).
 * Parse qua zod: fail sớm với message rõ ràng nếu props sai schema,
 * đồng thời áp default (audio.sfx = []).
 */
const calculateAssembleMetadata: CalculateMetadataFunction<Manifest> = ({
  props,
}) => {
  const manifest = manifestSchema.parse(props);
  return {
    props: manifest,
    width: manifest.width,
    height: manifest.height,
    fps: manifest.fps,
    durationInFrames: totalDurationInFrames(manifest),
  };
};

/**
 * Poster demo — chỉ để mở studio không cần props. background/logoFile null
 * nên không đòi file trong public/staging. Render thật luôn --props=<file>.
 */
const demoPoster: PosterProps = posterSchema.parse({
  aspect: "9:16",
  background: null,
  overlay: {
    title: "Tự Động Hóa Marketing Bằng AI",
    subtitle: "Tiết kiệm 80% thời gian edit video",
    stats: [
      { label: "Video/tháng", value: "120+" },
      { label: "Chi phí giảm", value: "65%" },
    ],
    cta: "Dùng thử miễn phí",
    showLogo: true,
  },
  design: { brandName: "Noti.vn" },
});

/**
 * Still 1 frame — width/height suy từ props.aspect (docs/API.md):
 * 9:16=1080×1920, 16:9=1920×1080, 1:1=1080×1080, 4:5=1080×1350.
 */
const calculatePosterMetadata: CalculateMetadataFunction<PosterProps> = ({
  props,
}) => {
  const poster = posterSchema.parse(props);
  const { width, height } = POSTER_DIMENSIONS[poster.aspect];
  return {
    props: poster,
    width,
    height,
    fps: 30,
    durationInFrames: 1,
  };
};

/**
 * Thumbnail demo — background/frame null nên mở studio được mà không cần
 * file trong public/staging. Render thật luôn --props=<file>.
 */
const demoThumbnail: ThumbnailProps = thumbnailSchema.parse({
  aspect: "9:16",
  background: null,
  frame: null,
  title: "Video này Edit bằng AI",
  design: { brandName: "Noti.vn" },
});

/** Still 1 frame — width/height suy từ props.aspect (giống Poster). */
const calculateThumbnailMetadata: CalculateMetadataFunction<ThumbnailProps> = ({
  props,
}) => {
  const thumb = thumbnailSchema.parse(props);
  const { width, height } = THUMBNAIL_DIMENSIONS[thumb.aspect];
  return { props: thumb, width, height, fps: 30, durationInFrames: 1 };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="BriskyShortV18Video2" component={BriskyShortV18Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V18_DURATIONS[0]} />
      <Composition id="BriskyShortV18Video3" component={BriskyShortV18Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V18_DURATIONS[1]} />
      <Composition id="BriskyShortV18Video4" component={BriskyShortV18Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V18_DURATIONS[2]} />
      <Composition id="BriskyShortV18Video5" component={BriskyShortV18Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V18_DURATIONS[3]} />
      <Composition id="BriskyShortV19Video2" component={BriskyShortV19Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V19_DURATIONS[0]} />
      <Composition id="BriskyShortV19Video3" component={BriskyShortV19Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V19_DURATIONS[1]} />
      <Composition id="BriskyShortV19Video4" component={BriskyShortV19Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V19_DURATIONS[2]} />
      <Composition id="BriskyShortV19Video5" component={BriskyShortV19Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V19_DURATIONS[3]} />
      <Composition id="BriskyShortV20Video2" component={BriskyShortV20Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V20_DURATIONS[0]} />
      <Composition id="BriskyShortV20Video3" component={BriskyShortV20Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V20_DURATIONS[1]} />
      <Composition id="BriskyShortV20Video4" component={BriskyShortV20Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V20_DURATIONS[2]} />
      <Composition id="BriskyShortV20Video5" component={BriskyShortV20Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V20_DURATIONS[3]} />
      <Composition id="BriskyShortV21Video2" component={BriskyShortV21Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V21_DURATIONS[0]} />
      <Composition id="BriskyShortV21Video3" component={BriskyShortV21Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V21_DURATIONS[1]} />
      <Composition id="BriskyShortV21Video4" component={BriskyShortV21Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V21_DURATIONS[2]} />
      <Composition id="BriskyShortV21Video5" component={BriskyShortV21Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V21_DURATIONS[3]} />
      <Composition id="BriskyShortV22Video2" component={BriskyShortV22Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V22_DURATIONS[0]} />
      <Composition id="BriskyShortV22Video3" component={BriskyShortV22Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V22_DURATIONS[1]} />
      <Composition id="BriskyShortV22Video4" component={BriskyShortV22Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V22_DURATIONS[2]} />
      <Composition id="BriskyShortV22Video5" component={BriskyShortV22Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V22_DURATIONS[3]} />
      <Composition id="BriskyShortV23Video2" component={BriskyShortV23Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V23_VIDEO2_DURATION} />
      <Composition id="BriskyShortV24Video2" component={BriskyShortV24Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V24_VIDEO2_DURATION} />
      <Composition id="BriskyShortV25Video3" component={BriskyShortV25Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V25_VIDEO3_DURATION} />
      <Composition id="BriskyShortV26Video4" component={BriskyShortV26Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V26_VIDEO4_DURATION} />
      <Composition id="BriskyShortV27Video5" component={BriskyShortV27Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V27_VIDEO5_DURATION} />
      <Composition id="BriskyShortV28Video4" component={BriskyShortV28Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V28_VIDEO4_DURATION} />
      <Composition id="BriskyShortV28Video5" component={BriskyShortV28Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V28_VIDEO5_DURATION} />
      <Composition id="BriskyShortV29Video4" component={BriskyShortV29Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V29_VIDEO4_DURATION} />
      <Composition id="BriskyShortV29Video5" component={BriskyShortV29Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V29_VIDEO5_DURATION} />
      <Composition id="BriskyShortV30Video4" component={BriskyShortV30Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V30_VIDEO4_DURATION} />
      <Composition id="BriskyShortV31Video4" component={BriskyShortV31Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V31_VIDEO4_DURATION} />
      <Composition id="BriskyShortV32Video4" component={BriskyShortV32Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V32_VIDEO4_DURATION} />
      <Composition id="BriskyShortV33Video4" component={BriskyShortV33Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V33_VIDEO4_DURATION} />
      <Composition id="BriskyShortV34Video5" component={BriskyShortV34Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V34_VIDEO5_DURATION} />
      <Composition id="BriskyShortV35Video5" component={BriskyShortV35Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V35_VIDEO5_DURATION} />
      <Composition id="BriskyShortV36Video5" component={BriskyShortV36Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V36_VIDEO5_DURATION} />
      <Composition id="BriskyShortV37Video5" component={BriskyShortV37Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V37_VIDEO5_DURATION} />
      <Composition id="BriskyShortV38Video5" component={BriskyShortV38Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V38_VIDEO5_DURATION} />
      <Composition id="BriskyShortV17Video2" component={BriskyShortV17Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V17_DURATIONS[0]} />
      <Composition id="BriskyShortV17Video3" component={BriskyShortV17Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V17_DURATIONS[1]} />
      <Composition id="BriskyShortV17Video4" component={BriskyShortV17Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V17_DURATIONS[2]} />
      <Composition id="BriskyShortV17Video5" component={BriskyShortV17Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V17_DURATIONS[3]} />
      <Composition id="BriskyShortV16Video2" component={BriskyShortV16Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V16_DURATIONS[0]} />
      <Composition id="BriskyShortV16Video3" component={BriskyShortV16Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V16_DURATIONS[1]} />
      <Composition id="BriskyShortV16Video4" component={BriskyShortV16Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V16_DURATIONS[2]} />
      <Composition id="BriskyShortV16Video5" component={BriskyShortV16Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V16_DURATIONS[3]} />
      <Composition id="BriskyShortV15Video2" component={BriskyShortV15Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V15_DURATIONS[0]} />
      <Composition id="BriskyShortV15Video3" component={BriskyShortV15Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V15_DURATIONS[1]} />
      <Composition id="BriskyShortV15Video4" component={BriskyShortV15Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V15_DURATIONS[2]} />
      <Composition id="BriskyShortV15Video5" component={BriskyShortV15Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V15_DURATIONS[3]} />
      <Composition id="BriskyShortV15Video6" component={BriskyShortV15Video6} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V15_DURATIONS[4]} />
      <Composition id="BriskyShortV14Video2" component={BriskyShortV14Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V14_DURATIONS[0]} />
      <Composition id="BriskyShortV14Video3" component={BriskyShortV14Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V14_DURATIONS[1]} />
      <Composition id="BriskyShortV14Video4" component={BriskyShortV14Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V14_DURATIONS[2]} />
      <Composition id="BriskyShortV14Video5" component={BriskyShortV14Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V14_DURATIONS[3]} />
      <Composition id="BriskyShortV14Video6" component={BriskyShortV14Video6} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V14_DURATIONS[4]} />
      <Composition id="BriskyShortV13Video2" component={BriskyShortV13Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V13_DURATIONS[0]} />
      <Composition id="BriskyShortV13Video3" component={BriskyShortV13Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V13_DURATIONS[1]} />
      <Composition id="BriskyShortV13Video4" component={BriskyShortV13Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V13_DURATIONS[2]} />
      <Composition id="BriskyShortV13Video5" component={BriskyShortV13Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V13_DURATIONS[3]} />
      <Composition id="BriskyShortV13Video6" component={BriskyShortV13Video6} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V13_DURATIONS[4]} />
      <Composition id="BriskyShortV12Video2" component={BriskyShortV12Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V12_DURATIONS[1]} />
      <Composition id="BriskyShortV12Video3" component={BriskyShortV12Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V12_DURATIONS[2]} />
      <Composition id="BriskyShortV12Video4" component={BriskyShortV12Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V12_DURATIONS[3]} />
      <Composition id="BriskyShortV12Video5" component={BriskyShortV12Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V12_DURATIONS[4]} />
      <Composition id="BriskyShortV12Video6" component={BriskyShortV12Video6} width={1080} height={1920} fps={BRISKY_STANDING_V11_FPS} durationInFrames={BRISKY_STANDING_V12_DURATION} />
      <Composition id="BriskyShortV11Video6" component={BriskyShortV11Video6} width={1080} height={1920} fps={BRISKY_STANDING_V11_FPS} durationInFrames={BRISKY_STANDING_V11_DURATION} />
      <Composition id="BriskyShortV10Video1" component={BriskyShortV10Video1} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V10_VIDEO1_DURATION} />
      <Composition id="BriskyShortV10Video2" component={BriskyShortV10Video2} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V10_DURATIONS[1]} />
      <Composition id="BriskyShortV10Video3" component={BriskyShortV10Video3} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V10_DURATIONS[2]} />
      <Composition id="BriskyShortV10Video4" component={BriskyShortV10Video4} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V10_DURATIONS[3]} />
      <Composition id="BriskyShortV10Video5" component={BriskyShortV10Video5} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V10_DURATIONS[4]} />
      <Composition id="BriskyShortV9Video1" component={BriskyShortV9Video1} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V9_VIDEO1_DURATION} />
      <Composition id="BriskyShortV8Video1" component={BriskyShortV8Video1} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V8_VIDEO1_DURATION} />
      <Composition id="BriskyShortV7Video1" component={BriskyShortV7Video1} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V7_VIDEO1_DURATION} />
      <Composition id="BriskyShortV601" component={BriskyShortV601} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V6_DURATIONS[0]} />
      <Composition id="BriskyShortV602" component={BriskyShortV602} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V6_DURATIONS[1]} />
      <Composition id="BriskyShortV603" component={BriskyShortV603} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V6_DURATIONS[2]} />
      <Composition id="BriskyShortV604" component={BriskyShortV604} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V6_DURATIONS[3]} />
      <Composition id="BriskyShortV605" component={BriskyShortV605} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V6_DURATIONS[4]} />
      <Composition id="BriskyShortV501" component={BriskyShortV501} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V5_DURATIONS[0]} />
      <Composition id="BriskyShortV502" component={BriskyShortV502} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V5_DURATIONS[1]} />
      <Composition id="BriskyShortV503" component={BriskyShortV503} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V5_DURATIONS[2]} />
      <Composition id="BriskyShortV504" component={BriskyShortV504} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V5_DURATIONS[3]} />
      <Composition id="BriskyShortV505" component={BriskyShortV505} width={1080} height={1920} fps={BRISKY_V5_FPS} durationInFrames={BRISKY_SHORT_V5_DURATIONS[4]} />
      <Composition id="BriskyShortV401" component={BriskyShortV401} width={1080} height={1920} fps={BRISKY_V4_FPS} durationInFrames={BRISKY_SHORT_V4_DURATIONS[0]} />
      <Composition id="BriskyShortV402" component={BriskyShortV402} width={1080} height={1920} fps={BRISKY_V4_FPS} durationInFrames={BRISKY_SHORT_V4_DURATIONS[1]} />
      <Composition id="BriskyShortV403" component={BriskyShortV403} width={1080} height={1920} fps={BRISKY_V4_FPS} durationInFrames={BRISKY_SHORT_V4_DURATIONS[2]} />
      <Composition id="BriskyShortV404" component={BriskyShortV404} width={1080} height={1920} fps={BRISKY_V4_FPS} durationInFrames={BRISKY_SHORT_V4_DURATIONS[3]} />
      <Composition id="BriskyShortV405" component={BriskyShortV405} width={1080} height={1920} fps={BRISKY_V4_FPS} durationInFrames={BRISKY_SHORT_V4_DURATIONS[4]} />
      <Composition id="BriskyShortV301" component={BriskyShortV301} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V3_DURATIONS[0]} />
      <Composition id="BriskyShortV302" component={BriskyShortV302} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V3_DURATIONS[1]} />
      <Composition id="BriskyShortV303" component={BriskyShortV303} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V3_DURATIONS[2]} />
      <Composition id="BriskyShortV304" component={BriskyShortV304} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V3_DURATIONS[3]} />
      <Composition id="BriskyShortV305" component={BriskyShortV305} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V3_DURATIONS[4]} />
      <Composition id="BriskyShortV201" component={BriskyShortV201} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V2_DURATIONS[0]} />
      <Composition id="BriskyShortV202" component={BriskyShortV202} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V2_DURATIONS[1]} />
      <Composition id="BriskyShortV203" component={BriskyShortV203} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V2_DURATIONS[2]} />
      <Composition id="BriskyShortV204" component={BriskyShortV204} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V2_DURATIONS[3]} />
      <Composition id="BriskyShortV205" component={BriskyShortV205} width={1080} height={1920} fps={30} durationInFrames={BRISKY_SHORT_V2_DURATIONS[4]} />
      <Composition id="BriskyRawAd01" component={BriskyRawAd01} width={1080} height={1920} fps={30} durationInFrames={BRISKY_RAW_AD_DURATIONS[0]} />
      <Composition id="BriskyRawAd02" component={BriskyRawAd02} width={1080} height={1920} fps={30} durationInFrames={BRISKY_RAW_AD_DURATIONS[1]} />
      <Composition id="BriskyRawAd03" component={BriskyRawAd03} width={1080} height={1920} fps={30} durationInFrames={BRISKY_RAW_AD_DURATIONS[2]} />
      <Composition id="BriskyRawAd04" component={BriskyRawAd04} width={1080} height={1920} fps={30} durationInFrames={BRISKY_RAW_AD_DURATIONS[3]} />
      <Composition id="BriskyRawAd05" component={BriskyRawAd05} width={1080} height={1920} fps={30} durationInFrames={BRISKY_RAW_AD_DURATIONS[4]} />
      <Composition
        id="BriskyFullVideo"
        component={BriskyFullVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={300}
        defaultProps={demoBriskyFullVideo}
        calculateMetadata={calculateBriskyMetadata}
      />
      <Composition
        id="BriskyAds02Premium"
        component={BriskyAds02Premium}
        width={720}
        height={720}
        fps={30}
        durationInFrames={3764}
        defaultProps={demoBriskyFullVideo}
        calculateMetadata={calculateBriskyMetadata}
      />
      <Composition
        id="BriskyAds02Fast"
        component={BriskyAds02Fast}
        width={720}
        height={720}
        fps={30}
        durationInFrames={BRISKY_ADS_02_FAST_DURATION}
        defaultProps={demoBriskyFullVideo}
      />
      <Composition
        id="AdsVinhOptimized"
        component={AdsVinhOptimized}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={2466}
      />
      <Composition
        id="AdsShortOptimized"
        component={AdsShortOptimized}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={1915}
      />
      <Composition
        id="AdsNovemberOptimized"
        component={AdsNovemberOptimized}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={2132}
      />
      <Composition
        id="ClaudeTestimonial"
        component={ClaudeTestimonial}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1787}
      />
      <Composition
        id="Assemble"
        component={Assemble}
        // Giá trị fallback — calculateMetadata ghi đè từ manifest thật.
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={210}
        defaultProps={demoManifest}
        calculateMetadata={calculateAssembleMetadata}
      />
      <Composition
        id="Poster"
        component={Poster}
        // Fallback — calculateMetadata ghi đè theo props.aspect.
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
        defaultProps={demoPoster}
        calculateMetadata={calculatePosterMetadata}
      />
      <Composition
        id="Thumbnail"
        component={Thumbnail}
        // Fallback — calculateMetadata ghi đè theo props.aspect.
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
        defaultProps={demoThumbnail}
        calculateMetadata={calculateThumbnailMetadata}
      />
    </>
  );
};
