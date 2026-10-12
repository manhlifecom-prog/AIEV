const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {MediaLibrary}=require('./media-library.cjs');
function cleanup(root) {
 const target=path.resolve(root);
 assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.match(path.basename(target),/^aiev-library-/);
 fs.rmSync(target,{recursive:true,force:true});
}
test('only picked video sources are indexed; opaque IDs and grants are account scoped',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aiev-library-'));
 try {
  const picked=path.join(root,'video'),state=path.join(root,'state');fs.mkdirSync(picked);fs.mkdirSync(path.join(picked,'trip'));
  fs.writeFileSync(path.join(picked,'trip','du-lich.mp4'),Buffer.alloc(200,7));fs.writeFileSync(path.join(picked,'.env'),'private');fs.writeFileSync(path.join(picked,'notes.txt'),'private');
  const lib=new MediaLibrary(state),value=await lib.grant('alice',[picked],true);
  assert.equal(value.total,1);assert.equal(value.files[0].name,'trip/du-lich.mp4');assert.ok(!JSON.stringify(value).includes(root));
  assert.equal((await lib.scan('bob')).total,0);await assert.rejects(lib.copy('bob',value.files[0].id,path.join(root,'stolen.mp4')));
  await lib.copy('alice',value.files[0].id,path.join(root,'copy.mp4'));assert.equal(fs.readFileSync(path.join(root,'copy.mp4'))[0],7);
  assert.equal(lib.context('alice','dựng video du lịch').files[0].id,value.files[0].id);
  const restarted=new MediaLibrary(state);assert.equal((await restarted.scan('alice')).files[0].id,value.files[0].id);
  await lib.revoke('alice');assert.equal((await restarted.scan('bob')).total,0);await assert.rejects(lib.copy('alice',value.files[0].id,path.join(root,'revoked.mp4')));
 } finally {cleanup(root);}
});
test('directory junctions and replaced files cannot expand a picked folder grant',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aiev-library-'));
 try {
  const picked=path.join(root,'picked'),outside=path.join(root,'outside');fs.mkdirSync(picked);fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside,'private.mp4'),Buffer.alloc(200));fs.symlinkSync(outside,path.join(picked,'escape'),'junction');
  const file=path.join(picked,'owned.mp4');fs.writeFileSync(file,Buffer.alloc(200));
  const lib=new MediaLibrary(path.join(root,'state')),value=await lib.grant('alice',[picked],true);assert.equal(value.total,1);
  fs.renameSync(file,path.join(root,'old.mp4'));fs.writeFileSync(file,Buffer.alloc(200));
  await assert.rejects(lib.copy('alice',value.files[0].id,path.join(root,'copy.mp4')),/thay đổi/);
  await assert.rejects(lib.copy('alice','../../outside/private.mp4',path.join(root,'copy.mp4')));
 } finally {cleanup(root);}
});
