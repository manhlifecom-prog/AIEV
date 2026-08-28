from __future__ import annotations

import difflib
import json
import os
import re
import sys
from pathlib import Path

from faster_whisper import WhisperModel


ROOT = Path(r"C:\Users\Admin\Documents\Codex-Projects\AIEV")
OUTPUT_ROOT = Path(os.environ.get("BRISKY_QC_OUTPUT_ROOT", ROOT / "outputs" / "Brisky-videos2-6-tdc-subs-word-safe-v14"))
FINAL_DIR = OUTPUT_ROOT / "final"
OUTPUT_DIR = OUTPUT_ROOT / "transcripts"
EDIT_MAP = Path(os.environ.get("BRISKY_QC_EDIT_MAP", ROOT / "projects" / "brisky-raw-ads-20260825" / "edit-map-v14.json"))
SOURCE_TRANSCRIPTS = ROOT / "projects" / "brisky-raw-ads-20260825" / "transcripts-draft"
MODEL_DIR = ROOT / ".runtime" / "models" / "models--Systran--faster-whisper-large-v3" / "snapshots" / "edaa852ec7e145841d8ffdb056a99866b5f0a478"
SPEED = 1.08
CTA_SECONDS = float(os.environ.get("BRISKY_QC_CTA_SECONDS", (409.9 - 407.42) / SPEED))
COMPOSITION_PREFIX = os.environ.get("BRISKY_QC_COMPOSITION_PREFIX", "BriskyShortV14Video")
START_INDEX = int(os.environ.get("BRISKY_QC_START_INDEX", "2"))
END_CARD_SECONDS = 3.6


def lower_priority() -> None:
    if os.name == "nt":
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000)


def normalized_tokens(text: str) -> list[str]:
    return re.findall(r"[0-9a-zà-ỹ]+", text.lower())


def duplicate_runs(tokens: list[str]) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for size in range(1, 5):
        for index in range(len(tokens) - size * 2 + 1):
            left = tokens[index:index + size]
            right = tokens[index + size:index + size * 2]
            if left == right:
                findings.append({"kind": f"{size}_gram", "index": index, "text": " ".join(left)})
    return findings


def expected_join_times(video: dict) -> list[float]:
    joins: list[float] = []
    cursor = 0.0
    speed = float(video.get("playbackSpeed", SPEED))
    for segment_index, segment in enumerate(video["segments"]):
        for piece_index, piece in enumerate(segment["pieces"]):
            cursor += (float(piece[1]) - float(piece[0])) / speed
            if piece_index < len(segment["pieces"]) - 1:
                joins.append(cursor)
        cursor += float(segment.get("pauseAfterSeconds", 0.0))
        if segment_index < len(video["segments"]) - 1:
            joins.append(cursor)
    return joins


def join_duplicate_findings(words: list[dict], joins: list[float]) -> list[dict]:
    findings: list[dict] = []
    for join_index, join in enumerate(joins):
        # Do not overlap the two windows: a single ASR word that straddles the
        # edit point must not be counted once on each side as a duplicate.
        before = [w for w in words if w["end"] <= join][-6:]
        after = [w for w in words if w["start"] >= join][:6]
        left = [normalized_tokens(w["word"])[0] for w in before if normalized_tokens(w["word"])]
        right = [normalized_tokens(w["word"])[0] for w in after if normalized_tokens(w["word"])]
        for size in range(1, min(4, len(left), len(right)) + 1):
            if left[-size:] == right[:size]:
                findings.append({"joinIndex": join_index, "time": round(join, 3), "size": size, "text": " ".join(left[-size:])})
    return findings


def boundary_findings(video: dict) -> list[dict]:
    source_json = SOURCE_TRANSCRIPTS / f"{Path(video['source']).stem}.json"
    payload = json.loads(source_json.read_text(encoding="utf-8-sig"))
    words = [word for segment in payload["segments"] for word in segment.get("words", [])]
    findings: list[dict] = []
    for segment_index, segment in enumerate(video["segments"]):
        for piece_index, (start, end) in enumerate(segment["pieces"]):
            for word in words:
                word_start = float(word["start"])
                word_end = float(word["end"])
                if word_start + 0.035 < float(start) < word_end - 0.035:
                    findings.append({"segmentIndex": segment_index, "pieceIndex": piece_index, "boundary": "start", "time": start, "word": word["word"].strip(), "wordRange": [word_start, word_end]})
                if word_start + 0.035 < float(end) < word_end - 0.035:
                    findings.append({"segmentIndex": segment_index, "pieceIndex": piece_index, "boundary": "end", "time": end, "word": word["word"].strip(), "wordRange": [word_start, word_end]})
    return findings


def main() -> None:
    lower_priority()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    edit_map = json.loads(EDIT_MAP.read_text(encoding="utf-8"))
    by_composition = {video["composition"]: video for video in edit_map["videos"]}
    model = WhisperModel(str(MODEL_DIR), device="cpu", compute_type="int8", cpu_threads=5, num_workers=1)
    prompt = (
        "Brisky Academy. Thầy Quyền Đỗ. Bí mật lấy gốc tiếng Anh siêu tốc. "
        "Ba buổi Zoom hoàn toàn miễn phí dành cho cha mẹ có con lớp 3 đến lớp 9. "
        "Mất gốc tiếng Anh, từ vựng, ngữ pháp, đọc hiểu, lộ trình, kiểm tra trình độ."
    )
    requested = set(sys.argv[1:])
    summaries = []
    for index, source in enumerate(sorted(FINAL_DIR.glob("*.mp4")), start=START_INDEX):
        composition = f"{COMPOSITION_PREFIX}{index}"
        if composition not in by_composition:
            continue
        if requested and source.name not in requested and source.stem not in requested and composition not in requested:
            continue
        video = by_composition[composition]
        speed = float(video.get("playbackSpeed", SPEED))
        cta_seconds = (409.9 - 407.42) / speed
        video_prompt = prompt + " " + " ".join(segment["transcript"] for segment in video["segments"])
        print(f"TRANSCRIBE_START {source.name}", flush=True)
        segments, info = model.transcribe(
            str(source), language="vi", beam_size=5, best_of=5, word_timestamps=True,
            vad_filter=True, vad_parameters={"min_silence_duration_ms": 180},
            condition_on_previous_text=False, initial_prompt=video_prompt,
        )
        rows = []
        words = []
        text_parts = []
        speech_limit = sum((float(end) - float(start)) / speed for segment in video["segments"] for start, end in segment["pieces"])
        speech_limit += sum(float(segment.get("pauseAfterSeconds", 0.0)) for segment in video["segments"])
        for segment in segments:
            if float(segment.start) >= speech_limit + cta_seconds + 0.25:
                continue
            text = (segment.text or "").strip()
            text_parts.append(text)
            segment_words = [
                {"word": word.word.strip(), "start": round(float(word.start), 3), "end": round(float(word.end), 3)}
                for word in (segment.words or [])
            ]
            words.extend(segment_words)
            rows.append({"start": round(float(segment.start), 3), "end": round(float(segment.end), 3), "text": text, "words": segment_words})
        full_text = " ".join(text_parts).strip()
        expected_text = " ".join(segment["transcript"] for segment in video["segments"]) + " Nếu ba mẹ quan tâm, hãy nhấn vào nút đăng ký bên dưới."
        expected_tokens = normalized_tokens(expected_text)
        actual_tokens = normalized_tokens(full_text)
        matcher = difflib.SequenceMatcher(a=expected_tokens, b=actual_tokens, autojunk=False)
        opcodes = [
            {"tag": tag, "expected": " ".join(expected_tokens[i1:i2]), "actual": " ".join(actual_tokens[j1:j2])}
            for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag != "equal"
        ]
        duplicates = duplicate_runs(actual_tokens)
        join_duplicates = join_duplicate_findings(words, expected_join_times(video))
        fillers = [token for token in actual_tokens if token in {"ậm", "ừ", "ừm"}]
        production_phrases = [phrase for phrase in ("ba hai một", "bắt đầu", "lại đi", "ok") if phrase in " ".join(actual_tokens)]
        boundaries = boundary_findings(video)
        payload = {
            "source": source.name,
            "duration": round(float(info.duration), 3),
            "speechLimitSeconds": round(speech_limit, 3),
            "language": info.language,
            "transcript": full_text,
            "expectedTranscript": expected_text,
            "tokenSimilarity": round(matcher.ratio(), 4),
            "diffOpcodes": opcodes,
            "duplicateCandidates": duplicates,
            "joinDuplicateCandidates": join_duplicates,
            "fillerTokens": fillers,
            "productionPhrases": production_phrases,
            "partialWordBoundaries": boundaries,
            "segments": rows,
        }
        (OUTPUT_DIR / f"{source.stem}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (OUTPUT_DIR / f"{source.stem}.txt").write_text(full_text, encoding="utf-8")
        summaries.append({key: payload[key] for key in ("source", "tokenSimilarity", "duplicateCandidates", "joinDuplicateCandidates", "fillerTokens", "productionPhrases", "partialWordBoundaries")})
        print(f"TRANSCRIBE_DONE {source.name} similarity={matcher.ratio():.4f} duplicates={len(duplicates)} join_duplicates={len(join_duplicates)} boundaries={len(boundaries)}", flush=True)
    (OUTPUT_DIR / "qc-transcript-summary.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
