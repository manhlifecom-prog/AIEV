import OpenAI from "openai";

export const OPENAI_MODELS = {
  director: process.env.OPENAI_DIRECTOR_MODEL || "gpt-5.5",
  fast: process.env.OPENAI_FAST_MODEL || "gpt-5.4-mini",
  image: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
  transcription: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
  speech: process.env.OPENAI_SPEECH_MODEL || "gpt-4o-mini-tts",
} as const;

export function openaiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function hasOpenAIAuth(): boolean {
  return Boolean(openaiApiKey());
}

export function openaiClient(): OpenAI {
  const apiKey = openaiApiKey();
  if (!apiKey) throw new Error("Chưa có OPENAI_API_KEY. Mở Kết nối > OpenAI để thêm key.");
  return new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
}

export type ModelRole = keyof typeof OPENAI_MODELS;

