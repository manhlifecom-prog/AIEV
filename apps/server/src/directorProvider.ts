import fs from "node:fs";
import path from "node:path";
import { OPENAI_MODELS, openaiClient } from "./openaiConfig.js";
import { paths, repoRoot } from "./config.js";

export interface DirectorProvider { run(input: DirectorRunInput): DirectorRun }
export interface DirectorRunInput { prompt: string; previousResponseId?: string | null; model?: string | null; effort?: string | null; projectId?: string | null }
export interface DirectorEvent { type: "init" | "text" | "tool" | "result"; responseId?: string; text?: string; tool?: { name: string; input: unknown }; usage?: { input_tokens: number; output_tokens: number; cached_tokens: number }; result?: string }
export interface DirectorRun extends AsyncIterable<DirectorEvent> { interrupt(): Promise<void> }

const TOOLS = [
  { type: "function" as const, name: "getTranscript", description: "Read the current project's transcript with word timestamps.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { type: "function" as const, name: "getSourceMetadata", description: "Read project meta.json and source metadata.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { type: "function" as const, name: "readProjectFile", description: "Read a UTF-8 file inside one video project.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" }, file: { type: "string" } }, required: ["projectId", "file"] } },
  { type: "function" as const, name: "writeProjectFile", description: "Write a UTF-8 project file. Use for edit-plan.json and HyperFrames scenes only.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" }, file: { type: "string" }, content: { type: "string" } }, required: ["projectId", "file", "content"] } },
  { type: "function" as const, name: "generateIllustration", description: "Generate a brand-safe OpenAI illustration for a timestamp.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" }, prompt: { type: "string" }, name: { type: "string" }, aspect: { type: "string", enum: ["9:16", "16:9", "1:1", "4:5"] } }, required: ["projectId", "prompt", "name", "aspect"] } },
  { type: "function" as const, name: "renderDraft", description: "Queue a Remotion draft render.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { type: "function" as const, name: "runQC", description: "Run automated QC on the current draft.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" } }, required: ["projectId"] } },
  { type: "function" as const, name: "renderFinal", description: "Queue final render after draft and QC pass.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { projectId: { type: "string" } }, required: ["projectId"] } },
];

function projectRoot(projectId: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(projectId)) throw new Error("projectId không hợp lệ");
  const root = path.resolve(paths.videoProjectsDir, projectId);
  if (!root.startsWith(path.resolve(paths.videoProjectsDir) + path.sep)) throw new Error("Đường dẫn project không hợp lệ");
  return root;
}
function projectFile(projectId: string, rel: string): string {
  const root = projectRoot(projectId); const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep)) throw new Error("File nằm ngoài project");
  return file;
}
async function localPost(url: string, body: unknown): Promise<unknown> {
  const r = await fetch(`http://127.0.0.1:6869${url}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AIEV_API_TOKEN || ""}` }, body: JSON.stringify(body) });
  const text = await r.text(); if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return text; }
}
async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const projectId = String(args.projectId || "");
  if (name === "getSourceMetadata") return JSON.parse(fs.readFileSync(projectFile(projectId, "meta.json"), "utf8"));
  if (name === "getTranscript") {
    const candidates = ["assets/transcript.json", "transcript.json"];
    for (const rel of candidates) { const file = projectFile(projectId, rel); if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")); }
    throw new Error("Project chưa có transcript");
  }
  if (name === "readProjectFile") return fs.readFileSync(projectFile(projectId, String(args.file)), "utf8");
  if (name === "writeProjectFile") { const file = projectFile(projectId, String(args.file)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, String(args.content), "utf8"); return { ok: true, file: path.relative(repoRoot, file).replaceAll("\\", "/") }; }
  if (name === "generateIllustration") return localPost("/api/illustrations", args);
  if (name === "renderDraft") return localPost("/api/jobs", { projectId, type: "assemble-draft" });
  if (name === "runQC") return localPost(`/api/projects/${projectId}/qc`, {});
  if (name === "renderFinal") return localPost("/api/jobs", { projectId, type: "assemble-final" });
  throw new Error(`Tool không được hỗ trợ: ${name}`);
}

export class OpenAIDirectorProvider implements DirectorProvider {
  run(input: DirectorRunInput): DirectorRun {
    const controller = new AbortController();
    const iterator = async function* (): AsyncGenerator<DirectorEvent> {
      let response = await openaiClient().responses.create({
        model: input.model || OPENAI_MODELS.director,
        reasoning: { effort: (input.effort === "low" || input.effort === "high" ? input.effort : "medium") },
        instructions: "You are AIEV's video Edit Director. Use only the bounded project tools. Preserve Style Design, produce edit-plan.json before scenes, keep changes incremental during review, render draft, run QC, then render final. Never access secrets or files outside the active video project.",
        input: input.prompt,
        previous_response_id: input.previousResponseId || undefined,
        tools: TOOLS,
      }, { signal: controller.signal });
      yield { type: "init", responseId: response.id };
      for (let turn = 0; turn < 30; turn++) {
        const calls = response.output.filter((item) => item.type === "function_call");
        if (!calls.length) break;
        const outputs = [];
        for (const call of calls) {
          let args: Record<string, unknown> = {}; try { args = JSON.parse(call.arguments) as Record<string, unknown>; } catch { /* validated below */ }
          yield { type: "tool", tool: { name: call.name, input: args } };
          let output: unknown; try { output = await executeTool(call.name, args); } catch (err) { output = { error: err instanceof Error ? err.message : String(err) }; }
          outputs.push({ type: "function_call_output" as const, call_id: call.call_id, output: JSON.stringify(output) });
        }
        response = await openaiClient().responses.create({ model: input.model || OPENAI_MODELS.director, previous_response_id: response.id, input: outputs, tools: TOOLS }, { signal: controller.signal });
      }
      const usage = { input_tokens: response.usage?.input_tokens ?? 0, output_tokens: response.usage?.output_tokens ?? 0, cached_tokens: response.usage?.input_tokens_details?.cached_tokens ?? 0 };
      yield { type: "text", text: response.output_text };
      yield { type: "result", result: response.output_text, responseId: response.id, usage };
    }();
    return { [Symbol.asyncIterator]: () => iterator, interrupt: async () => controller.abort() };
  }
}

export const directorProvider: DirectorProvider = new OpenAIDirectorProvider();

export interface Query extends AsyncIterable<unknown> { interrupt(): Promise<void> }
export function query(args: { prompt: string; options?: Record<string, unknown> }): Query {
  const run = directorProvider.run({
    prompt: args.prompt,
    previousResponseId: typeof args.options?.resume === "string" ? args.options.resume : null,
    model: typeof args.options?.model === "string" ? args.options.model : null,
    effort: typeof args.options?.effort === "string" ? args.options.effort : null,
  });
  const mapped = async function* () {
    for await (const event of run) {
      if (event.type === "init") yield { type: "system", subtype: "init", session_id: event.responseId };
      else if (event.type === "tool") yield { type: "assistant", message: { content: [{ type: "tool_use", name: event.tool?.name, input: event.tool?.input }] } };
      else if (event.type === "text") yield { type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: event.text } } };
      else if (event.type === "result") yield { type: "result", subtype: "success", result: event.result, usage: { input_tokens: event.usage?.input_tokens, output_tokens: event.usage?.output_tokens, cache_read_input_tokens: event.usage?.cached_tokens } };
    }
  }();
  return { [Symbol.asyncIterator]: () => mapped, interrupt: () => run.interrupt() };
}
