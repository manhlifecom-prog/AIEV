import test from 'node:test';import assert from 'node:assert/strict';
import {remapCaptions,captionPages} from './timing';
import {getTextEffect,selectedTextEffect,textEffects} from '../../../../../server/src/customer/text-effects';
import {validateEdit} from '../browser-plan';
test('captions follow trimmed and reordered source ranges and never bridge removed silence',()=>{const input=[{word:'đầu',start:0,end:1},{word:'cuối',start:4,end:6}];const words=remapCaptions(input,[{start:5,end:6},{start:0,end:.5}]);assert.deepEqual(words.map(w=>[w.text,w.startMs,w.endMs]),[[' cuối',0,1000],[' đầu',1000,1500]]);assert.equal(captionPages([{...words[0],startMs:0,endMs:100},{...words[1],startMs:1000,endMs:1200}]).length,2);});
test('motion choice is allowlisted and latest choice persists',()=>{assert.equal(selectedTextEffect('[text-effect:typewriter] [text-effect:circle-marker]'),'circle-marker');assert.equal(getTextEffect('unknown'),undefined);for(const e of textEffects)assert.equal(selectedTextEffect('[text-effect:'+e.id+']'),e.id);assert.throws(()=>validateEdit({title:'',ratio:'9:16',subtitles:true,textEffect:'injected',segments:[{start:0,end:1,framing:'fit',focusX:.5,focusY:.5}]},1));});
