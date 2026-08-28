from __future__ import annotations

import argparse
import json
import os
import re
import unicodedata
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / ".runtime" / "models" / "models--Systran--faster-whisper-large-v3" / "snapshots" / "edaa852ec7e145841d8ffdb056a99866b5f0a478"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower()).replace("đ", "d")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def immediate_repeats(words: list[str]) -> list[dict]:
    hits = []
    for size in range(1, 5):
        for i in range(len(words) - 2 * size + 1):
            if words[i:i + size] == words[i + size:i + 2 * size]:
                phrase = " ".join(words[i:i + size])
                if phrase not in {"la", "va", "thi", "chi", "cac anh chi", "hoc"}:
                    hits.append({"index": i, "size": size, "phrase": phrase})
    unique = []
    seen = set()
    for hit in hits:
        key = (hit["index"], hit["phrase"])
        if key not in seen:
            seen.add(key)
            unique.append(hit)
    return unique


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    if os.name == "nt":
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000)

    model = WhisperModel(str(MODEL_DIR), device="cpu", compute_type="int8", cpu_threads=5, num_workers=1)
    prompt = "TDC. Thầy Lê Văn Thành. Bí mật giúp con ham học. Buổi một, buổi hai, buổi ba. Zoom lúc 20 giờ."
    reports = []
    for file_name in args.files:
        path = Path(file_name)
        segments, _ = model.transcribe(str(path), language="vi", beam_size=5, best_of=5, word_timestamps=True, vad_filter=True, condition_on_previous_text=True, initial_prompt=prompt)
        rows = []
        for segment in segments:
            rows.append({"start": round(float(segment.start), 3), "end": round(float(segment.end), 3), "text": (segment.text or "").strip()})
        text = " ".join(row["text"] for row in rows)
        normalized = normalize(text)
        words = normalized.split()
        report = {
            "file": str(path.resolve()),
            "text": text,
            "segments": rows,
            "immediateRepeats": immediate_repeats(words),
            "checks": {
                "hasMotKm": "mot km" in normalized,
                "hasHamHoc": "ham hoc" in normalized,
                "theNenCacAnhChiCount": normalized.count("the nen cac anh chi"),
                "henGapLaiCacAnhChiCount": normalized.count("hen gap lai cac anh chi"),
                "hasCorrectionHaiGio": "dung 2 gio" in normalized or "dung hai gio" in normalized,
            },
        }
        reports.append(report)
        print(path.name, report["checks"], "repeats=", len(report["immediateRepeats"]), flush=True)
    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"files": reports}, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
