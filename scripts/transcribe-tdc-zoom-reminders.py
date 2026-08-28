from __future__ import annotations

import json
import os
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "imports" / "drive-1HPqPPDjlWFzZJfgIDsKVDMaJemU05ECE"
OUTPUT_DIR = ROOT / "projects" / "tdc-zoom-reminders-20260827" / "transcripts"
MODEL_DIR = (
    ROOT
    / ".runtime"
    / "models"
    / "models--Systran--faster-whisper-large-v3"
    / "snapshots"
    / "edaa852ec7e145841d8ffdb056a99866b5f0a478"
)

SOURCES = [
    ("buoi-1", "Buoi-1-IMG_2421.MOV"),
    ("buoi-2", "Buoi-2-IMG_2423.MOV"),
    ("buoi-3", "Buoi-3-IMG_2425.MOV"),
]


def lower_priority() -> None:
    if os.name == "nt":
        import ctypes

        ctypes.windll.kernel32.SetPriorityClass(
            ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000
        )


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
        "TDC. Thầy Lê Văn Thành. Chương trình Bí mật giúp con ham học. "
        "Nhắc lịch Zoom trước hai tiếng. Ba mẹ chuẩn bị sổ, bút, đường link Zoom, "
        "tham gia đúng giờ. Buổi một, buổi hai, buổi ba. Coaching cùng Thầy Thành."
    )
    for index, (video_id, filename) in enumerate(SOURCES, start=1):
        source = SOURCE_DIR / filename
        print(f"[{index}/{len(SOURCES)}] {source.name}", flush=True)
        segments, info = model.transcribe(
            str(source),
            language="vi",
            beam_size=5,
            best_of=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 220},
            condition_on_previous_text=True,
            initial_prompt=prompt,
        )
        rows = []
        for segment in segments:
            rows.append(
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
        target = OUTPUT_DIR / f"{video_id}.json"
        payload = {
            "segments": rows,
            "duration": float(info.duration),
            "model": "large-v3",
            "source": source.name,
        }
        target.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"  wrote {target.name}: {len(rows)} segments", flush=True)


if __name__ == "__main__":
    main()
