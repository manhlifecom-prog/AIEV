import fs from "node:fs";
import path from "node:path";
import { customerConfig, quoteTokens } from "./config.js";
import { downloadDrive, probe } from "./media.js";
import { renderControlled } from "./render.js";
import { CustomerError, CustomerStore, type Job } from "./store.js";

export class CustomerService {
  private busy = false;
  constructor(public store: CustomerStore, private freeBytes = () => {
    fs.mkdirSync(customerConfig.dataDir, { recursive: true });
    const disk = fs.statfsSync(customerConfig.dataDir);
    return disk.bavail * disk.bsize;
  }) {}
  ensureCapacity(phase: "import" | "render", jobId?: string) {
    const active = this.store.db.prepare("SELECT count(*) AS n FROM jobs WHERE status IN ('inspecting','queued','running') AND id<>?").get(jobId || "");
    // Reserve scratch space for workers, not the former fixed source-size cap.
    const scratch = 64 * 1024 * 1024;
    const needed = customerConfig.minFreeBytes + (Number(active?.n) + 1) * scratch;
    if (this.freeBytes() < needed) throw new CustomerError(503, "Máy chủ đang thiếu dung lượng xử lý. Hãy thử lại sau.");
  }
  directory(job: Job) {
    const directory = path.join(customerConfig.dataDir, "videos", job.user_id, job.id);
    fs.mkdirSync(directory, { recursive: true });
    return directory;
  }
  async inspect(job: Job) {
    try {
      this.ensureCapacity("import", job.id);
      const dir = this.directory(job);
      const prior = this.store.jobs(job.user_id).find(x => x.id !== job.id && x.drive_url === job.drive_url && x.status === "done");
      const existing = prior ? path.join(this.directory(prior), "source.mp4") : null;
      if (existing && fs.existsSync(existing)) fs.copyFileSync(existing, path.join(dir, "source.mp4"));
      else await downloadDrive(job.drive_url, path.join(dir, "source.mp4"));
      const metadata = await probe("source.mp4", dir);
      const bytes = fs.statSync(path.join(dir, "source.mp4")).size;
      const tokens = quoteTokens(metadata.duration, bytes);
      this.store.quote(job.id, metadata.duration, tokens);
      this.store.message(job.thread_id, "assistant", `Tôi đã nhận video nguồn dài ${Math.ceil(metadata.duration)} giây, ${(bytes / 1024 / 1024).toFixed(1)} MB. Chi phí theo thời lượng và dung lượng nguồn cho yêu cầu này là ${tokens} token. Nhắn 'đồng ý dựng' để tôi bắt đầu, hoặc 'hủy yêu cầu' để bỏ qua. Token được hoàn nếu xử lý thất bại.`);
    } catch (error) { this.store.fail(job.id, error instanceof Error ? error.message : "Không kiểm tra được video nguồn"); }
  }
  async processQueue() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (;;) {
        const job = this.store.db.prepare("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").get() as Job | undefined;
        if (!job) break;
        const claimed = this.store.db.prepare("UPDATE jobs SET status='running',stage='Đang bắt đầu xử lý' WHERE id=? AND status='queued'").run(job.id);
        if (!claimed.changes) continue;
        try {
          this.ensureCapacity("render", job.id);
          const output = await renderControlled(job, this.directory(job), stage => this.store.update(job.id, "running", stage));
          this.store.finish(job.id, output);
          this.store.message(job.thread_id, "assistant", "Video đã hoàn tất. Bạn có thể xem và tải MP4 ở khung Video của bạn. Hãy nhắn tiếp nếu muốn chỉnh sửa thêm; mỗi lượt dựng mới sẽ có báo giá riêng.");
        } catch (error) { this.store.fail(job.id, error instanceof Error ? error.message : "Không dựng được video"); }
      }
    } finally { this.busy = false; }
  }
}
