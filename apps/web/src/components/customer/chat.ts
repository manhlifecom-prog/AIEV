import { customerApi, StudioApiError } from './api';
export type ChatEvent = { type: string; data: { threadId?: string; label?: string; text?: string; status?: number; message?: string; cancellable?: boolean } };
export type ChatResult = { threadId: string; reply?: string; localError?: string; action?: string; sourceIds?:string[]; url?:string; sourceJobId?:string; jobId?:string; turnId?:string; prompt?:string };
export async function customerChat(body: { message: string; requestId: string; threadId?: string }, onEvent: (event: ChatEvent) => void, signal: AbortSignal): Promise<ChatResult> {
  const desktop = window.aievDesktop;
  if (desktop) {
    const unsubscribe = desktop.onActivity?.(event => { if (event.requestId === body.requestId) onEvent(event); });
    const cancel = () => { void desktop.cancelChat?.(body.requestId); };
    signal.addEventListener('abort', cancel, { once: true });
    try { return await customerApi<ChatResult>('/chat', body); }
    finally { unsubscribe?.(); signal.removeEventListener('abort', cancel); }
  }
  if (/AIEV(?:Desktop|iOS)\//.test(navigator.userAgent)) throw new StudioApiError(409, 'App chưa kết nối được bộ dựng tại thiết bị. Đóng app và mở lại; nếu vẫn lỗi, cập nhật AIEV Studio.');
  const engine=await import('./browser-engine');
  const supported=engine.browserSupported();
  const account=supported?await customerApi<{id:string}>('/me'):null;
  const response = await fetch('/api/customer/assistant', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, device: supported?'browser':'web', ...(supported?{browserRenderer:1,localLibrary:engine.librarySummary(account!.id)}:{}), stream: true }) });
  if (!response.ok) { const value = await response.json().catch(() => ({})); throw new StudioApiError(response.status, value.error || 'Không kết nối được AI'); }
  if (!response.body) throw new Error('Không nhận được phản hồi AI');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', result: ChatResult | undefined;
  try {
    for (;;) {
      const chunk = await reader.read(); buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        if (!frame.startsWith('data: ')) continue;
        const event = JSON.parse(frame.slice(6));
        if (event.type === 'error') throw new StudioApiError(event.data.status, event.data.message);
        if (event.type === 'result') result = event.data;
        onEvent(event);
      }
      if (chunk.done) break;
      if (buffer.length > 100000) throw new Error('Phản hồi AI không hợp lệ');
    }
    if (!result) throw new Error('Kết nối bị ngắt. Bấm Thử lại để nhận kết quả của tin nhắn này.');
    signal.throwIfAborted();
    return supported?await engine.browserDecision(result,onEvent):result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
