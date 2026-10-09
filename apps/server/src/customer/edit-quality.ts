export type SourceClip = { start: number; duration: number; content?: { x: number; y: number; width: number; height: number } };
export type VisualFrame = { time: number; image: string };
export type Framing = { framing?: 'fill' | 'fit'; focusX?: number; focusY?: number };

// Sample each clip before adding more observations; cap payloads and AI image cost.
export function visualSampleTimes(duration: number, clips: SourceClip[] = [], limit = 24) {
  if(!clips.length || clips.length===1)return Array.from({length:Math.min(limit,Math.max(3,Math.ceil(duration/6)))},(_,i)=>Math.round(duration*(i+0.5)/Math.min(limit,Math.max(3,Math.ceil(duration/6)))*100)/100).map(t=>Math.max(0,Math.min(duration-0.04,t)));
  const sources = clips.length ? clips : [{ start: 0, duration }];
  const selected = sources.length > limit ? Array.from({ length: limit }, (_, i) => sources[Math.floor(i * sources.length / limit)]) : sources;
  const times: number[] = [];
  for (const fraction of [0.5, 0.15, 0.85, 0.3, 0.7, 0.05, 0.95, 0.4]) {
    for (const clip of selected) {
      const time = Math.round(Math.max(0, Math.min(duration - 0.04, clip.start + clip.duration * fraction)) * 100) / 100;
      if (!times.includes(time)) times.push(time);
      if (times.length === Math.min(limit, Math.max(3, Math.ceil(duration / 6), sources.length * 3))) return times.sort((a, b) => a - b);
    }
  }
  return times.sort((a, b) => a - b);
}

export function validFraming(segment: Framing) {
  return (segment.framing === undefined || ['fill', 'fit'].includes(segment.framing)) &&
    [segment.focusX, segment.focusY].every(n => n === undefined || (Number.isFinite(n) && n >= 0 && n <= 1));
}

export function contentRect(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const w = Math.max(2, Math.floor(sourceWidth * scale / 2) * 2), h = Math.max(2, Math.floor(sourceHeight * scale / 2) * 2);
  return { x: Math.floor((width - w) / 4) * 2, y: Math.floor((height - h) / 4) * 2, width: w, height: h };
}

export function frameFilter(segment: Framing, width: number, height: number, content?: SourceClip['content']) {
  const crop = content ? `crop=${content.width}:${content.height}:${content.x}:${content.y},` : '';
  if (segment.framing === 'fill') return crop + `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-ow)*${segment.focusX ?? 0.5}:(ih-oh)*${segment.focusY ?? 0.5},setsar=1,fps=30`;
  return crop + `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`;
}

// A cut spanning clips must remove each clip's own normalization padding.
export function splitAtSources<T extends {start:number;end:number}>(segments: T[], sources: SourceClip[] = []): (T & {content?: SourceClip['content']})[] {
  if (!sources.length) return segments;
  return segments.flatMap(segment => sources.filter(s => s.start < segment.end && s.start + s.duration > segment.start).map(source => ({...segment, start:Math.max(segment.start,source.start),end:Math.min(segment.end,source.start+source.duration),content:source.content})).filter(s=>s.end-s.start>0.005));
}

export function fullHdSize(ratio: string): [number, number] {
  return ratio === '9:16' ? [1080, 1920] : ratio === '1:1' ? [1080, 1080] : [1920, 1080];
}
