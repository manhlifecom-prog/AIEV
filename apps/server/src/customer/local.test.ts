import test from 'node:test';
import assert from 'node:assert/strict';
import {CustomerStore} from './store.js';
import {customerApp} from './http.js';
test('device jobs reserve once, persist across restart, reject other users and complete without server files',async()=>{
 const store=new CustomerStore(':memory:'); const user=store.register('local@example.com','Local','secure-password'); const other=store.register('other@example.com','Other','secure-password');
 store.db.prepare('UPDATE users SET balance=1000 WHERE id=?').run(user.id);
 const {app}=customerApp(store); const server=app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
 const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const session=store.createSession(user.id),otherSession=store.createSession(other.id); const saved=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='test-only';
 const post=(endpoint:string,body:unknown={},token=session)=>fetch(origin+'/api/customer'+endpoint,{method:'POST',headers:{cookie:'aiev_customer='+token,'content-type':'application/json'},body:JSON.stringify(body)});
 try {
  assert.equal((await post('/local/quote',{metadata:{duration:-1},message:'edit'})).status,400);
  const quoted=await post('/local/quote',{message:'Cắt video',metadata:{duration:120,bytes:3405232803,width:1920,height:1080,hasAudio:false}});
  assert.equal(quoted.status,200); const {jobId}=await quoted.json(); assert.equal(store.job(user.id,jobId).tokens,50);
  assert.equal((await post('/local/'+jobId+'/confirm',{},otherSession)).status,404);
  assert.equal((await post('/local/'+jobId+'/confirm')).status,200); assert.equal((await post('/local/'+jobId+'/confirm')).status,200);
  assert.equal(store.user(user.id)?.balance,950); store.recover(); assert.equal(store.job(user.id,jobId).status,'local_running');
  assert.equal((await post('/local/'+jobId+'/complete')).status,409);
  store.db.prepare('UPDATE local_jobs SET plan=? WHERE id=?').run(JSON.stringify({edit:{title:'',ratio:'1:1',subtitles:false,segments:[{start:0,end:1}]},words:[],hasAudio:false}),jobId);
  assert.equal((await post('/local/'+jobId+'/fail')).status,200); assert.equal(store.user(user.id)?.balance,950);
  assert.equal((await post('/local/'+jobId+'/complete')).status,200); assert.equal((await post('/local/'+jobId+'/complete')).status,200);
  assert.equal(store.job(user.id,jobId).output,'local.mp4'); assert.equal((await fetch(origin+'/api/customer/videos/'+jobId+'/file',{headers:{cookie:'aiev_customer='+session}})).status,404);
  const prior=process.env.CUSTOMER_SERVER_RENDER; process.env.CUSTOMER_SERVER_RENDER='0';
  try {assert.equal((await post('/chat',{message:'edit https://drive.google.com/file/d/abcdefghijk/view'})).status,409);} finally {if(prior===undefined) delete process.env.CUSTOMER_SERVER_RENDER; else process.env.CUSTOMER_SERVER_RENDER=prior;}
 } finally {if(saved===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=saved; await new Promise<void>(resolve=>server.close(()=>resolve())); store.db.close();}
});
