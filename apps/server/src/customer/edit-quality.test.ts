import test from 'node:test';
import assert from 'node:assert/strict';
import {visualSampleTimes,frameFilter,contentRect,splitAtSources,fullHdSize} from './edit-quality.js';
import {validateEdit} from './render.js';
import {validateVisualFrames} from './visual.js';
test('visual samples cover separate clips and obey source bounds',()=>{
 const samples=visualSampleTimes(120,[{start:0,duration:10},{start:10,duration:90},{start:100,duration:20}]);
 assert.ok(samples.length<=24);assert.ok(samples.some(n=>n<10));assert.ok(samples.some(n=>n>100));assert.ok(samples.every(n=>n>=0&&n<120));assert.equal(visualSampleTimes(600).length,24);
});
test('portrait render fills the frame after removing normalization padding; web output is Full HD',()=>{
 const content=contentRect(1920,1080,1080,1920);assert.ok(content.y>0);
 const split=splitAtSources([{start:1,end:3,framing:'fill' as const}],[{start:0,duration:2,content},{start:2,duration:2}]);assert.equal(split.length,2);assert.equal(split[0].end,2);assert.equal(split[1].start,2);
 assert.match(frameFilter(split[0],1080,1920,split[0].content),/^crop=/);assert.match(frameFilter(split[0],1080,1920),/force_original_aspect_ratio=increase/);
 assert.deepEqual(fullHdSize('9:16'),[1080,1920]);
 const plan={title:'',ratio:'9:16' as const,subtitles:false,segments:[{start:0,end:1,framing:'fill' as const}]};
 assert.throws(()=>validateEdit({...plan,segments:[{start:0,end:1,focusX:9}]},4));
});
test('visual payload rejects remote URLs, oversized images and source timestamps',()=>{
 for(const frames of [[{time:0,image:'https://example.com/private.jpg'}],Array(25).fill({time:0,image:'data:image/jpeg;base64,AA=='}),[{time:8,image:'data:image/jpeg;base64,AA=='}]])assert.throws(()=>validateVisualFrames(frames,4));
 assert.deepEqual(validateVisualFrames(undefined,4),[]);
});
