# OpenAI runtime architecture

The backend uses `DirectorProvider`, implemented by `OpenAIDirectorProvider`, over the Responses API. The Director has bounded tools only: transcript and metadata reads, project-scoped file reads/writes, illustration generation, draft render, QC and final render. It cannot read files outside the selected video project and has no unrestricted shell tool.

Short metadata/classification tasks use the FAST model. Timeline-like tasks should use strict JSON Schema outputs; `editPlan.ts` defines the canonical event contract. Image generation uses the Images API and inherits Style Design context. Local faster-whisper remains the default transcription path because it supplies word timestamps needed by karaoke subtitles.

Runtime cloud calls occur for GPT Director reasoning, FAST text tasks, image generation and optional OpenAI transcription. HyperFrames, GSAP, Chrome rasterization, Remotion, FFmpeg, QC, local transcription and VieNeu-TTS run on the user's machine.

Usage rows record OpenAI input/output tokens. Unknown pricing remains zero instead of crashing; image operations are still recorded even when the endpoint does not return token usage.
