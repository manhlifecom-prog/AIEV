import { Router } from "express";
import { upsertEnvVar } from "../config.js";
import { OPENAI_MODELS, hasOpenAIAuth, openaiClient, openaiApiKey } from "../openaiConfig.js";
import { HttpError } from "../util.js";

const router = Router();
const MODEL_ENV = { directorModel: "OPENAI_DIRECTOR_MODEL", fastModel: "OPENAI_FAST_MODEL", imageModel: "OPENAI_IMAGE_MODEL", transcriptionModel: "OPENAI_TRANSCRIPTION_MODEL" } as const;
function maskKey(key: string): string { return key.length < 10 ? "••••" : `${key.slice(0, 5)}••••${key.slice(-4)}`; }
function payload() {
  const key = openaiApiKey();
  return { connections: [{ id: "openai", label: "OpenAI", roles: ["edit", "chat", "image", "transcription"], connected: hasOpenAIAuth(), source: key ? "api-key" : null, note: key ? "OpenAI đang đảm nhiệm Director, tác vụ nhanh, tạo ảnh và STT cloud tùy chọn." : "Thêm OPENAI_API_KEY để dùng các tính năng AI cloud.", key: { envVar: "OPENAI_API_KEY", present: Boolean(key), masked: key ? maskKey(key) : null }, keyHelpUrl: "https://platform.openai.com/api-keys", models: OPENAI_MODELS, transcriptionPreference: process.env.TRANSCRIPTION_ENGINE || "local" }] };
}
router.get("/", (_req, res) => res.json(payload()));
router.put("/openai/key", (req, res) => {
  const raw = (req.body as { apiKey?: unknown } | undefined)?.apiKey;
  if (raw !== null && typeof raw !== "string") throw new HttpError(400, "INVALID_KEY", "apiKey phải là string hoặc null");
  let value = typeof raw === "string" ? raw.trim().replace(/^OPENAI_API_KEY\s*=\s*/i, "").replace(/^["']+|["']+$/g, "") : null;
  if (value && (value.length < 10 || /[\r\n]/.test(value))) throw new HttpError(400, "INVALID_KEY", "OpenAI API key không hợp lệ");
  upsertEnvVar("OPENAI_API_KEY", value); if (value) process.env.OPENAI_API_KEY = value; else delete process.env.OPENAI_API_KEY;
  res.json(payload());
});
router.put("/openai/settings", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const [field, envName] of Object.entries(MODEL_ENV)) { if (field in body) { const value = String(body[field] || "").trim(); if (!/^[a-z0-9][a-z0-9.-]*$/i.test(value)) throw new HttpError(400, "INVALID_MODEL", `${field} không hợp lệ`); upsertEnvVar(envName, value); process.env[envName] = value; } }
  if ("transcriptionPreference" in body) { const value = body.transcriptionPreference; if (value !== "local" && value !== "openai") throw new HttpError(400, "INVALID_TRANSCRIPTION_ENGINE", "Chỉ hỗ trợ local hoặc openai"); upsertEnvVar("TRANSCRIPTION_ENGINE", value); process.env.TRANSCRIPTION_ENGINE = value; }
  res.json(payload());
});
router.post("/openai/test", async (_req, res) => {
  if (!hasOpenAIAuth()) return res.json({ ok: false, message: "Chưa có OPENAI_API_KEY." });
  try { await openaiClient().models.list(); res.json({ ok: true, message: "OpenAI API key hoạt động." }); }
  catch (err) { res.json({ ok: false, message: `OpenAI từ chối kết nối: ${err instanceof Error ? err.message : String(err)}` }); }
});
router.put("/:provider/key", (_req, _res) => { throw new HttpError(404, "PROVIDER_NOT_FOUND", "AIEV chỉ hỗ trợ OpenAI runtime."); });
router.post("/:provider/test", (_req, _res) => { throw new HttpError(404, "PROVIDER_NOT_FOUND", "AIEV chỉ hỗ trợ OpenAI runtime."); });
export default router;
