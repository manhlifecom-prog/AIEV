import { Router } from "express";
import { IMAGE_MODELS } from "../gemini.js";
import { OPENAI_MODELS, hasOpenAIAuth, openaiClient } from "../openaiConfig.js";
import { HttpError } from "../util.js";

export const OPENAI_DIRECTOR_MODELS = [
  { id: "gpt-5.5", label: "GPT-5.5 (Director)" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini (nhanh)" },
];
export const EFFORT_LEVELS = ["low", "medium", "high"];

export function parseModelEffort(body: Record<string, unknown>): { model?: string; effort?: string } {
  const out: { model?: string; effort?: string } = {};
  if (body.model !== undefined && body.model !== null && body.model !== "") {
    if (typeof body.model !== "string" || !/^(gpt|o)[a-z0-9.-]+$/i.test(body.model)) throw new HttpError(400, "INVALID_MODEL", "OpenAI model id không hợp lệ");
    out.model = body.model;
  }
  if (body.effort !== undefined && body.effort !== null && body.effort !== "") {
    if (typeof body.effort !== "string" || !EFFORT_LEVELS.includes(body.effort)) throw new HttpError(400, "INVALID_EFFORT", "effort phải là low, medium hoặc high");
    out.effort = body.effort;
  }
  return out;
}

const router = Router();
router.get("/", (_req, res) => res.json({ providers: [{ id: "openai", label: "OpenAI", connected: hasOpenAIAuth(), source: hasOpenAIAuth() ? "api-key" : null, roles: ["edit", "chat", "image", "transcription"], models: OPENAI_DIRECTOR_MODELS, modelRoles: OPENAI_MODELS }] }));
router.get("/openai/models", async (_req, res) => {
  if (!hasOpenAIAuth()) return res.json({ source: "static", models: OPENAI_DIRECTOR_MODELS, imageModels: IMAGE_MODELS });
  try {
    const page = await openaiClient().models.list();
    const models = page.data.filter((m) => /^(gpt|o)[a-z0-9.-]+$/i.test(m.id)).map((m) => ({ id: m.id, label: m.id })).sort((a, b) => b.id.localeCompare(a.id));
    res.json({ source: "openai", models, imageModels: IMAGE_MODELS });
  } catch { res.json({ source: "static", models: OPENAI_DIRECTOR_MODELS, imageModels: IMAGE_MODELS }); }
});
router.get("/openai/image-models", (_req, res) => res.json({ source: "static", models: IMAGE_MODELS }));

export default router;
