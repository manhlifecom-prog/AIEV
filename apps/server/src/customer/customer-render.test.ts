import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { runMedia, probe } from "./media.js";
import { renderPlan } from "./render.js";
import { customerConfig } from "./config.js";

test("real FFmpeg pipeline produces a checked MP4 with resized video, audio, cuts and Vietnamese captions", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aiev-customer-render-"));
  try {
    await runMedia("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=navy:s=320x240:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-c:v", "libx264", "-c:a", "aac", "-shortest", "source.mp4"], directory);
    const stages: string[] = [];
    await renderPlan({ title: "Xin chào Việt Nam", ratio: "1:1", subtitles: true, segments: [{ start: 0, end: 0.5 }, { start: 1, end: 2 }] }, [{ word: "Xin chào", start: 0, end: 0.4 }, { word: "Việt Nam", start: 1.1, end: 1.7 }], true, directory, stage => stages.push(stage));
    const result = await probe("final.mp4", directory);
    assert.equal(result.width, 1080); assert.equal(result.height, 1080); assert.equal(result.hasAudio, true);
    assert.ok(Math.abs(result.duration - 1.5) < 0.2);
    assert.deepEqual(stages, ["Đang dựng bản xem trước", "Đang kiểm tra bản dựng", "Đang xuất video MP4"]);
    assert.equal(fs.existsSync(path.join(directory, "draft.mp4")), false);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("aiev-customer-render-"));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("uncapped probing accepts sources longer than five minutes and larger than 100 MiB", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aiev-customer-render-large-"));
  const prior = customerConfig.maxSeconds;
  try {
    customerConfig.maxSeconds = 0;
    await runMedia("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=160x90:r=1:d=601", "-c:v", "libx264", "-preset", "ultrafast", "source.mp4"], directory);
    const descriptor = fs.openSync(path.join(directory, "source.mp4"), "r+");
    fs.ftruncateSync(descriptor, 101 * 1024 * 1024); fs.closeSync(descriptor);
    assert.ok((await probe("source.mp4", directory)).duration > 600);
  } finally {
    customerConfig.maxSeconds = prior;
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("aiev-customer-render-large-"));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
