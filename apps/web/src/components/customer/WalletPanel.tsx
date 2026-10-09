"use client";
import { customerApi, number, type StudioConfig, type Order, type Wallet } from "./api";
import { useState } from "react";
export function WalletPanel({ config, wallet, order, setOrder, unlimitedTokens = false }: { unlimitedTokens?: boolean; config: StudioConfig | null; wallet: Wallet | null; order: Order | null; setOrder: (order: Order) => void }) {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function buy(tokens: number) {
    setBusy(true); setError("");
    try { setOrder(await customerApi<Order>("/orders", { tokens })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không tạo được đơn nạp"); }
    finally { setBusy(false); }
  }
  return <div className="studio-wallet">
    <p>{unlimitedTokens ? <><strong>Token không giới hạn</strong><br />Miễn token cho quản trị. Chat, dựng và chỉnh sửa tiếp không trừ số dư.</> : <>Số dư hiện tại <strong>{number(wallet?.balance || 0)} token</strong></>}</p>
    {!unlimitedTokens && order ? <div className="studio-transfer">
      {order.status === "paid" ? <p className="studio-success">Đã nhận chuyển khoản. Token đã được cộng vào ví.</p> : order.status === "expired" ? <p className="studio-error">Đơn nạp đã hết hạn. Hãy tạo đơn mới trước khi chuyển khoản.</p> : <>
        <p>Chuyển đúng <strong>{number(order.amount)} ₫</strong> với nội dung <strong>{order.code}</strong>.</p>
        <img className="studio-qr" alt={`QR chuyển khoản ${number(order.amount)} đồng`} src={`https://qr.sepay.vn/img?acc=${encodeURIComponent(config?.account || "")}&bank=${encodeURIComponent(config?.bank || "")}&amount=${order.amount}&des=${encodeURIComponent(order.code)}`} />
        <dl><dt>Ngân hàng</dt><dd>{config?.bank}</dd><dt>Số tài khoản</dt><dd>{config?.account}</dd><dt>Người nhận</dt><dd>{config?.accountName}</dd><dt>Nội dung</dt><dd>{order.code}</dd></dl>
        <small>Hệ thống tự cộng token sau khi SePay xác nhận. Đơn nạp có hiệu lực 30 phút.</small>
      </>}
    </div> : null}
    {!unlimitedTokens && (!config?.paymentReady || !config?.aiReady || !config?.mediaReady) ? <p className="studio-notice">Dịch vụ đang được cấu hình. Nạp token sẽ mở khi AI, bộ dựng video và thanh toán đã sẵn sàng.</p> : null}
    {!unlimitedTokens ? <div className="studio-packs">{(config?.packs || [100, 500, 1000]).map(tokens => <button className="studio-secondary" key={tokens} disabled={busy || !config?.paymentReady || !config?.aiReady || !config?.mediaReady} onClick={() => buy(tokens)}><strong>{number(tokens)} token</strong><span>{number(tokens * (config?.tokenPrice || 1000))} ₫</span></button>)}</div> : null}
    {error ? <p role="alert" className="studio-error">{error}</p> : null}
    <h3>Lịch sử token</h3>
    {wallet?.transactions.length ? <ul className="studio-ledger">{wallet.transactions.map((row, index) => <li key={index}><span>{({ purchase: "Nạp token", refund: "Hoàn phí dựng", chat: "Chat với AI", chat_refund: "Hoàn phí chat", reserve: "Dựng video", admin_adjustment: "Điều chỉnh bởi quản trị" } as Record<string,string>)[row.kind] || row.kind}<small>{new Date(row.created_at).toLocaleString("vi-VN")}</small>{unlimitedTokens && row.estimatedTokens ? <small>Ước tính {number(row.estimatedTokens)} token · Thực trừ {number(Math.abs(row.delta))}</small> : null}</span><strong>{row.delta > 0 ? "+" : ""}{number(row.delta)}</strong></li>)}</ul> : <p>Chưa có giao dịch.</p>}
  </div>;
}
