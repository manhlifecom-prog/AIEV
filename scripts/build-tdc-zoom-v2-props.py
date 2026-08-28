from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "projects" / "tdc-zoom-reminders-20260827"
TRANSCRIPTS = PROJECT / "transcripts"
PROPS = PROJECT / "props-v2"
FPS = 30
SPEED = 1.07
POSTER_FRAMES = 3 * FPS
POSTER_SRC = "broll/brand/tdc-bimat-program-poster-v1.jpg"
CTA_SOURCE = "imports/drive-128bcNdTYBkx10pYqKBONMrc2vMYDDWpx/video-qc-1/11.MOV"
CTA_TRANSCRIPT = ROOT / ".runtime" / "tmp" / "drive-transcripts-words" / "video-qc-1--11.json"
CTA_CUT = (1.10, 12.35)
PROGRAM_NAME_SOURCE = "imports/drive-128bcNdTYBkx10pYqKBONMrc2vMYDDWpx/video-chuc-mung/1.MOV"
PROGRAM_NAME_TRANSCRIPT = ROOT / ".runtime" / "tmp" / "drive-transcripts-words" / "video-chuc-mung--1.json"
PROGRAM_NAME_CUT = (8.68, 10.55)


SESSIONS = {
    "buoi-1": {
        "source": "Buoi-1-IMG_2421.MOV",
        "transcript": TRANSCRIPTS / "buoi-1.json",
        "reminder_cuts": [(1.44, 13.85), (40.44, 59.81), (96.50, 122.55), (131.07, 142.30)],
        "ad_cuts": [(1.44, 13.85), (40.44, 59.81), (96.50, 107.44)],
        "speaker_offset_y": 140,
        "editorials": [
            (0.0, "TÌNH HUỐNG QUEN THUỘC", "Con quên", "sách vở quan trọng", "orange"),
            (11.6, "ĐIỀU BỐ MẸ CHƯA THẤY", "Làm hộ con", "mất quyền tự chủ", "cyan"),
            (28.6, "BÀI HỌC QUAN TRỌNG", "Tự kiểm soát", "đồ dùng & bài tập", "orange"),
            (36.8, "NỘI DUNG BUỔI 1", "Đồng hành đúng", "giúp con tự chủ", "cyan"),
            (55.2, "CHỈ CÒN 2 TIẾNG", "Zoom bắt đầu", "20:00 tối nay", "orange"),
            (61.5, "BÍ MẬT GIÚP CON HAM HỌC", "Buổi 1", "Thắp lửa tự chủ", "cyan"),
        ],
        "infographics": [
            ("một km", "TÌNH HUỐNG THỰC TẾ", "CHỈ CÁCH TRƯỜNG 1 KM", "orange", ["Mang sách đến ngay?", "Hay để con tự chịu trách nhiệm?", "Một lựa chọn tạo nên thói quen"], "all"),
            ("quyền tự chủ và trách nhiệm", "VÒNG LẶP TỰ CHỦ", "TRAO QUYỀN ĐÚNG CÁCH", "cyan", ["Con tự kiểm tra", "Con tự chịu trách nhiệm", "Con trưởng thành từ trải nghiệm"], "all"),
            ("8 giờ tối", "NHẮC LỊCH ZOOM", "20:00 TỐI NAY", "orange", ["Có mặt sớm 5 phút", "Chuẩn bị sổ và bút", "Kiểm tra đường link Zoom"], "reminder"),
        ],
        "broll": [
            ("quên hai quyển sách", 3.2, "broll/tdc-zoom-reminders/ai/quen-sach-v1.png", "left", "cover"),
            ("tước đi cái quyền tự chủ", 3.2, "broll/tdc-zoom-reminders/ai/cha-me-lam-ho-v1.png", "right", "cover"),
            ("bài học quan trọng nhất", 2.8, "broll/tdc-zoom-reminders/ai/tu-kiem-tra-cap-sach-v3.png", "left", "cover"),
            ("tự kiểm soát", 3.0, "broll/tdc-zoom-reminders/ai/sap-xep-do-dung-v3.png", "right", "cover"),
            ("đồng hành đúng", 3.0, "broll/tdc-zoom-reminders/ai/bo-dong-hanh-dung-v3.png", "left", "cover"),
            ("ít việc hơn", 2.7, "broll/tdc-zoom-reminders/ai/me-tin-tuong-con-v3.png", "right", "cover"),
            ("tự chủ và ham học", 3.0, "broll/tdc-zoom-reminders/ai/ham-hoc-kham-pha-v3.png", "left", "cover"),
        ],
        "program_anchor": "bí mật giúp con ham học",
    },
    "buoi-2": {
        "source": "Buoi-2-IMG_2423.MOV",
        "transcript": TRANSCRIPTS / "buoi-2.json",
        "reminder_cuts": [(1.94, 8.07), (19.40, 35.63), (58.52, 69.86), (80.18, 88.22), (100.56, 106.52), (111.87, 115.16), (116.50, 124.09)],
        "ad_cuts": [(1.94, 8.07), (19.40, 35.63), (58.52, 69.86), (80.18, 88.22), (100.56, 106.52)],
        "speaker_offset_y": 150,
        "editorials": [
            (0.0, "BỐ MẸ THƯỜNG LÀM", "Treo thưởng", "hoặc dọa nạt", "orange"),
            (5.6, "CHỈ LÀ BỀ NỔI", "Con hành động nhanh", "nhưng không bền vững", "cyan"),
            (20.9, "ĐỘNG LỰC BÊN NGOÀI", "Không tạo ra", "niềm vui học tập", "orange"),
            (31.4, "NỘI DUNG BUỔI 2", "3 động lực", "từ sâu bên trong", "cyan"),
            (43.0, "CHỈ CÒN 2 TIẾNG", "Có mặt sớm", "đúng giờ", "orange"),
            (55.0, "BÍ MẬT GIÚP CON HAM HỌC", "Buổi 2", "Kích hoạt năng lực tự học", "cyan"),
        ],
        "infographics": [
            ("bề nổi của tảng băng chìm", "THƯỞNG VÀ PHẠT", "CHỈ TÁC ĐỘNG BỀ NỔI", "orange", ["Con làm vì phần thưởng", "Con sợ bị phạt", "Động lực không bền vững"], "all"),
            ("3 cái động lực tự thân", "ĐỘNG LỰC BỀN VỮNG", "ĐẾN TỪ BÊN TRONG", "cyan", ["Niềm vui tiến bộ", "Cảm giác làm chủ", "Ý nghĩa của việc học"], "all"),
            ("20 giờ", "NHẮC LỊCH ZOOM", "20:00 TỐI NAY", "orange", ["Có mặt sớm 5 phút", "Chuẩn bị sổ và bút", "Kiểm tra đường link Zoom"], "reminder"),
        ],
        "broll": [
            ("treo thưởng dọa nạt", 3.2, "broll/tdc-zoom-reminders/ai/thuong-phat-v1.png", "left", "cover"),
            ("hành động rất là nhanh", 2.8, "broll/tdc-zoom-reminders/ai/hoc-vi-phan-thuong-v3.png", "right", "cover"),
            ("nội lực học tập tự thân", 3.0, "broll/tdc-zoom-reminders/ai/dong-luc-tu-than-v2.png", "left", "cover"),
            ("niềm vui của sự tiến bộ", 3.0, "broll/tdc-zoom-reminders/ai/niem-vui-tien-bo-v3.png", "right", "cover"),
            ("yếu tố ngoại lực", 2.8, "broll/tdc-zoom-reminders/ai/mat-ket-noi-ngoai-luc-v3.png", "left", "cover"),
            ("3 cái động lực tự thân rất mạnh mẽ", 3.0, "broll/tdc-zoom-reminders/ai/ba-dong-luc-tu-than-v3.png", "right", "cover"),
            ("tự chủ và ham học", 2.8, "broll/tdc-zoom-reminders/ai/tu-giac-hoc-bai-v3.png", "left", "cover"),
        ],
        "program_anchor": "bí mật giúp con ham học",
    },
    "buoi-3": {
        "source": "Buoi-3-IMG_2425.MOV",
        "transcript": TRANSCRIPTS / "buoi-3.json",
        "reminder_cuts": [(2.44, 13.06), (33.82, 48.73), (51.24, 72.60), (72.75, 104.20)],
        "ad_cuts": [(2.44, 13.06), (33.82, 48.73), (51.24, 72.60)],
        "speaker_offset_y": 140,
        "editorials": [
            (0.0, "CON ĐANG MẮC KẸT", "Không phải vì", "con lười học", "orange"),
            (9.9, "ĐIỂM CHUNG CỦA HỌC SINH GIỎI", "Có phương pháp", "học tập hiệu quả", "cyan"),
            (23.8, "NỘI DUNG BUỔI 3", "Học vừa phải", "nhưng nhớ lâu", "orange"),
            (39.8, "ĐÒN BẨY ĐÚNG", "Đạt kết quả tốt", "tạo động lực ham học", "cyan"),
            (54.2, "CHỈ CÒN 2 TIẾNG", "Zoom bắt đầu", "20:00 tối nay", "orange"),
            (62.0, "BÍ MẬT GIÚP CON HAM HỌC", "Buổi 3", "Phương pháp học hiệu quả", "cyan"),
        ],
        "infographics": [
            ("không phải là vì các con lười", "ĐIỀU BỐ MẸ CẦN BIẾT", "KHÔNG PHẢI VÌ CON LƯỜI", "orange", ["Con vẫn cố gắng", "Nhưng thiếu phương pháp", "Cần đúng công cụ học tập"], "all"),
            ("học ít học vừa phải", "CHU TRÌNH HỌC HIỆU QUẢ", "HỌC ĐÚNG — NHỚ LÂU", "cyan", ["Thuộc bài nhanh", "Ghi nhớ lâu", "Làm bài kiểm tra tốt"], "all"),
            ("đúng 20h", "NHẮC LỊCH ZOOM", "20:00 TỐI NAY", "orange", ["Có mặt sớm 5 phút", "Chuẩn bị sổ và bút", "Kiểm tra đường link Zoom"], "reminder"),
        ],
        "broll": [
            ("thiếu những phương pháp học tập hiệu quả", 3.2, "broll/tdc-zoom-reminders/ai/phuong-phap-hoc-v1.png", "left", "cover"),
            ("các bạn học tốt học giỏi", 2.8, "broll/tdc-zoom-reminders/ai/hoc-nhom-co-phuong-phap-v3.png", "right", "cover"),
            ("phương pháp học tập hiệu quả", 3.0, "broll/tdc-zoom-reminders/ai/phuong-phap-ghi-nho-v2.png", "left", "cover"),
            ("người bình thường cũng làm được", 2.8, "broll/tdc-zoom-reminders/ai/tien-bo-nho-hoc-dung-v3.png", "right", "cover"),
            ("ghi nhớ lâu", 3.2, "broll/tdc-zoom-reminders/ai/ky-thuat-ghi-nho-v3.png", "left", "cover"),
            ("làm tốt những bài kiểm tra", 2.8, "broll/tdc-zoom-reminders/ai/ket-qua-kiem-tra-v3.png", "right", "cover"),
            ("động lực ham học", 2.8, "broll/tdc-zoom-reminders/ai/yeu-thich-hoc-tap-v3.png", "left", "cover"),
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
    raw = data.get("words") or [word for segment in data.get("segments", []) for word in segment.get("words", [])]
    replacements = {"Cheo": "Treo", "cheo": "treo", "rục": "giục", "rã": "giã"}
    return [
        {"text": replacements.get(str(w.get("word", "")).strip(), str(w.get("word", "")).strip()), "start": float(w["start"]), "end": float(w["end"])}
        for w in raw if w.get("start") is not None and w.get("end") is not None
    ]


def remap_word_blocks(blocks: list[dict]) -> list[dict]:
    output: list[dict] = []
    cursor = 0.0
    for block in blocks:
        start, end, words = block["start"], block["end"], block["words"]
        for word in words:
            if word["start"] >= start - 0.03 and word["end"] <= end + 0.03:
                output.append({
                    "text": word["text"],
                    "start": round((cursor + word["start"] - start) / SPEED * FPS),
                    "end": round((cursor + word["end"] - start) / SPEED * FPS),
                })
        cursor += end - start
    return output


def find_frame(words: list[dict], phrase: str) -> int | None:
    needle = [normalize(token) for token in phrase.split() if normalize(token)]
    haystack = [normalize(word["text"]) for word in words]
    for start in range(len(haystack) - len(needle) + 1):
        if haystack[start:start + len(needle)] == needle:
            return int(words[start]["start"])
    compact = normalize(phrase)
    for start in range(len(words)):
        joined = ""
        for end in range(start, min(len(words), start + len(needle) + 5)):
            joined += haystack[end]
            if compact in joined or (joined in compact and len(joined) >= max(6, len(compact) - 4)):
                return int(words[start]["start"])
    return None


def caption_cues(words: list[dict]) -> list[dict]:
    groups: list[list[dict]] = []
    group: list[dict] = []
    for word in words:
        group.append(word)
        sentence_end = str(word["text"]).rstrip().endswith((".", "?", "!"))
        if len(group) >= 7 or (len(group) >= 5 and sentence_end):
            groups.append(group)
            group = []
    if group:
        if len(group) <= 2 and groups and len(groups[-1]) + len(group) <= 9:
            groups[-1].extend(group)
        else:
            groups.append(group)
    cues = []
    for group in groups:
        cues.append({"from": group[0]["start"], "durationInFrames": max(1, group[-1]["end"] - group[0]["start"] + 5), "words": group})
    return cues


def motion_cues(speech_frames: int) -> list[dict]:
    span = FPS * 3
    scales = [1.0, 1.045, 1.015, 1.065, 1.025, 1.055]
    return [
        {
            "from": start,
            "durationInFrames": min(span, speech_frames - start),
            "fromScale": scales[index % len(scales)],
            "toScale": scales[(index + 1) % len(scales)],
            "fromX": -3 if index % 2 == 0 else 3,
            "toX": 3 if index % 2 == 0 else -3,
            "fromY": 1 if index % 3 == 0 else 0,
            "toY": -1 if index % 3 == 0 else 1,
        }
        for index, start in enumerate(range(0, speech_frames, span))
    ]


def build_variant(stem: str, session: dict, variant: str) -> None:
    cuts = session[f"{variant}_cuts"]
    main_words = load_words(session["transcript"])
    blocks = [{"start": start, "end": end, "words": main_words} for start, end in cuts]
    plan_blocks = [{"start": start, "end": end} for start, end in cuts]
    if variant == "ad":
        blocks.append({"start": CTA_CUT[0], "end": CTA_CUT[1], "words": load_words(CTA_TRANSCRIPT)})
        plan_blocks.append({"start": CTA_CUT[0], "end": CTA_CUT[1], "source": CTA_SOURCE})
        blocks.append({"start": PROGRAM_NAME_CUT[0], "end": PROGRAM_NAME_CUT[1], "words": load_words(PROGRAM_NAME_TRANSCRIPT)})
        plan_blocks.append({"start": PROGRAM_NAME_CUT[0], "end": PROGRAM_NAME_CUT[1], "source": PROGRAM_NAME_SOURCE})
    words = remap_word_blocks(blocks)
    speech_seconds = sum(block["end"] - block["start"] for block in blocks) / SPEED
    speech_frames = round(speech_seconds * FPS)
    total_frames = speech_frames + POSTER_FRAMES

    editorials = []
    for index, (second, eyebrow, line1, line2, color) in enumerate(session["editorials"]):
        if second * FPS >= speech_frames - 20:
            continue
        if variant == "ad" and ("CHỈ CÒN" in eyebrow or "BÍ MẬT" in eyebrow):
            continue
        editorials.append({
            "from": round(second * FPS),
            "durationInFrames": round(4.2 * FPS),
            "eyebrow": eyebrow,
            "lines": [[{"text": line1}], [{"text": line2, "color": color}]],
            "offsetX": [0, -60, 64, -44, 55, 0][index % 6],
        })

    infographics = []
    for phrase, eyebrow, title, accent, rows, scope in session["infographics"]:
        if scope == "reminder" and variant != "reminder":
            continue
        frame = find_frame(words, phrase)
        if frame is None:
            continue
        infographics.append({
            "from": frame,
            "durationInFrames": round(3.0 * FPS),
            "eyebrow": eyebrow,
            "title": title,
            "accent": accent,
            "rows": rows,
        })

    broll = []
    for phrase, duration, src, direction, fit in session["broll"]:
        frame = find_frame(words, phrase)
        if frame is None:
            continue
        broll.append({
            "from": frame,
            "durationInFrames": round(duration * FPS),
            "src": src,
            "direction": direction,
            "fit": fit,
        })

    program_frame = find_frame(words, session["program_anchor"])
    reminder = variant == "reminder"
    cta_frame = find_frame(words, "đăng ký ngay") if not reminder else None
    reminder_climax = find_frame(words, "hẹn gặp lại") or find_frame(words, "20 giờ") or find_frame(words, "8 giờ tối")
    climax_frame = cta_frame if cta_frame is not None else reminder_climax
    if not reminder and cta_frame is not None:
        editorials.append({
            "from": cta_frame,
            "durationInFrames": round(3.6 * FPS),
            "eyebrow": "BƯỚC TIẾP THEO",
            "lines": [[{"text": "Đăng ký ngay"}], [{"text": "3 buổi tối miễn phí", "color": "orange"}]],
            "offsetX": 0,
        })
    if not reminder and program_frame is not None:
        editorials.append({
            "from": program_frame,
            "durationInFrames": round(1.85 * FPS),
            "eyebrow": "CHƯƠNG TRÌNH 3 BUỔI MIỄN PHÍ",
            "lines": [[{"text": "Bí Mật Giúp Con"}], [{"text": "Ham Học", "color": "cyan"}]],
            "offsetX": 0,
        })
    session_number = stem[-1]
    props = {
        "width": 1080,
        "height": 1920,
        "fps": FPS,
        "variant": variant,
        "bannerPrimary": "NHẮC LỊCH ZOOM" if reminder else "CHƯƠNG TRÌNH MIỄN PHÍ",
        "bannerAccent": "CHỈ CÒN 2 TIẾNG" if reminder else "BÍ MẬT GIÚP CON HAM HỌC",
        "scenes": [{"render": f"staging/tdc-zoom-reminders-v5/{stem}-{variant}-clean.mp4", "durationInFrames": total_frames}],
        "speechFrames": speech_frames,
        "captions": caption_cues(words),
        "speakerScale": 1.01,
        "speakerMotionBoost": 1.0,
        "speakerDriftBoost": 1.0,
        "speakerOffsetY": session["speaker_offset_y"],
        "climaxFrame": climax_frame,
        "climaxMusicLeadFrames": round(1.5 * FPS),
        "motionCues": motion_cues(speech_frames),
        "editorials": editorials,
        "infographics": infographics,
        "illustrationCues": [],
        "emphasisCues": ([{"from": program_frame, "durationInFrames": round(3 * FPS), "kind": "program"}] if reminder and program_frame is not None else []),
        "brollCues": broll,
        "posterCue": {
            "from": speech_frames,
            "durationInFrames": POSTER_FRAMES,
            "src": POSTER_SRC,
            "label": f"BUỔI {session_number} • 20:00 TỐI NAY" if reminder else "CHƯƠNG TRÌNH GIÁO DỤC MIỄN PHÍ",
            "cta": "20:00 TỐI NAY" if reminder else "ĐĂNG KÝ NGAY",
            "subtext": "Mở link Zoom và vào sớm 5 phút" if reminder else "Bí Mật Giúp Con Ham Học",
        },
    }
    props["sfxCues"] = sorted(
        [
            *[{"from": cue["from"], "file": "quick-swoosh.mp3", "gain": 0.055} for cue in editorials[::2]],
            *[{"from": cue["from"], "file": "swoosh.mp3", "gain": 0.05} for cue in infographics],
            {"from": speech_frames + 4, "file": "quick-ting.mp3", "gain": 0.035},
        ],
        key=lambda cue: cue["from"],
    )

    key = f"{stem}-{variant}"
    plan = {
        "source": session["source"],
        "variant": variant,
        "blocks": plan_blocks,
        "speed": SPEED,
        "speechDurationAfterSpeed": speech_seconds,
        "speechFrames": speech_frames,
        "posterFrames": POSTER_FRAMES,
        "totalFrames": total_frames,
    }
    (PROPS / f"{key}.json").write_text(json.dumps(props, ensure_ascii=False, indent=2), encoding="utf-8")
    (PROJECT / f"{key}.plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{key}: speech={speech_seconds:.2f}s total={total_frames / FPS:.2f}s words={len(words)} broll={len(broll)} info={len(infographics)}")


def main() -> None:
    PROPS.mkdir(parents=True, exist_ok=True)
    for stem, session in SESSIONS.items():
        build_variant(stem, session, "reminder")
        build_variant(stem, session, "ad")


if __name__ == "__main__":
    main()
