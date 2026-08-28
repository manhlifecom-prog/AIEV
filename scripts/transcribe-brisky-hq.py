from __future__ import annotations

import json
import os
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "imports" / "brisky-20260824" / "primary"
OUTPUT_DIR = ROOT / "projects" / "brisky-2026-08-24" / "transcripts-hq"
IDS = [
    "01-bi-mat-lay-goc",
    "02-ads-ban-1",
    "03-video-ads-2-meta",
    "04-fb-2-cam-nhan",
    "05-video-cam-nhan",
    "06-video-tai-lieu-1",
]


def lower_priority() -> None:
    if os.name != "nt":
        return
    try:
        import ctypes

        BELOW_NORMAL_PRIORITY_CLASS = 0x00004000
        ctypes.windll.kernel32.SetPriorityClass(
            ctypes.windll.kernel32.GetCurrentProcess(), BELOW_NORMAL_PRIORITY_CLASS
        )
    except Exception:
        pass


def main() -> None:
    lower_priority()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("[whisper] loading large-v3 on CPU/int8 with 5 threads", flush=True)
    model = WhisperModel(
        "large-v3",
        device="cpu",
        compute_type="int8",
        cpu_threads=5,
        num_workers=1,
    )
    prompt = (
        "Brisky Academy, học tiếng Anh, mất gốc tiếng Anh, phụ huynh, học sinh, "
        "lộ trình học, Cambridge, IELTS, ngữ pháp, từ vựng, phát âm, học online."
    )
    for index, video_id in enumerate(IDS, start=1):
        source = SOURCE_DIR / f"{video_id}.mp4"
        target = OUTPUT_DIR / f"{video_id}.json"
        print(f"[{index}/6] transcribing {source.name}", flush=True)
        segments, info = model.transcribe(
            str(source),
            language="vi",
            beam_size=5,
            best_of=5,
            word_timestamps=True,
            condition_on_previous_text=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 420},
            initial_prompt=prompt,
        )
        output_segments = []
        last_progress = -10.0
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
            if segment.end - last_progress >= 20:
                last_progress = segment.end
                print(f"    {segment.end:.0f}s", flush=True)
        payload = {
            "segments": output_segments,
            "language": info.language,
            "duration": float(info.duration),
            "model": "large-v3",
        }
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"    wrote {target.name}: {len(output_segments)} segments", flush=True)


if __name__ == "__main__":
    main()
