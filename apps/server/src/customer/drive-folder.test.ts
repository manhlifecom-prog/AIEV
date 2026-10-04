import test from 'node:test';
import assert from 'node:assert/strict';
import {driveFolder,isDriveFolder,parsePublicFolder,listDriveFolder} from './drive-folder.js';
const a='abcdefghijk',b='bcdefghijkl',c='cdefghijklm';
function page(rows:unknown[][]) {return "<script>window['_DRIVE_ivd'] = '"+JSON.stringify([rows,null]).replace(/./g,x=>'\\x'+x.charCodeAt(0).toString(16).padStart(2,'0'))+"';</script>";}
function row(id:string,name:string,mime:string) {const r:unknown[]=[id,[],name,mime];r[13]=1000;return r;}
test('folder links and inert serialized listing reject other hosts, private and incomplete pages',()=>{
 assert.deepEqual(driveFolder('https://drive.google.com/drive/u/0/folders/'+a+'?resourcekey=key-1'),{id:a,key:'key-1'});
 assert.equal(isDriveFolder('https://drive.google.com.evil.test/drive/folders/'+a),false);
 assert.equal(isDriveFolder('https://drive.google.com/file/d/'+a+'/view'),false);
 const files=parsePublicFolder(page([row(a,"clip's 1.mov",'video/quicktime'),row(b,'notes.txt','text/plain')]));
 assert.equal(files[0].name,"clip's 1.mov");assert.equal(files[0].id,a);
 assert.throws(()=>parsePublicFolder('<script>throw Error("never execute")</script>'),/quyền/);
 assert.throws(()=>parsePublicFolder(page(Array.from({length:50},()=>row(a,'clip.mp4','video/mp4')))),/phân trang/);
});
test('public folders recurse, ignore nonvideo and deduplicate clips in natural order',async()=>{
 const saved=process.env.GOOGLE_DRIVE_API_KEY;delete process.env.GOOGLE_DRIVE_API_KEY;
 try {
  const files=await listDriveFolder('https://drive.google.com/drive/folders/'+a,async(url:any)=>new Response(page(String(url).includes(a)?[row(c,'10.mov','video/quicktime'),row(b,'2','application/vnd.google-apps.folder'),row(c,'duplicate.mov','video/quicktime'),row(a,'notes.txt','text/plain')]:[row(c,'1.mov','video/quicktime')])));
  assert.equal(files.length,1);assert.equal(files[0].name,'2/1.mov');
  await assert.rejects(listDriveFolder('https://drive.google.com/drive/folders/'+a,async()=>new Response(page([]))),/không có video/);
 }finally{if(saved===undefined)delete process.env.GOOGLE_DRIVE_API_KEY;else process.env.GOOGLE_DRIVE_API_KEY=saved;}
});
test('official API follows pages and preserves resource keys; failure does not return partial sources',async()=>{
 const saved=process.env.GOOGLE_DRIVE_API_KEY;process.env.GOOGLE_DRIVE_API_KEY='isolated-test-key';let calls=0;
 try {
  const files=await listDriveFolder('https://drive.google.com/drive/folders/'+a+'?resourcekey=parent-key',async(url:any,init:any)=>{
   calls++;assert.equal(init.headers['X-Goog-Drive-Resource-Keys'],a+'/parent-key');assert.equal(new URL(url).searchParams.get('pageSize'),'1000');
   return Response.json(calls===1?{nextPageToken:'next',files:[{id:b,name:'1.mov',mimeType:'video/quicktime',size:'400',resourceKey:'child-key'}]}:{files:[{id:c,name:'2.mp4',mimeType:'video/mp4',size:'800'}]});
  });assert.equal(files.length,2);assert.match(files[0].url,/resourcekey=child-key/);assert.equal(calls,2);
  calls=0;await assert.rejects(listDriveFolder('https://drive.google.com/drive/folders/'+a,async()=>++calls===1?Response.json({nextPageToken:'next',files:[{id:b,name:'1.mp4',mimeType:'video/mp4'}]}):new Response('',{status:403})),/chưa đọc được/);
 }finally{if(saved===undefined)delete process.env.GOOGLE_DRIVE_API_KEY;else process.env.GOOGLE_DRIVE_API_KEY=saved;}
});
