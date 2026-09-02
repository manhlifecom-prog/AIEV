#!/usr/bin/env python3
"""Add a conservative music-reactive camera pass to baked Brisky finals.

The migration bundle contains QC'ed finals but not the raw staging assets.  This
post pass preserves the approved edit/audio while making the existing icon and
caption layer slightly larger and giving the whole composition a restrained,
music-timed push/pull.  Existing finals are never overwritten.
"""

from __future__ import annotations

import argparse
import array
import json
import math
import os
import shutil
import subprocess
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path


AIEV_ROOT = Path("/Users/manhsandbox/Documents/Codex-Projects/AIEV")
FFMPEG = AIEV_ROOT / ".tools/ffmpeg-static/node_modules/ffmpeg-static/ffmpeg"
FFPROBE = AIEV_ROOT / ".tools/ffmpeg-static/node_modules/ffprobe-static/bin/darwin/arm64/ffprobe"
OUTPUT_ROOT = AIEV_ROOT / "outputs/Brisky-motion-v2"


@dataclass(frozen=True)
class VideoJob:
    number: int
    source: Path
    output_name: str


JOBS = (
    VideoJob(1, AIEV_ROOT / "outputs/Brisky-video1-v10/final/01-mat-goc-brisky-tdc-icons-selective-subs-v10.mp4", "01-mat-goc-brisky-motion-v2.mp4"),
    VideoJob(2, AIEV_ROOT / "outputs/Brisky-video2-fairy-tail-v24/final/02-tu-3-4-diem-len-8-diem-fairy-tail-v24.mp4", "02-tu-3-4-diem-len-8-diem-motion-v2.mp4"),
    VideoJob(3, AIEV_ROOT / "outputs/Brisky-video3-wake-oao-v25/final/03-dau-hieu-con-dang-hong-goc-wake-oao-v25.mp4", "03-dau-hieu-con-dang-hong-goc-motion-v2.mp4"),
    VideoJob(4, AIEV_ROOT / "outputs/Brisky-video4-keywords-v33/final/04-brisky-keywords-v33.mp4", "04-brisky-keywords-motion-v2.mp4"),
    VideoJob(5, AIEV_ROOT / "outputs/Brisky-video5-full-anh-v38/final/05-brisky-full-anh-v38.mp4", "05-brisky-full-anh-motion-v2.mp4"),
    VideoJob(6, AIEV_ROOT / "outputs/Brisky-video6-standing-v11/final/06-video-dung-lay-goc-day-du-v11.mp4", "06-video-dung-lay-goc-day-du-motion-v2.mp4"),
)


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=capture)


def extract_low_band(source: Path, wav_path: Path, offset: float, limit: float | None) -> None:
    command = [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y"]
    if offset:
        command += ["-ss", f"{offset:.3f}"]
    command += ["-i", str(source)]
    if limit is not None:
        command += ["-t", f"{limit:.3f}"]
    command += [
        "-vn",
        "-af",
        "highpass=f=45,lowpass=f=220,aresample=22050",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        str(wav_path),
    ]
    run(command)


def strong_accents(wav_path: Path) -> list[float]:
    with wave.open(str(wav_path), "rb") as wav:
        rate = wav.getframerate()
        samples = array.array("h", wav.readframes(wav.getnframes()))

    window = 1024
    hop = 512
    energies: list[float] = []
    for start in range(0, max(0, len(samples) - window), hop):
        chunk = samples[start : start + window]
        energies.append(sum(float(value) * float(value) for value in chunk) / window)

    if len(energies) < 4:
        return []

    flux = [0.0]
    for index in range(1, len(energies)):
        previous = max(1.0, energies[index - 1])
        flux.append(max(0.0, (energies[index] - energies[index - 1]) / previous))

    positive = sorted(value for value in flux if value > 0)
    if not positive:
        return []
    threshold = positive[min(len(positive) - 1, int(len(positive) * 0.88))]
    min_gap = max(1, int(1.15 * rate / hop))
    candidates = [
        index
        for index in range(1, len(flux) - 1)
        if flux[index] >= threshold and flux[index] >= flux[index - 1] and flux[index] >= flux[index + 1]
    ]

    selected: list[int] = []
    for candidate in sorted(candidates, key=lambda index: flux[index], reverse=True):
        if all(abs(candidate - existing) >= min_gap for existing in selected):
            selected.append(candidate)
    selected.sort()
    return [index * hop / rate for index in selected]


def scale_expression(accents: list[float]) -> str:
    base = "1.030+0.008*sin(6.28318530718*t/4.8)"
    pulses = "".join(
        f"+0.014*exp(-((t-{accent:.3f})*(t-{accent:.3f}))/0.028)" for accent in accents
    )
    return base + pulses


def render(job: VideoJob, *, preview: bool, offset: float, limit: float | None) -> dict[str, object]:
    if not job.source.is_file():
        raise FileNotFoundError(job.source)
    if not FFMPEG.is_file() or not FFPROBE.is_file():
        raise FileNotFoundError("Bundled ffmpeg/ffprobe runtime is missing")

    final_dir = OUTPUT_ROOT / ("preview" if preview else "final")
    contact_dir = OUTPUT_ROOT / "contact-sheets"
    qc_dir = OUTPUT_ROOT / "qc"
    final_dir.mkdir(parents=True, exist_ok=True)
    contact_dir.mkdir(parents=True, exist_ok=True)
    qc_dir.mkdir(parents=True, exist_ok=True)
    output = final_dir / (job.output_name.replace(".mp4", "-preview.mp4") if preview else job.output_name)

    with tempfile.TemporaryDirectory(prefix="brisky-motion-") as temp:
        wav_path = Path(temp) / "low-band.wav"
        extract_low_band(job.source, wav_path, offset, limit)
        accents = strong_accents(wav_path)

    zoom = scale_expression(accents)
    video_filter = (
        f"scale=w='ceil(iw*({zoom})/2)*2':h='ceil(ih*({zoom})/2)*2':eval=frame,"
        "crop=1080:1920:"
        "x='(in_w-out_w)/2+5*sin(6.28318530718*t/7.2)':"
        "y='(in_h-out_h)/2+7*sin(6.28318530718*t/8.6+1.2)',"
        "eq=contrast=1.012:saturation=1.018"
    )
    command = [str(FFMPEG), "-hide_banner", "-loglevel", "warning", "-y"]
    if offset:
        command += ["-ss", f"{offset:.3f}"]
    command += ["-i", str(job.source)]
    if limit is not None:
        command += ["-t", f"{limit:.3f}"]
    command += [
        "-vf",
        video_filter,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium" if not preview else "veryfast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-movflags",
        "+faststart",
        str(output),
    ]
    run(command)

    probe = json.loads(
        run(
            [
                str(FFPROBE),
                "-v",
                "error",
                "-show_entries",
                "format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,duration",
                "-of",
                "json",
                str(output),
            ],
            capture=True,
        ).stdout
    )
    report = {
        "source": str(job.source),
        "output": str(output),
        "preview": preview,
        "offsetSeconds": offset,
        "limitSeconds": limit,
        "accentCount": len(accents),
        "accentSeconds": [round(value, 3) for value in accents],
        "probe": probe,
    }
    report_path = qc_dir / f"{output.stem}.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    contact_path = contact_dir / f"{output.stem}.jpg"
    run(
        [
            str(FFMPEG),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(output),
            "-vf",
            "fps=1/2,scale=216:384,tile=5x2",
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(contact_path),
        ]
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=int, choices=range(1, 7), action="append")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--offset", type=float, default=0.0)
    parser.add_argument("--limit", type=float)
    args = parser.parse_args()

    selected = [job for job in JOBS if not args.video or job.number in args.video]
    if args.preview and args.limit is None:
        args.limit = 18.0
    for job in selected:
        report = render(job, preview=args.preview, offset=args.offset, limit=args.limit)
        print(json.dumps({key: report[key] for key in ("output", "accentCount", "accentSeconds")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
