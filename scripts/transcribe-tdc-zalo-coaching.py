from __future__ import annotations

import json
import os
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "imports" / "drive-1yiLbsX_7UYzqRWMbot6EQMs-Mc4dVOOL"
OUTPUT_DIR = ROOT / "projects" / "tdc-zalo-coaching-20260828" / "transcripts"
MODEL_DIR = next(
    (
        ROOT
        / ".runtime"
        / "models"
        / "models--Systran--faster-whisper-small"
        / "snapshots"
    ).iterdir()
)


def lower_priority() -> None:
    if os.name == "nt":
        import ctypes

        ctypes.windll.kernel32.SetPriorityClass(
            ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000
        )


def main() -> None:
    lower_priority()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(
        path
        for path in SOURCE_DIR.glob("Video */*.MOV")
        if "incomplete" not in path.name.lower()
    )
    model = WhisperModel(
        str(MODEL_DIR),
        device="cpu",
        compute_type="int8",
        cpu_threads=5,
        num_workers=1,
    )
    prompt = (
        "TDC. Thầy Lê Văn Thành. Trao giá trị cho cha mẹ trong nhóm Zalo. "
        "Đặt lịch Coaching, buổi Coaching cùng Thầy Thành, hỗ trợ con ham học, "
        "tự chủ, trách nhiệm, đồng hành cùng con, giáo dục gia đình."
    )
    for index, source in enumerate(sources, start=1):
        print(f"[{index}/{len(sources)}] {source.parent.name}/{source.name}", flush=True)
        segments, info = model.transcribe(
            str(source),
            language="vi",
            beam_size=3,
            best_of=3,
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
        stem = f"{source.parent.name.lower().replace(' ', '-')}-{source.stem.lower()}"
        target = OUTPUT_DIR / f"{stem}.json"
        target.write_text(
            json.dumps(
                {
                    "segments": rows,
                    "duration": float(info.duration),
                    "model": "small-draft",
                    "source": str(source.relative_to(SOURCE_DIR)),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"  wrote {target.name}: {len(rows)} segments", flush=True)


if __name__ == "__main__":
    main()
