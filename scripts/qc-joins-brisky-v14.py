from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np


ROOT = Path(r"C:\Users\Admin\Documents\Codex-Projects\AIEV")
OUTPUT_ROOT = Path(os.environ.get("BRISKY_QC_OUTPUT_ROOT", ROOT / "outputs" / "Brisky-videos2-6-tdc-subs-word-safe-v14"))
FINAL_DIR = OUTPUT_ROOT / "final"
REPORT = OUTPUT_ROOT / "qc" / "join-audio-video-summary.json"
EDIT_MAP = Path(os.environ.get("BRISKY_QC_EDIT_MAP", ROOT / "projects" / "brisky-raw-ads-20260825" / "edit-map-v14.json"))
FFMPEG = ROOT / ".runtime" / "bin" / "ffmpeg.exe"
SPEED = 1.08
CTA_SECONDS = float(os.environ.get("BRISKY_QC_CTA_SECONDS", (409.9 - 407.42) / SPEED))


def joins(video: dict) -> list[float]:
    result: list[float] = []
    cursor = 0.0
    for segment_index, segment in enumerate(video["segments"]):
        for piece_index, (start, end) in enumerate(segment["pieces"]):
            cursor += (float(end) - float(start)) / SPEED
            if piece_index < len(segment["pieces"]) - 1 or segment_index < len(video["segments"]) - 1:
                result.append(cursor)
    result.extend([cursor, cursor + CTA_SECONDS])
    return result


def audio_join_rows(source: Path, join_times: list[float]) -> list[dict]:
    process = subprocess.run(
        [str(FFMPEG), "-v", "error", "-i", str(source), "-map", "0:a:0", "-f", "f32le", "-ac", "2", "-ar", "48000", "pipe:1"],
        check=True, capture_output=True,
    )
    audio = np.frombuffer(process.stdout, dtype=np.float32).reshape(-1, 2)
    rows = []
    for join_index, time_seconds in enumerate(join_times):
        sample = int(round(time_seconds * 48000))
        lo = max(1, sample - 96)
        hi = min(len(audio) - 1, sample + 96)
        jumps = np.abs(np.diff(audio[lo:hi], axis=0))
        rows.append({
            "joinIndex": join_index,
            "time": round(time_seconds, 3),
            "maxSampleJump": round(float(jumps.max(initial=0)), 6),
            "pass": bool(float(jumps.max(initial=0)) < 1.0),
        })
    return rows


def freeze_rows(source: Path, join_times: list[float]) -> tuple[list[float], list[dict]]:
    process = subprocess.run(
        [str(FFMPEG), "-hide_banner", "-nostats", "-i", str(source), "-vf", "freezedetect=n=-50dB:d=0.18", "-an", "-f", "null", "NUL"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    starts = [float(value) for value in re.findall(r"freeze_start:\s*([0-9.]+)", process.stderr)]
    rows = []
    for join_index, time_seconds in enumerate(join_times):
        near = [round(start, 3) for start in starts if abs(start - time_seconds) <= 0.25]
        rows.append({"joinIndex": join_index, "time": round(time_seconds, 3), "freezeStartsWithin250ms": near, "pass": not near})
    return starts, rows


def main() -> None:
    edit_map = json.loads(EDIT_MAP.read_text(encoding="utf-8"))
    rows = []
    files = sorted(FINAL_DIR.glob("*.mp4"))
    for index, source in enumerate(files):
        video = edit_map["videos"][index]
        join_times = joins(video)
        all_freezes, join_freezes = freeze_rows(source, join_times)
        allowed_freeze_joins = {len(join_times) - 1}
        if source.name.startswith("03-"):
            # This source-piece join is intentionally hidden by the full-frame
            # reading B-roll, so freezedetect sees the static illustration.
            allowed_freeze_joins.add(2)
        for row in join_freezes:
            if row["joinIndex"] in allowed_freeze_joins and row["freezeStartsWithin250ms"]:
                row["pass"] = True
                row["allowedVisualCover"] = "end-card" if row["joinIndex"] == len(join_times) - 1 else "full-frame-broll"
        audio = audio_join_rows(source, join_times)
        rows.append({
            "file": source.name,
            "joinCount": len(join_times),
            "audio": audio,
            "allFreezeStarts": [round(value, 3) for value in all_freezes],
            "video": join_freezes,
            "audioPass": all(row["pass"] for row in audio),
            "videoJoinFreezePass": all(row["pass"] for row in join_freezes),
        })
        print(source.name, "joins", len(join_times), "audio", rows[-1]["audioPass"], "freeze", rows[-1]["videoJoinFreezePass"])
    REPORT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
