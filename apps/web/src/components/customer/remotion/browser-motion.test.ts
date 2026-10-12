import test from 'node:test';
import assert from 'node:assert/strict';
import {browserMotionEdit,motionPreview} from './browser-motion';
import type {Edit} from '../browser-plan';
const edit:Edit={title:'Video thật',ratio:'9:16',subtitles:true,segments:[{start:3,end:4,framing:'fit',focusX:.5,focusY:.5},{start:0,end:1,framing:'fit',focusX:.5,focusY:.5}]};
test('web uses motion captions by default and respects explicit appearance and no-subtitle requests',()=>{
 assert.equal(browserMotionEdit(edit).textEffect,'word-highlight');
 assert.equal(edit.textEffect,undefined);
 assert.equal(browserMotionEdit({...edit,textEffect:'story-steps'}).textEffect,'story-steps');
 assert.equal(browserMotionEdit({...edit,captionStyle:'yellow'}).textEffect,undefined);
 assert.equal(browserMotionEdit({...edit,subtitles:false}).textEffect,undefined);
});
test('live preview uses the same cut order and timed words as the final composition',()=>{
 const recipe=motionPreview(browserMotionEdit(edit),[{word:'cuối',start:3,end:4},{word:'đầu',start:0,end:1}],720,1280)!;
 assert.equal(recipe.durationInFrames,60);
 assert.deepEqual(recipe.captions.map(w=>[w.text,w.startMs,w.endMs]),[[' cuối',0,1000],[' đầu',1000,2000]]);
 assert.equal(recipe.effect,'word-highlight');
 assert.equal(motionPreview(edit,[],720,1280),undefined);
});
