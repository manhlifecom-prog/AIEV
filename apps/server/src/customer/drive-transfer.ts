import dns from 'node:dns/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Express, RequestHandler } from 'express';
import { driveFile } from './media.js';
import { isBlockedIp } from '../safeFetch.js';
import { CustomerError } from './store.js';

function allowed(url:URL) {
  return url.protocol==='https:' && !url.port && !url.username && !url.password &&
    (url.hostname==='drive.usercontent.google.com' || url.hostname==='drive.google.com' || url.hostname.endsWith('.googleusercontent.com'));
}
export async function openDriveTransfer(url:string, signal:AbortSignal, fetcher:typeof fetch=fetch, lookup=dns.lookup) {
  const {id,key}=driveFile(url);
  let target=new URL('https://drive.usercontent.google.com/download');
  target.searchParams.set('id',id);target.searchParams.set('export','download');target.searchParams.set('confirm','t');
  if(key)target.searchParams.set('resourcekey',key);
  for(let i=0;i<6;i++) {
    if(!allowed(target))throw new CustomerError(400,'Drive chuyển tới địa chỉ không được phép');
    const addresses=await lookup(target.hostname,{all:true});
    if(!addresses.length || addresses.some(a=>isBlockedIp(a.address)))throw new CustomerError(400,'Địa chỉ tải Drive không hợp lệ');
    const response=await fetcher(target,{redirect:'manual',signal});
    if(response.status>=300 && response.status<400 && response.headers.get('location')) {
      const location=response.headers.get('location')!;await response.body?.cancel();target=new URL(location,target);continue;
    }
    const mime=response.headers.get('content-type') || '';
    if(!response.ok || !response.body || !/^(video\/|application\/octet-stream|application\/binary)/i.test(mime)) {
      await response.body?.cancel();throw new CustomerError(400,'Drive chưa cho tải video. Bật “Bất kỳ ai có đường liên kết”, cho phép tải xuống và kiểm tra hạn mức tải của file.');
    }
    return response;
  }
  throw new CustomerError(400,'Drive chuyển hướng quá nhiều lần');
}
export function driveTransferRoutes(app:Express,auth:RequestHandler,open= openDriveTransfer) {
  const busy=new Set<string>();
  app.post('/api/customer/drive/transfer',auth,async(req,res)=>{
    const owner=String(res.locals.user.id);
    if(busy.has(owner) || busy.size>=4)throw new CustomerError(429,'Đang tải nguồn khác. Hãy thử lại khi tải xong.');
    if(typeof req.body?.url!=='string' || req.body.url.length>2000)throw new CustomerError(400,'Link file Drive không hợp lệ');
    try{driveFile(req.body.url);}catch{throw new CustomerError(400,'Link file Drive không hợp lệ');}
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),60*60_000);
    const disconnect=()=>{if(!res.writableFinished)controller.abort();};res.once('close',disconnect);busy.add(owner);
    try {
      const upstream=await open(req.body.url,controller.signal);
      res.set({'Content-Type':upstream.headers.get('content-type') || 'application/octet-stream','X-Accel-Buffering':'no'});
      const length=Number(upstream.headers.get('content-length'));
      if(!upstream.headers.get('content-encoding') && Number.isSafeInteger(length)&&length>0)res.set('Content-Length',String(length));
      // Backpressure keeps a bounded buffer. No source file or video render is created on the VPS.
      await pipeline(Readable.fromWeb(upstream.body as never),res,{signal:controller.signal});
    } catch(error) {
      if(res.headersSent){res.destroy();return;}
      if(controller.signal.aborted){if(!res.destroyed)res.status(408).json({error:'Tải Drive bị ngắt hoặc hết thời gian'});return;}
      throw error;
    } finally {clearTimeout(timer);res.off('close',disconnect);busy.delete(owner);}
  });
}
