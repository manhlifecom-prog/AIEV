export type Edit = { title: string; ratio: "16:9" | "9:16" | "1:1"; subtitles: boolean; segments: { start: number; end: number }[] };
export function validateEdit(value: unknown, duration: number): Edit {
  const plan = value as Edit;
  if (!plan || typeof plan.title !== "string" || plan.title.length > 100 || !["16:9", "9:16", "1:1"].includes(plan.ratio) || typeof plan.subtitles !== "boolean" || !Array.isArray(plan.segments) || !plan.segments.length || plan.segments.length > 50) throw new Error("AI chưa tạo được kế hoạch dựng video hợp lệ");
  let total = 0;
  for (const segment of plan.segments) {
    if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0 || segment.end > duration + 0.05 || segment.end - segment.start < 0.3) throw new Error("AI chọn đoạn video ngoài thời lượng nguồn");
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
  const size = plan.ratio === "9:16" ? 48 : 42;
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
  return header + rows.join("\n") + "\n";
}

export function renderArguments(plan:Edit, hasAudio:boolean) {
 const [w,h]=plan.ratio==='9:16'?[720,1280]:plan.ratio==='1:1'?[720,720]:[1280,720];
 const filters:string[]=[], inputs:string[]=[];
 plan.segments.forEach((s,i)=>{filters.push(`[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS,scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`);if(hasAudio)filters.push(`[0:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[a${i}]`);inputs.push(`[v${i}]`+(hasAudio?`[a${i}]`: ''));});
 filters.push(inputs.join('')+`concat=n=${plan.segments.length}:v=1:a=${hasAudio?1:0}[joined]${hasAudio?'[audio]':''}`); filters.push('[joined]subtitles=filename=captions.ass:fontsdir=fonts[video]');
 return {width:w,height:h,args:['-y','-i','source.mp4','-filter_complex',filters.join(';'),'-map','[video]',...(hasAudio?['-map','[audio]','-c:a','aac','-b:a','128k']:[]),'-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','final.mp4']};
}
