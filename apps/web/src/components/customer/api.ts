export type CustomerUser = { id: string; name: string; email: string; balance: number; role: "customer" | "admin"; unlimitedTokens: boolean; blocked: boolean };
export type StudioConfig = { bank: string; account: string; accountName: string; tokenPrice: number; packs: number[]; maxMinutes: number; maxMegabytes: number; baseTokens: number; tokensPerMinute: number; tokensPerGiB: number; aiReady: boolean; mediaReady: boolean; paymentReady: boolean; processingMode?: 'local' | 'server' };
declare global { interface Window { aievDesktop?: {version:string;mediaLibrary?:boolean;platform?:'windows'|'macos'|'ios'|'linux';onActivity?:(callback:(event:import('./chat').ChatEvent & {requestId:string})=>void)=>()=>void;cancelChat?:(id:string)=>Promise<boolean>;request:(endpoint:string,body:unknown)=>Promise<{result?:unknown;error?:string;status?:number}>;preview?:(id:string)=>Promise<{url:string;preview:boolean;story?:string}>;open:(id:string)=>Promise<void>;save:(id:string)=>Promise<void>}; } }
export type VideoJob = { id: string; thread_id: string; status: string; stage: string; tokens: number; duration: number; error: string | null; created_at: number; output: string | null };
export type Thread = { id: string; title: string; created_at: number };
export type Message = { role: string; content: string; created_at: number };
export type Order = { id: string; code: string; tokens: number; amount: number; status: string; expires: number };
export type Wallet = { balance: number; transactions: { delta: number; kind: string; created_at: number; estimatedTokens?: number }[] };
export class StudioApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function customerApi<T>(endpoint: string, body?: unknown): Promise<T> {
  if(typeof window!=='undefined' && !window.aievDesktop && body!==undefined) {
    if(/^\/library\/(status|refresh|revoke)$/.test(endpoint))return (await (await import('./browser-engine')).browserLibrary(endpoint.split('/').pop()!)) as T;
    const match=endpoint.match(/^\/videos\/([a-zA-Z0-9-]+)\/confirm$/);
    if(match && (await import('./browser-engine')).browserSupported())return (await (await import('./browser-engine')).confirmBrowser(match[1])) as T;
  }
  if (typeof window !== 'undefined' && window.aievDesktop && body!==undefined && (endpoint==='/chat' || /^\/videos\/[^/]+\/confirm$/.test(endpoint) || (window.aievDesktop.mediaLibrary && /^\/library\/(status|pick-folder|pick-files|refresh|revoke)$/.test(endpoint)))) {
    if(endpoint==='/chat' && !/^(?:0\.(?:[3-9]|[1-9]\d+)\.\d+|[1-9]\d*\.\d+\.\d+)$/.test(window.aievDesktop.version)) throw new StudioApiError(409,'Hãy cập nhật AIEV Studio để trò chuyện với AI và sửa tiếp video.');
    const result=await window.aievDesktop.request(endpoint,body);
    if(result.error) throw new StudioApiError(result.status || 400,result.error);
    return result.result as T;
  }
  if(endpoint==='/chat' && body!==undefined) { endpoint='/assistant'; body={...(body as object),requestId:crypto.randomUUID(),device:'web'}; }
  const response = await fetch("/api/customer" + endpoint, { credentials: "same-origin", cache: "no-store", method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => { throw new StudioApiError(response.status || 503, "Dịch vụ tạm thời gián đoạn. Hãy thử lại sau."); });
  if (!response.ok) throw new StudioApiError(response.status, result.error || "Không kết nối được máy chủ");
  return result;
}
export const number = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
