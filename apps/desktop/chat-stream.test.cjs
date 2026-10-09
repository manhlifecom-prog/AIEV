const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {readChatStream}=require('./chat-stream.cjs');
test('native stream decoder handles split UTF-8 frames and rejects missing completion',async()=>{
  const encoder=new TextEncoder(),bytes=encoder.encode('data: {"type":"reply","data":{"text":"Chào 😀"}}\n\n: heartbeat\n\ndata: {"type":"result","data":{"threadId":"one"}}\n\n');
  const events=[];const response=new Response(new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}}));
  assert.equal((await readChatStream(response,event=>events.push(event))).threadId,'one');assert.equal(events[0].data.text,'Chào 😀');
  await assert.rejects(readChatStream(new Response('data: {"type":"reply","data":{"text":"Partial"}}\n\n'),()=>{}),/bị ngắt/);
});
test('sandbox preload exposes limited native bridge and strips Electron event from callbacks',async()=>{
  let bridge,listener,removed;const calls=[];
  vm.runInNewContext(fs.readFileSync(__dirname+'/preload.cjs','utf8'),{process:{platform:'darwin'},require:name=>{assert.equal(name,'electron');return{contextBridge:{exposeInMainWorld:(name,value)=>{assert.equal(name,'aievDesktop');bridge=value;}},ipcRenderer:{invoke:async(...args)=>calls.push(args),on:(channel,fn)=>{assert.equal(channel,'aiev:activity');listener=fn;},removeListener:(channel,fn)=>removed=fn}};}});
  assert.equal(bridge.version,require('./package.json').version);assert.equal(bridge.mediaLibrary,true);assert.equal(bridge.platform,'macos');let received;const unsubscribe=bridge.onActivity(value=>received=value);const value={requestId:'test',type:'status',data:{label:'Đang tải'}};listener({secret:'Electron'},value);assert.equal(received,value);unsubscribe();assert.equal(removed,listener);
  await bridge.cancelChat('test');assert.deepEqual(calls[0],['aiev:cancel-chat','test']);assert.equal(bridge.exec,undefined);
});
test('desktop uses target-specific media binaries and device identity',()=>{
  const {nativePlatform,mediaResources}=require('./runtime.cjs');
  assert.equal(nativePlatform('darwin'),'macos');assert.equal(nativePlatform('win32'),'windows');
  assert.match(mediaResources('resources','win32').ffmpeg,/ffmpeg\.exe$/);
  assert.match(mediaResources('resources','darwin').ffprobe,/ffprobe$/);
});
