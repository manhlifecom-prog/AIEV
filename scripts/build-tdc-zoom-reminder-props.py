from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects" / "tdc-zoom-reminders-20260827"
TRANSCRIPTS = PROJECT / "transcripts"
PROPS = PROJECT / "props"
FPS = 30
SPEED = 1.07


CONFIG = {
    "buoi-1": {
        "source": "Buoi-1-IMG_2421.MOV",
        "transcript": TRANSCRIPTS / "buoi-1.json",
        "cuts": [(1.62, 13.44), (40.56, 59.72), (96.74, 122.42), (131.18, 141.96)],
        "editorials": [
            (0.0, "TÌNH HUỐNG QUEN THUỘC", "Con quên", "sách vở quan trọng", "orange"),
            (11.1, "ĐIỀU BỐ MẸ CHƯA THẤY", "Làm hộ con", "mất quyền tự chủ", "cyan"),
            (28.2, "BÀI HỌC QUAN TRỌNG", "Tự kiểm soát", "đồ dùng & bài tập", "orange"),
            (36.4, "NỘI DUNG BUỔI 1", "Đồng hành đúng", "giúp con tự chủ", "cyan"),
            (54.8, "CHỈ CÒN 2 TIẾNG", "Zoom bắt đầu", "20:00 tối nay", "orange"),
            (61.1, "BÍ MẬT GIÚP CON HAM HỌC", "Buổi 1", "Thắp lửa tự chủ", "cyan"),
        ],
        "infographics": [
            (24.8, "BỐ MẸ LÀ CHỖ DỰA", "Trao quyền cho con", "cyan", ["Không làm hộ", "Không làm thay", "Để con chịu trách nhiệm"]),
            (51.2, "NHẮC LỊCH ZOOM", "20:00 tối nay", "orange", ["Có mặt sớm 5 phút", "Chuẩn bị sổ và bút", "Kiểm tra đường link Zoom"]),
        ],
        "illustrations": [
            ("quên hai quyển sách", "book", "left-upper", "orange", "Quên sách vở"),
            ("tước đi cái quyền tự chủ", "shield", "right-upper", "cyan", "Quyền tự chủ"),
            ("bài học quan trọng nhất", "target", "left-mid", "orange", "Bài học từ thất bại"),
            ("đồng hành đúng", "compass", "right-mid", "cyan", "Đồng hành đúng"),
            ("thắp lửa", "bulb", "left-upper", "orange", "Thắp lửa ham học"),
            ("8 giờ tối", "clock", "right-upper", "cyan", "20:00 tối nay"),
        ],
        "program_anchor": "bí mật giúp con ham học",
    },
    "buoi-2": {
        "source": "Buoi-2-IMG_2423.MOV",
        "transcript": TRANSCRIPTS / "buoi-2.json",
        "cuts": [(2.12, 8.04), (19.4, 35.58), (58.56, 69.86), (80.24, 88.2), (100.56, 119.08), (128.16, 140.32)],
        "editorials": [
            (0.0, "BỐ MẸ THƯỜNG LÀM", "Treo thưởng", "hoặc dọa nạt", "orange"),
            (5.6, "CHỈ LÀ BỀ NỔI", "Con hành động nhanh", "nhưng không bền vững", "cyan"),
            (20.9, "ĐỘNG LỰC BÊN NGOÀI", "Không tạo ra", "niềm vui học tập", "orange"),
            (31.4, "NỘI DUNG BUỔI 2", "3 động lực", "từ sâu bên trong", "cyan"),
            (39.2, "CHỈ CÒN 2 TIẾNG", "Có mặt sớm", "đúng giờ", "orange"),
            (56.2, "BÍ MẬT GIÚP CON HAM HỌC", "Buổi 2", "Kích hoạt năng lực tự học", "cyan"),
        ],
        "infographics": [
            (24.1, "ĐỘNG LỰC BỀN VỮNG", "Đến từ bên trong", "cyan", ["Niềm vui tiến bộ", "Cảm giác làm chủ", "Ý nghĩa của việc học"]),
            (49.2, "NHẮC LỊCH ZOOM", "20:00 tối nay", "orange", ["Có mặt sớm 5 phút", "Chuẩn bị sổ và bút", "Kiểm tra đường link Zoom"]),
        ],
        "illustrations": [
            ("treo thưởng dọa nạt", "quote", "left-upper", "orange", "Thưởng và phạt"),
            ("nội lực học tập tự thân", "target", "right-upper", "cyan", "Động lực tự thân"),
            ("niềm vui của sự tiến bộ", "growth", "left-mid", "orange", "Niềm vui tiến bộ"),
            ("3 cái động lực tự thân", "number", "right-mid", "cyan", "Ba động lực", "03"),
            ("có mặt sớm và đúng giờ", "clock", "left-upper", "orange", "Có mặt đúng giờ"),
            ("20 giờ", "video", "right-upper", "cyan", "Zoom lúc 20:00"),
        ],
        "program_anchor": "bí mật giúp con ham học",
    },
    "buoi-3": {
        "source": "Buoi-3-IMG_2425.MOV",
        "transcript": TRANSCRIPTS / "buoi-3.json",
        "cuts": [(2.62, 12.96), (33.82, 48.7), (53.02, 70.12), (72.94, 88.38), (89.16, 103.84)],
        "editorials": [
            (0.0, "CON ĐANG MẮC KẸT", "Không phải vì", "con lười học", "orange"),
            (9.9, "ĐIỂM CHUNG CỦA HỌC SINH GIỎI", "Có phương pháp", "học tập hiệu quả", "cyan"),
            (23.8, "NỘI DUNG BUỔI 3", "Học vừa phải", "nhưng nhớ lâu", "orange"),
            (39.8, "ĐÒN BẨY ĐÚNG", "Đạt kết quả tốt", "tạo động lực ham học", "cyan"),
            (54.2, "CHỈ CÒN 2 TIẾNG", "Zoom bắt đầu", "20:00 tối nay", "orange"),
            (62.0, "BÍ MẬT GIÚP CON HAM HỌC", "Buổi 3", "Phương pháp học hiệu quả", "cyan"),
        ],
        "infographics": [
            (27.1, "HỌC ĐÚNG PHƯƠNG PHÁP", "Hiệu quả hơn mỗi ngày", "cyan", ["Thuộc bài nhanh", "Ghi nhớ lâu", "Làm bài kiểm tra tốt"]),
            (47.3, "NHẮC LỊCH ZOOM", "20:00 tối nay", "orange", ["Có mặt sớm 5 phút", "Chuẩn bị sổ và bút", "Kiểm tra đường link Zoom"]),
        ],
        "illustrations": [
            ("thiếu những phương pháp học tập hiệu quả", "compass", "left-upper", "orange", "Thiếu phương pháp"),
            ("các bạn học tốt học giỏi", "growth", "right-upper", "cyan", "Học sinh tiến bộ"),
            ("có phương pháp", "checklist", "left-mid", "orange", "Phương pháp đúng"),
            ("ghi nhớ lâu", "book", "right-mid", "cyan", "Ghi nhớ lâu"),
            ("có mặt sớm và đúng giờ", "clock", "left-upper", "orange", "Có mặt đúng giờ"),
            ("20h", "video", "right-upper", "cyan", "Zoom lúc 20:00"),
        ],
        "program_anchor": "bí mật giúp con ham học",
    },
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", value.lower()).replace("đ", "d")
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", value)


def load_words(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if data.get("words"):
        words = data["words"]
    else:
        words = [word for segment in data.get("segments", []) for word in segment.get("words", [])]
    replacements = {"Cheo": "Treo", "cheo": "treo", "rục": "giục", "rã": "giã"}
    return [
        {"text": replacements.get(str(word.get("word", "")).strip(), str(word.get("word", "")).strip()),
         "start": float(word["start"]), "end": float(word["end"])}
        for word in words if word.get("start") is not None and word.get("end") is not None
    ]


def remap_words(words: list[dict], cuts: list[tuple[float, float]]) -> list[dict]:
    output: list[dict] = []
    cursor = 0.0
    for start, end in cuts:
        for word in words:
            if word["start"] >= start - 0.03 and word["end"] <= end + 0.03:
                output.append({
                    "text": word["text"],
                    "start": round((cursor + word["start"] - start) / SPEED * FPS),
                    "end": round((cursor + word["end"] - start) / SPEED * FPS),
                })
        cursor += end - start
    return output


def caption_cues(words: list[dict]) -> list[dict]:
    cues: list[dict] = []
    for index in range(0, len(words), 6):
        group = words[index:index + 6]
        if not group:
            continue
        cues.append({
            "from": group[0]["start"],
            "durationInFrames": max(1, group[-1]["end"] - group[0]["start"]),
            "words": group,
        })
    return cues


def find_frame(words: list[dict], phrase: str) -> int:
    needle = [normalize(token) for token in phrase.split() if normalize(token)]
    haystack = [normalize(word["text"]) for word in words]
    for start in range(len(haystack) - len(needle) + 1):
        if haystack[start:start + len(needle)] == needle:
            return int(words[start]["start"])
    compact = normalize(phrase)
    for start in range(len(words)):
        joined = ""
        for end in range(start, min(len(words), start + len(needle) + 4)):
            joined += haystack[end]
            if compact in joined or joined in compact and len(joined) >= max(4, len(compact) - 3):
                return int(words[start]["start"])
    raise ValueError(f"Missing spoken anchor: {phrase}")


def motion_cues(total_frames: int) -> list[dict]:
    span = FPS * 3
    scales = [1.0, 1.045, 1.015, 1.065, 1.025, 1.055]
    result = []
    for index, start in enumerate(range(0, total_frames, span)):
        result.append({
            "from": start,
            "durationInFrames": min(span, total_frames - start),
            "fromScale": scales[index % len(scales)],
            "toScale": scales[(index + 1) % len(scales)],
            "fromX": -3 if index % 2 == 0 else 3,
            "toX": 3 if index % 2 == 0 else -3,
            "fromY": 1 if index % 3 == 0 else 0,
            "toY": -1 if index % 3 == 0 else 1,
        })
    return result


def main() -> None:
    PROPS.mkdir(parents=True, exist_ok=True)
    for stem, config in CONFIG.items():
        words = remap_words(load_words(config["transcript"]), config["cuts"])
        duration = sum(end - start for start, end in config["cuts"]) / SPEED
        total_frames = round(duration * FPS)
        props = {
            "width": 1080,
            "height": 1920,
            "fps": FPS,
            "scenes": [{"render": f"staging/tdc-zoom-reminders/{stem}-clean.mp4", "durationInFrames": total_frames}],
            "captions": caption_cues(words),
            "speakerScale": 1.006,
            "speakerMotionBoost": 1.0,
            "speakerDriftBoost": 1.0,
            "speakerOffsetY": 0,
            "motionCues": motion_cues(total_frames),
            "editorials": [
                {"from": round(second * FPS), "durationInFrames": round(4.5 * FPS), "eyebrow": eyebrow,
                 "lines": [[{"text": line1}], [{"text": line2, "color": color}]], "offsetX": [0, -60, 64, -44, 55, 0][index]}
                for index, (second, eyebrow, line1, line2, color) in enumerate(config["editorials"])
            ],
            "infographics": [
                {"from": round(second * FPS), "durationInFrames": round(2.8 * FPS), "eyebrow": eyebrow,
                 "title": title, "accent": accent, "rows": rows}
                for second, eyebrow, title, accent, rows in config["infographics"]
            ],
            "illustrationCues": [],
            "emphasisCues": [{"from": find_frame(words, config["program_anchor"]), "durationInFrames": round(3 * FPS), "kind": "program"}],
            "brollCues": [],
        }
        for item in config["illustrations"]:
            phrase, icon_type, position, accent, label, *value = item
            props["illustrationCues"].append({
                "from": find_frame(words, phrase),
                "durationInFrames": round(1.9 * FPS),
                "type": icon_type,
                "position": position,
                "accent": accent,
                "label": label,
                **({"value": value[0]} if value else {}),
            })
        props["sfxCues"] = sorted(
            [
                *[{"from": cue["from"], "file": "quick-swoosh.mp3", "gain": 0.06} for cue in props["editorials"][::2]],
                *[{"from": cue["from"], "file": "swoosh.mp3", "gain": 0.06} for cue in props["infographics"]],
                *[{"from": cue["from"] + 4, "file": "pop-2.mp3", "gain": 0.03} for cue in props["illustrationCues"][1::2]],
                {"from": props["emphasisCues"][0]["from"], "file": "quick-ting.mp3", "gain": 0.04},
            ],
            key=lambda cue: cue["from"],
        )
        plan = {"source": config["source"], "blocks": [{"start": start, "end": end} for start, end in config["cuts"]],
                "speed": SPEED, "durationAfterSpeed": duration, "totalFrames": total_frames}
        (PROPS / f"{stem}.json").write_text(json.dumps(props, ensure_ascii=False, indent=2), encoding="utf-8")
        (PROJECT / f"{stem}.plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{stem}: {duration:.2f}s, {len(words)} words, {total_frames} frames")


if __name__ == "__main__":
    main()
