from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(r"C:\Users\Admin\Documents\Codex-Projects\AIEV")
FINAL_DIR = ROOT / "outputs" / "Brisky-videos2-6-long-clean-v13" / "final"
OUTPUT_DIR = ROOT / "outputs" / "Brisky-videos2-6-long-clean-v13" / "transcripts"
MODEL_DIR = ROOT / ".runtime" / "models" / "models--Systran--faster-whisper-large-v3" / "snapshots" / "edaa852ec7e145841d8ffdb056a99866b5f0a478"


def lower_priority() -> None:
    if os.name == "nt":
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000)


def normalized_tokens(text: str) -> list[str]:
    return re.findall(r"[0-9a-zà-ỹ]+", text.lower())


def duplicate_runs(tokens: list[str]) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for index in range(len(tokens) - 1):
        if tokens[index] == tokens[index + 1]:
            findings.append({"kind": "single_word", "index": index, "text": tokens[index]})
    for size in range(2, 5):
        for index in range(len(tokens) - size * 2 + 1):
            left = tokens[index:index + size]
            right = tokens[index + size:index + size * 2]
            if left == right:
                findings.append({"kind": f"{size}_gram", "index": index, "text": " ".join(left)})
    return findings


def main() -> None:
    lower_priority()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(str(MODEL_DIR), device="cpu", compute_type="int8", cpu_threads=5, num_workers=1)
    prompt = (
        "Brisky Academy. Thầy Quyền Đỗ. Bí mật lấy gốc tiếng Anh siêu tốc. "
        "Ba buổi Zoom hoàn toàn miễn phí dành cho cha mẹ có con lớp 3 đến lớp 9. "
        "Mất gốc tiếng Anh, từ vựng, ngữ pháp, đọc hiểu, lộ trình, kiểm tra trình độ."
    )
    summary_path = OUTPUT_DIR / "duplicate-summary.json"
    existing = []
    if summary_path.exists():
        existing = json.loads(summary_path.read_text(encoding="utf-8-sig"))
    summary_by_source = {row["source"]: row for row in existing}
    requested = set(sys.argv[1:])
    sources = sorted(FINAL_DIR.glob("*.mp4"))
    if requested:
        sources = [source for source in sources if source.name in requested or source.stem in requested]
    for source in sources:
        print(f"TRANSCRIBE_START {source.name}", flush=True)
        segments, info = model.transcribe(
            str(source), language="vi", beam_size=5, best_of=5, word_timestamps=True,
            vad_filter=True, vad_parameters={"min_silence_duration_ms": 180},
            condition_on_previous_text=False, initial_prompt=prompt,
        )
        rows = []
        text_parts = []
        for segment in segments:
            text = (segment.text or "").strip()
            text_parts.append(text)
            rows.append({
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": text,
                "words": [
                    {"word": word.word.strip(), "start": round(float(word.start), 3), "end": round(float(word.end), 3)}
                    for word in (segment.words or [])
                ],
            })
        full_text = " ".join(text_parts).strip()
        duplicates = duplicate_runs(normalized_tokens(full_text))
        payload = {
            "source": source.name,
            "duration": round(float(info.duration), 3),
            "language": info.language,
            "segments": rows,
            "duplicate_candidates": duplicates,
        }
        stem = source.stem
        (OUTPUT_DIR / f"{stem}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (OUTPUT_DIR / f"{stem}.txt").write_text(full_text, encoding="utf-8")
        summary_by_source[source.name] = {"source": source.name, "duplicate_candidates": duplicates}
        print(f"TRANSCRIBE_DONE {source.name} duplicate_candidates={len(duplicates)}", flush=True)
    summary = [summary_by_source[key] for key in sorted(summary_by_source)]
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
