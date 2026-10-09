const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(__dirname+'/../mobile/ios/Sources/native-bridge.js','utf8');
test('iOS bridge forwards only structured requests, streams events and cannot be overwritten',async()=>{
  const calls=[],window={webkit:{messageHandlers:{aiev:{postMessage:async value=>{calls.push(value);return{result:{success:true}};}}}}};window.top=window;
  vm.runInNewContext(script,{window,location:{origin:'https://video.manh.marketing'}});
  const bridge=window.aievDesktop;assert.equal(bridge.platform,'ios');assert.equal(bridge.exec,undefined);
  await bridge.request('/chat',{message:'Chào'});assert.equal(calls[0].method,'request');assert.equal(calls[0].body.message,'Chào');
  let received;const remove=bridge.onActivity(event=>received=event);window.__aievActivity({requestId:'test',data:{text:'Chào'}});assert.equal(received.data.text,'Chào');remove();received=null;window.__aievActivity({data:{text:'khác'}});assert.equal(received,null);
  assert.equal(Object.getOwnPropertyDescriptor(window,'aievDesktop').writable,false);
});
test('iOS native bridge is absent in frames and foreign pages',()=>{
  for(const origin of ['https://evil.invalid','http://video.manh.marketing']) {const window={};window.top=window;vm.runInNewContext(script,{window,location:{origin}});assert.equal(window.aievDesktop,undefined);}
  const window={top:{}};vm.runInNewContext(script,{window,location:{origin:'https://video.manh.marketing'}});assert.equal(window.aievDesktop,undefined);
});
