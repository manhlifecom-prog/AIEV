import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {CustomerStore,CustomerError} from './store.js';
import {assistantRoutes} from './assistant.js';

test('native library selection is bounded, strips extra fields and refunds invalid selections; chat stays available during rendering',async()=>{
 const store=new CustomerStore(':memory:');const user=store.register('library@example.invalid','Library','safe-password');
 store.db.prepare('UPDATE users SET balance=10 WHERE id=?').run(user.id);
 const id='a'.repeat(32);let received:any,invalid=false,calls=0;
 const app=express();app.use(express.json());assistantRoutes(app,store,(_req,res,next)=>{res.locals.user=store.user(user.id);next();},async input=>{received=input;calls++;return {action:'prepare',reply:'Tôi sẽ dựng nguồn bạn chọn.',prompt:'Cắt 2 giây',sourceIds:[invalid?'b'.repeat(32):id]};});
 app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof CustomerError?error.status:500).json({error:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant';
 const library={total:1,role:'admin',path:'C:/private',files:[{id,name:'du-lich.mp4',bytes:1000,path:'C:/private/video.mp4'}]};
 const post=(body:object)=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try {
  const response=await post({message:'Cắt video du lịch',device:'macos',deviceVersion:'1.0.0',localLibrary:library,unlimitedTokens:true});assert.equal(response.status,200);
  const first=await response.json();assert.deepEqual(first.sourceIds,[id]);assert.equal(received.device,'macos');assert.deepEqual(received.localLibrary,{total:1,files:[{id,name:'du-lich.mp4',bytes:1000}]});assert.equal(received.billing.unlimitedTokens,false);assert.equal(store.user(user.id)?.balance,9);
  invalid=true;assert.equal((await post({message:'Làm tiếp',threadId:first.threadId,device:'windows',localLibrary:library})).status,400);assert.equal(store.user(user.id)?.balance,9);
  invalid=false;const job=store.createJob(user.id,first.threadId,'Video đang dựng','local-file');store.update(job.id,'local_running','Đang xuất MP4');
  const active=await post({message:'Sau đó đổi sang dọc',threadId:first.threadId,device:'windows',deviceVersion:'1.0.0',localLibrary:library});assert.equal(active.status,200);const reply=await active.json();assert.equal(reply.action,'reply');assert.deepEqual(reply.sourceIds,[]);assert.equal(received.activeJob.stage,'Đang xuất MP4');assert.equal(store.jobs(user.id).length,1);assert.equal(store.user(user.id)?.balance,8);
  const before=calls;assert.equal((await post({message:'x',device:'windows',localLibrary:{...library,files:[...library.files,...library.files]}})).status,400);assert.equal(calls,before);assert.equal(store.user(user.id)?.balance,8);
 }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});

test('native confirmation and cancellation retries reuse their turn and do not duplicate messages',async()=>{
 const store=new CustomerStore(':memory:');const user=store.register('confirmation@example.invalid','Confirm','safe-password');const threadId=store.createThread(user.id,'Cắt video');const job=store.createJob(user.id,threadId,'Cắt video','local-file');store.quote(job.id,2,10);
 const app=express();app.use(express.json());assistantRoutes(app,store,(_req,res,next)=>{res.locals.user=store.user(user.id);next();},async()=>{throw Error('Confirmation must not call AI');});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 const post=(message:string,requestId:string)=>fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,requestId,threadId,device:'windows',deviceVersion:'1.0.0'})});
 try{
  const key='11111111-1111-1111-1111-111111111111';const first=await (await post('Ok rồi làm đi',key)).json();assert.equal(first.action,'confirm');assert.equal(first.jobId,job.id);
  assert.deepEqual(await (await post('Ok rồi làm đi',key)).json(),first);assert.equal(store.messages(user.id,threadId).length,2);
  const cancelKey='22222222-2222-2222-2222-222222222222';const cancel=await (await post('hủy',cancelKey)).json();assert.equal(store.job(user.id,job.id).status,'cancelled');assert.deepEqual(await (await post('hủy',cancelKey)).json(),cancel);assert.equal(store.messages(user.id,threadId).length,4);assert.equal(store.user(user.id)?.balance,0);
 }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});
