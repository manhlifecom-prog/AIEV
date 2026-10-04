"use client";
import {useState} from 'react';
import {Download} from 'lucide-react';
import type {VideoJob} from './api';
export function VideoResult({job}:{job:VideoJob}) {
  const [error,setError]=useState('');
  if(job.output==='local.mp4') return <div className="studio-result"><p>Video được lưu trên thiết bị đã dựng.</p><button className="studio-primary" onClick={()=>{if(!window.aievDesktop) {setError('Mở AIEV Studio trên thiết bị đã dựng để xem video.');return;} void window.aievDesktop.open(job.id).catch(()=>setError('Không có video trên thiết bị này.'));}}>Mở video</button><button className="studio-secondary" onClick={()=>{if(!window.aievDesktop){setError('Mở app trên thiết bị đã dựng để lưu video.');return;}void window.aievDesktop.save(job.id).catch(()=>setError('Chưa lưu được video.'));}}><Download size={18}/>Lưu hoặc chia sẻ MP4</button>{error?<p role="alert">{error}</p>:null}</div>;
  return <div className="studio-result"><video controls preload="metadata" src={`/api/customer/videos/${job.id}/file`}/><a className="studio-primary" href={`/api/customer/videos/${job.id}/file?download=1`}><Download size={18}/>Tải video MP4</a></div>;
}
