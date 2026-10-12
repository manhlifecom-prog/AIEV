import test from 'node:test';
import assert from 'node:assert/strict';
import {browserDriveFiles} from './browser-drive';
const url='https://drive.google.com/file/d/abcdefghijk/view';
test('Browser receives file bytes with progress; rejects oversized and broken transfers',async()=>{
 const labels:string[]=[];
 const files=await browserDriveFiles(url,label=>labels.push(label),(async()=>new Response(new Uint8Array(256).fill(5),{headers:{'content-type':'video/mp4','content-length':'256'}})) as typeof fetch);
 assert.equal(files.length,1);assert.equal(files[0].size,256);assert.deepEqual(new Uint8Array(await files[0].arrayBuffer()),new Uint8Array(256).fill(5));assert.ok(labels.some(x=>x.includes('MB')));
 await assert.rejects(browserDriveFiles(url,()=>{},(async()=>new Response('x',{headers:{'content-length':'2000000000'}})) as typeof fetch),/bộ nhớ/);
 await assert.rejects(browserDriveFiles(url,()=>{},(async()=>new Response(new ReadableStream({start(c){c.error(Error('connection interrupted'));}}))) as typeof fetch),/connection interrupted/);
});
