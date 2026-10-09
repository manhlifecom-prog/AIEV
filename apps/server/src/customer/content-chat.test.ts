import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {CustomerStore} from './store.js';
import {assistantRoutes,conversationContext} from './assistant.js';

test('long script context retains the closing scene and stays bounded',()=>{
 const script='A'.repeat(6000)+'Closing scene CTA';
 assert.equal(conversationContext([{role:'assistant',content:script}])[0].content,script);
 assert.ok(conversationContext(Array.from({length:50},()=>({role:'assistant',content:'x'.repeat(24000)}))).reduce((n,m)=>n+m.content.length,0)<=96000);
});

test('text drafts need no files; inaccessible old Drive does not block conversation or create render jobs',async()=>{
 const store=new CustomerStore(':memory:'); const user=store.register('writer@example.invalid','Writer','test-password');
 store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
 const thread=store.createThread(user.id,'Content');store.message(thread,'user','https://drive.google.com/drive/folders/abcdefghijk');
 const app=express();app.use(express.json());let received:any;
 assistantRoutes(app,store,(_q,r,n)=>{r.locals.user=store.user(user.id);n();},async input=>{received=input;return {reply:'Kịch bản: Mở đầu thu hút. Nội dung chính. Kết thúc.',action:'reply',prompt:'',sourceIds:[]};},async()=>{throw Error('Private folder');});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const prior=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 try{
 const r=await fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({threadId:thread,message:'Viết content cho tôi, chưa cần dựng',device:'web'})});
 assert.equal(r.status,200);assert.equal((await r.json()).action,'reply');assert.ok(received.sourceError);assert.equal(store.jobs(user.id).length,0);assert.equal(store.user(user.id)?.balance,0);
 }finally{await new Promise<void>(r=>server.close(()=>r()));store.db.close();if(prior===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prior;}
});
