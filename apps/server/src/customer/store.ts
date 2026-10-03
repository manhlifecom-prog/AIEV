import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { customerConfig } from "./config.js";

export type User = { id: string; email: string; name: string; password: string; balance: number; role: "customer" | "admin" };
export type Job = { id: string; user_id: string; thread_id: string; prompt: string; drive_url: string; status: string; stage: string; tokens: number; duration: number; error: string | null; created_at: number; output: string | null };
export class CustomerError extends Error { constructor(public status: number, message: string) { super(message); } }
export class CustomerStore {
  db: DatabaseSync;
  constructor(filename = path.join(customerConfig.dataDir, "customers.sqlite")) {
    if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0));
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS threads(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id), role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), thread_id TEXT NOT NULL REFERENCES threads(id), prompt TEXT NOT NULL, drive_url TEXT NOT NULL, status TEXT NOT NULL, stage TEXT NOT NULL, tokens INTEGER NOT NULL DEFAULT 0, duration REAL NOT NULL DEFAULT 0, error TEXT, created_at INTEGER NOT NULL, output TEXT);
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), code TEXT UNIQUE NOT NULL, tokens INTEGER NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS transactions(provider_id TEXT PRIMARY KEY, payload TEXT NOT NULL, result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), delta INTEGER NOT NULL, kind TEXT NOT NULL, reference TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(user_id,kind,reference));
      CREATE INDEX IF NOT EXISTS jobs_owner ON jobs(user_id,created_at);
      CREATE INDEX IF NOT EXISTS threads_owner ON threads(user_id,created_at);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);`);
    const columns = this.db.prepare("PRAGMA table_info(users)").all();
    if (!columns.some(column => column.name === "role")) this.db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin'))");
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  user(id: string) { return this.db.prepare("SELECT * FROM users WHERE id=?").get(id) as User | undefined; }
  register(email: string, name: string, password: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new CustomerError(400, "Email không hợp lệ");
    if (password.length < 10 || password.length > 128) throw new CustomerError(400, "Mật khẩu cần từ 10 đến 128 ký tự");
    if (!name.trim() || name.length > 100) throw new CustomerError(400, "Tên không hợp lệ");
    const salt = randomBytes(16).toString("hex");
    const encoded = salt + ":" + scryptSync(password, salt, 64).toString("hex");
    const id = randomUUID();
    try { this.db.prepare("INSERT INTO users(id,email,name,password) VALUES(?,?,?,?)").run(id, email.toLowerCase(), name.trim(), encoded); }
    catch { throw new CustomerError(409, "Email đã được đăng ký"); }
    return this.user(id)!;
  }
  login(email: string, password: string) {
    const user = this.db.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase()) as User | undefined;
    const [salt, hash] = (user?.password || "invalid:" + "00".repeat(64)).split(":");
    const actual = scryptSync(password, salt, 64);
    if (!user || !timingSafeEqual(actual, Buffer.from(hash, "hex"))) throw new CustomerError(401, "Email hoặc mật khẩu không đúng");
    return user;
  }
  createSession(userId: string) {
    this.db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    this.db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(createHash("sha256").update(token).digest("hex"), userId, Date.now() + 7 * 86400_000);
    return token;
  }
  session(token: string) {
    const row = this.db.prepare("SELECT user_id FROM sessions WHERE hash=? AND expires>?").get(createHash("sha256").update(token).digest("hex"), Date.now());
    return row ? this.user(String(row.user_id)) : undefined;
  }
  logout(token: string) { this.db.prepare("DELETE FROM sessions WHERE hash=?").run(createHash("sha256").update(token).digest("hex")); }
  publicUser(user: User) { return { id: user.id, name: user.name, email: user.email, balance: user.balance, role: user.role }; }
  changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = this.user(userId);
    if (!user) throw new CustomerError(401, "Hãy đăng nhập để tiếp tục");
    this.login(user.email, currentPassword);
    if (newPassword.length < 10 || newPassword.length > 128) throw new CustomerError(400, "Mật khẩu cần từ 10 đến 128 ký tự");
    if (currentPassword === newPassword) throw new CustomerError(400, "Mật khẩu mới cần khác mật khẩu hiện tại");
    const salt = randomBytes(16).toString("hex");
    const encoded = salt + ":" + scryptSync(newPassword, salt, 64).toString("hex");
    this.transaction(() => {
      this.db.prepare("UPDATE users SET password=? WHERE id=?").run(encoded, userId);
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
    });
  }
  adminOverview(userId: string) {
    if (this.user(userId)?.role !== "admin") throw new CustomerError(403, "Chỉ tài khoản quản trị được sử dụng chức năng này");
    const stats = this.db.prepare(`SELECT
      (SELECT count(*) FROM users WHERE role='customer') AS customers,
      (SELECT count(*) FROM jobs) AS videos,
      (SELECT count(*) FROM jobs WHERE status IN ('inspecting','queued','running')) AS activeVideos,
      (SELECT coalesce(sum(amount),0) FROM orders WHERE status='paid') AS paidVnd`).get();
    return {
      stats,
      users: this.db.prepare("SELECT id,name,email,balance,role FROM users ORDER BY rowid DESC LIMIT 100").all(),
      jobs: this.db.prepare("SELECT j.id,u.email,j.status,j.stage,j.tokens,j.created_at FROM jobs j JOIN users u ON u.id=j.user_id ORDER BY j.created_at DESC LIMIT 100").all(),
      orders: this.db.prepare("SELECT o.id,u.email,o.code,o.tokens,o.amount,o.status,o.created_at FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 100").all(),
    };
  }
  thread(userId: string, threadId: string) {
    const thread = this.db.prepare("SELECT * FROM threads WHERE id=? AND user_id=?").get(threadId, userId);
    if (!thread) throw new CustomerError(404, "Không tìm thấy cuộc trò chuyện");
    return thread;
  }
  createThread(userId: string, title: string) {
    const id = randomUUID();
    this.db.prepare("INSERT INTO threads VALUES(?,?,?,?)").run(id, userId, title.slice(0, 80), Date.now());
    return id;
  }
  threads(userId: string) { return this.db.prepare("SELECT id,title,created_at FROM threads WHERE user_id=? ORDER BY created_at DESC LIMIT 100").all(userId); }
  message(threadId: string, role: string, content: string) { this.db.prepare("INSERT INTO messages VALUES(?,?,?,?,?)").run(randomUUID(), threadId, role, content, Date.now()); }
  messages(userId: string, threadId: string) { this.thread(userId, threadId); return this.db.prepare("SELECT role,content,created_at FROM messages WHERE thread_id=? ORDER BY rowid").all(threadId); }
  job(userId: string, id: string) {
    const job = this.db.prepare("SELECT * FROM jobs WHERE user_id=? AND id=?").get(userId, id) as Job | undefined;
    if (!job) throw new CustomerError(404, "Không tìm thấy video");
    return job;
  }
  jobs(userId: string) { return this.db.prepare("SELECT * FROM jobs WHERE user_id=? ORDER BY created_at DESC LIMIT 100").all(userId) as Job[]; }
  createJob(userId: string, threadId: string, prompt: string, driveUrl: string) {
    this.thread(userId, threadId);
    const pending = this.db.prepare("SELECT count(*) AS n FROM jobs WHERE user_id=? AND status='awaiting_confirmation'").get(userId);
    if (Number(pending?.n) >= 3) throw new CustomerError(429, "Bạn đã có 3 video chờ xác nhận. Hãy hoàn tất các yêu cầu trước.");
    const daily = this.db.prepare("SELECT count(*) AS n FROM jobs WHERE user_id=? AND created_at>?").get(userId, Date.now() - 86400_000);
    if (Number(daily?.n) >= 30) throw new CustomerError(429, "Bạn đã đạt giới hạn 30 yêu cầu trong 24 giờ.");
    const imports = this.db.prepare("SELECT count(*) AS n FROM jobs WHERE status='inspecting'").get();
    if (Number(imports?.n) >= 3) throw new CustomerError(429, "Máy chủ đang nhận nhiều video. Hãy thử lại sau ít phút.");
    if (this.db.prepare("SELECT id FROM jobs WHERE user_id=? AND status IN ('inspecting','queued','running')").get(userId)) throw new CustomerError(409, "Video trước đang xử lý. Hãy chờ hoàn tất.");
    const id = randomUUID();
    this.db.prepare("INSERT INTO jobs(id,user_id,thread_id,prompt,drive_url,status,stage,created_at) VALUES(?,?,?,?,?,'inspecting','Đang kiểm tra video nguồn',?)").run(id, userId, threadId, prompt, driveUrl, Date.now());
    return this.job(userId, id);
  }
  update(id: string, status: string, stage: string) { this.db.prepare("UPDATE jobs SET status=?,stage=? WHERE id=?").run(status, stage, id); }
  quote(id: string, seconds: number, tokens: number) { this.db.prepare("UPDATE jobs SET duration=?,tokens=?,status='awaiting_confirmation',stage='Sẵn sàng dựng video' WHERE id=? AND status='inspecting'").run(seconds, tokens, id); }
  reserve(userId: string, id: string) {
    return this.transaction(() => {
      const job = this.job(userId, id);
      if (["queued", "running", "local_running", "done"].includes(job.status)) return job;
      if (job.status !== "awaiting_confirmation") throw new CustomerError(409, "Video chưa sẵn sàng");
      const changed = this.db.prepare("UPDATE users SET balance=balance-? WHERE id=? AND balance>=?").run(job.tokens, userId, job.tokens);
      if (changed.changes !== 1) throw new CustomerError(402, "Bạn cần nạp thêm token để dựng video");
      this.db.prepare("INSERT INTO ledger VALUES(?,?,?,?,?,?)").run(randomUUID(), userId, -job.tokens, "reserve", id, Date.now());
      this.update(id, "queued", "Đang chờ dựng video");
      return this.job(userId, id);
    });
  }
  finish(id: string, output: string) { this.db.prepare("UPDATE jobs SET status='done',stage='Video đã hoàn tất',output=? WHERE id=? AND status='running'").run(output, id); }
  fail(id: string, message: string) {
    this.transaction(() => {
      const job = this.db.prepare("SELECT * FROM jobs WHERE id=?").get(id) as Job | undefined;
      if (!job || job.status === "done" || job.status === "failed") return;
      const reserved = this.db.prepare("SELECT id FROM ledger WHERE user_id=? AND kind='reserve' AND reference=?").get(job.user_id, id);
      if (reserved) {
        const result = this.db.prepare("INSERT OR IGNORE INTO ledger VALUES(?,?,?,?,?,?)").run(randomUUID(), job.user_id, job.tokens, "refund", id, Date.now());
        if (result.changes) this.db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(job.tokens, job.user_id);
      }
      this.db.prepare("UPDATE jobs SET status='failed',stage='Xử lý không thành công',error=? WHERE id=?").run(message.slice(0, 300), id);
      this.message(job.thread_id, "assistant", message + (reserved ? " Token đã được hoàn vào ví." : " Bạn chưa bị trừ token."));
    });
  }
  recover() {
    const interrupted = this.db.prepare("SELECT id FROM jobs WHERE status IN ('running','inspecting')").all();
    for (const row of interrupted) this.fail(String(row.id), "Máy chủ khởi động lại trong lúc xử lý. Hãy gửi lại yêu cầu.");
  }
  createOrder(userId: string, tokens: number) {
    if (![100, 500, 1000].includes(tokens)) throw new CustomerError(400, "Gói token không hợp lệ");
    const pending = this.db.prepare("SELECT * FROM orders WHERE user_id=? AND tokens=? AND status='pending' AND expires>? ORDER BY created_at DESC LIMIT 1").get(userId, tokens, Date.now());
    if (pending) return pending;
    const id = randomUUID(), code = "AIEV" + randomBytes(6).toString("hex").toUpperCase();
    this.db.prepare("INSERT INTO orders VALUES(?,?,?,?,?,'pending',?,?)").run(id, userId, code, tokens, tokens * customerConfig.tokenPrice, Date.now(), Date.now() + 30 * 60_000);
    return this.db.prepare("SELECT * FROM orders WHERE id=?").get(id)!;
  }
  order(userId: string, id: string) {
    const order = this.db.prepare("SELECT * FROM orders WHERE user_id=? AND id=?").get(userId, id);
    if (!order) throw new CustomerError(404, "Không tìm thấy giao dịch");
    return { ...order, status: order.status === "pending" && Number(order.expires) < Date.now() ? "expired" : order.status };
  }
  payment(payload: Record<string, unknown>): { success: boolean; credited?: boolean; duplicate?: boolean; test?: boolean } {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new CustomerError(400, "Dữ liệu chuyển khoản không hợp lệ");
    const providerId = String(payload.id ?? "");
    if (!/^(0|[1-9][0-9]*)$/.test(providerId)) throw new CustomerError(400, "Mã giao dịch không hợp lệ");
    const amount = Number(payload.transferAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || String(payload.content || "").length > 2000) throw new CustomerError(400, "Dữ liệu chuyển khoản không hợp lệ");
    // SePay's dashboard sends a mock transaction with id 0. It must never pay an order.
    if (providerId === "0") return { success: true, credited: false, test: true };
    return this.transaction(() => {
      if (this.db.prepare("SELECT provider_id FROM transactions WHERE provider_id=?").get(providerId)) return { success: true, duplicate: true };
      const code = (String(payload.code || "") + " " + String(payload.content || "")).match(/\bAIEV[A-F0-9]{12}\b/i)?.[0].toUpperCase();
      const order = code ? this.db.prepare("SELECT * FROM orders WHERE code=?").get(code) : undefined;
      const matching = payload.transferType === "in" && String(payload.accountNumber) === customerConfig.account && order?.status === "pending" && Number(order.amount) === amount && Number(order.expires) > Date.now();
      if (matching && order) {
        this.db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(order.tokens!, order.user_id!);
        this.db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(order.id!);
        this.db.prepare("INSERT INTO ledger VALUES(?,?,?,?,?,?)").run(randomUUID(), order.user_id!, order.tokens!, "purchase", order.id!, Date.now());
      }
      // Unexpected amounts and expired references are recorded for manual reconciliation.
      this.db.prepare("INSERT INTO transactions VALUES(?,?,?)").run(providerId, JSON.stringify(payload), matching ? "credited" : "review_required");
      return { success: true, credited: Boolean(matching) };
    });
  }
}
