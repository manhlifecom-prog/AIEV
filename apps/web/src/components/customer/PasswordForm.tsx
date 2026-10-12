"use client";
import { useState, type FormEvent } from "react";
import { customerApi } from "./api";

export function PasswordForm() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    setError(""); setSuccess(false);
    if (values.get("newPassword") !== values.get("confirmPassword")) { setError("Mật khẩu xác nhận chưa khớp"); return; }
    setBusy(true);
    try { await customerApi("/auth/password", { currentPassword: values.get("currentPassword"), newPassword: values.get("newPassword") }); form.reset(); setSuccess(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không đổi được mật khẩu"); }
    finally { setBusy(false); }
  }
  return <form className="studio-form" onSubmit={submit}>
    <p>Đổi mật khẩu sẽ đăng xuất tài khoản trên các thiết bị khác.</p>
    <label>Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
    <label>Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
    <label>Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
    {error ? <p role="alert" className="studio-error">{error}</p> : null}
    {success ? <p role="status" className="studio-success">Đã đổi mật khẩu thành công.</p> : null}
    <button className="studio-primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu mới"}</button>
  </form>;
}
