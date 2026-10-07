import test from 'node:test';
import assert from 'node:assert/strict';
import {librarySummary,setBrowserFiles,browserSupported} from './browser-engine';

test('phone sources preserve selection on invalid files and isolate accounts',()=>{
 const video=new File([new Uint8Array(200)],'holiday.mp4',{type:'video/mp4'});
 const first=setBrowserFiles('one',[video]);
 assert.equal(first.total,1);assert.match(first.files[0].id,/^[a-f0-9]{32}$/);
 assert.throws(()=>setBrowserFiles('one',[new File(['notes'],'private.txt')]));
 assert.deepEqual(librarySummary('one').files,first.files);
 assert.equal(librarySummary('two').total,0);
 assert.equal(librarySummary('one').total,0);
});

test('only Android builds with a native video picker enable the local renderer',()=>{
 const beforeWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const beforeNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 try {
  Object.defineProperty(globalThis,'window',{configurable:true,value:{Worker:true,WebAssembly:true,indexedDB:true,isSecureContext:true}});
  for(const [userAgent,expected] of [['Android AIEVAndroid/0.1.0',false],['Android AIEVAndroid/0.2.0',true],['AIEViOS/0.7.0',false],['Chrome',true]] as const){
   Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent}});
   assert.equal(browserSupported(),expected,userAgent);
  }
 } finally {
  if(beforeWindow)Object.defineProperty(globalThis,'window',beforeWindow);else Reflect.deleteProperty(globalThis,'window');
  if(beforeNavigator)Object.defineProperty(globalThis,'navigator',beforeNavigator);else Reflect.deleteProperty(globalThis,'navigator');
 }
});
