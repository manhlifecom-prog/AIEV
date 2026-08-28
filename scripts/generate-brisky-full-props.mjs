import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const fps = 30;
const ids = [
  "01-bi-mat-lay-goc",
  "02-ads-ban-1",
  "03-video-ads-2-meta",
  "04-fb-2-cam-nhan",
  "05-video-cam-nhan",
  "06-video-tai-lieu-1",
];

const outDir = path.join(root, "projects", "brisky-2026-08-24", "full-video-props");
fs.mkdirSync(outDir, { recursive: true });
const stagingDir = path.join(root, "engines", "remotion", "public", "staging", "brisky-full");
fs.mkdirSync(stagingDir, { recursive: true });
const ffprobe = path.join(root, ".runtime", "bin", "ffprobe.exe");

const probeVideo = (file) => JSON.parse(execFileSync(ffprobe, [
  "-v", "error",
  "-select_streams", "v:0",
  "-show_entries", "stream=width,height:format=duration",
  "-of", "json",
  file,
], { encoding: "utf8" }));

const ensureHardLink = (source, target) => {
  if (fs.existsSync(target)) return;
  fs.linkSync(source, target);
};

ensureHardLink(path.join(root, ".tmp", "brisky-logo.png"), path.join(stagingDir, "brisky-logo.png"));

const clean = (value) => value
  .replace(/\s+/g, " ")
  .replace(/\s+([,.;:!?])/g, "$1")
  .trim();

const normalizeTranscriptWords = (rawWords) => rawWords.map((word, index, all) => {
  const previous = clean(all[index - 1]?.word ?? "").toLowerCase();
  const next = clean(all[index + 1]?.word ?? "").toLowerCase();
  let text = clean(word.word ?? "");
  const lower = text.toLowerCase().replace(/[.,!?;:]$/g, "");
  const punctuation = text.slice(lower.length);
  if (["britski", "brisky", "brisky.", "britsky"].includes(lower)) text = `Brisky${punctuation}`;
  if (lower === "idaibis") text = `Ít ai biết${punctuation}`;
  if (lower === "đội" && next === "tuổi") text = `độ${punctuation}`;
  if (lower === "điển") text = `điểm${punctuation}`;
  if (lower === "kèm") text = `kém${punctuation}`;
  if (lower === "yêu" && ["kèm", "kém"].includes(next)) text = `học${punctuation}`;
  if (lower === "ý" && previous === "vô" && next === "chung") text = `hình${punctuation}`;
  if (lower === "điểm" && previous === "mất" && next === "tin") text = `niềm${punctuation}`;
  if (lower === "tả" && previous === "thực") text = `trạng${punctuation}`;
  return { ...word, word: text };
});

const captionWords = (segments) => segments.flatMap((segment) =>
  normalizeTranscriptWords(segment.words ?? []).map((word) => ({
    text: clean(word.word ?? ""),
    startSec: Number(word.start),
    endSec: Number(word.end),
  })).filter((word) => word.text && Number.isFinite(word.startSec) && Number.isFinite(word.endSec))
);

const makeCues = (words) => {
  const cues = [];
  let group = [];
  for (const word of words) {
    const previous = group.at(-1);
    const span = group.length ? word.endSec - group[0].startSec : 0;
    const gap = previous ? word.startSec - previous.endSec : 0;
    if (group.length && (group.length >= 7 || span > 2.6 || gap > 0.72)) {
      cues.push(group);
      group = [];
    }
    group.push(word);
    if (/[.!?]$/.test(word.text) && group.length >= 3) {
      cues.push(group);
      group = [];
    }
  }
  if (group.length) cues.push(group);
  return cues.map((cue) => {
    const from = Math.max(0, Math.floor(cue[0].startSec * fps));
    const end = Math.max(from + 2, Math.ceil(cue.at(-1).endSec * fps) + 3);
    return {
      from,
      durationInFrames: end - from,
      words: cue.map((word) => ({
        text: word.text,
        start: Math.floor(word.startSec * fps),
        end: Math.max(Math.floor(word.startSec * fps) + 1, Math.ceil(word.endSec * fps)),
      })),
    };
  });
};

const makeChapters = (cues, durationInFrames) => {
  const chapters = [];
  const interval = 30 * fps;
  for (let target = 25 * fps; target < durationInFrames - 4 * fps; target += interval) {
    const cue = cues.find((item) => item.from >= target) ?? cues.findLast((item) => item.from < target);
    if (!cue) continue;
    const label = cue.words.slice(0, 6).map((word) => word.text).join(" ");
    chapters.push({ from: target, durationInFrames: 66, label: clean(label) });
  }
  return chapters;
};

for (const id of ids) {
  const sourceFile = path.join(root, "imports", "brisky-20260824", "primary", `${id}.mp4`);
  const stagedFile = path.join(stagingDir, `${id}.mp4`);
  ensureHardLink(sourceFile, stagedFile);
  const rawProbe = probeVideo(sourceFile);
  const info = {
    width: Number(rawProbe.streams[0].width),
    height: Number(rawProbe.streams[0].height),
    duration: Number(rawProbe.format.duration),
  };
  const hq = path.join(root, "projects", "brisky-2026-08-24", "transcripts-hq", `${id}.json`);
  const fallback = path.join(root, "auto-cut", id, "transcript.json");
  const transcript = JSON.parse(fs.readFileSync(fs.existsSync(hq) ? hq : fallback, "utf8"));
  const cues = makeCues(captionWords(transcript.segments ?? []));
  const durationInFrames = Math.round(info.duration * fps);
  const props = {
    source: `staging/brisky-full/${id}.mp4`,
    logo: "staging/brisky-full/brisky-logo.png",
    title: "Brisky Academy",
    width: info.width,
    height: info.height,
    fps,
    durationInFrames,
    captions: cues,
    chapters: makeChapters(cues, durationInFrames),
  };
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(props, null, 2));
  process.stdout.write(`${id}: ${cues.length} subtitle cues, ${props.chapters.length} chapter cards\n`);
}
