"use client";
import { useEffect, useRef, useState } from 'react';
import { FolderOpen, FileVideo, RefreshCw, X, LoaderCircle } from 'lucide-react';
import { customerApi, number } from './api';
import { browserSupported, setBrowserFiles } from './browser-engine';

type Library = { total:number; truncated:boolean; unavailable:string[]; grants:{id:string;name:string;folder:boolean}[]; files:{id:string;name:string;bytes:number}[] };
export function MediaLibraryPanel({ owner, chatBusy }: { owner:string; chatBusy:boolean }) {
  const [supported,setSupported]=useState(false), [library,setLibrary]=useState<Library|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState(''), [expanded,setExpanded]=useState(false);
  const generation=useRef(0), operation=useRef(false);
  const filesInput=useRef<HTMLInputElement>(null), folderInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const enabled=Boolean(window.aievDesktop?.mediaLibrary) || (!window.aievDesktop && browserSupported());setSupported(enabled);setLibrary(null);setError('');
    const current=++generation.current;
    if(enabled)customerApi<Library>('/library/status',{}).then(value=>{if(generation.current===current)setLibrary(value);}).catch(reason=>{if(generation.current===current)setError(reason.message);});
    return()=>{generation.current++;};
  },[owner]);
  async function change(action:string) {
    if(operation.current || chatBusy)return;
    if(!window.aievDesktop && action.startsWith('pick-')){(action==='pick-folder'?folderInput:filesInput).current?.click();return;}
    operation.current=true;setBusy(true);setError('');const current=generation.current;
    try {const value=await customerApi<Library>('/library/'+action,{});if(generation.current===current)setLibrary(value);}
    catch(reason){if(generation.current===current)setError((reason as Error).message);}
    finally {operation.current=false;setBusy(false);}
  }
  if(!supported)return null;
  return <div className="studio-library">
    <input hidden type="file" accept="video/*,.mkv,.avi,.mts,.m2ts" multiple ref={filesInput} onChange={event=>{try{setLibrary(setBrowserFiles(owner,Array.from(event.target.files || [])));setError('');}catch(reason){setError((reason as Error).message);}event.target.value='';}}/>
    <input hidden type="file" multiple ref={folderInput} {...{webkitdirectory:''}} onChange={event=>{try{setLibrary(setBrowserFiles(owner,Array.from(event.target.files || [])));setError('');}catch(reason){setError((reason as Error).message);}event.target.value='';}}/>
    <div className="studio-library-bar"><button type="button" disabled={busy || chatBusy} onClick={()=>void change('pick-folder')}><FolderOpen size={16}/>Chọn thư mục</button><button type="button" disabled={busy || chatBusy} onClick={()=>void change('pick-files')}><FileVideo size={16}/>Chọn video</button>{busy?<span role="status"><LoaderCircle size={15} className="studio-spin"/>Đang đọc nguồn…</span>:library?.total?<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{number(library.total)} video đã cấp quyền</button>:<span>Chọn nguồn, rồi nhắn cho AI</span>}</div>
    {library?.grants.length?<div className="studio-library-grants">{library.grants.map(grant=><span key={grant.id}>{grant.name}</span>)}<button type="button" title="Đọc lại danh sách video" disabled={busy || chatBusy} onClick={()=>void change('refresh')}><RefreshCw size={14}/>Làm mới</button><button type="button" disabled={busy || chatBusy} onClick={()=>void change('revoke')}><X size={14}/>Thu hồi quyền</button></div>:null}
    {expanded && library?<ul className="studio-library-files">{library.files.slice(0,25).map(file=><li key={file.id}><FileVideo size={14}/><span>{file.name}</span><small>{number(Math.ceil(file.bytes/1048576))} MB</small></li>)}{library.total>25?<li>AI tìm nguồn theo tên trong danh mục đã cấp quyền.</li>:null}</ul>:null}
    {library?.truncated?<p>Danh mục đang lấy tối đa {window.aievDesktop?'2.000':'200'} video. Chọn thư mục con cụ thể để AI tìm chính xác hơn.</p>:null}
    {library?.unavailable.length?<p role="status">Không đọc được nguồn: {library.unavailable.join(', ')}. Kiểm tra ổ đĩa hoặc chọn lại thư mục.</p>:null}
    {error?<p role="alert" className="studio-error">{error}</p>:null}
    <p>AI dùng tên và thông tin cơ bản để chọn video. Chỉ đọc nguồn bạn chọn; video gốc ở trên máy bạn. Trên web, giữ tab mở khi dựng và tải MP4 về sau khi hoàn tất.</p>
  </div>;
}
