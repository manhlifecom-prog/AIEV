import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { CustomerStore, CustomerError } from './store.js';
import { customerApp } from './http.js';
import { customerConfig } from './config.js';
import { assistantRoutes } from './assistant.js';

test('migration retains old users, balances and roles and is repeatable', () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aiev-migration-')),filename=path.join(dir,'customers.sqlite');
 const old=new DatabaseSync(filename);
 old.exec("CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,balance INTEGER NOT NULL CHECK(balance>=0),role TEXT NOT NULL DEFAULT 'customer'); INSERT INTO users VALUES('old','old@example.invalid','Old','old-hash',17,'admin')");old.close();
 try {for(let i=0;i<2;i++){const store=new CustomerStore(filename);assert.equal(store.user('old')?.balance,17);assert.equal(store.user('old')?.password,'old-hash');assert.equal(store.publicUser(store.user('old')!).unlimitedTokens,true);assert.equal(store.user('old')?.blocked,0);assert.equal(store.db.prepare('SELECT count(*) n FROM admin_audit').get()?.n,0);store.db.close();}}
 finally {fs.rmSync(dir,{recursive:true});}
});

test('zero-balance admins reserve, finish, fail and revise without charges; refund follows original debit even after role changes', () => {
 const store=new CustomerStore(':memory:'),admin=store.register('admin@example.invalid','Admin','safe-password');
 store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.id);const thread=store.createThread(admin.id,'Admin edits');
 for(let i=0;i<32;i++){const j=store.createJob(admin.id,thread,'Cut video','local-file');store.quote(j.id,60,30);store.reserve(admin.id,j.id);store.reserve(admin.id,j.id);store.update(j.id,'running','render');if(i%2)store.finish(j.id,'local.mp4');else{store.fail(j.id,'error');store.fail(j.id,'retry');}assert.equal(store.user(admin.id)?.balance,0);}
 assert.equal(store.db.prepare("SELECT count(*) n FROM ledger WHERE kind='reserve' AND delta=0").get()?.n,32);
 assert.equal(store.db.prepare("SELECT count(*) n FROM ledger WHERE kind='refund'").get()?.n,0);
 const free=store.createJob(admin.id,thread,'Free before demotion','local-file');store.quote(free.id,60,30);store.reserve(admin.id,free.id);store.update(free.id,'local_running','At device');assert.throws(()=>store.createJob(admin.id,store.createThread(admin.id,'Another thread'),'Concurrent','local-file'),(e:unknown)=>e instanceof CustomerError&&e.status===409);store.db.prepare("UPDATE users SET role='customer' WHERE id=?").run(admin.id);store.fail(free.id,'error');assert.equal(store.user(admin.id)?.balance,0);
 assert.throws(()=>store.createJob(admin.id,thread,'Daily limit','local-file'),(e:unknown)=>e instanceof CustomerError&&e.status===429);
 const customer=store.register('customer@example.invalid','Customer','safe-password');store.db.prepare('UPDATE users SET balance=50 WHERE id=?').run(customer.id);
 const paid=store.createJob(customer.id,store.createThread(customer.id,'Paid'),'Cut','local-file');store.quote(paid.id,60,30);store.reserve(customer.id,paid.id);assert.equal(store.user(customer.id)?.balance,20);
 store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(customer.id);store.fail(paid.id,'error');store.fail(paid.id,'retry');assert.equal(store.user(customer.id)?.balance,50);
 store.db.close();
});

test('admin chat at zero, failed AI and same-request retry preserve zero; successful replay uses one AI turn',async()=>{
 const store=new CustomerStore(':memory:'),u=store.register('chat-admin@example.invalid','Admin','safe-password');store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(u.id);
 const app=express();app.use(express.json());let fail=true,calls=0;
 assistantRoutes(app,store,(_req,res,next)=>{res.locals.user=store.user(u.id);next();},async input=>{calls++;assert.equal((input as any).billing.unlimitedTokens,true);if(fail)throw new Error('upstream');return {reply:'Ready',action:'reply',prompt:''};});
 app.use((e:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(e instanceof CustomerError?e.status:500).json({error:e.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 try{const body={message:'Hi',requestId:randomUUID()},post=()=>fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post()).status,503);assert.equal(store.user(u.id)?.balance,0);fail=false;assert.equal((await post()).status,200);assert.equal((await post()).status,200);assert.equal(calls,2);assert.equal(store.user(u.id)?.balance,0);assert.equal(store.db.prepare("SELECT count(*) n FROM ledger WHERE kind='chat' AND delta=0").get()?.n,2);assert.equal(store.db.prepare("SELECT count(*) n FROM ledger WHERE kind='chat_refund'").get()?.n,0);
 }finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});

test('admin APIs enforce roles, atomic idempotent changes, session revocation and genuine receipt revenue',async()=>{
 const store=new CustomerStore(':memory:'),admin=store.register('admin@example.invalid','Admin','safe-password'),u=store.register('customer@example.invalid','Customer','safe-password');
 store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(admin.id);for(let i=0;i<26;i++)store.register(`page${i}@example.invalid`,'Page '+i,'safe-password');
 const {app}=customerApp(store),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const origin='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/customer',adminToken=store.createSession(admin.id),customerToken=store.createSession(u.id);
 const req=(route:string,body?:object,token=adminToken)=>fetch(origin+route,{method:body?'POST':'GET',headers:{cookie:'aiev_customer='+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
 try{
  assert.equal((await req('/admin/customers',undefined,customerToken)).status,403);assert.equal((await req('/admin/overview',undefined,'')).status,401);
  const me=await(await req('/me')).json();assert.equal(me.unlimitedTokens,true);assert.equal(me.balance,0);assert.equal(me.password,undefined);
  const list=await(await req('/admin/customers')).json();assert.equal(list.items.length,25);assert.equal(list.total,27);assert.equal((await(await req('/admin/customers?page=2')).json()).items.length,2);
  assert.equal((await(await req('/admin/customers?q=customer')).json()).total,1);assert.equal((await req('/admin/customers?status=wrong')).status,400);
  const route='/admin/customers/'+u.id,change={requestId:randomUUID(),reason:'Test credit',delta:20};
  assert.equal((await req(route+'/tokens',{...change,reason:''})).status,400);assert.equal((await req(route+'/tokens',change)).status,200);assert.equal((await(await req(route+'/tokens',change)).json()).duplicate,true);assert.equal(store.user(u.id)?.balance,20);
  assert.equal((await req(route+'/tokens',{...change,delta:21})).status,409);assert.equal((await req(route+'/tokens',{requestId:randomUUID(),reason:'Cannot go negative',delta:-21})).status,400);assert.equal(store.db.prepare('SELECT count(*) n FROM admin_audit').get()?.n,1);
  // A failed audit insertion must also roll back wallet and ledger changes.
  store.db.exec("CREATE TRIGGER test_audit_failure BEFORE INSERT ON admin_audit WHEN NEW.reason='rollback-test' BEGIN SELECT RAISE(ABORT,'test'); END");
  assert.equal((await req(route+'/tokens',{requestId:randomUUID(),reason:'rollback-test',delta:5})).status,500);assert.equal(store.user(u.id)?.balance,20);store.db.exec('DROP TRIGGER test_audit_failure');
  assert.equal((await req(route+'/tokens',{requestId:randomUUID(),reason:'Debit',delta:-5})).status,200);assert.equal(store.user(u.id)?.balance,15);
  const thread=store.createThread(u.id,'Video'),job=store.createJob(u.id,thread,'Test cut','local-file');store.quote(job.id,10,10);store.reserve(u.id,job.id);store.update(job.id,'local_running','At device');
  const order=store.createOrder(u.id,100),lock={requestId:randomUUID(),reason:'Lock test',blocked:true};assert.equal((await req(route+'/status',lock)).status,200);assert.equal((await req(route+'/status',lock)).status,200);assert.equal(store.job(u.id,job.id).status,'local_running');assert.equal(store.user(u.id)?.balance,5);
  assert.equal((await req('/me',undefined,customerToken)).status,401);assert.equal((await req('/auth/login',{email:u.email,password:'safe-password'})).status,403);
  const payment={id:9123,accountNumber:customerConfig.account,transferType:'in',transferAmount:order.amount,content:order.code};assert.equal(store.payment(payment).credited,true);assert.equal(store.payment(payment).duplicate,true);assert.equal(store.user(u.id)?.balance,105);
  assert.equal((await(await req('/admin/customers?status=blocked')).json()).total,1);
  assert.equal((await req('/admin/customers/'+admin.id+'/status',{requestId:randomUUID(),reason:'Forbidden',blocked:true})).status,403);assert.equal((await req('/admin/customers/'+admin.id+'/tokens',change)).status,409);
  assert.equal((await req('/admin/customers/'+admin.id+'/tokens',{...change,requestId:randomUUID()})).status,403);
  const wallet=await(await req('/wallet',undefined,customerToken)).json();assert.equal(wallet.error,'Hãy đăng nhập để tiếp tục');
  const summary=await(await req('/admin/overview?days=7')).json();assert.equal(summary.stats.paidVnd,order.amount);assert.equal(summary.series.length,7);assert.equal(summary.stats.activeVideos,1);assert.equal(summary.series.at(-1).amount,order.amount);assert.equal(summary.recentJobs[0].status,'local_running');
  assert.equal((await(await req('/admin/videos?status=local_running')).json()).total,1);assert.equal((await(await req('/admin/videos/'+job.id)).json()).chargedTokens,10);assert.equal((await(await req('/admin/orders?status=paid')).json()).total,1);assert.ok((await(await req('/admin/orders/'+order.id)).json()).paidAt);
  const audit=await(await req('/admin/audit')).json();assert.equal(audit.total,3);assert.equal(audit.items[0].actorEmail,admin.email);assert.equal(audit.items[0].targetEmail,u.email);
  for(const endpoint of ['/admin/customers','/admin/customers/'+u.id,'/admin/orders','/admin/videos','/admin/audit'])assert.ok(!(await(await req(endpoint)).text()).includes('password'));
  assert.equal((await req(route+'/status',{requestId:randomUUID(),reason:'Unlock test',blocked:false})).status,200);assert.equal((await req('/me',undefined,customerToken)).status,401);assert.equal((await req('/auth/login',{email:u.email,password:'safe-password'})).status,200);assert.equal(store.job(u.id,job.id).status,'local_running');
 }finally{await new Promise<void>(r=>server.close(()=>r()));store.db.close();}
});
