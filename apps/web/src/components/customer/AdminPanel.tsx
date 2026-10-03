"use client";
import { useEffect, useState } from "react";
import { customerApi, number, type AdminOverview } from "./api";

const statuses: Record<string, string> = { inspecting: "Kiểm tra nguồn", awaiting_confirmation: "Chờ xác nhận", queued: "Chờ dựng", running: "Đang dựng", done: "Hoàn tất", failed: "Thất bại", cancelled: "Đã hủy", pending: "Chờ thanh toán", paid: "Đã thanh toán", expired: "Hết hạn" };
export function AdminPanel() {
  const [data, setData] = useState<AdminOverview | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    customerApi<AdminOverview>("/admin/overview").then(value => { if (live) { setData(value); setError(""); } }).catch(reason => { if (live) setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu"); });
    return () => { live = false; };
  }, [revision]);
  return <div className="studio-admin">
    <p>Tổng quan vận hành. Hiển thị tối đa 100 mục mới nhất trong mỗi danh sách.</p>
    <button className="studio-secondary" onClick={() => setRevision(value => value + 1)}>Cập nhật dữ liệu</button>
    {error ? <p className="studio-error" role="alert">{error}</p> : null}
    {!data && !error ? <p role="status">Đang tải…</p> : null}
    {data ? <>
      <dl className="studio-admin-stats"><div><dt>Khách hàng</dt><dd>{number(data.stats.customers)}</dd></div><div><dt>Video</dt><dd>{number(data.stats.videos)}</dd></div><div><dt>Đang xử lý</dt><dd>{number(data.stats.activeVideos)}</dd></div><div><dt>Đã thu</dt><dd>{number(data.stats.paidVnd)} đ</dd></div></dl>
      <h3>Tài khoản</h3><div className="studio-admin-table"><table><thead><tr><th>Email</th><th>Tên</th><th>Quyền</th><th>Token</th></tr></thead><tbody>{data.users.map(account => <tr key={account.id}><td>{account.email}</td><td>{account.name}</td><td>{account.role === "admin" ? "Quản trị" : "Khách hàng"}</td><td>{number(account.balance)}</td></tr>)}</tbody></table></div>
      <h3>Video gần đây</h3>{data.jobs.length ? <div className="studio-admin-table"><table><thead><tr><th>Khách hàng</th><th>Trạng thái</th><th>Token</th></tr></thead><tbody>{data.jobs.map(job => <tr key={job.id}><td>{job.email}</td><td>{statuses[job.status] || job.status}<small>{job.stage}</small></td><td>{number(job.tokens)}</td></tr>)}</tbody></table></div> : <p>Chưa có yêu cầu video.</p>}
      <h3>Đơn nạp token</h3>{data.orders.length ? <div className="studio-admin-table"><table><thead><tr><th>Mã đơn / khách hàng</th><th>Số tiền</th><th>Trạng thái</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>{order.code}<small>{order.email}</small></td><td>{number(order.amount)} đ</td><td>{statuses[order.status] || order.status}</td></tr>)}</tbody></table></div> : <p>Chưa có đơn nạp token.</p>}
    </> : null}
  </div>;
}
