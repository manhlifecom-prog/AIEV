const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createPreviewHandler}=require('./media-preview.cjs');
test('local preview supports seeking and keeps account, token and file boundaries',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aiev-preview-test-')),file=path.join(root,'preview.mp4'),final=path.join(root,'final.mp4');
 fs.writeFileSync(file,'0123456789');fs.writeFileSync(final,'abcdefghij');let user='owner',current=file,now=1000;
 const previews=createPreviewHandler({account:async()=>({id:user}),resolve:async(id)=>{assert.equal(id,'owned-job');return {file:current,preview:current===file};},now:()=>now});
 try {
  const issued=await previews.issue('owned-job');current=final;
  let response=await previews.handle(new Request(issued.url,{headers:{Range:'bytes=2-5'}}));assert.equal(response.status,206);assert.equal(await response.text(),'2345');assert.equal(response.headers.get('Content-Range'),'bytes 2-5/10');
  response=await previews.handle(new Request(issued.url,{headers:{Range:'bytes=-3'}}));assert.equal(await response.text(),'789');
  response=await previews.handle(new Request(issued.url,{method:'HEAD'}));assert.equal(response.headers.get('Content-Length'),'10');assert.equal(await response.text(),'');
  for(const range of ['bytes=20-','bytes=3-1','bytes=0-1,5-6'])assert.equal((await previews.handle(new Request(issued.url,{headers:{Range:range}}))).status,416);
  assert.equal((await previews.handle(new Request(issued.url,{headers:{Origin:'https://attacker.example'}}))).status,403);
  assert.equal((await previews.handle(new Request('aiev-media://video/../../secret'))).status,403);
  user='another';assert.equal((await previews.handle(new Request(issued.url))).status,403);user='owner';now+=9*60*60*1000;assert.equal((await previews.handle(new Request(issued.url))).status,403);
 } finally {assert.equal(path.dirname(root),path.resolve(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});}
});
