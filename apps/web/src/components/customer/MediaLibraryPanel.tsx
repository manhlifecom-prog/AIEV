"use client";
import { useEffect, useRef, useState } from 'react';
import { FolderOpen, FileVideo, RefreshCw, X, LoaderCircle, Plus, Link } from 'lucide-react';
import { customerApi, number } from './api';
import { browserSupported, setBrowserFiles } from './browser-engine';

type Library = { total:number; truncated:boolean; unavailable:string[]; grants:{id:string;name:string;folder:boolean}[]; files:{id:string;name:string;bytes:number}[] };
export function MediaLibraryPanel({ owner, chatBusy, onDrive }: { owner:string; chatBusy:boolean; onDrive:()=>void }) {
  const [supported,setSupported]=useState(false), [library,setLibrary]=useState<Library|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState(''), [expanded,setExpanded]=useState(false);
  const [phone,setPhone]=useState(false);
  const generation=useRef(0), operation=useRef(false);
  const filesInput=useRef<HTMLInputElement>(null), folderInput=useRef<HTMLInputElement>(null);
  const container=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!expanded)return;
    const close=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setExpanded(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setExpanded(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
  },[expanded]);
  useEffect(()=>{
    setPhone(window.aievDesktop?.platform==='ios' || /Android|iPhone|iPad/.test(navigator.userAgent));
    const enabled=Boolean(window.aievDesktop?.mediaLibrary) || (!window.aievDesktop && browserSupported());setSupported(enabled);setLibrary(null);setError('');
    const current=++generation.current;
    if(enabled)customerApi<Library>('/library/status',{}).then(value=>{if(generation.current===current)setLibrary(value);}).catch(reason=>{if(generation.current===current)setError(reason.message);});
    return()=>{generation.current++;};
  },[owner]);
  async function change(action:string) {
    if(operation.current || chatBusy)return;
    setExpanded(false);
    if(!window.aievDesktop && action.startsWith('pick-')){(action==='pick-folder'?folderInput:filesInput).current?.click();return;}
    operation.current=true;setBusy(true);setError('');const current=generation.current;
    try {const value=await customerApi<Library>('/library/'+action,{});if(generation.current===current)setLibrary(value);}
    catch(reason){if(generation.current===current)setError((reason as Error).message);}
    finally {operation.current=false;setBusy(false);}
  }
  return <div className="studio-attachments" ref={container}>
    <input hidden type="file" accept="video/*,.mkv,.avi,.mts,.m2ts" multiple ref={filesInput} onChange={event=>{if(!event.target.files?.length)return;try{setLibrary(setBrowserFiles(owner,Array.from(event.target.files || [])));setError('');}catch(reason){setError((reason as Error).message);}event.target.value='';}}/>
    <input hidden type="file" multiple ref={folderInput} {...(phone?{accept:'video/*'}:{webkitdirectory:''})} onChange={event=>{if(!event.target.files?.length)return;try{setLibrary(setBrowserFiles(owner,Array.from(event.target.files || [])));setError('');}catch(reason){setError((reason as Error).message);}event.target.value='';}}/>
    <button ref={trigger} type="button" className="studio-icon" aria-label="Đính kèm nguồn" aria-expanded={expanded} disabled={busy || chatBusy} onClick={()=>setExpanded(!expanded)}><Plus size={21}/></button>
    {busy?<span className="studio-attachment-status" role="status"><LoaderCircle size={15} className="studio-spin"/>Đang đọc nguồn…</span>:library?.total?<button type="button" className="studio-source-chip" aria-label="Xem nguồn đã chọn" onClick={()=>setExpanded(!expanded)}><FileVideo size={14}/>{number(library.total)} video</button>:null}
    {expanded?<div className="studio-attachment-menu" role="group" aria-label="Chọn nguồn video">
    {supported?<><button type="button" disabled={busy || chatBusy} onClick={()=>void change('pick-files')}><FileVideo size={17}/>{phone?'Chọn video trên điện thoại':'Chọn video'}</button><button type="button" disabled={busy || chatBusy} onClick={()=>void change('pick-folder')}><FolderOpen size={17}/>{phone?'Chọn từ Tệp':'Chọn thư mục'}</button></>:null}
    <button type="button" onClick={()=>{setExpanded(false);onDrive();}}><Link size={17}/>Thêm link Google Drive</button>
    {library?.grants.length?<div className="studio-library-grants">{library.grants.map(grant=><span key={grant.id}>{grant.name}</span>)}<button type="button" title="Đọc lại danh sách video" disabled={busy || chatBusy} onClick={()=>void change('refresh')}><RefreshCw size={14}/>Làm mới</button><button type="button" disabled={busy || chatBusy} onClick={()=>void change('revoke')}><X size={14}/>Thu hồi quyền</button></div>:null}
    {library?.total?<ul className="studio-library-files">{library.files.slice(0,25).map(file=><li key={file.id}><FileVideo size={14}/><span>{file.name}</span><small>{number(Math.ceil(file.bytes/1048576))} MB</small></li>)}{library.total>25?<li>AI tìm nguồn theo tên trong danh mục đã cấp quyền.</li>:null}</ul>:null}
    {library?.truncated?<p>Danh mục đang lấy tối đa {window.aievDesktop?'2.000':'200'} video. Chọn thư mục con cụ thể để AI tìm chính xác hơn.</p>:null}
    {library?.unavailable.length?<p role="status">Không đọc được nguồn: {library.unavailable.join(', ')}. Kiểm tra ổ đĩa hoặc chọn lại thư mục.</p>:null}
    <small>AI chỉ dùng nguồn bạn chọn.</small>
    </div>:null}
    {error?<span role="alert" className="studio-attachment-error">{error}</span>:null}
  </div>;
}
