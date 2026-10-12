import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type dns from 'node:dns/promises';
import {openDriveTransfer,driveTransferRoutes} from './drive-transfer.js';
const url='https://drive.google.com/file/d/abcdefghijk/view';
const publicLookup=(async()=>[{address:'142.250.1.1',family:4}]) as unknown as typeof dns.lookup;
test('Drive rejects private destinations, redirects and non-video bodies',async()=>{
 const signal=new AbortController().signal;
 await assert.rejects(openDriveTransfer('https://127.0.0.1/secret',signal),/drive.google.com/);
 await assert.rejects(openDriveTransfer(url,signal,(async()=>new Response('',{status:302,headers:{location:'https://127.0.0.1/secret'}})) as typeof fetch,publicLookup),/không được phép/);
 await assert.rejects(openDriveTransfer(url,signal,(async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})) as typeof fetch,publicLookup),/chưa cho tải/);
 await assert.rejects(openDriveTransfer(url,signal,fetch,(async()=>[{address:'127.0.0.1',family:4}]) as unknown as typeof dns.lookup),/không hợp lệ/);
});
test('Transfer authenticates, streams original bytes and releases concurrency after completion',async()=>{
 const app=express();app.use(express.json());let calls=0;
 driveTransferRoutes(app,(req,res,next)=>{if(req.headers.authorization!=='test')return void res.status(401).end();res.locals.user={id:'test-owner'};next();},async()=>{calls++;return new Response(new Uint8Array(256).fill(7),{headers:{'content-type':'video/mp4','content-length':'256'}});});
 app.use((error:any,_req:any,res:any,_next:any)=>res.status(error.status||400).json({error:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const endpoint=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/customer/drive/transfer`;
 const post=(auth=false,value=url)=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'test'}:{})},body:JSON.stringify({url:value})});
 try {
  assert.equal((await post()).status,401);assert.equal(calls,0);
  assert.equal((await post(true,'https://localhost/secret')).status,400);assert.equal(calls,0);
  for(let i=0;i<2;i++){const response=await post(true);assert.equal(response.status,200);assert.equal(response.headers.get('x-accel-buffering'),'no');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array(256).fill(7));}
  assert.equal(calls,2);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
