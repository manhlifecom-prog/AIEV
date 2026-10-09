import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import dns from "node:dns/promises";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { customerConfig, customerRepoRoot } from "./config.js";
import { isBlockedIp } from "../safeFetch.js";

export function driveFile(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Link Google Drive không hợp lệ"); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "drive.google.com" || parsed.username || parsed.password || parsed.port) throw new Error("Hãy dùng link file từ https://drive.google.com");
  const id = parsed.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || (parsed.pathname === "/open" || parsed.pathname === "/uc" ? parsed.searchParams.get("id") : null);
  if (!id || !/^[a-zA-Z0-9_-]{10,200}$/.test(id)) throw new Error("Hãy dùng link một file video cho tải file; thư mục phải qua bước lấy danh sách video.");
  const key = parsed.searchParams.get("resourcekey");
  if (key && !/^[a-zA-Z0-9_-]{1,200}$/.test(key)) throw new Error("Link Google Drive không hợp lệ");
  return { id, key };
}
function allowedHost(host: string) { return host === "drive.google.com" || host === "drive.usercontent.google.com" || host === "www.googleapis.com" || host === "googleusercontent.com" || host.endsWith(".googleusercontent.com"); }
export async function downloadDrive(url: string, destination: string) {
  const { id, key } = driveFile(url);
  let current = new URL("https://drive.usercontent.google.com/download");
  current.searchParams.set("id", id); current.searchParams.set("export", "download"); current.searchParams.set("confirm", "t");
  if (key) current.searchParams.set("resourcekey", key);
  const deadline = Date.now() + 24 * 60 * 60_000;
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (current.protocol !== "https:" || !allowedHost(current.hostname) || current.port || current.username || current.password) throw new Error("Google Drive chuyển tới địa chỉ không được phép");
    const addresses = await dns.lookup(current.hostname, { all: true });
    if (!addresses.length || addresses.some(x => isBlockedIp(x.address))) throw new Error("Địa chỉ tải video không hợp lệ");
    const address = addresses.find(x => x.family === 4) || addresses[0];
    const response = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
      const request = https.get(current, {
        lookup: (_host, options, callback) => {
          if (typeof options === "object" && options.all) callback(null, [{ address: address.address, family: address.family }]);
          else callback(null, address.address, address.family);
        },
        headers: { "user-agent": "AIEV-Customer/1.0", "accept-encoding": "identity" },
      }, resolve);
      const timer = setTimeout(() => request.destroy(new Error("Tải video quá thời gian cho phép")), Math.max(1, deadline - Date.now()));
      request.setTimeout(45_000, () => request.destroy(new Error("Google Drive không phản hồi")));
      request.on("error", reject); request.on("close", () => clearTimeout(timer));
    });
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      current = new URL(response.headers.location, current); response.destroy(); continue;
    }
    const mime = String(response.headers["content-type"] || "");
    if (response.statusCode !== 200 || /text\/html|application\/(json|xml)/i.test(mime)) {
      response.destroy(); throw new Error("Không tải được video. Hãy bật quyền 'Bất kỳ ai có đường liên kết' và cho phép tải xuống trên Google Drive.");
    }
    const tooLarge = () => new Error(`Video vượt giới hạn ${Math.floor(customerConfig.maxBytes / 1024 / 1024)} MB cho mỗi file`);
    if (customerConfig.maxBytes > 0 && Number(response.headers["content-length"]) > customerConfig.maxBytes) { response.destroy(); throw tooLarge(); }
    let bytes = 0, checkedAt = 0;
    const capacity = (remaining = 0) => {
      const disk = fs.statfsSync(path.dirname(destination));
      if (disk.bavail * disk.bsize < customerConfig.minFreeBytes + 64 * 1024 * 1024 + remaining) throw new Error("Máy chủ chưa đủ chỗ lưu video này. Token chưa bị trừ; cần bổ sung dung lượng máy chủ.");
    };
    try { capacity(Number(response.headers["content-length"]) || 0); } catch (error) { response.destroy(); throw error; }
    const limiter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (customerConfig.maxBytes > 0 && bytes > customerConfig.maxBytes) return callback(tooLarge());
      try { if (bytes - checkedAt >= 1024 * 1024) { capacity(); checkedAt = bytes; } callback(null, chunk); }
      catch (error) { callback(error as Error); }
    } });
    try { await pipeline(response, limiter, fs.createWriteStream(destination, { flags: "wx" })); }
    catch (error) { if (fs.existsSync(destination)) fs.unlinkSync(destination); throw error; }
    if (bytes < 100) throw new Error("File Google Drive không có video hợp lệ");
    return;
  }
  throw new Error("Google Drive chuyển hướng quá nhiều lần");
}
export function mediaBinary(name: "ffmpeg" | "ffprobe") {
  const configured = process.env[name === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"];
  if (configured) return configured;
  const bundled = path.join(customerRepoRoot, ".runtime", "bin", name + (process.platform === "win32" ? ".exe" : ""));
  return fs.existsSync(bundled) ? bundled : name;
}
export async function runMedia(name: "ffmpeg" | "ffprobe", args: string[], cwd: string, timeout = 20 * 60_000) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(mediaBinary(name), args, { cwd, windowsHide: true, shell: false });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Dựng video quá thời gian cho phép")); }, timeout);
    const diskTimer = name === "ffmpeg" ? setInterval(() => {
      try {
        const disk = fs.statfsSync(cwd);
        if (disk.bavail * disk.bsize < customerConfig.minFreeBytes) {
          child.kill("SIGKILL"); reject(new Error("Máy chủ hết chỗ dựng video. Cần bổ sung dung lượng trước khi thử lại."));
        }
      } catch { child.kill("SIGKILL"); reject(new Error("Không kiểm tra được dung lượng dựng video")); }
    }, 1000) : undefined;
    const clear = () => { clearTimeout(timer); if (diskTimer) clearInterval(diskTimer); };
    child.stdout.on("data", chunk => { if (stdout.length < 4_000_000) stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr = (stderr + String(chunk)).slice(-8000); });
    child.on("error", () => { clear(); reject(new Error("Máy chủ chưa sẵn sàng xử lý video")); });
    child.on("close", code => { clear(); if (code === 0) resolve(stdout); else reject(new Error(`Bộ dựng video không hoàn tất (mã ${code}).`, { cause: stderr })); });
  });
}
export async function probe(filename: string, cwd: string) {
  const result = JSON.parse(await runMedia("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe", "-show_format", "-show_streams", "-of", "json", filename], cwd, 30_000));
  const video = result.streams?.find((stream: { codec_type: string }) => stream.codec_type === "video");
  const duration = Number(result.format?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error("File không có video hoặc thời lượng hợp lệ");
  if (customerConfig.maxSeconds > 0 && duration > customerConfig.maxSeconds) throw new Error(`Hãy dùng video có thời lượng tối đa ${Math.floor(customerConfig.maxSeconds / 60)} phút`);
  return { duration, width: Number(video.width), height: Number(video.height), hasAudio: Boolean(result.streams?.some((stream: { codec_type: string }) => stream.codec_type === "audio")) };
}
