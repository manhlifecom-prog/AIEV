import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const customerRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
dotenv.config({ path: path.join(customerRepoRoot, ".env.local"), quiet: true });
dotenv.config({ path: path.join(customerRepoRoot, ".env"), quiet: true });
function integer(name: string, fallback: number, min = 1) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name} không hợp lệ`);
  return value;
}
export const customerConfig = {
  port: integer("CUSTOMER_PORT", 6871),
  origin: process.env.CUSTOMER_ORIGIN || "http://localhost:6870",
  dataDir: process.env.CUSTOMER_DATA_DIR || path.join(customerRepoRoot, ".runtime", "customer"),
  bank: process.env.CUSTOMER_BANK || "MB",
  account: process.env.CUSTOMER_BANK_ACCOUNT || "0383199234",
  accountName: process.env.CUSTOMER_BANK_NAME || "Mạnh",
  tokenPrice: integer("CUSTOMER_TOKEN_PRICE_VND", 1000),
  baseCost: integer("CUSTOMER_BASE_TOKENS", 10),
  perMinute: integer("CUSTOMER_TOKENS_PER_MINUTE", 20),
  perGiB: integer("CUSTOMER_TOKENS_PER_GIB", 10, 0),
  // Zero means no product cap. Physical disk admission still applies.
  maxSeconds: integer("CUSTOMER_MAX_VIDEO_SECONDS", 0, 0),
  maxBytes: integer("CUSTOMER_MAX_VIDEO_BYTES", 0, 0),
  minFreeBytes: integer("CUSTOMER_MIN_FREE_BYTES", 512 * 1024 * 1024),
  sepayKey: process.env.CUSTOMER_SEPAY_WEBHOOK_KEY || "",
};
export function quoteTokens(seconds: number, bytes = 0) {
  if (!Number.isFinite(seconds) || seconds <= 0 || (customerConfig.maxSeconds > 0 && seconds > customerConfig.maxSeconds)) throw new Error("Thời lượng video vượt giới hạn xử lý");
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error("Dung lượng video không hợp lệ");
  const tokens = customerConfig.baseCost + Math.ceil(seconds / 60) * customerConfig.perMinute + Math.ceil(bytes / (1024 ** 3) * customerConfig.perGiB);
  if (!Number.isSafeInteger(tokens)) throw new Error("Không tính được chi phí video");
  return tokens;
}
