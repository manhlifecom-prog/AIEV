import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { assistantRoutes, type ConversationProgress } from './assistant.js';
import { CustomerStore, CustomerError } from './store.js';
import { partialReply } from './reply-stream.js';

test('structured reply streaming preserves escaped Vietnamese text and hides plan data', () => {
  const reply = 'Xin chào\n"Video" \\ 😀';
  const json = JSON.stringify({ reply, action: 'prepare', prompt: 'private-plan' });
  let previous = '';
  for (let i=1;i<=json.length;i++) { const value=partialReply(json.slice(0,i)); assert.ok(reply.startsWith(value)); assert.ok(value.startsWith(previous)); previous=value; }
  assert.equal(previous, reply);
  assert.equal(partialReply('{"reply":"a\\uD83D'), 'a');
});

test('SSE accepts immediately, streams reply, caches retries and refunds disconnected or failed AI once', async () => {
  const store=new CustomerStore(':memory:'); const user=store.register('stream@example.invalid','Stream','safe-password');
  store.db.prepare('UPDATE users SET balance=10 WHERE id=?').run(user.id);
  const app=express(); app.use(express.json()); let release:()=>void=()=>{}, fail=false, cancel=false, calls=0;
  assistantRoutes(app,store,(_req,res,next)=>{res.locals.user=store.user(user.id);next();},async (_input,progress?:ConversationProgress)=>{
    calls++; progress?.reply?.('Xin');
    await new Promise<void>((resolve,reject)=>{release=resolve;progress?.signal?.addEventListener('abort',()=>{cancel=true;reject(new Error('cancelled'));},{once:true});});
    if(fail)throw Error('failure');progress?.reply?.('Xin chào');return{reply:'Xin chào',action:'reply',prompt:''};
  });
  app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof CustomerError?error.status:500).json({error:error.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant';
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
  const post=(id:string,signal?:AbortSignal)=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Chào',stream:true,requestId:id}),signal});
  try {
    const id='11111111-1234-1234-1234-111111111111';const response=await post(id);assert.match(response.headers.get('content-type')!,/text\/event-stream/);
    const reader=response.body!.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.match(first,/accepted/);assert.match(first,/Xin/);assert.equal(store.messages(user.id,String(store.threads(user.id)[0].id)).length,0);
    release();let rest='';for(;;){const chunk=await reader.read();if(chunk.done)break;rest+=new TextDecoder().decode(chunk.value);}assert.match(rest,/result/);assert.equal(store.user(user.id)?.balance,9);
    assert.match(await (await post(id)).text(),/result/);assert.equal(calls,1);assert.equal(store.user(user.id)?.balance,9);
    fail=true;const failed=await post('22222222-1234-1234-1234-222222222222');release();assert.match(await failed.text(),/"type":"error"/);assert.equal(store.user(user.id)?.balance,9);
    const controller=new AbortController();const stopped=await post('33333333-1234-1234-1234-333333333333',controller.signal);await stopped.body!.getReader().read();controller.abort();
    for(let i=0;i<40&&!cancel;i++)await new Promise(r=>setTimeout(r,10));assert.equal(cancel,true);assert.equal(store.user(user.id)?.balance,9);
    fail=false;const retry=await post('33333333-1234-1234-1234-333333333333');release();assert.match(await retry.text(),/result/);assert.equal(store.user(user.id)?.balance,8);
  } finally {if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});

