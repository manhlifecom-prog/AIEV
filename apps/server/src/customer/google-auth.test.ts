import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHash } from 'node:crypto';
import { googleAccount, googleRoutes, googleSchema } from './google-auth.js';
import { CustomerStore } from './store.js';

test('Google preserves existing wallet and admin only after password proof; blocked accounts cannot sign in', () => {
  const store = new CustomerStore(':memory:'); googleSchema(store);
  try {
    const existing = store.register('admin@example.com', 'Admin', 'test-password');
    store.db.prepare("UPDATE users SET role='admin',balance=73 WHERE id=?").run(existing.id);
    const identity = {sub:'google-123',email:existing.email,name:'Google Name'};
    assert.equal(googleAccount(store, identity), null);
    assert.throws(()=>googleAccount(store, identity, 'wrong'));
    assert.equal(store.db.prepare('SELECT count(*) n FROM google_accounts').get()?.n,0);
    assert.equal(googleAccount(store, identity, 'test-password')?.id,existing.id);
    assert.equal(googleAccount(store, identity)?.balance,73);
    assert.equal(googleAccount(store, identity)?.role,'admin');
    // Identity is keyed by Google's stable subject, not mutable email.
    assert.equal(googleAccount(store, {...identity,email:'changed@example.com'})?.id,existing.id);
    assert.throws(()=>googleAccount(store,{...identity,sub:'different'},'test-password'));
    store.db.prepare('UPDATE users SET blocked=1 WHERE id=?').run(existing.id);
    assert.throws(()=>googleAccount(store,identity));
  } finally { store.db.close(); }
});

test('new Google accounts are ordinary customers with no credit and repeat sign-in does not duplicate users',()=>{
  const store=new CustomerStore(':memory:');googleSchema(store);
  try {
    const identity={sub:'new-sub',email:'new@example.com',name:'Customer'};
    const user=googleAccount(store,identity)!;
    assert.equal(user.role,'customer');assert.equal(user.balance,0);
    assert.equal(googleAccount(store,identity)?.id,user.id);
    assert.equal(store.db.prepare('SELECT count(*) n FROM users').get()?.n,1);
    assert.equal(store.db.prepare('SELECT count(*) n FROM ledger').get()?.n,0);
  } finally {store.db.close();}
});

test('OAuth uses state, nonce, PKCE, narrow scopes and rejects missing/mismatched/replayed cookies',async()=>{
  const before=[process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET];
  process.env.GOOGLE_CLIENT_ID='test-client';process.env.GOOGLE_CLIENT_SECRET='test-secret';
  const store=new CustomerStore(':memory:'),app=express();
  googleRoutes(app,store,(_q,_r,next)=>next(),()=>{throw new Error('No session may be created');});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
  try {
    const start=await fetch(base+'/api/customer/auth/google',{redirect:'manual'});
    const cookie=start.headers.get('set-cookie')!.split(';')[0];
    const url=new URL(start.headers.get('location')!);
    assert.equal(url.origin,'https://accounts.google.com');
    assert.equal(url.searchParams.get('scope'),'openid email profile');
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    const flow=store.db.prepare('SELECT * FROM google_flows').get()!;
    assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(String(flow.verifier)).digest('base64url'));
    assert.equal(url.searchParams.get('nonce'),flow.nonce);
    const callback='/api/customer/auth/google/callback?state=wrong&code=fake';
    assert.equal((await fetch(base+callback,{redirect:'manual',headers:{cookie}})).headers.get('location'),'/studio?google=expired');
    assert.equal(store.db.prepare('SELECT count(*) n FROM google_flows').get()?.n,0);
    assert.equal((await fetch(base+callback,{redirect:'manual',headers:{cookie}})).headers.get('location'),'/studio?google=expired');
    assert.equal((await fetch(base+callback,{redirect:'manual'})).headers.get('location'),'/studio?google=expired');
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));store.db.close();
    for(const [i,key] of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'].entries()) {if(before[i]===undefined)delete process.env[key];else process.env[key]=before[i];}
  }
});
