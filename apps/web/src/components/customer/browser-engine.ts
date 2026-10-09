import {captionFonts,captionStyle} from '../../../../server/src/customer/caption-styles';
import {visualSampleTimes,contentRect,type SourceClip,type VisualFrame} from "../../../../server/src/customer/edit-quality";
import { customerApi } from './api';
import type { ChatEvent, ChatResult } from './chat';
import { validateEdit, subtitleDocument, renderArguments, speechChunks, type Edit, type Word } from './browser-plan';
type FFmpeg={load:(config:object)=>Promise<boolean>;createDir:(name:string)=>Promise<boolean>;writeFile:(name:string,data:string|Uint8Array)=>Promise<boolean>;readFile:(name:string,encoding?:string)=>Promise<string|Uint8Array>;deleteFile:(name:string)=>Promise<boolean>;exec:(args:string[])=>Promise<number>;ffprobe:(args:string[])=>Promise<number>;terminate:()=>void;on:(event:string,callback:(event:{progress:number;message?:string})=>void)=>void};

type Metadata={duration:number;width:number;height:number;hasAudio:boolean;bytes:number;sources?:{name:string;start:number;duration:number;hasAudio:boolean;content?:SourceClip['content']}[];visualAnalysis?:boolean};
type Plan={edit:Edit;words:Word[];hasAudio:boolean};
type RecordData={key:string;owner:string;id:string;source:Blob;metadata:Metadata;plan?:Plan;output?:Blob;preview?:Blob};
const records=new Map<string,RecordData>();
let libraryOwner='',library: {id:string;file:File}[]=[],working=false,libraryTruncated=false;
export const browserSupported=()=>typeof window!=='undefined' && Boolean(window.Worker && window.WebAssembly && window.indexedDB) && window.isSecureContext && !/AIEV(?:Desktop|iOS)\//.test(navigator.userAgent) && !/AIEVAndroid\/0\.1\./.test(navigator.userAgent);
const beforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
const key=(owner:string,id:string)=>owner+':'+id;
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('aiev-browser-video',1);r.onupgradeneeded=()=>r.result.createObjectStore('jobs',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Không mở được nơi lưu video. Hãy dùng trình duyệt thông thường, không dùng chế độ riêng tư.'));});}
async function write(record:RecordData){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('jobs','readwrite');tx.objectStore('jobs').put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('Không đủ dung lượng lưu video trong trình duyệt. Hãy giải phóng bộ nhớ và thử lại.'));tx.onabort=()=>reject(Error('Chưa lưu được video trong trình duyệt'));});records.set(record.key,record);}finally{db.close();}}
async function read(owner:string,id:string){const k=key(owner,id);if(records.has(k))return records.get(k)!;const db=await database();try{const value=await new Promise<RecordData|undefined>((resolve,reject)=>{const r=db.transaction('jobs').objectStore('jobs').get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(!value)throw Error('Nguồn không còn trong trình duyệt này. Chọn lại video và yêu cầu một lượt dựng mới.');records.set(k,value);return value;}finally{db.close();}}
const owner=async()=> (await customerApi<{id:string}>('/me')).id;
export function librarySummary(account:string){if(libraryOwner!==account){libraryOwner=account;library=[];libraryTruncated=false;}return {total:library.length,truncated:libraryTruncated,unavailable:[],grants:library.length?[{id:'browser',name:'Video đã chọn trong trình duyệt',folder:false}]:[],files:library.map(({id,file})=>({id,name:(file.webkitRelativePath || file.name).replace(/[\x00-\x1f]/g,' ').slice(0,500),bytes:file.size}))};}
export function setBrowserFiles(account:string,files:File[]){if(working)throw Error('Hãy chờ lượt dựng hiện tại trước khi đổi nguồn');const selected=files.filter(f=>f.size>=100 && (/\.(mp4|mov|m4v|webm|mkv|avi|mts|m2ts)$/i.test(f.name)||f.type.startsWith('video/')));if(!selected.length)throw Error('Không tìm thấy video trong nguồn đã chọn');libraryOwner=account;libraryTruncated=selected.length>200;library=selected.slice(0,200).map(file=>({id:crypto.randomUUID().replaceAll('-',''),file}));if(!library.length)throw Error('Không tìm thấy video trong nguồn đã chọn');return librarySummary(account);}
export async function browserLibrary(action:string){const account=await owner();if(action==='revoke'){library=[];libraryOwner=account;libraryTruncated=false;}return librarySummary(account);}
function stage(label:string){if(working)window.addEventListener('beforeunload',beforeUnload);else window.removeEventListener('beforeunload',beforeUnload);window.dispatchEvent(new CustomEvent('aiev-browser-stage',{detail:label}));}
async function core():Promise<FFmpeg>{stage('Đang tải bộ dựng về trình duyệt…');const moduleUrl='/studio/renderer/ffmpeg/index.js';const {FFmpeg}=await import(/* webpackIgnore: true */ moduleUrl);const ff:FFmpeg=new FFmpeg();try{let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([ff.load({classWorkerURL:'/studio/renderer/ffmpeg/worker.js',coreURL:'/studio/renderer/core/ffmpeg-core.js',wasmURL:'/studio/renderer/core/ffmpeg-core.wasm'}),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Chưa tải được bộ dựng. Kiểm tra kết nối và thử lại.')),60000);})]);}finally{clearTimeout(timer);}await ff.createDir('fonts');const r=await fetch('/studio/renderer/caption.ttf',{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Chưa tải được phông chữ phụ đề');await ff.writeFile('fonts/caption.ttf',new Uint8Array(await r.arrayBuffer()));return ff;}catch(error){ff.terminate();throw error;}}
async function exec(ff:FFmpeg,args:string[]){if(await ff.exec(args)!==0)throw Error('Bộ dựng chưa xử lý được video. Kiểm tra định dạng và bộ nhớ của thiết bị; có thể dùng app Windows cho nguồn lớn.');}
async function probe(ff:FFmpeg,name:string):Promise<Omit<Metadata,'bytes'>>{await ff.deleteFile('probe.json').catch(()=>{});const status=await ff.ffprobe(['-v','error','-show_format','-show_streams','-of','json',name,'-o','probe.json']);if(status>0)throw Error('Không đọc được video nguồn ('+status+')');const data=await ff.readFile('probe.json','utf8');const m=JSON.parse(String(data)),v=m.streams?.find((s:{codec_type:string})=>s.codec_type==='video');const duration=Number(m.format?.duration);if(!v || !Number.isFinite(duration)||duration<=0)throw Error('Video không có thời lượng hợp lệ');return {duration,width:Number(v.width),height:Number(v.height),hasAudio:m.streams.some((s:{codec_type:string})=>s.codec_type==='audio')};}
function blob(data:Uint8Array,type='video/mp4'){return new Blob([new Uint8Array(data).buffer],{type});}
function capacity(bytes:number){if(bytes>1024*1024*1024)throw Error('Nguồn này lớn hơn khả năng bộ nhớ của bộ dựng web. Hãy dùng app Windows để xử lý nguồn lớn trên máy bạn. Chưa trừ phí dựng.');}
async function sourceFiles(decision:ChatResult & {sourceIds?:string[];url?:string;sourceJobId?:string},account:string){
 if(decision.sourceIds?.length){if(libraryOwner!==account)throw Error('Hãy chọn video trước khi dựng');return decision.sourceIds.map(id=>{const entry=library.find(f=>f.id===id);if(!entry)throw Error('Nguồn đã thay đổi. Chọn lại video.');return entry.file;});}
 if(decision.url){throw Error('Google Drive có thể chặn trình duyệt tải video trực tiếp. Tải file hoặc thư mục Drive về máy, bấm Chọn video/Chọn thư mục rồi nhắn “làm theo yêu cầu trên”. Video không chuyển qua VPS.');}
 if(libraryOwner===account && library.length)return library.slice(0,50).map(f=>f.file);
 throw Error('Bấm Chọn video hoặc Chọn thư mục ở dưới khung chat, rồi nhắn “làm theo yêu cầu trên”.');
}
export async function browserDecision(decision:ChatResult & {sourceIds?:string[];url?:string;sourceJobId?:string;jobId?:string;turnId?:string;prompt?:string},onEvent:(e:ChatEvent)=>void):Promise<ChatResult>{
 if(decision.action==='confirm' && decision.jobId){await confirmBrowser(decision.jobId);return decision;}
 if(decision.action!=='prepare')return decision;
 if(working)return {...decision,localError:'Đang dựng video khác trong trình duyệt. Bạn vẫn có thể chat với AI.'};
 working=true;let ff:FFmpeg|undefined;
 const progress=(event:Event)=>onEvent({type:'status',data:{label:(event as CustomEvent<string>).detail,cancellable:false}});window.addEventListener('aiev-browser-stage',progress);
 try{const account=await owner();let source:Blob,metadata:Metadata;
  if(decision.sourceJobId && !decision.url && !decision.sourceIds?.length){const previous=await read(account,decision.sourceJobId);source=previous.source;metadata=previous.metadata;}
  else{const files=await sourceFiles(decision,account);capacity(files.reduce((n,f)=>n+f.size,0));onEvent({type:'status',data:{label:'Đang chuẩn bị nguồn trên thiết bị',cancellable:false}});ff=await core();const clips:NonNullable<Metadata['sources']>=[];let duration=0,bytes=0,sourceWidth=1920,sourceHeight=1080;
   for(const [i,file] of files.entries()){stage(`Đang đọc video ${i+1}/${files.length}`);await ff.writeFile('input.mp4',new Uint8Array(await file.arrayBuffer()));const m=await probe(ff,'input.mp4');if(i===0){const ratio=m.width/m.height;[sourceWidth,sourceHeight]=ratio<0.8?[1080,1920]:ratio>1.2?[1920,1080]:[1080,1080];}clips.push({name:file.name,start:duration,duration:m.duration,hasAudio:m.hasAudio,content:contentRect(m.width,m.height,sourceWidth,sourceHeight)});duration+=m.duration;bytes+=file.size;
    if(files.length===1){metadata={...m,bytes};source=file;break;}
    // Normalize each clip before joining, including silent audio for silent clips.
    await exec(ff,['-y','-i','input.mp4',...(!m.hasAudio?['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']:[]),'-map','0:v:0','-map',m.hasAudio?'0:a:0':'1:a:0','-vf',`scale=${sourceWidth}:${sourceHeight}:force_original_aspect_ratio=decrease,pad=${sourceWidth}:${sourceHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,'-t',String(m.duration),'-c:v','libx264','-preset','ultrafast','-crf','18','-c:a','aac','-ar','48000','-ac','2',`clip${i}.mp4`]);await ff.deleteFile('input.mp4');}
   if(files.length>1){stage('Đang ghép nguồn trong trình duyệt');await ff.writeFile('clips.txt',files.map((_,i)=>`file 'clip${i}.mp4'`).join('\n'));await exec(ff,['-y','-f','concat','-safe','0','-i','clips.txt','-c','copy','source.mp4']);source=blob(await ff.readFile('source.mp4') as Uint8Array);metadata={...await probe(ff,'source.mp4'),bytes,sources:clips};}
  }
  metadata!.visualAnalysis=true;capacity(source!.size);const result=await customerApi<{jobId:string;threadId:string}>('/local/quote',{threadId:decision.threadId,turnId:decision.turnId,message:decision.prompt,metadata:metadata!,url:'browser-file'});
  const record:RecordData={key:key(account,result.jobId),owner:account,id:result.jobId,source:source!,metadata:metadata!};
  try{await write(record);}catch(error){await customerApi('/local/'+result.jobId+'/fail',{}).catch(()=>{});throw error;}
  return {...decision,...result};
 }catch(error){return {...decision,localError:(error as Error).message};}finally{ff?.terminate();window.removeEventListener('aiev-browser-stage',progress);working=false;stage('');}
}
export async function confirmBrowser(id:string){if(working)throw Error('Đang dựng video khác trong trình duyệt');const account=await owner();const record=await read(account,id);capacity(record.source.size);working=true;
 // Confirm only after the local source is available. The server owns billing and roles.
 try{await customerApi('/local/'+id+'/confirm',{});if(record.output){await customerApi('/local/'+id+'/complete',{});working=false;stage('Video đã lưu trong trình duyệt này');return {success:true};}}catch(error){working=false;throw error;}
 void render(record).catch(error=>{stage((error as Error).message);window.dispatchEvent(new CustomEvent('aiev-browser-error',{detail:(error as Error).message}));}).finally(()=>{working=false;window.removeEventListener('beforeunload',beforeUnload);window.dispatchEvent(new Event('aiev-browser-complete'));});
 return {success:true};
}
async function render(record:RecordData){let ff:FFmpeg|undefined;try{ff=await core();await ff.writeFile('source.mp4',new Uint8Array(await record.source.arrayBuffer()));
 if(!record.plan){if(record.metadata.hasAudio)for(const [i,chunk] of [...speechChunks(record.metadata.duration)].entries()){stage(`Nhận diện lời thoại đoạn ${i+1}`);await exec(ff,['-y','-ss',String(chunk.start),'-i','source.mp4','-t',String(chunk.seconds),'-vn','-ac','1','-ar','16000','-b:a','48k','speech.mp3']);const r=await fetch('/api/customer/local/'+record.id+'/audio/'+i,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:blob(await ff.readFile('speech.mp3') as Uint8Array,'audio/mpeg')});if(!r.ok)throw Error((await r.json()).error || 'Không nhận diện được lời thoại');await ff.deleteFile('speech.mp3');}
 const frames:VisualFrame[]=[];const times=visualSampleTimes(record.metadata.duration,record.metadata.sources);
 for(const [i,time] of times.entries()){stage(`Đang xem cảnh ${i+1}/${times.length}`);await exec(ff,['-y','-ss',String(time),'-i','source.mp4','-frames:v','1','-vf','scale=320:320:force_original_aspect_ratio=decrease','-q:v','9','frame.jpg']);const data=await ff.readFile('frame.jpg') as Uint8Array;if(data.length>28*1024)throw Error('Ảnh phân tích quá lớn');let binary='';for(const byte of data)binary+=String.fromCharCode(byte);frames.push({time,image:'data:image/jpeg;base64,'+btoa(binary)});await ff.deleteFile('frame.jpg');}
 stage('AI đang chọn cảnh và sắp xếp câu chuyện');record.plan=await customerApi<Plan>('/local/'+record.id+'/plan',{frames});await write(record);}
 const plan=record.plan;validateEdit(plan.edit,record.metadata.duration);
 if(plan.edit.captionStyle){const files=new Set([captionFonts[captionStyle(plan.edit.captionStyle).font].file,...(plan.edit.title?[captionFonts.strong.file]:[])]);await Promise.all([...files].map(async file=>{const response=await fetch('/studio/renderer/fonts/'+file,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Chưa tải được phông chữ đã chọn. Hãy thử lại.');await ff!.writeFile('fonts/'+file,new Uint8Array(await response.arrayBuffer()));}));}
 for(const preview of record.preview?[false]:[true,false]) {
  const {args,width,height}=renderArguments(plan.edit.textEffect?{...plan.edit,title:'',subtitles:false}:plan.edit,plan.hasAudio,record.metadata.sources,preview);
  await ff.writeFile('captions.ass',subtitleDocument(plan.edit.textEffect?{...plan.edit,title:'',subtitles:false}:plan.edit,plan.words,width,height).replaceAll('Arial','Noto Sans'));
  stage(preview?'Đang dựng bản xem trước':'Đang xuất Full HD · Bạn có thể xem bản dựng trước');
  await exec(ff,args);
  const file=preview?'preview.mp4':'final.mp4';let data=await ff.readFile(file) as Uint8Array;
  if(plan.edit.textEffect){const {renderTextEffectVideo}=await import('./remotion/export');const output=await renderTextEffectVideo(blob(data),plan.edit,plan.words,width,height,p=>stage('Đang dựng hiệu ứng chữ Remotion · '+Math.round(p*100)+'%'));data=new Uint8Array(await output.arrayBuffer());await ff.writeFile(file,data);}
  const check=await probe(ff,file);
  const expected=plan.edit.segments.reduce((n,s)=>n+s.end-s.start,0);
  if(data.length<1000 || Math.abs(check.duration-expected)>1 || check.width!==width || check.height!==height){console.warn('AIEV output check '+JSON.stringify({expected,width,height,actual:check,bytes:data.length}));throw Error('Video xuất chưa đạt kiểm tra chất lượng. Có thể thử lại cùng kế hoạch miễn phí.');}
  if(preview)record.preview=blob(data);else record.output=blob(data);
  await write(record);await ff.deleteFile(file);window.dispatchEvent(new CustomEvent('aiev-browser-preview',{detail:record.id}));
 }
 await customerApi('/local/'+record.id+'/complete',{});stage('Video Full HD đã lưu trong trình duyệt này');
 }catch(error){await customerApi('/local/'+record.id+'/fail',{}).catch(()=>{});throw error;}finally{ff?.terminate();}}
export async function browserOutput(id:string){const record=await read(await owner(),id);if(!record.output)throw Error('Video chưa được lưu trong trình duyệt này. Mở thiết bị đã dựng hoặc tiếp tục dựng.');return record.output;}

export async function browserPreview(id:string){const record=await read(await owner(),id);const output=record.output||record.preview;if(!output)throw Error("Bản xem trước đang được dựng");return {blob:output,preview:!record.output,story:record.plan?.edit.story};}
