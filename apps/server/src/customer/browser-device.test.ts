import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {CustomerStore} from './store.js';
import {assistantRoutes} from './assistant.js';

test('browser renderer prepares selected sources and confirms without trusting client billing rights',async()=>{
 const store=new CustomerStore(':memory:');const user=store.register('browser@example.invalid','Browser','safe-password');store.db.prepare('UPDATE users SET balance=2 WHERE id=?').run(user.id);
 let received:any;const id='a'.repeat(32),app=express();app.use(express.json());
 assistantRoutes(app,store,(_req,res,next)=>{res.locals.user=store.user(user.id);next();},async input=>{received=input;return {action:'prepare',reply:'Dựng ngay trong trình duyệt.',prompt:'Cắt video 2 giây',sourceIds:[id]};});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 const post=(body:object)=>fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  const first=await post({message:'Cắt video',device:'browser',browserRenderer:1,unlimitedTokens:true,localLibrary:{total:1,files:[{id,name:'clip.mp4',bytes:1000,path:'/secret'}]}});assert.equal(first.status,200);const decision=await first.json();assert.equal(received.device,'browser');assert.equal(received.billing.unlimitedTokens,false);assert.equal(store.user(user.id)?.balance,1);assert.deepEqual(received.localLibrary.files,[{id,name:'clip.mp4',bytes:1000}]);
  const job=store.createJob(user.id,decision.threadId,'Cắt video 2 giây','browser-file');store.quote(job.id,2,30);
  const confirmation=await (await post({message:'đồng ý',threadId:decision.threadId,device:'browser',browserRenderer:1})).json();assert.equal(confirmation.action,'confirm');assert.equal(confirmation.jobId,job.id);assert.equal(store.user(user.id)?.balance,1);
 }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});
