import {renderMediaOnWeb,canRenderMediaOnWeb} from '@remotion/web-renderer';
import {MotionText} from './MotionText';
import {remapCaptions,type TimedWord} from './timing';
import {getTextEffect,type TextEffectId} from '../../../../../server/src/customer/text-effects';
import {captionFonts} from '../../../../../server/src/customer/caption-styles';
const fontCache=new Map<string,Promise<string>>();
async function embeddedFont(font:typeof captionFonts[keyof typeof captionFonts]){if(!fontCache.has(font.file)){const promise=(async()=>{const r=await fetch('/studio/renderer/fonts/'+font.file,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Không tải được phông chữ Remotion');const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return '@font-face{font-family:"'+font.family+'";font-weight:'+font.weight+';font-style:'+(font.italic?'italic':'normal')+';src:url(data:font/ttf;base64,'+btoa(binary)+') format("truetype");}';})();fontCache.set(font.file,promise);promise.catch(()=>fontCache.delete(font.file));}return fontCache.get(font.file)!;}
export async function renderTextEffectVideo(source:Blob,plan:{textEffect?:TextEffectId;title:string;subtitles:boolean;segments:{start:number;end:number}[]},words:TimedWord[],width:number,height:number,progress:(value:number)=>void){
 if(!plan.textEffect)return source;const preset=getTextEffect(plan.textEffect);if(!preset)throw Error('Hiệu ứng chữ không hợp lệ');const font=captionFonts[preset.font];await document.fonts.load(`${font.italic?'italic ':''}${font.weight} 48px "${font.family}"`);await document.fonts.load('700 48px "Be Vietnam Pro"');
 const fontCss=(await Promise.all([embeddedFont(font),...(font.file!==captionFonts.strong.file?[embeddedFont(captionFonts.strong)]:[]),...(plan.textEffect==='coffee-editorial'?[embeddedFont(captionFonts.poetic)]:[])])).join('\n');
 const src=URL.createObjectURL(source);try{const composition={id:'AievMotionText',component:MotionText,durationInFrames:Math.max(1,Math.round(plan.segments.reduce((n,s)=>n+s.end-s.start,0)*30)),fps:30,width,height};const inputProps={fontCss,effect:plan.textEffect,src,title:plan.title,captions:plan.subtitles?remapCaptions(words,plan.segments):[]};
 const support=await canRenderMediaOnWeb({width,height,container:'mp4',videoCodec:'h264'});if(!support.canRender)throw Error('Trình duyệt chưa hỗ trợ xuất hiệu ứng Remotion. Hãy dùng Chrome hoặc Edge mới nhất.');
 const result=await renderMediaOnWeb({composition:{...composition,defaultProps:inputProps},inputProps,container:'mp4',videoCodec:'h264',videoBitrate:'high',onProgress:({progress:p})=>progress(p)});return await result.getBlob();}finally{URL.revokeObjectURL(src);}
}
