import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { CustomerStore, CustomerError } from './store.js';
import { assistantRoutes } from './assistant.js';

test('conversation remembers source, bills once, enforces ownership and refunds failed AI', async () => {
  const store=new CustomerStore(':memory:');
  const user=store.register('chat@example.invalid','Chat','safe-password');
  const other=store.register('other@example.invalid','Other','safe-password');
  store.db.prepare('UPDATE users SET balance=10 WHERE id=?').run(user.id);
  const app=express(); app.use(express.json()); let calls=0, received:any, fail=false;
  assistantRoutes(app,store,(req,res,next)=>{res.locals.user=store.user(String(req.headers['x-user']));next();},async input=>{
    calls++; received=input; if(fail) throw new Error('upstream unavailable');
    return {reply:'Tôi có thể chỉnh video này.',action:calls===1?'reply':'prepare',prompt:'Giữ khung vuông, cắt còn 4 giây'};
  });
  app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof CustomerError?error.status:500).json({error:error.message}));
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r));
  const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant';
  const post=(body:object,owner=user.id)=>fetch(url,{method:'POST',headers:{'content-type':'application/json','x-user':owner},body:JSON.stringify(body)});
  const saved=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='test-only';
  try {
    const first=await post({message:'Xin chào',requestId:'11111111-1111-1111-1111-111111111111'});
    assert.equal(first.status,200); const greeting=await first.json(); assert.equal(greeting.action,'reply'); assert.equal(store.user(user.id)?.balance,9);
    await post({message:'Xin chào',requestId:greeting.turnId}); assert.equal(calls,1); assert.equal(store.user(user.id)?.balance,9);
    const job=store.createJob(user.id,greeting.threadId,'Video vuông','local-file');
    store.update(job.id,'done','Video đã dựng');
    const edit=await post({message:'Ngắn hơn',threadId:greeting.threadId,device:'windows'}); assert.equal(edit.status,200);
    const next=await edit.json(); assert.equal(next.sourceJobId,job.id); assert.equal(next.action,'prepare'); assert.equal(received.currentSource.request,'Video vuông'); assert.equal(received.conversation.length,2);
    assert.equal((await post({message:'x',threadId:greeting.threadId},other.id)).status,404);
    fail=true; assert.equal((await post({message:'Sửa tiếp',threadId:greeting.threadId})).status,503); assert.equal(store.user(user.id)?.balance,8); assert.equal(store.messages(user.id,greeting.threadId).length,4);
    assert.equal((await post({message:'Hi'},other.id)).status,402); assert.equal(calls,3);
    const retryId='22222222-2222-2222-2222-222222222222';
    assert.equal((await post({message:'Retry',threadId:greeting.threadId,requestId:retryId})).status,503); assert.equal(store.user(user.id)?.balance,8);
    fail=false; assert.equal((await post({message:'Retry',threadId:greeting.threadId,requestId:retryId})).status,200);assert.equal(store.user(user.id)?.balance,7);
    assert.equal((await post({message:'Retry',threadId:greeting.threadId,requestId:retryId})).status,200);assert.equal(store.user(user.id)?.balance,7);assert.equal(calls,5);
  } finally {if(saved===undefined) delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved; await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});

test('folder source is remembered from web chat and older desktop gets upgrade guidance',async()=>{
 const store=new CustomerStore(':memory:');const user=store.register('folder@example.invalid','Folder','safe-password');store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
 const app=express();app.use(express.json());let received:any;
 assistantRoutes(app,store,(_req,res,next)=>{res.locals.user=store.user(user.id);next();},async input=>{received=input;return{action:'prepare',reply:'Có thể dựng từ thư mục.',prompt:'Ghép vlog vuông 4 giây'};},async()=>[{id:'abcdefghijk',name:'clip.mov',mimeType:'video/quicktime',url:'https://drive.google.com/file/d/abcdefghijk/view',bytes:1000}]);
 app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof CustomerError?error.status:500).json({error:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 const post=async(body:object)=>{const r=await fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
 try {
  const first=await post({message:'Ghép vlog https://drive.google.com/drive/folders/abcdefghijk',device:'web'});assert.equal(received.currentSource.videoCount,1);assert.equal(first.action,'prepare');
  const old=await post({threadId:first.threadId,message:'Làm theo yêu cầu trên',device:'windows'});assert.equal(old.action,'reply');assert.match(old.reply,/0.5.0/);
  const compatible=await post({threadId:first.threadId,message:'Làm theo yêu cầu trên',device:'windows',deviceVersion:'0.4.0'});assert.equal(compatible.action,'prepare');
  const current=await post({threadId:first.threadId,message:'Làm theo yêu cầu trên',device:'windows',deviceVersion:'0.5.0'});assert.equal(current.action,'prepare');assert.equal(current.url,first.url);assert.equal(store.user(user.id)?.balance,0);
  for(const device of ['macos','ios']) {
   const native=await post({threadId:first.threadId,message:'Làm theo yêu cầu trên',device,deviceVersion:'0.6.0'});assert.equal(native.action,'prepare');assert.equal(received.device,device);
   const oldNative=await post({threadId:first.threadId,message:'Xin chào',device,deviceVersion:'0.1.0'});assert.equal(received.device,'web');
   const pending=store.createJob(user.id,first.threadId,'Ghép clip','local-file');store.quote(pending.id,4,10);
   const before=store.messages(user.id,first.threadId).length;
   const confirmed=await post({threadId:first.threadId,message:'Làm đi',device,deviceVersion:'0.6.0'});assert.equal(confirmed.action,'confirm');assert.equal(confirmed.jobId,pending.id);assert.equal(store.messages(user.id,first.threadId).length,before+2);assert.equal(store.user(user.id)?.balance,0);
   store.update(pending.id,'cancelled','Kiểm thử đã hoàn tất');
  }
 }finally {if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});
