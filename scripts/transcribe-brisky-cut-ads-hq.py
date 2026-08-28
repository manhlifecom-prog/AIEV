from __future__ import annotations

import json
import os
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "engines" / "remotion" / "public" / "staging" / "brisky-raw-ads" / "cuts"
OUTPUT_DIR = ROOT / "projects" / "brisky-raw-ads-20260825" / "transcripts-final"
MODEL_DIR = ROOT / ".runtime" / "models" / "models--Systran--faster-whisper-large-v3" / "snapshots" / "edaa852ec7e145841d8ffdb056a99866b5f0a478"


def lower_priority() -> None:
    if os.name == "nt":
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000)


def main() -> None:
    lower_priority()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(str(MODEL_DIR), device="cpu", compute_type="int8", cpu_threads=5, num_workers=1)
    prompt = (
        "Brisky Academy. Thầy Quyền Đỗ. Bí mật lấy gốc tiếng Anh siêu tốc. "
        "Ba buổi Zoom miễn phí dành cho cha mẹ có con lớp 3 đến lớp 9. "
        "Mất gốc tiếng Anh, từ vựng, ngữ pháp, đọc hiểu, lộ trình học, kiểm tra trình độ."
    )
    for index in range(1, 6):
        video_id = f"ad{index:02d}"
        source = SOURCE_DIR / f"{video_id}-cut.mp4"
        print(f"[{index}/5] {source.name}", flush=True)
        segments, info = model.transcribe(
            str(source), language="vi", beam_size=5, best_of=5, word_timestamps=True,
            vad_filter=True, vad_parameters={"min_silence_duration_ms": 220},
            condition_on_previous_text=True, initial_prompt=prompt,
        )
        rows = []
        for segment in segments:
            rows.append({
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": (segment.text or "").strip(),
                "words": [{"word": w.word, "start": round(float(w.start), 3), "end": round(float(w.end), 3)} for w in (segment.words or [])],
            })
        target = OUTPUT_DIR / f"{video_id}.json"
        target.write_text(json.dumps({"segments": rows, "duration": float(info.duration), "model": "large-v3", "source": source.name}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  wrote {target.name}: {len(rows)} segments", flush=True)


if __name__ == "__main__":
    main()
