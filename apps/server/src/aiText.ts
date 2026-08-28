import { nanoid } from "nanoid";
import { addTokenUsage } from "./db.js";
import { OPENAI_MODELS, hasOpenAIAuth, openaiClient } from "./openaiConfig.js";
import { HttpError } from "./util.js";

export interface AiTextResult { text: string; inputTokens: number; outputTokens: number; costUsd: number }

export async function generateText(input: {
  prompt: string; usageTag: string; projectId?: string | null; timeoutMs?: number;
  model?: string | null; jsonSchema?: { name: string; schema: Record<string, unknown> };
}): Promise<AiTextResult> {
  if (!hasOpenAIAuth()) throw new HttpError(503, "NO_OPENAI_AUTH", "Chưa có OPENAI_API_KEY. Mở Kết nối > OpenAI để thêm key.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 180_000);
  let inputTokens = 0, outputTokens = 0, text = "";
  const model = input.model || OPENAI_MODELS.fast;
  try {
    const response = await openaiClient().responses.create({
      model, input: input.prompt,
      ...(input.jsonSchema ? { text: { format: { type: "json_schema" as const, name: input.jsonSchema.name, strict: true, schema: input.jsonSchema.schema } } } : {}),
    }, { signal: controller.signal });
    text = response.output_text;
    inputTokens = response.usage?.input_tokens ?? 0;
    outputTokens = response.usage?.output_tokens ?? 0;
  } catch (err) {
    throw new HttpError(502, "OPENAI_FAILED", `Gọi OpenAI thất bại: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
    try { if (inputTokens || outputTokens) addTokenUsage(`${input.usageTag}_${nanoid(8)}`, input.projectId ?? null, inputTokens, outputTokens, 0, "openai"); } catch { /* usage không chặn luồng chính */ }
  }
  return { text, inputTokens, outputTokens, costUsd: 0 };
}

/** Compatibility helper; structured callers should use jsonSchema. */
export function extractJson<T = unknown>(text: string): T | null {
  try { return JSON.parse(text.trim()) as T; } catch { return null; }
}
