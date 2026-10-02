export type CustomerUser = { id: string; name: string; email: string; balance: number };
export type StudioConfig = { bank: string; account: string; accountName: string; tokenPrice: number; packs: number[]; maxMinutes: number; aiReady: boolean; mediaReady: boolean; paymentReady: boolean };
export type VideoJob = { id: string; thread_id: string; status: string; stage: string; tokens: number; duration: number; error: string | null; created_at: number; output: string | null };
export type Thread = { id: string; title: string; created_at: number };
export type Message = { role: string; content: string; created_at: number };
export type Order = { id: string; code: string; tokens: number; amount: number; status: string; expires: number };
export type Wallet = { balance: number; transactions: { delta: number; kind: string; created_at: number }[] };
export class StudioApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function customerApi<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/customer" + endpoint, { credentials: "same-origin", cache: "no-store", method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new StudioApiError(response.status, result.error || "Không kết nối được máy chủ");
  return result;
}
export const number = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
