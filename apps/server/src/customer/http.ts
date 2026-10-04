import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { customerConfig } from "./config.js";
import { mediaBinary, driveFile, runMedia } from "./media.js";
import { CustomerService } from "./service.js";
import { CustomerError, CustomerStore, type User } from "./store.js";
import { localRoutes } from "./local.js";
import { assistantRoutes } from "./assistant.js";
import { adminRoutes } from "./admin.js";
import { folderRoutes } from "./drive-folder.js";

function cookie(req: Request) { return req.headers.cookie?.split(";").map(x => x.trim()).find(x => x.startsWith("aiev_customer="))?.slice(14) || ""; }
function sameSecret(a: string, b: string) { const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && aa.length > 0 && timingSafeEqual(aa, bb); }
function field(body: unknown, name: string, max = 8000) {
  const value = (body as Record<string, unknown> | null)?.[name];
  if (typeof value !== "string" || value.length > max) throw new CustomerError(400, `${name} không hợp lệ`);
  return value.trim();
}
function sessionCookie(res: Response, token: string) { res.cookie("aiev_customer", token, { httpOnly: true, sameSite: "lax", secure: customerConfig.origin.startsWith("https://"), path: "/", maxAge: 7 * 86400_000 }); }
export function customerApp(store = new CustomerStore(), service = new CustomerService(store)) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use((req, res, next) => {
    res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.path !== "/api/customer/payments/sepay" && req.headers.origin && req.headers.origin !== customerConfig.origin) return res.status(403).json({ error: "Nguồn yêu cầu không được phép" });
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  const attempts = new Map<string, { count: number; expires: number }>();
  function limit(req: Request, _res: Response, next: NextFunction) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expires < now) attempts.delete(key);
    const key = req.ip || "unknown";
    const entry = attempts.get(key) || { count: 0, expires: now + 15 * 60_000 };
    if (++entry.count > 15) throw new CustomerError(429, "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút.");
    attempts.set(key, entry); next();
  }
  function auth(req: Request, res: Response, next: NextFunction) {
    const user = store.session(cookie(req));
    if (!user) throw new CustomerError(401, "Hãy đăng nhập để tiếp tục");
    res.locals.user = user; next();
  }
  function user(res: Response) { return res.locals.user as User; }
  localRoutes(app, store, auth);
  assistantRoutes(app, store, auth);
  adminRoutes(app,store,auth);
  folderRoutes(app,auth);
  let mediaReady: boolean | null = null;
  let readinessCheckedAt = 0;
  async function ready() {
    if (process.env.CUSTOMER_SERVER_RENDER === '0') return true;
    if (mediaReady !== null && Date.now() - readinessCheckedAt < (mediaReady ? 30_000 : 5000)) return mediaReady;
    try { await runMedia("ffmpeg", ["-version"], customerConfig.dataDir, 10_000); await runMedia("ffprobe", ["-version"], customerConfig.dataDir, 10_000); mediaReady = true; }
    catch { mediaReady = false; }
    readinessCheckedAt = Date.now(); return mediaReady;
  }
  app.get("/api/customer/config", async (_req, res) => res.json({
    bank: customerConfig.bank, account: customerConfig.account, accountName: customerConfig.accountName,
    tokenPrice: customerConfig.tokenPrice, packs: [100, 500, 1000], maxMinutes: customerConfig.maxSeconds / 60, maxMegabytes: Math.floor(customerConfig.maxBytes / 1024 / 1024),
    baseTokens: customerConfig.baseCost, tokensPerMinute: customerConfig.perMinute, tokensPerGiB: process.env.CUSTOMER_SERVER_RENDER === '0' ? 0 : customerConfig.perGiB,
    aiReady: Boolean(process.env.OPENAI_API_KEY?.trim()), mediaReady: await ready(), paymentReady: Boolean(customerConfig.sepayKey),
    processingMode: process.env.CUSTOMER_SERVER_RENDER === '0' ? 'local' : 'server',
    chatTokens: 1,
  }));
  app.post("/api/customer/auth/register", limit, (req, res) => {
    const created = store.register(field(req.body, "email", 254), field(req.body, "name", 100), field(req.body, "password", 128));
    sessionCookie(res, store.createSession(created.id)); res.status(201).json(store.publicUser(created));
  });
  app.post("/api/customer/auth/login", limit, (req, res) => {
    const loggedIn = store.login(field(req.body, "email", 254), field(req.body, "password", 128));
    sessionCookie(res, store.createSession(loggedIn.id)); res.json(store.publicUser(loggedIn));
  });
  app.post("/api/customer/auth/logout", (req, res) => { store.logout(cookie(req)); res.clearCookie("aiev_customer", { path: "/" }); res.json({ success: true }); });
  app.get("/api/customer/me", auth, (_req, res) => res.json(store.publicUser(user(res))));
  app.post("/api/customer/auth/password", auth, limit, (req, res) => {
    store.changePassword(user(res).id, field(req.body, "currentPassword", 128), field(req.body, "newPassword", 128));
    sessionCookie(res, store.createSession(user(res).id)); res.json({ success: true });
  });
  app.get("/api/customer/threads", auth, (_req, res) => res.json(store.threads(user(res).id)));
  app.get("/api/customer/threads/:id", auth, (req, res) => res.json({ messages: store.messages(user(res).id, String(req.params.id)), jobs: store.jobs(user(res).id).filter(x => x.thread_id === req.params.id) }));
  app.get("/api/customer/videos", auth, (_req, res) => res.json(store.jobs(user(res).id)));
  app.get("/api/customer/wallet", auth, (_req, res) => res.json({ balance: store.user(user(res).id)!.balance, transactions: store.db.prepare("SELECT l.delta,l.kind,l.created_at,CASE WHEN l.kind='chat' THEN 1 WHEN l.kind='reserve' THEN COALESCE(j.tokens,0) ELSE 0 END AS estimatedTokens FROM ledger l LEFT JOIN jobs j ON j.id=l.reference AND j.user_id=l.user_id WHERE l.user_id=? ORDER BY l.rowid DESC LIMIT 100").all(user(res).id) }));
  app.post("/api/customer/chat", auth, async (req, res) => {
    if (process.env.CUSTOMER_SERVER_RENDER === '0') throw new CustomerError(409, 'Video được dựng trên máy bạn. Hãy tải app Windows 0.2.0 để gửi yêu cầu; website dùng đăng nhập và nạp token.');
    const owner = user(res).id;
    const message = field(req.body, "message");
    if (!message) throw new CustomerError(400, "Hãy nhập yêu cầu làm video");
    const threadId = typeof req.body?.threadId === "string" ? field(req.body, "threadId", 100) : store.createThread(owner, message);
    store.thread(owner, threadId);
    const existing = store.jobs(owner).filter(x => x.thread_id === threadId);
    if (existing.some(x => ["queued", "running", "inspecting"].includes(x.status))) throw new CustomerError(409, "Tôi đang xử lý yêu cầu trước. Hãy chờ hoàn tất.");
    const awaiting = existing.find(x => x.status === "awaiting_confirmation");
    if (awaiting && /^(đồng ý|dong y|ok|xác nhận|xac nhan|dựng luôn|dung luon)( dựng| dung| làm| lam| video)?[.!]?$/i.test(message)) {
      if (!process.env.OPENAI_API_KEY?.trim() || !await ready()) throw new CustomerError(503, "Dịch vụ AI chưa được kích hoạt. Token chưa bị trừ.");
      service.ensureCapacity("render", awaiting.id);
      const confirmed = store.reserve(owner, awaiting.id);
      store.message(threadId, "user", message);
      store.message(threadId, "assistant", "Đã xác nhận. Tôi đang dựng video theo yêu cầu của bạn.");
      void service.processQueue(); return res.status(202).json({ threadId, jobId: confirmed.id });
    }
    if (awaiting && /^(hủy|huy|hủy yêu cầu|huy yeu cau)[.!]?$/i.test(message)) {
      store.update(awaiting.id, "cancelled", "Đã hủy yêu cầu");
      store.message(threadId, "user", message); store.message(threadId, "assistant", "Đã hủy yêu cầu. Bạn chưa bị trừ token.");
      return res.json({ threadId });
    }
    const url = message.match(/https:\/\/drive\.google\.com\/[^\s<>"']+/)?.[0]?.replace(/[),.;]+$/, "") || existing.find(x => x.status === "done")?.drive_url;
    if (!url) {
      store.message(threadId, "user", message);
      store.message(threadId, "assistant", "Bạn hãy dán link một file video trên Google Drive và mô tả cách muốn chỉnh. Ví dụ: 'Cắt thành clip dọc 60 giây, thêm phụ đề và bỏ khoảng lặng'. Video cần có quyền tải xuống bằng đường liên kết.");
      return res.json({ threadId });
    }
    try { driveFile(url); }
    catch (error) { throw new CustomerError(400, error instanceof Error ? error.message : "Link Google Drive không hợp lệ"); }
    if (!await ready()) throw new CustomerError(503, "Bộ dựng video chưa sẵn sàng. Vui lòng thử lại sau.");
    service.ensureCapacity("import");
    const prior = existing.find(x => x.status === "done" && x.drive_url === url);
    const prompt = prior ? (prior.prompt + "\nYêu cầu chỉnh sửa tiếp theo: " + message).slice(-16000) : message;
    const job = store.createJob(owner, threadId, prompt, url);
    store.message(threadId, "user", message);
    store.message(threadId, "assistant", "Tôi đang kiểm tra video trên Google Drive để báo chi phí. Bạn chưa bị trừ token.");
    void service.inspect(job);
    res.status(202).json({ threadId, jobId: job.id });
  });
  app.post("/api/customer/videos/:id/confirm", auth, async (req, res) => {
    if (process.env.CUSTOMER_SERVER_RENDER === '0' || store.db.prepare('SELECT id FROM local_jobs WHERE id=?').get(String(req.params.id))) throw new CustomerError(409,'Hãy xác nhận trong app dựng tại máy');
    if (!process.env.OPENAI_API_KEY?.trim() || !await ready()) throw new CustomerError(503, "Dịch vụ AI chưa được kích hoạt. Token chưa bị trừ.");
    service.ensureCapacity("render", String(req.params.id));
    const job = store.reserve(user(res).id, String(req.params.id));
    void service.processQueue(); res.status(202).json(job);
  });
  app.get("/api/customer/videos/:id/file", auth, (req, res) => {
    const job = store.job(user(res).id, String(req.params.id));
    if (job.status !== "done" || job.output !== "final.mp4") throw new CustomerError(404, "Video chưa hoàn tất");
    const file = path.join(service.directory(job), "final.mp4");
    if (!fs.existsSync(file)) throw new CustomerError(404, "Video không còn trên máy chủ");
    res.setHeader("Content-Type", "video/mp4");
    if (req.query.download === "1") res.setHeader("Content-Disposition", 'attachment; filename="AIEV-video.mp4"');
    res.sendFile(file);
  });
  app.post("/api/customer/orders", auth, async (req, res) => {
    if (!customerConfig.sepayKey || !process.env.OPENAI_API_KEY?.trim() || !await ready()) throw new CustomerError(503, "Nạp token sẽ mở khi dịch vụ AI và thanh toán đã sẵn sàng");
    res.status(201).json(store.createOrder(user(res).id, Number(req.body?.tokens)));
  });
  app.get("/api/customer/orders/:id", auth, (req, res) => res.json(store.order(user(res).id, String(req.params.id))));
  app.post("/api/customer/payments/sepay", (req, res) => {
    if (!customerConfig.sepayKey || !sameSecret(req.headers.authorization || "", "Apikey " + customerConfig.sepayKey)) throw new CustomerError(401, "Không xác thực được giao dịch");
    res.json(store.payment(req.body));
  });
  app.use((_req, res) => res.status(404).json({ error: "Không tìm thấy chức năng" }));
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof CustomerError) return res.status(error.status).json({ error: error.message });
    if ("type" in error && error.type === "entity.parse.failed") return res.status(400).json({ error: "Dữ liệu yêu cầu không hợp lệ" });
    if (error instanceof SyntaxError) return res.status(400).json({ error: "Dữ liệu yêu cầu không hợp lệ" });
    res.status(500).json({ error: "Không xử lý được yêu cầu. Vui lòng thử lại." });
  });
  return { app, service, store };
}
