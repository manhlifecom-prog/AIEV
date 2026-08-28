import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import dotenv from "dotenv";

const repo = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(repo, ".env.local"), quiet: true });
dotenv.config({ path: path.join(repo, ".env"), quiet: true });
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const inputName = process.argv[2] || "ads-vinh-audio.mp3";
const outputName = process.argv[3] || "ads-vinh-transcript.json";
const result = await client.audio.transcriptions.create({
  file: fs.createReadStream(path.join(repo, ".runtime", "tmp", inputName)),
  model: "whisper-1",
  language: "vi",
  response_format: "verbose_json",
  timestamp_granularities: ["segment", "word"],
});

fs.writeFileSync(
  path.join(repo, ".runtime", "tmp", outputName),
  JSON.stringify(result, null, 2),
  "utf8",
);
console.log(`[transcribe] ${result.duration ?? "?"}s, ${result.segments?.length ?? 0} segments`);
