# AIEV - AI Edit Video dùng OpenAI

AIEV dùng GPT làm Edit Director và giữ pipeline dựng video chạy local:

```text
VIDEO GỐC
-> faster-whisper local (mặc định)
-> GPT EDIT DIRECTOR qua OpenAI Responses API
-> edit-plan.json có schema
-> HyperFrames + GSAP
-> Remotion
-> FFmpeg + QC
-> MP4
```

OpenAI Image Generation chỉ tạo nền/ảnh minh họa không chữ. Remotion tiếp tục chịu trách nhiệm chữ tiếng Việt, logo thật, CTA và bố cục. Codex dùng để phát triển dự án, không phải runtime video và không cần mở ChatGPT khi AIEV chạy.

Các tính năng Videos Project, Auto Cut, Text to Video, Images Project, Style Design, Video Styles, Skills, Prompts, SFX, Music, Render Queue, QC, GPU, thumbnail, publish pack, upload điện thoại/tunnel, dashboard và lịch sử project vẫn được giữ.

## Chạy trên Windows

Double-click `start\start.bat`. Script sẽ kiểm tra Node, FFmpeg, Chrome, OpenAI key, Python, faster-whisper, GPU/NVENC và cloudflared; sau đó cài dependency, chạy backend/frontend và mở [http://localhost:6868](http://localhost:6868).

Nhập hoặc kiểm tra key tại **Kết nối > OpenAI**. Key nằm trong `.env.local` đã gitignore và không được trả về frontend/log.

Các model được cấu hình tập trung:

```env
OPENAI_DIRECTOR_MODEL=gpt-5.5
OPENAI_FAST_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
TRANSCRIPTION_ENGINE=local
```

## Preset Thầy Vinh

Style Design `ThayVinhToan.vn` và skill `education-ads-thay-vinh` dùng 9:16, 1080x1920, 30fps, Be Vietnam Pro, karaoke tối đa 2-3 dòng, giữ safe area, zoom 103%-115% và cấu trúc hook → vấn đề → giá trị → bằng chứng → CTA.

Xem [kiến trúc OpenAI](docs/OPENAI_ARCHITECTURE.md) và [API contract](docs/API.md).
