import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commands = [
  [path.join(root, "scripts", "browser-assets.mjs")],
  [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", path.join(root, "apps", "server", "tsconfig.json")],
  [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build", path.join(root, "apps", "web")],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, CUSTOMER_MODE: "1" }, stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
