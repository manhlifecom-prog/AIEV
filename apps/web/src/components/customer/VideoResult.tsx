"use client";
import {useEffect,useState} from 'react';
import {Download,Film,LoaderCircle,Maximize2} from 'lucide-react';
import type {VideoJob} from './api';
type Media={id:string;url:string;preview:boolean;story?:string};
export function VideoResult({job,pendingLabel}:{job:VideoJob;pendingLabel?:string}) {
  const [error,setError]=useState(''),[saved,setSaved]=useState<Media|null>(null),[size,setSize]=useState('');
  useEffect(()=>{
    let live=true,objectUrl='',loadedKind:boolean|undefined,timer:ReturnType<typeof setTimeout>;
    setError('');setSize('');
    async function load(){
      try {
        if(job.output!=='local.mp4' && job.status==='done'){setSaved({id:job.id,url:`/api/customer/videos/${job.id}/file`,preview:false});return;}
        const bridge=window.aievDesktop;
        if(bridge && !bridge.preview)return;
        const result=bridge?await bridge.preview!(job.id):await(await import('./browser-engine')).browserPreview(job.id);
        if(!live)return;
        if(loadedKind!==result.preview){
          loadedKind=result.preview;
          const url='blob' in result?URL.createObjectURL(result.blob):result.url;
          if(objectUrl)URL.revokeObjectURL(objectUrl);
          objectUrl='blob' in result?url:'';
          setSaved({id:job.id,url,preview:result.preview,story:result.story});setError('');
        }
        if(!result.preview)return;
      }catch(reason){if(live && job.status==='done')setError((reason as Error).message);}
      if(live)timer=setTimeout(load,3000);
    }
    void load();return()=>{live=false;clearTimeout(timer);if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[job.id,job.output,job.status]);
  const media=saved?.id===job.id?saved:null;
  const save=()=>void window.aievDesktop?.save(job.id).catch(()=>setError('Chưa lưu được video. Hãy thử lại.'));
  return <div className="studio-result">
    {media?<><div className="studio-player-heading"><strong>{media.preview?'Bản xem trước':'Video hoàn tất'}</strong><span>{size || (media.preview?'Đang tải bản xem trước':'MP4')}</span></div><video key={media.url} aria-label="Xem trước video đã dựng" controls playsInline preload="metadata" src={media.url} onLoadedMetadata={e=>{const v=e.currentTarget;setSize(`${v.videoWidth} × ${v.videoHeight}${Math.min(v.videoWidth,v.videoHeight)>=1080?' · Full HD':''}`);}} onError={()=>setError('Trình phát chưa đọc được video. Thử Mở video hoặc tải bản MP4.')} />{media.story?<p className="studio-edit-story">{media.story}</p>:null}{media.preview?<p role="status"><LoaderCircle size={14} className="studio-spin"/> Bản xuất Full HD đang được xử lý. Anh có thể xem trước ngay.</p>:window.aievDesktop?<button className="studio-primary" onClick={save}><Download size={18}/>Lưu video MP4</button>:<a className="studio-primary" href={media.url} download={`AIEV-${job.id}.mp4`}><Download size={18}/>Tải video MP4</a>}</>:job.status!=='done'?<div className="studio-preview-empty"><Film size={42}/><p>{pendingLabel || 'Đang chuẩn bị bản xem trước…'}</p><small>Bản dựng sẽ phát ngay tại đây. Sau đó xuất MP4 Full HD.</small></div>:<p>Video được lưu trên thiết bị đã dựng. Cập nhật app để xem ngay trong Studio.</p>}
    {job.status==='done' && typeof window!=='undefined' && window.aievDesktop?<div className="studio-result-actions"><button className="studio-secondary" onClick={()=>void window.aievDesktop!.open(job.id).catch(()=>setError('Không có video trên thiết bị này.'))}><Maximize2 size={16}/>Mở video</button>{!media?<button className="studio-primary" onClick={save}><Download size={16}/>Lưu MP4</button>:null}</div>:null}
    {error?<p role="alert">{error}</p>:null}
  </div>;
}
