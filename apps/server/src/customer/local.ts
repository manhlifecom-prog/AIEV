import express, { type Express, type RequestHandler } from "express";
import OpenAI, { toFile } from "openai";
import { CustomerStore, CustomerError } from "./store.js";
import { quoteTokens } from "./config.js";
import { createEditPlan, type Word } from "./render.js";
export function localRoutes(app: Express, store: CustomerStore, auth: RequestHandler) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS local_jobs(id TEXT PRIMARY KEY REFERENCES jobs(id), metadata TEXT NOT NULL, plan TEXT);
    CREATE TABLE IF NOT EXISTS local_chunks(job_id TEXT NOT NULL REFERENCES local_jobs(id), idx INTEGER NOT NULL, result TEXT NOT NULL, PRIMARY KEY(job_id,idx));`);
  const busy = new Set<string>();
  function owned(owner: string, id: string) {
    const job = store.job(owner,id);
    const local = store.db.prepare('SELECT * FROM local_jobs WHERE id=?').get(id);
    if (!local) throw new CustomerError(409,'Yêu cầu này không dùng bộ dựng tại máy');
    return {job, metadata:JSON.parse(String(local.metadata)), plan:local.plan ? JSON.parse(String(local.plan)) : null};
  }
  app.post('/api/customer/local/quote',auth,(req,res)=>{
    const m=req.body?.metadata;
    if (!m || !Number.isFinite(m.duration) || m.duration<=0 || !Number.isSafeInteger(m.bytes) || m.bytes<100 || !Number.isSafeInteger(m.width) || m.width<=0 || !Number.isSafeInteger(m.height) || m.height<=0 || typeof m.hasAudio!=='boolean') throw new CustomerError(400,'Thông tin video không hợp lệ');
    if(m.sources!==undefined) {
      if(!Array.isArray(m.sources)||!m.sources.length)throw new CustomerError(400,'Danh sách clip không hợp lệ');
      let end=0;
      for(const clip of m.sources) {
        if(!clip||typeof clip.name!=='string'||clip.name.length>500||!Number.isFinite(clip.start)||!Number.isFinite(clip.duration)||clip.duration<=0||Math.abs(clip.start-end)>0.05||typeof clip.hasAudio!=='boolean')throw new CustomerError(400,'Mốc thời gian các clip không hợp lệ');
        end=clip.start+clip.duration;
      }
      if(Math.abs(end-m.duration)>Math.max(0.5,m.sources.length*0.05))throw new CustomerError(400,'Tổng thời lượng clip không khớp báo giá');
    }
    const message=req.body?.message;
    if (typeof message!=='string' || !message.trim() || message.length>8000) throw new CustomerError(400,'Yêu cầu không hợp lệ');
    const owner=res.locals.user.id;
    const threadId=req.body.threadId || store.createThread(owner,message);
    store.thread(owner,threadId);
    if (req.body.turnId) {
      const turn=store.db.prepare('SELECT result FROM assistant_turns WHERE id=? AND user_id=?').get(req.body.turnId,owner);
      const decision=turn && JSON.parse(String(turn.result));
      if (!decision || decision.threadId!==threadId || decision.action!=='prepare' || decision.prompt!==message) throw new CustomerError(400,'Yêu cầu dựng không khớp cuộc trò chuyện');
    }
    const existing=store.jobs(owner).filter(j=>j.thread_id===threadId);
    if(existing.some(j=>j.status==='local_running')) throw new CustomerError(409,'Hãy chờ lượt dựng hiện tại hoàn tất');
    for(const pending of existing.filter(j=>j.status==='awaiting_confirmation')) store.update(pending.id,'cancelled','Được thay bằng yêu cầu mới');
    const tokens=quoteTokens(m.duration,0);
    const job=store.createJob(owner,threadId,message,String(req.body.url || 'local-file'));
    store.db.prepare('INSERT INTO local_jobs(id,metadata) VALUES(?,?)').run(job.id,JSON.stringify(m));
    store.quote(job.id,m.duration,tokens);
    if (!req.body.turnId) store.message(threadId,'user',message);
    store.message(threadId,'assistant',store.user(owner)?.role==='admin' ? `${m.sources ? `${m.sources.length} clip trong thư mục đã tải và ghép trên máy bạn` : "Nguồn được lưu trên máy bạn"}, dài ${Math.ceil(m.duration)} giây. Miễn token cho quản trị. Chi phí ước tính ${tokens} token chỉ để theo dõi, không trừ số dư. Xác nhận để AI lên kế hoạch và dựng tại máy.` : `${m.sources ? `${m.sources.length} clip trong thư mục đã tải và ghép trên máy bạn` : "Nguồn được lưu trên máy bạn"}, dài ${Math.ceil(m.duration)} giây. Chi phí ${tokens} token. Xác nhận để AI lên kế hoạch và app dựng tại máy. Không tải video nguồn lên VPS. Khi đã nhận kế hoạch AI, phí AI không hoàn nếu máy bạn dựng lỗi; bạn có thể thử dựng lại cùng kế hoạch miễn phí.`);
    res.json({threadId,jobId:job.id});
  });
  app.post('/api/customer/local/:id/confirm',auth,(req,res)=>{
    const id=String(req.params.id), owner=res.locals.user.id;
    const {job}=owned(owner,id);
    if (!process.env.OPENAI_API_KEY) throw new CustomerError(503,'AI chưa sẵn sàng');
    if (job.status==='awaiting_confirmation') {store.reserve(owner,id); store.update(id,'local_running','Đang xử lý trên máy bạn');}
    else if (!['local_running','done'].includes(job.status)) throw new CustomerError(409,'Yêu cầu không còn hiệu lực');
    res.json({success:true});
  });
  app.post('/api/customer/local/:id/audio/:index',auth,express.raw({type:'application/octet-stream',limit:'5mb'}),async(req,res)=>{
    const id=String(req.params.id),idx=Number(req.params.index);
    const {job,metadata,plan}=owned(res.locals.user.id,id);
    if (job.status!=='local_running' || plan || !metadata.hasAudio || !Number.isSafeInteger(idx) || idx<0 || idx>=Math.ceil(metadata.duration/600)) throw new CustomerError(409,'Đoạn âm thanh không hợp lệ');
    const cached=store.db.prepare('SELECT result FROM local_chunks WHERE job_id=? AND idx=?').get(id,idx);
    if (cached) return res.json(JSON.parse(String(cached.result)));
    const count=Number(store.db.prepare('SELECT count(*) AS n FROM local_chunks WHERE job_id=?').get(id)?.n);
    if (idx!==count || busy.has(id)) throw new CustomerError(409,'Hãy gửi lần lượt các đoạn âm thanh');
    if (!Buffer.isBuffer(req.body) || req.body.length<100) throw new CustomerError(400,'Không có âm thanh');
    busy.add(id);
    try {
      const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:180000,maxRetries:1});
      const filename=req.get('X-AIEV-Audio-Format')==='m4a'?'speech.m4a':'speech.mp3';
      const result=await client.audio.transcriptions.create({file:await toFile(req.body,filename),model:'whisper-1',response_format:'verbose_json',timestamp_granularities:['word']});
      const seconds=Math.min(600,metadata.duration-idx*600);
      if (result.duration>seconds+5) throw new CustomerError(400,'Âm thanh vượt thời lượng đã báo giá');
      const payload={text:result.text,words:(result.words || []).map(w=>({...w,start:w.start+idx*600,end:w.end+idx*600}))};
      store.db.prepare('INSERT INTO local_chunks VALUES(?,?,?)').run(id,idx,JSON.stringify(payload));
      res.json(payload);
    } finally {busy.delete(id);}
  });
  app.post('/api/customer/local/:id/plan',auth,async(req,res)=>{
    const id=String(req.params.id);
    const {job,metadata,plan}=owned(res.locals.user.id,id);
    if (plan) return res.json(plan);
    if (job.status!=='local_running' || busy.has(id)) throw new CustomerError(409,'Yêu cầu chưa sẵn sàng');
    const chunks=store.db.prepare('SELECT result FROM local_chunks WHERE job_id=? ORDER BY idx').all(id).map(r=>JSON.parse(String(r.result)));
    if (metadata.hasAudio && chunks.length!==Math.ceil(metadata.duration/600)) throw new CustomerError(409,'Chưa nhận đủ âm thanh');
    busy.add(id);
    try {
      const words:Word[]=chunks.flatMap(c=>c.words);
      const edit=await createEditPlan(job.prompt,metadata,chunks.map(c=>c.text).join('\n') || 'Video không có âm thanh.',words);
      const payload={edit,words,hasAudio:metadata.hasAudio};
      store.db.prepare('UPDATE local_jobs SET plan=? WHERE id=?').run(JSON.stringify(payload),id);
      res.json(payload);
    } finally {busy.delete(id);}
  });
  app.post('/api/customer/local/:id/complete',auth,(req,res)=>{
    const id=String(req.params.id),{job,plan}=owned(res.locals.user.id,id);
    if (!plan || !['local_running','done'].includes(job.status)) throw new CustomerError(409,'Chưa có kế hoạch AI');
    if (job.status!=='done') {
      store.db.prepare("UPDATE jobs SET status='done',output='local.mp4',stage='Video đã lưu trên máy bạn' WHERE id=?").run(id);
      store.message(job.thread_id,'assistant','Video đã dựng trên máy bạn. Bấm Mở video để xem hoặc Lưu bản sao.');
    }
    res.json({success:true});
  });
  app.post('/api/customer/local/:id/fail',auth,(req,res)=>{
    const id=String(req.params.id),{job,plan}=owned(res.locals.user.id,id);
    if (busy.has(id)) throw new CustomerError(409,'AI đang xử lý');
    if (!plan) store.fail(id,'Không hoàn tất xử lý AI.');
    else if (job.status==='local_running') store.update(id,'local_running','Dựng tại máy bị gián đoạn; bấm xác nhận để thử lại miễn phí');
    res.json({success:true,retry:Boolean(plan)});
  });
}
