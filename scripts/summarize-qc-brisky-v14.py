from __future__ import annotations

import difflib
import json
import os
import re
from pathlib import Path


ROOT = Path(r"C:\Users\Admin\Documents\Codex-Projects\AIEV")
OUTPUT_ROOT = Path(os.environ.get("BRISKY_QC_OUTPUT_ROOT", ROOT / "outputs" / "Brisky-videos2-6-tdc-subs-word-safe-v14"))
TRANSCRIPTS = OUTPUT_ROOT / "transcripts"
EDIT_MAP = Path(os.environ.get("BRISKY_QC_EDIT_MAP", ROOT / "projects" / "brisky-raw-ads-20260825" / "edit-map-v14.json"))
SOURCE_TRANSCRIPTS = ROOT / "projects" / "brisky-raw-ads-20260825" / "transcripts-draft"
SPEED = 1.08
COMPOSITION_PREFIX = os.environ.get("BRISKY_QC_COMPOSITION_PREFIX", "BriskyShortV14Video")


def tokens(text: str) -> list[str]:
    return re.findall(r"[0-9a-zà-ỹ]+", text.lower())


def join_times(video: dict) -> list[float]:
    joins: list[float] = []
    cursor = 0.0
    for segment_index, segment in enumerate(video["segments"]):
        for piece_index, (start, end) in enumerate(segment["pieces"]):
            cursor += (float(end) - float(start)) / SPEED
            if piece_index < len(segment["pieces"]) - 1 or segment_index < len(video["segments"]) - 1:
                joins.append(cursor)
    return joins


def join_duplicates(words: list[dict], joins: list[float]) -> list[dict]:
    findings: list[dict] = []
    for join_index, join in enumerate(joins):
        before = [word for word in words if float(word["end"]) <= join][-6:]
        after = [word for word in words if float(word["start"]) >= join][:6]
        left = [tokens(word["word"])[0] for word in before if tokens(word["word"])]
        right = [tokens(word["word"])[0] for word in after if tokens(word["word"])]
        for size in range(1, min(4, len(left), len(right)) + 1):
            if left[-size:] == right[:size]:
                findings.append({"joinIndex": join_index, "time": round(join, 3), "size": size, "text": " ".join(left[-size:])})
    return findings


def source_text(video: dict) -> str:
    payload = json.loads((SOURCE_TRANSCRIPTS / f"{Path(video['source']).stem}.json").read_text(encoding="utf-8-sig"))
    source_words = [word for segment in payload["segments"] for word in segment.get("words", [])]
    selected: list[str] = []
    for segment in video["segments"]:
        for start, end in segment["pieces"]:
            for word in source_words:
                midpoint = (float(word["start"]) + float(word["end"])) / 2
                if float(start) <= midpoint <= float(end):
                    selected.append(word["word"].strip())
    return " ".join(selected).strip()


def main() -> None:
    edit_map = json.loads(EDIT_MAP.read_text(encoding="utf-8"))
    videos = {video["composition"]: video for video in edit_map["videos"]}
    summaries = []
    transcript_files = sorted(path for path in TRANSCRIPTS.glob("*.json") if path.name != "qc-transcript-summary.json")
    for index, path in enumerate(transcript_files, start=2):
        composition = f"{COMPOSITION_PREFIX}{index}"
        video = videos[composition]
        payload = json.loads(path.read_text(encoding="utf-8"))
        all_words = [word for segment in payload.get("segments", []) for word in segment.get("words", [])]
        payload["joinDuplicateCandidates"] = join_duplicates(all_words, join_times(video))
        expected_source = source_text(video)
        expected_with_cta = expected_source + " Nếu ba mẹ quan tâm thì hãy nhấn vào nút đăng ký bên dưới."
        expected_tokens = tokens(expected_with_cta)
        actual_tokens = tokens(payload["transcript"])
        matcher = difflib.SequenceMatcher(a=expected_tokens, b=actual_tokens, autojunk=False)
        payload["sourceExpectedTranscript"] = expected_with_cta
        payload["sourceTokenSimilarity"] = round(matcher.ratio(), 4)
        payload["sourceDiffOpcodes"] = [
            {"tag": tag, "expected": " ".join(expected_tokens[i1:i2]), "actual": " ".join(actual_tokens[j1:j2])}
            for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag != "equal"
        ]
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        summaries.append({
            "source": payload["source"],
            "sourceTokenSimilarity": payload["sourceTokenSimilarity"],
            "duplicateCandidates": payload["duplicateCandidates"],
            "joinDuplicateCandidates": payload["joinDuplicateCandidates"],
            "fillerTokens": payload["fillerTokens"],
            "productionPhrases": payload["productionPhrases"],
            "partialWordBoundaries": payload["partialWordBoundaries"],
        })
    (TRANSCRIPTS / "qc-transcript-summary.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
