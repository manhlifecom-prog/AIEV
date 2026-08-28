# AIEV - OpenAI Video Edit Director

AIEV edits videos with an OpenAI-powered director while keeping the rendering pipeline local.

```text
source video
  -> faster-whisper (local, default)
  -> GPT Edit Director (OpenAI Responses API)
  -> structured edit-plan.json
  -> HyperFrames + GSAP scenes
  -> Remotion timeline
  -> FFmpeg + QC
  -> final MP4
```

OpenAI Image Generation creates optional text-free illustrations/backgrounds. Remotion remains responsible for Vietnamese text, logo, CTA and layout. Codex is a development tool, not the application's video API or runtime login.

## Preserved features

Video Projects, Auto Cut, Text to Video, Images Project, Style Design, Video Styles, Skills, Prompts, Sound Effects, Music, Render Queue, QC, GPU acceleration, thumbnails, publish packs, phone upload/tunnel, dashboard and project history remain part of the application.

## Requirements

- Node.js 22+
- FFmpeg and ffprobe
- Google Chrome or Chromium (local rendering only; no Google AI API)
- Python + faster-whisper for default local transcription
- `OPENAI_API_KEY` for Director and cloud image generation
- Optional NVIDIA NVENC / Apple VideoToolbox

## Windows quick start

Clone the repository, then double-click `start\start.bat`. It checks the environment, installs JavaScript dependencies, starts backend and frontend, and opens [http://localhost:6868](http://localhost:6868).

Add or test the key at **Connections > OpenAI**. Secrets are stored in ignored `.env.local` and are never returned to frontend logs.

Model roles are centralized:

```env
OPENAI_DIRECTOR_MODEL=gpt-5.5
OPENAI_FAST_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
TRANSCRIPTION_ENGINE=local
```

Local development:

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## State and resume

Project state is independent of any provider conversation ID: project files, `edit-plan.json`, chat messages, tool outputs, jobs, render state, assets, errors and the last successful step remain local. The stored OpenAI response ID only optimizes conversational continuation; after a restart AIEV reconstructs work from project state.

## Brand preset

The built-in `ThayVinhToan.vn` Style Design and `education-ads-thay-vinh` skill target 9:16 1080x1920 at 30fps, Be Vietnam Pro, safe karaoke captions, restrained 103%-115% zoom and an education-ad hook/problem/value/proof/CTA structure.

See [docs/OPENAI_ARCHITECTURE.md](docs/OPENAI_ARCHITECTURE.md) and [docs/API.md](docs/API.md).
