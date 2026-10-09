import {getTextEffect,selectedTextEffect,type TextEffectId} from '../../../../server/src/customer/text-effects';
import {captionStyles, styleCaptionDocument, selectedCaptionStyle, type CaptionStyleId} from '../../../../server/src/customer/caption-styles';
import {frameFilter, fullHdSize, splitAtSources, validFraming, type Framing, type SourceClip} from "../../../../server/src/customer/edit-quality";
export type Edit = { textEffect?:TextEffectId; captionStyle?: CaptionStyleId; title: string; ratio: "16:9" | "9:16" | "1:1"; subtitles: boolean; story?:string; segments: ({ start: number; end: number } & Framing)[] };
export function validateEdit(value: unknown, duration: number): Edit {
  const plan = value as Edit;
  if (!plan || typeof plan.title !== "string" || plan.title.length > 100 || !["16:9", "9:16", "1:1"].includes(plan.ratio) || typeof plan.subtitles !== "boolean" || !Array.isArray(plan.segments) || !plan.segments.length || plan.segments.length > 50) throw new Error("AI chưa tạo được kế hoạch dựng video hợp lệ");
  if(plan.captionStyle !== undefined && !captionStyles.some(s=>s.id===plan.captionStyle))throw new Error("Kiểu phụ đề không hợp lệ");
  if(plan.textEffect!==undefined&&!getTextEffect(plan.textEffect))throw new Error('Hiệu ứng chữ không hợp lệ');
  let total = 0;
  for (const segment of plan.segments) {
    if (!validFraming(segment) || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0 || segment.end > duration + 0.05 || segment.end - segment.start < 0.3) throw new Error("AI chọn đoạn video ngoài thời lượng nguồn");
    total += segment.end - segment.start;
  }
  if (total > duration + 0.1) throw new Error("Kế hoạch dựng vượt giới hạn chi phí đã báo");
  return plan;
}
export type Word = { word: string; start: number; end: number };
export function* speechChunks(duration: number) {
  for (let start = 0; start < duration; start += 600) yield { start, seconds: Math.min(600, duration - start) };
}
function assText(text: string) { return text.replace(/[\\{}\r\n]/g, " ").replace(/[\x00-\x1f]/g, "").slice(0, 250); }
function assTime(seconds: number) {
  const cs = Math.max(0, Math.round(seconds * 100));
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}
export function subtitleDocument(plan: Edit, words: Word[], width: number, height: number) {
  const size = Math.round((plan.ratio === "9:16" ? 52 : 44) * width / (plan.ratio === "16:9" ? 1920 : 1080));
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Arial,${size},&H00FFFFFF,&H00FFFFFF,&H00111111,&H70000000,-1,0,0,0,100,100,0,0,1,3,1,2,60,60,${Math.round(height * 0.1)},1\nStyle: Title,Arial,${size + 8},&H00FFFFFF,&H00FFFFFF,&H00111111,&H70000000,-1,0,0,0,100,100,0,0,1,3,1,8,70,70,90,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const rows: string[] = []; let offset = 0;
  if (plan.title.trim()) rows.push(`Dialogue: 0,0:00:00.00,${assTime(Math.min(4, plan.segments.reduce((sum, x) => sum + x.end - x.start, 0)))},Title,,0,0,0,,${assText(plan.title)}`);
  for (const segment of plan.segments) {
    if (plan.subtitles) {
      const selected = words.filter(word => word.end > segment.start && word.start < segment.end);
      for (let i = 0; i < selected.length; i += 6) {
        const chunk = selected.slice(i, i + 6);
        const start = offset + Math.max(0, chunk[0].start - segment.start);
        const end = offset + Math.min(segment.end - segment.start, chunk[chunk.length - 1].end - segment.start);
        if (end > start) rows.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Caption,,0,0,0,,${assText(chunk.map(x => x.word).join(" "))}`);
      }
    }
    offset += segment.end - segment.start;
  }
  return styleCaptionDocument(header + rows.join("\n") + "\n",plan.captionStyle);
}

export function renderArguments(plan:Edit, hasAudio:boolean, sources:SourceClip[]=[], preview=false) {
 const [width,height]=fullHdSize(plan.ratio),w=preview?width*2/3:width,h=preview?height*2/3:height;
 const filters:string[]=[], inputs:string[]=[];
 const segments=splitAtSources(plan.segments,sources);
 segments.forEach((s,i)=>{filters.push(`[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS,${frameFilter(s,w,h,s.content)}[v${i}]`);if(hasAudio)filters.push(`[0:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.012,afade=t=out:st=${Math.max(0,s.end-s.start-0.012)}:d=0.012[a${i}]`);inputs.push(`[v${i}]`+(hasAudio?`[a${i}]`: ''));});
 filters.push(inputs.join('')+`concat=n=${segments.length}:v=1:a=${hasAudio?1:0}[joined]${hasAudio?'[rawaudio]':''}`);
 if(hasAudio)filters.push(`[rawaudio]loudnorm=I=-16:TP=-1.5:LRA=11,atrim=duration=${plan.segments.reduce((n,s)=>n+s.end-s.start,0)},asetpts=PTS-STARTPTS[audio]`);
 filters.push('[joined]subtitles=filename=captions.ass:fontsdir=fonts[video]');
 return {width:w,height:h,args:['-y','-i','source.mp4','-filter_complex',filters.join(';'),'-map','[video]',...(hasAudio?['-map','[audio]','-c:a','aac','-b:a','192k']:[]),'-c:v','libx264','-preset',preview?'ultrafast':'veryfast','-crf',preview?'27':'18','-pix_fmt','yuv420p','-t',String(plan.segments.reduce((n,s)=>n+s.end-s.start,0)),'-movflags','+faststart',preview?'preview.mp4':'final.mp4']};
}
