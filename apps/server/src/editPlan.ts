export type TimedEventType =
  | "cut"
  | "subtitle"
  | "keyword"
  | "zoom"
  | "text-overlay"
  | "illustration"
  | "sfx"
  | "scene"
  | "cta";

export interface TimedEditEvent {
  startTime: number;
  endTime: number;
  type: TimedEventType;
  content: string;
  style: Record<string, string | number | boolean>;
  priority: "low" | "medium" | "high";
}

export interface EditPlan {
  version: 1;
  project: { id: string; name: string };
  source: { file: string; duration: number; width: number; height: number; fps: number };
  transcript: { language: string; text: string };
  segments: TimedEditEvent[];
  cuts: TimedEditEvent[];
  subtitles: TimedEditEvent[];
  keywords: TimedEditEvent[];
  zoomEvents: TimedEditEvent[];
  textOverlays: TimedEditEvent[];
  illustrations: TimedEditEvent[];
  sfxEvents: TimedEditEvent[];
  music: { file: string | null; volume: number };
  scenes: TimedEditEvent[];
  cta: TimedEditEvent | null;
  brand: { styleId: string | null; colors: string[]; font: string; logo: string | null };
  renderSettings: { width: number; height: number; fps: number; quality: "draft" | "final" };
}

export const EDIT_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["version", "project", "source", "transcript", "segments", "cuts", "subtitles", "keywords", "zoomEvents", "textOverlays", "illustrations", "sfxEvents", "music", "scenes", "cta", "brand", "renderSettings"],
  properties: {
    version: { type: "integer", enum: [1] },
    project: { type: "object", additionalProperties: false, required: ["id", "name"], properties: { id: { type: "string" }, name: { type: "string" } } },
    source: { type: "object", additionalProperties: false, required: ["file", "duration", "width", "height", "fps"], properties: { file: { type: "string" }, duration: { type: "number" }, width: { type: "number" }, height: { type: "number" }, fps: { type: "number" } } },
    transcript: { type: "object", additionalProperties: false, required: ["language", "text"], properties: { language: { type: "string" }, text: { type: "string" } } },
    segments: { type: "array", items: { $ref: "#/$defs/event" } }, cuts: { type: "array", items: { $ref: "#/$defs/event" } }, subtitles: { type: "array", items: { $ref: "#/$defs/event" } }, keywords: { type: "array", items: { $ref: "#/$defs/event" } }, zoomEvents: { type: "array", items: { $ref: "#/$defs/event" } }, textOverlays: { type: "array", items: { $ref: "#/$defs/event" } }, illustrations: { type: "array", items: { $ref: "#/$defs/event" } }, sfxEvents: { type: "array", items: { $ref: "#/$defs/event" } }, scenes: { type: "array", items: { $ref: "#/$defs/event" } },
    music: { type: "object", additionalProperties: false, required: ["file", "volume"], properties: { file: { type: ["string", "null"] }, volume: { type: "number" } } },
    cta: { anyOf: [{ $ref: "#/$defs/event" }, { type: "null" }] },
    brand: { type: "object", additionalProperties: false, required: ["styleId", "colors", "font", "logo"], properties: { styleId: { type: ["string", "null"] }, colors: { type: "array", items: { type: "string" } }, font: { type: "string" }, logo: { type: ["string", "null"] } } },
    renderSettings: { type: "object", additionalProperties: false, required: ["width", "height", "fps", "quality"], properties: { width: { type: "integer" }, height: { type: "integer" }, fps: { type: "number" }, quality: { type: "string", enum: ["draft", "final"] } } },
  },
  $defs: { event: { type: "object", additionalProperties: false, required: ["startTime", "endTime", "type", "content", "style", "priority"], properties: { startTime: { type: "number", minimum: 0 }, endTime: { type: "number", minimum: 0 }, type: { type: "string", enum: ["cut", "subtitle", "keyword", "zoom", "text-overlay", "illustration", "sfx", "scene", "cta"] }, content: { type: "string" }, style: { type: "object", additionalProperties: { type: ["string", "number", "boolean"] } }, priority: { type: "string", enum: ["low", "medium", "high"] } } } },
} as const;

