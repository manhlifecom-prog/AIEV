import { customerApi } from './api';
type DriveSource={url:string;name:string;bytes?:number};
const memoryLimit=1024*1024*1024;
export async function browserDriveFiles(url:string,status:(message:string)=>void,fetcher:typeof fetch=fetch):Promise<File[]> {
  const parsed=new URL(url);
  const folder=/\/folders\//.test(parsed.pathname);
  const entries:DriveSource[]=folder?(await customerApi<{files:DriveSource[]}>('/drive/folder',{url})).files:[{url,name:'video-drive.mp4'}];
  if(!entries.length)throw Error('Thư mục Drive không có video');
  if(entries.length>50)throw Error('Thư mục có hơn 50 video. Hãy chọn thư mục con để dựng trên web.');
  if(entries.reduce((sum,item)=>sum+(item.bytes || 0),0)>memoryLimit)throw Error('Nguồn vượt bộ nhớ của bộ dựng web. Hãy dùng thư mục nhỏ hơn hoặc app trên máy. Chưa trừ phí dựng.');
  const result:File[]=[];let total=0;
  for(const [i,entry] of entries.entries()) {
    status(`Đang tải video ${i+1}/${entries.length} từ Drive về thiết bị…`);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60*60_000);
    try {
      const response=await fetcher('/api/customer/drive/transfer',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({url:entry.url})});
      if(!response.ok){const value=await response.json().catch(()=>({}));throw Error(value.error || 'Chưa tải được video từ Drive');}
      const length=Number(response.headers.get('content-length'));
      if(length>memoryLimit-total){controller.abort();throw Error('Nguồn vượt bộ nhớ của bộ dựng web. Chưa trừ phí dựng.');}
      if(!response.body)throw Error('Drive chưa trả dữ liệu video');
      const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let bytes=0;
      try {
        for(;;) {
          const chunk=await reader.read();if(chunk.done)break;
          bytes+=chunk.value.length;
          if(total+bytes>memoryLimit){controller.abort();throw Error('Nguồn vượt bộ nhớ của bộ dựng web. Chưa trừ phí dựng.');}
          chunks.push(chunk.value);
          status(`Đang tải video ${i+1}/${entries.length} · ${Math.ceil(bytes/1048576)} MB${length>0?' / '+Math.ceil(length/1048576)+' MB':''}`);
        }
      } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(bytes<100)throw Error('File Drive không có dữ liệu video hợp lệ');
      total+=bytes;result.push(new File(chunks,entry.name.split('/').pop() || 'video-drive.mp4',{type:response.headers.get('content-type') || 'video/mp4'}));
    } finally {clearTimeout(timer);}
  }
  return result;
}
