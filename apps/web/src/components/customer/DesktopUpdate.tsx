"use client";
import {useEffect,useState} from 'react';
import {Download,RefreshCw,CheckCircle2} from 'lucide-react';
import {StudioModal} from './StudioModal';
import type {DesktopUpdateState} from './api';

export function DesktopUpdate(){
 const [open,setOpen]=useState(false),[error,setError]=useState('');
 const [state,setState]=useState<DesktopUpdateState>({status:'idle',currentVersion:window.aievDesktop?.version || '',message:'Tự động cập nhật đã bật',percent:0});
 useEffect(()=>{
   let live=true;
   void window.aievDesktop!.update!('status').then(value=>{if(live)setState(value);}).catch(()=>{if(live)setError('Chưa kết nối được bộ cập nhật. Hãy mở lại app.');});
   const unsubscribe=window.aievDesktop!.onUpdate!(value=>{if(value.open)setOpen(true);if(value.status){setState(value as DesktopUpdateState);setError('');}});
   return()=>{live=false;unsubscribe();};
 },[]);
 async function action(value:'check'|'install'){
   setError('');
   try{setState(await window.aievDesktop!.update!(value));}catch(reason){setError((reason as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/,''));}
 }
 const pending=['checking','downloading','installing'].includes(state.status);
 return <>
  <button className="studio-text-button studio-install" aria-label="Cập nhật ứng dụng" onClick={()=>{setOpen(true);if(['idle','error'].includes(state.status))void action('check');}}><Download size={20}/><span>{state.status==='ready'?'Cập nhật và mở lại':state.status==='downloading'?`Đang tải ${state.percent}%`:'Cập nhật'}</span></button>
  {open?<StudioModal title="Cập nhật AIEV Studio" close={()=>setOpen(false)}><div className="studio-form studio-update-panel">
   <p>Phiên bản đang dùng: <strong>{state.currentVersion}</strong>{state.version?<> · Bản mới: <strong>{state.version}</strong></>:null}</p>
   <div className="studio-update-status" role="status">{state.status==='latest'?<CheckCircle2 size={24}/>:<RefreshCw size={24} className={pending?'studio-spin':''}/>}<p>{state.message}</p></div>
   {state.status==='downloading'?<><progress aria-label="Tiến độ tải bản cập nhật" max={100} value={state.percent}/><small>{state.percent}% · Bạn vẫn có thể chat và dựng video.</small></>:null}
   <p><strong>Tự động cập nhật đang bật.</strong> App kiểm tra khi mở và định kỳ, tải bản mới trong nền rồi cài khi bạn đóng app. Dữ liệu tài khoản và video được giữ lại.</p>
   {state.status==='ready'?<button className="studio-primary" onClick={()=>void action('install')}><RefreshCw size={18}/>Cập nhật và mở lại</button>:<button className="studio-secondary" disabled={pending} onClick={()=>void action('check')}><RefreshCw size={18}/>{pending?'Đang xử lý…':'Kiểm tra phiên bản mới'}</button>}
   <small>App sẽ chờ tác vụ video hoặc AI hoàn tất trước khi cài đặt.</small>
   {error?<p className="studio-error" role="alert">{error}</p>:null}
  </div></StudioModal>:null}
 </>;
}
