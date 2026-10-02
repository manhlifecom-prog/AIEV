import test from "node:test";
import assert from "node:assert/strict";
import { CustomerStore, CustomerError } from "./store.js";
import { customerConfig } from "./config.js";
import { driveFile } from "./media.js";
import { validateEdit, subtitleDocument } from "./render.js";
import { customerApp } from "./http.js";
import type { AddressInfo } from "node:net";

function setup() {
  const store = new CustomerStore(":memory:");
  const user = store.register("one@example.com", "Khách hàng một", "valid-password-one");
  const second = store.register("two@example.com", "Khách hàng hai", "valid-password-two");
  return { store, user, second };
}
test("admin overview rejects customer accounts and never exposes password hashes", () => {
  const { store, user, second } = setup();
  assert.equal(user.role, "customer");
  assert.throws(() => store.adminOverview(user.id), (error: unknown) => error instanceof CustomerError && error.status === 403);
  store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  const overview = store.adminOverview(user.id);
  assert.equal(overview.stats?.customers, 1);
  assert.equal(overview.users.find(account => account.id === second.id)?.email, second.email);
  assert.ok(overview.users.every(account => !("password" in account)));
  store.db.close();
});
test("changing a password validates the old password and revokes every existing session", () => {
  const { store, user } = setup();
  store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  const session = store.createSession(user.id);
  assert.throws(() => store.changePassword(user.id, "wrong-password", "new-valid-password"), CustomerError);
  assert.equal(store.session(session)?.id, user.id);
  assert.throws(() => store.changePassword(user.id, "valid-password-one", "short"), CustomerError);
  store.changePassword(user.id, "valid-password-one", "new-valid-password");
  assert.equal(store.session(session), undefined);
  assert.throws(() => store.login(user.email, "valid-password-one"), CustomerError);
  assert.equal(store.login(user.email, "new-valid-password").role, "admin");
  store.db.close();
});
test("sessions use opaque tokens, hashed storage and isolated data", () => {
  const { store, user, second } = setup();
  const session = store.createSession(user.id);
  assert.equal(store.session(session)?.id, user.id);
  assert.notEqual(store.db.prepare("SELECT hash FROM sessions").get()?.hash, session);
  const thread = store.createThread(user.id, "Riêng tư");
  assert.throws(() => store.messages(second.id, thread), CustomerError);
  const job = store.createJob(user.id, thread, "cắt video", "https://drive.google.com/file/d/1234567890abcdef/view");
  assert.throws(() => store.job(second.id, job.id), CustomerError);
  store.logout(session); assert.equal(store.session(session), undefined);
  store.db.close();
});
test("bank transactions must match account, code, exact amount and incoming direction; replay credits once", () => {
  const { store, user } = setup();
  const order = store.createOrder(user.id, 100);
  const data = { id: 1, accountNumber: customerConfig.account, transferType: "in", transferAmount: order.amount, content: order.code };
  assert.equal(store.payment({ ...data, id: 2, accountNumber: "different" }).credited, false);
  assert.equal(store.payment({ ...data, id: 3, transferAmount: Number(order.amount) + 1 }).credited, false);
  assert.equal(store.payment({ ...data, id: 4, transferType: "out" }).credited, false);
  assert.equal(store.user(user.id)?.balance, 0);
  assert.equal(store.payment(data).credited, true);
  assert.equal(store.payment(data).duplicate, true);
  assert.equal(store.payment({ ...data, id: 5 }).credited, false);
  assert.equal(store.user(user.id)?.balance, 100);
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM ledger WHERE kind='purchase'").get()?.n, 1);
  store.db.close();
});
test("unfunded jobs cannot queue; retries reserve once and failures refund once", () => {
  const { store, user } = setup();
  const thread = store.createThread(user.id, "Video");
  const job = store.createJob(user.id, thread, "video", "https://drive.google.com/file/d/1234567890abcdef/view");
  store.quote(job.id, 60, 30);
  assert.throws(() => store.reserve(user.id, job.id), (error: unknown) => error instanceof CustomerError && error.status === 402);
  assert.equal(store.job(user.id, job.id).status, "awaiting_confirmation");
  store.db.prepare("UPDATE users SET balance=100 WHERE id=?").run(user.id);
  store.reserve(user.id, job.id); store.reserve(user.id, job.id);
  assert.equal(store.user(user.id)?.balance, 70);
  store.fail(job.id, "Render failed"); store.fail(job.id, "Again");
  assert.equal(store.user(user.id)?.balance, 100);
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM ledger WHERE kind='refund'").get()?.n, 1);
  store.db.close();
});
test("successful jobs remain charged and interrupted jobs refund on restart", () => {
  const { store, user } = setup();
  store.db.prepare("UPDATE users SET balance=100 WHERE id=?").run(user.id);
  const thread = store.createThread(user.id, "Video");
  const done = store.createJob(user.id, thread, "video", "https://drive.google.com/file/d/1234567890abcdef/view");
  store.quote(done.id, 10, 30); store.reserve(user.id, done.id); store.update(done.id, "running", "Đang dựng"); store.finish(done.id, "final.mp4");
  store.fail(done.id, "Too late"); assert.equal(store.user(user.id)?.balance, 70);
  const interrupted = store.createJob(user.id, thread, "edit", "https://drive.google.com/file/d/1234567890abcdef/view");
  store.quote(interrupted.id, 10, 30); store.reserve(user.id, interrupted.id); store.update(interrupted.id, "running", "Đang dựng");
  store.recover(); assert.equal(store.user(user.id)?.balance, 70); assert.equal(store.job(user.id, interrupted.id).status, "failed");
  store.db.close();
});
test("expired payment orders go to reconciliation and cannot silently credit", () => {
  const { store, user } = setup();
  const order = store.createOrder(user.id, 100);
  store.db.prepare("UPDATE orders SET expires=0 WHERE id=?").run(order.id!);
  assert.equal(store.order(user.id, String(order.id)).status, "expired");
  assert.equal(store.payment({ id: 10, accountNumber: customerConfig.account, transferType: "in", transferAmount: order.amount, content: order.code }).credited, false);
  assert.equal(store.user(user.id)?.balance, 0);
  store.db.close();
});
test("Drive URLs are bounded to shared file IDs, with no arbitrary host or folder access", () => {
  assert.equal(driveFile("https://drive.google.com/file/d/1234567890abcdef/view").id, "1234567890abcdef");
  assert.equal(driveFile("https://drive.google.com/open?id=1234567890abcdef").id, "1234567890abcdef");
  for (const value of ["http://127.0.0.1/secret", "https://drive.google.com.evil.com/file/d/1234567890abcdef", "https://user:password@drive.google.com/file/d/1234567890abcdef", "https://drive.google.com/drive/folders/1234567890abcdef"]) assert.throws(() => driveFile(value));
});
test("model plans cannot reference paths, invalid time ranges or unbounded rendered duration", () => {
  const plan = { title: "", ratio: "9:16", subtitles: true, segments: [{ start: 0, end: 10 }] };
  assert.equal(validateEdit(plan, 10).ratio, "9:16");
  assert.throws(() => validateEdit({ ...plan, segments: [{ start: -1, end: 10 }] }, 10));
  assert.throws(() => validateEdit({ ...plan, segments: [{ start: 0, end: 20 }] }, 10));
  assert.throws(() => validateEdit({ ...plan, segments: Array.from({ length: 2 }, () => ({ start: 0, end: 10 })) }, 10));
  const ass = subtitleDocument(validateEdit(plan, 10), [{ word: "{\\pos(0,0)}Xin chào", start: 0, end: 1 }], 1080, 1920);
  assert.ok(!ass.includes("{\\pos")); assert.ok(ass.includes("Xin chào"));
});
test("public customer API requires per-user auth and rejects fake payments and cross-origin requests", async () => {
  const { store, user, second } = setup();
  const { app } = customerApp(store);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/customer`;
  try {
    assert.equal((await fetch(base + "/videos")).status, 401);
    assert.equal((await fetch(base + "/admin/overview")).status, 401);
    assert.equal((await fetch(base + "/payments/sepay", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
    assert.equal((await fetch(base + "/auth/login", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" })).status, 403);
    const thread = store.createThread(user.id, "Private");
    const headers = { cookie: "aiev_customer=" + store.createSession(second.id) };
    assert.equal((await fetch(base + `/threads/${thread}`, { headers })).status, 404);
    assert.equal((await fetch(base + "/../health", { headers })).status, 404);
    const ownHeaders = { cookie: "aiev_customer=" + store.createSession(user.id) };
    assert.equal((await fetch(base + "/admin/overview", { headers: ownHeaders })).status, 403);
    const registered = await fetch(base + "/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "third@example.com", name: "Third", password: "valid-password-third", role: "admin" }) });
    assert.equal((await registered.json()).role, "customer");
    store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
    const overview = await fetch(base + "/admin/overview", { headers: ownHeaders });
    assert.equal(overview.status, 200); assert.ok(!(await overview.text()).includes("password"));
    const account = await (await fetch(base + "/me", { headers: ownHeaders })).json();
    assert.equal(account.email, user.email); assert.equal(account.password, undefined);
    const login = await fetch(base + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: user.email, password: "valid-password-one" }) });
    assert.equal(login.status, 200); assert.match(login.headers.get("set-cookie") || "", /HttpOnly/i);
    const passwordUpdate = await fetch(base + "/auth/password", { method: "POST", headers: { ...ownHeaders, "content-type": "application/json" }, body: JSON.stringify({ currentPassword: "valid-password-one", newPassword: "another-valid-password" }) });
    assert.equal(passwordUpdate.status, 200); assert.match(passwordUpdate.headers.get("set-cookie") || "", /HttpOnly/i);
    assert.equal((await fetch(base + "/me", { headers: ownHeaders })).status, 401);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.db.close(); }
});
