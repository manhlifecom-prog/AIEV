"use client";
import { useState, type FormEvent } from "react";
import { customerApi, type CustomerUser } from "./api";
export function AuthForm({ success }: { success: (user: CustomerUser) => void }) {
  const [register, setRegister] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = new FormData(event.currentTarget);
    try { success(await customerApi<CustomerUser>(register ? "/auth/register" : "/auth/login", { email: values.get("email"), password: values.get("password"), name: values.get("name") })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không đăng nhập được"); }
    finally { setBusy(false); }
  }
  return <form className="studio-form" onSubmit={submit}>
    <p>Đăng nhập để lưu video và sử dụng ví token của bạn.</p>
    {register ? <label>Tên của bạn<input name="name" autoComplete="name" required maxLength={100} /></label> : null}
    <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Mật khẩu<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 10 : 1} maxLength={128} /></label>
    {register ? <small>Mật khẩu cần ít nhất 10 ký tự.</small> : null}
    {error ? <p className="studio-error" role="alert">{error}</p> : null}
    <button className="studio-primary" disabled={busy}>{busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}</button>
    <button className="studio-text-button" type="button" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</button>
  </form>;
}
