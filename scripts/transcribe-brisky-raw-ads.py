from __future__ import annotations

import json
import os
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "engines" / "remotion" / "public" / "staging" / "brisky-raw-ads"
OUTPUT_DIR = ROOT / "projects" / "brisky-raw-ads-20260825" / "transcripts-draft"
MODEL_DIR = (
    ROOT
    / ".runtime"
    / "models"
    / "models--Systran--faster-whisper-small"
    / "snapshots"
    / "536b0662742c02347bc0e980a01041f333bce120"
)
VIDEO_IDS = ["ad01", "ad02", "ad03", "ad04", "ad05"]


def lower_priority() -> None:
    if os.name != "nt":
        return
    try:
        import ctypes

        ctypes.windll.kernel32.SetPriorityClass(
            ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000
        )
    except Exception:
        pass


def main() -> None:
    lower_priority()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(
        str(MODEL_DIR),
        device="cpu",
        compute_type="int8",
        cpu_threads=5,
        num_workers=1,
    )
    prompt = (
        "Brisky Academy, Bí mật lấy gốc tiếng Anh siêu tốc, mất gốc tiếng Anh, "
        "ba mẹ, học sinh lớp 3 đến lớp 9, từ vựng, ngữ pháp, phát âm, bài đọc, "
        "lộ trình học, kiểm tra trình độ, ba buổi miễn phí."
    )
    for index, video_id in enumerate(VIDEO_IDS, start=1):
        source = SOURCE_DIR / f"{video_id}.mp4"
        target = OUTPUT_DIR / f"{video_id}.json"
        print(f"[{index}/5] {source.name}", flush=True)
        segments, info = model.transcribe(
            str(source),
            language="vi",
            beam_size=5,
            best_of=5,
            word_timestamps=True,
            condition_on_previous_text=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 260},
            initial_prompt=prompt,
        )
        output_segments = []
        for segment in segments:
            output_segments.append(
                {
                    "start": round(float(segment.start), 3),
                    "end": round(float(segment.end), 3),
                    "text": (segment.text or "").strip(),
                    "words": [
                        {
                            "word": word.word,
                            "start": round(float(word.start), 3),
                            "end": round(float(word.end), 3),
                        }
                        for word in (segment.words or [])
                    ],
                }
            )
            if len(output_segments) % 20 == 0:
                print(f"  {segment.end:.0f}s", flush=True)
        target.write_text(
            json.dumps(
                {
                    "segments": output_segments,
                    "language": info.language,
                    "duration": float(info.duration),
                    "model": "faster-whisper-small-draft",
                    "source": source.name,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"  wrote {target.name}: {len(output_segments)} segments", flush=True)


if __name__ == "__main__":
    main()
