import test from 'node:test';import assert from 'node:assert/strict';
import {captionStyles,selectedCaptionStyle} from '../../../../server/src/customer/caption-styles';
import {subtitleDocument,validateEdit} from '../../../../server/src/customer/render';
import {subtitleDocument as browserSubtitles} from './browser-plan';
test('all 18 caption styles produce matching browser and server ASS and retain Vietnamese',()=>{
 const words=[{word:'Một ngày đáng nhớ',start:0,end:2}];
 for(const style of captionStyles){const plan={title:'Tiêu đề',ratio:'9:16' as const,subtitles:true,captionStyle:style.id,segments:[{start:0,end:3,framing:'fit' as const,focusX:.5,focusY:.5}]};validateEdit(plan,3);const doc=subtitleDocument(plan,words,1080,1920);assert.equal(doc,browserSubtitles(plan,words,1080,1920));assert.ok(doc.includes('Một ngày đáng nhớ'));const row=doc.split('\n').find(s=>s.startsWith('Style: Caption,'))!.split(',');assert.equal(row[15],style.box?'3':'1');assert.equal(row[7],style.bold?'-1':'0');assert.equal(doc.includes('\\fad(120,80)'),style.effect==='fade');}
});
test('caption choices are allowlisted, last explicit choice wins and old plans still work',()=>{
 assert.equal(selectedCaptionStyle('Tôi chọn mẫu phụ đề “Nhãn vàng”.'),'yellowbox');assert.equal(selectedCaptionStyle('[caption-style:yellow] rồi mẫu phụ đề “Tím mộng mơ”'),'lavender');assert.equal(selectedCaptionStyle('[caption-style:unknown]'),undefined);
 const plan={title:'',ratio:'9:16' as const,subtitles:true,segments:[{start:0,end:3,framing:'fit' as const,focusX:.5,focusY:.5}]};assert.ok(subtitleDocument(plan,[],1080,1920));assert.throws(()=>validateEdit({...plan,captionStyle:'bad'},3));
});
