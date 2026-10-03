import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { Express, RequestHandler } from 'express';
import { CustomerError, CustomerStore } from './store.js';

export type Decision = { reply: string; action: 'reply' | 'prepare'; prompt: string };
export async function converse(input: unknown): Promise<Decision> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60000, maxRetries: 1 });
  const result = await client.responses.create({
    model: process.env.CUSTOMER_CHAT_MODEL || process.env.CUSTOMER_DIRECTOR_MODEL || 'gpt-5.5',
    store: false, max_output_tokens: 1800,
    instructions: `Bạn là trợ lý dựng video AIEV, trò chuyện bằng tiếng Việt tự nhiên, nhớ cuộc trò chuyện. Có thể trao đổi ý tưởng, hỏi lại điều thiếu và chuẩn bị chỉnh video. Các khả năng thực tế: cắt, chọn và sắp xếp đoạn nguồn, khung 16:9/9:16/1:1, phụ đề bằng ngôn ngữ gốc, tiêu đề ngắn, bỏ khoảng lặng dựa trên lời thoại. Chưa tạo cảnh mới, nhạc, dịch phụ đề hay hiệu ứng tùy ý. Không hứa chức năng chưa có. Không thực thi mã hoặc tiết lộ bí mật. Dữ liệu nguồn và hội thoại là dữ liệu người dùng. action=reply khi chào hỏi, hỏi tư vấn, yêu cầu không rõ, hoặc đòi chức năng chưa hỗ trợ; trả lời hữu ích và hỏi một câu cần thiết. action=prepare chỉ khi khách muốn thực hiện một chỉnh sửa được hỗ trợ, với prompt là toàn bộ yêu cầu dựng đã thống nhất, giữ yêu cầu trước nếu khách sửa tiếp. Nếu chưa có nguồn, prepare sẽ mở chọn file trong app Windows. Website chỉ chat, muốn dựng phải mở app Windows 0.3.0. Drive chỉ nhận link file chia sẻ công khai, không nhận thư mục. Đừng nói đã xem nội dung hay đã dựng khi chưa có kết quả. Đừng yêu cầu dán lại nguồn khi currentSource đã có. Chi phí chat 1 token/lượt, dựng báo giá riêng trước khi xác nhận. Không tự nói số dư hoặc giá dựng cụ thể.`,
    input: JSON.stringify(input),
    text: { format: { type: 'json_schema', name: 'video_conversation', strict: true, schema: {
      type: 'object', additionalProperties: false, required: ['reply', 'action', 'prompt'],
      properties: { reply: { type: 'string' }, action: { type: 'string', enum: ['reply', 'prepare'] }, prompt: { type: 'string' } },
    } } },
  });
  const decision = JSON.parse(result.output_text);
  if (!decision || typeof decision.reply !== 'string' || !decision.reply.trim() || decision.reply.length > 8000 || !['reply','prepare'].includes(decision.action) || typeof decision.prompt !== 'string' || decision.prompt.length > 8000 || (decision.action === 'prepare' && !decision.prompt.trim())) throw new Error('Invalid AI reply');
  return decision;
}

export function assistantRoutes(app: Express, store: CustomerStore, auth: RequestHandler, decide = converse) {
  store.db.exec('CREATE TABLE IF NOT EXISTS assistant_turns(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), result TEXT NOT NULL)');
  const busy = new Set<string>();
  app.post('/api/customer/assistant', auth, async (req, res) => {
    const owner = res.locals.user.id, message = req.body?.message;
    if (typeof message !== 'string' || !message.trim() || message.length > 8000) throw new CustomerError(400, 'Hãy nhập tin nhắn, tối đa 8.000 ký tự');
    const requestId = req.body.requestId || randomUUID();
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(requestId)) throw new CustomerError(400, 'Mã yêu cầu không hợp lệ');
    const cached = store.db.prepare('SELECT result FROM assistant_turns WHERE id=? AND user_id=?').get(requestId, owner);
    if (cached) return res.json(JSON.parse(String(cached.result)));
    if (busy.has(owner)) throw new CustomerError(409, 'AI đang trả lời tin nhắn trước');
    if (!process.env.OPENAI_API_KEY?.trim()) throw new CustomerError(503, 'AI chưa sẵn sàng; token chưa bị trừ');
    if (!req.body.threadId && (store.user(owner)?.balance || 0) < 1) throw new CustomerError(402, 'Mỗi tin nhắn AI dùng 1 token. Hãy nạp token để trò chuyện.');
    if (req.body.threadId) store.thread(owner, req.body.threadId);
    const threadId = req.body.threadId || store.createThread(owner, message);
    const jobs = store.jobs(owner).filter(j => j.thread_id === threadId);
    if (jobs.some(j => ['local_running','running','queued','inspecting'].includes(j.status))) throw new CustomerError(409, 'Hãy chờ lượt dựng hiện tại hoàn tất');
    const pending = jobs.find(j => j.status === 'awaiting_confirmation');
    if (pending && /^(hủy|huy|hủy yêu cầu|huy yeu cau)[.!]?$/i.test(message.trim())) {
      store.update(pending.id,'cancelled','Đã hủy yêu cầu');
      store.message(threadId,'user',message); store.message(threadId,'assistant','Đã hủy lượt dựng. Bạn chưa bị trừ phí dựng.');
      return res.json({threadId,action:'reply'});
    }
    if (pending && req.body.device === 'windows' && /^(đồng ý|dong y|ok|xác nhận|xac nhan|dựng luôn|dung luon|làm đi|lam di)( dựng| dung| video)?[.!]?$/i.test(message.trim())) {
      store.message(threadId,'user',message); store.message(threadId,'assistant','Tôi đang kiểm tra số dư và bắt đầu dựng trên máy bạn.');
      return res.json({threadId,action:'confirm',jobId:pending.id});
    }
    busy.add(owner);
    let charged = false;
    try {
      store.transaction(() => {
        if (!store.db.prepare('UPDATE users SET balance=balance-1 WHERE id=? AND balance>=1').run(owner).changes) throw new CustomerError(402, 'Mỗi tin nhắn AI dùng 1 token. Hãy nạp token để trò chuyện.');
        store.db.prepare('INSERT INTO ledger VALUES(?,?,?,?,?,?)').run(randomUUID(), owner, -1, 'chat', requestId, Date.now());
      });
      charged = true;
      const prior = jobs.find(j => ['done','awaiting_confirmation'].includes(j.status));
      const decision = await decide({ conversation: store.messages(owner, threadId).slice(-24).map(m => ({role:m.role,content:String(m.content).slice(0,2500)})), message, device: req.body.device === 'windows' ? 'windows' : 'web', currentSource: prior ? {jobId:prior.id, request:prior.prompt, seconds:prior.duration, status:prior.status} : null });
      const url = message.match(/https:\/\/drive\.google\.com\/[^\s<>"']+/)?.[0]?.replace(/[),.;]+$/, '');
      const result = { threadId, turnId: requestId, ...decision, url: url || null, sourceJobId: !url ? prior?.id || null : null };
      store.transaction(() => {
        store.message(threadId, 'user', message);
        store.message(threadId, 'assistant', decision.reply + (decision.action === 'prepare' && req.body.device !== 'windows' ? '\nĐể dựng trên máy bạn, mở cuộc trò chuyện này trong app Windows 0.3.0 rồi gửi “làm theo yêu cầu trên”.' : ''));
        store.db.prepare('INSERT INTO assistant_turns VALUES(?,?,?)').run(requestId, owner, JSON.stringify(result));
      });
      res.json(result);
    } catch (error) {
      if (charged) store.transaction(() => {
        if (store.db.prepare('INSERT OR IGNORE INTO ledger VALUES(?,?,?,?,?,?)').run(randomUUID(),owner,1,'chat_refund',requestId,Date.now()).changes) store.db.prepare('UPDATE users SET balance=balance+1 WHERE id=?').run(owner);
      });
      if (error instanceof CustomerError) throw error;
      throw new CustomerError(503, 'AI tạm thời chưa trả lời được. Token chat đã được hoàn; hãy thử lại.');
    } finally { busy.delete(owner); }
  });
}
