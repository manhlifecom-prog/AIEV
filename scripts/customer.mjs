import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) throw new Error("Chế độ khách hàng cần Node.js 22.13+ hoặc Node 24.");
const production = process.argv.includes("--production");
const webPort = process.env.CUSTOMER_WEB_PORT || "6870";
const env = { ...process.env, CUSTOMER_MODE: "1", CUSTOMER_ORIGIN: process.env.CUSTOMER_ORIGIN || `http://localhost:${webPort}` };
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const server = path.join(root, "apps", "server", production ? "dist" : "src", "customer", "index" + (production ? ".js" : ".ts"));
if (!fs.existsSync(next) || !fs.existsSync(server)) throw new Error("Chưa cài dependencies hoặc chưa build. Xem docs/CUSTOMER_STUDIO.md.");
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 500).unref();
}
for (const [args, cwd] of [
  [production ? [server] : [tsx, "watch", server], root],
  [[next, production ? "start" : "dev", "-p", webPort, "-H", "0.0.0.0"], path.join(root, "apps", "web")],
]) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit", windowsHide: true });
  children.push(child);
  child.on("error", () => stop(1)); child.on("exit", code => stop(code || 0));
}
process.on("SIGINT", () => stop()); process.on("SIGTERM", () => stop());
console.log(`AIEV Studio: http://localhost:${webPort}/studio`);
