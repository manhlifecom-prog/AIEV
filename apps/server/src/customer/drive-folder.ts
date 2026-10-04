import type { Express, RequestHandler } from 'express';
import { CustomerError } from './store.js';

const ID = /^[a-zA-Z0-9_-]{10,200}$/;
export type DriveEntry = { id: string; name: string; mimeType: string; url: string; bytes: number };
export function driveFolder(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'drive.google.com' || parsed.port || parsed.username || parsed.password) throw new Error('Link Google Drive không hợp lệ');
  const id = parsed.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)\/?$/)?.[1];
  if (!id || !ID.test(id)) throw new Error('Hãy dùng link thư mục Google Drive');
  const key = parsed.searchParams.get('resourcekey');
  if (key && !/^[a-zA-Z0-9_-]{1,200}$/.test(key)) throw new Error('Resource key không hợp lệ');
  return { id, key };
}
export function isDriveFolder(url: string) { try { driveFolder(url); return true; } catch { return false; } }
const video = (mime: string, name: string) => mime.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v|mts|m2ts|wmv|mpeg|mpg)$/i.test(name);
function entry(id: unknown, name: unknown, mimeType: unknown, bytes: unknown, key?: string | null): DriveEntry {
  if (typeof id !== 'string' || !ID.test(id) || typeof name !== 'string' || typeof mimeType !== 'string') throw new Error('Google Drive trả danh sách không hợp lệ');
  const url = new URL(mimeType === 'application/vnd.google-apps.folder' ? 'https://drive.google.com/drive/folders/'+id : 'https://drive.google.com/file/d/'+id+'/view');
  if (key && /^[a-zA-Z0-9_-]{1,200}$/.test(key)) url.searchParams.set('resourcekey',key);
  return {id,name:name.slice(0,500),mimeType,url:String(url),bytes:Number(bytes)||0};
}
// Parse serialized data only. Never execute script from Drive or use its API keys.
export function parsePublicFolder(html: string): DriveEntry[] {
  const encoded = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'((?:\\.|[^'\\])*)'/)?.[1];
  if (!encoded) throw new Error("Không đọc được thư mục. Hãy bật quyền 'Bất kỳ ai có đường liên kết' cho thư mục và cho phép tải video.");
  const decoded = encoded.replace(/\\(x[\da-f]{2}|u[\da-f]{4}|.|$)/gi, (_all, value: string) => {
    if (/^[xu]/i.test(value)) return String.fromCharCode(parseInt(value.slice(1),16));
    return ({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'} as Record<string,string>)[value] ?? value;
  });
  const data = JSON.parse(decoded);
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Google Drive đã thay đổi cấu trúc danh sách; hãy thử lại sau');
  // Public HTML is a first page. Fail explicitly instead of silently dropping clips.
  if (data[0].length >= 50 || data[1]) throw new Error('Thư mục cần phân trang. Chủ hệ thống cần cấu hình GOOGLE_DRIVE_API_KEY để đọc đủ video; không dựng thiếu clip.');
  return data[0].map((row: unknown[]) => entry(row[0],row[2],row[3],row[13], typeof row[114] === 'string' ? new URL(row[114]).searchParams.get('resourcekey') : null));
}
async function boundedText(response: Response) {
  if (!response.ok || !response.body) throw new Error('Không đọc được thư mục Drive. Kiểm tra quyền chia sẻ công khai.');
  const reader=response.body.getReader(); const chunks:Uint8Array[]=[]; let size=0;
  try { while(true) { const part=await reader.read(); if(part.done)break; size+=part.value.length; if(size>12*1024*1024)throw new Error('Danh sách thư mục quá lớn; hãy cấu hình Google Drive API để đọc đủ danh sách'); chunks.push(part.value); } }
  finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function listDriveFolder(url: string, request: typeof fetch = fetch): Promise<DriveEntry[]> {
  const seenFolders=new Set<string>(), seenFiles=new Set<string>(), result:DriveEntry[]=[];
  const deadline=Date.now()+240000;
  async function visit(link: string, prefix='') {
    if(Date.now()>deadline)throw new Error('Chưa đọc xong thư mục; hãy thử lại. Không dựng khi danh sách chưa đầy đủ.');
    const folder=driveFolder(link); if(seenFolders.has(folder.id))return; seenFolders.add(folder.id);
    let children:DriveEntry[]=[];
    const apiKey=process.env.GOOGLE_DRIVE_API_KEY;
    if(apiKey) {
      let token=''; const pages=new Set<string>();
      do {
        if(Date.now()>deadline)throw new Error('Chưa đọc xong thư mục; hãy thử lại. Không dựng khi danh sách chưa đầy đủ.');
        if(pages.has(token))throw new Error('Google Drive trả trang trùng'); pages.add(token);
        const api=new URL('https://www.googleapis.com/drive/v3/files');
        api.search=new URLSearchParams({key:apiKey,q:`'${folder.id}' in parents and trashed = false`,pageSize:'1000',fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,size,resourceKey)',orderBy:'name',...(token?{pageToken:token}:{})}).toString();
        const response=await request(api,{redirect:'error',signal:AbortSignal.timeout(30000),headers:folder.key?{'X-Goog-Drive-Resource-Keys':folder.id+'/'+folder.key}:{}});
        if(!response.ok)throw new Error('Google Drive API chưa đọc được thư mục; kiểm tra cấu hình và quyền chia sẻ');
        const data=JSON.parse(await boundedText(response));
        if(!Array.isArray(data.files)||data.incompleteSearch)throw new Error('Google Drive chưa trả danh sách đầy đủ');
        children.push(...data.files.map((f:Record<string,unknown>)=>entry(f.id,f.name,f.mimeType,f.size,f.resourceKey as string)));
        token=data.nextPageToken||'';
      } while(token);
    } else {
      const publicUrl=new URL('https://drive.google.com/drive/folders/'+folder.id); if(folder.key)publicUrl.searchParams.set('resourcekey',folder.key);
      const response=await request(publicUrl,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'user-agent':'AIEV-Studio/0.4.0'}});
      children=parsePublicFolder(await boundedText(response));
    }
    children.sort((a,b)=>a.name.localeCompare(b.name,'vi',{numeric:true})||a.id.localeCompare(b.id));
    for(const child of children) {
      if(child.mimeType==='application/vnd.google-apps.folder')await visit(child.url,prefix+child.name+'/');
      else if(video(child.mimeType,child.name)&&!seenFiles.has(child.id)) {seenFiles.add(child.id); result.push({...child,name:(prefix+child.name).slice(0,500)});}
    }
  }
  await visit(url);
  if(!result.length)throw new Error('Thư mục không có video có thể tải. Hãy chia sẻ thư mục chứa các file video.');
  return result;
}
export function folderRoutes(app: Express, auth: RequestHandler) {
  const busy=new Set<string>();
  app.post('/api/customer/drive/folder',auth,async(req,res)=>{
    const owner=res.locals.user.id;
    if(busy.has(owner))throw new CustomerError(409,'Đang đọc thư mục trước');
    try {driveFolder(req.body?.url);}catch {throw new CustomerError(400,'Link thư mục Google Drive không hợp lệ');}
    busy.add(owner);
    try {const files=await listDriveFolder(req.body.url);res.json({files,count:files.length});}
    catch(error){throw new CustomerError(400,(error as Error).message);}
    finally {busy.delete(owner);}
  });
}
