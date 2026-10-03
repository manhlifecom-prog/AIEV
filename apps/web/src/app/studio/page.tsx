"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Play, Plus, Video, Wallet as WalletIcon, UserRound, Send, Paperclip, CircleHelp, Film, Scissors, Captions, Info, LogOut, Download, LoaderCircle, Shield, KeyRound } from "lucide-react";
import { customerApi, StudioApiError, number, type CustomerUser, type StudioConfig, type VideoJob, type Thread, type Message, type Order, type Wallet } from "@/components/customer/api";
import { StudioModal } from "@/components/customer/StudioModal";
import { AuthForm } from "@/components/customer/AuthForm";
import { WalletPanel } from "@/components/customer/WalletPanel";
import { AdminPanel } from "@/components/customer/AdminPanel";
import { PasswordForm } from "@/components/customer/PasswordForm";
import { InstallApp } from "@/components/customer/InstallApp";
import { VideoResult } from "@/components/customer/VideoResult";
import "./studio.css";

const examples = ["Cắt video thành một clip dọc 60 giây", "Thêm phụ đề tiếng Việt, bỏ khoảng lặng", "Dựng video giới thiệu sản phẩm"];
const active = (status: string) => ["inspecting", "queued", "running", "local_running"].includes(status);
export default function StudioPage() {
  const [user, setUser] = useState<CustomerUser | null>(null), [config, setConfig] = useState<StudioConfig | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]), [videos, setVideos] = useState<VideoJob[]>([]), [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null), [text, setText] = useState(""), [drive, setDrive] = useState(""), [showDrive, setShowDrive] = useState(false);
  const [modal, setModal] = useState<"auth" | "wallet" | "videos" | "help" | "admin" | "password" | "account" | null>(null), [wallet, setWallet] = useState<Wallet | null>(null), [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null), messagesEnd = useRef<HTMLDivElement>(null), refreshSequence = useRef(0);
  const currentJobs = videos.filter(job => job.thread_id === threadId);
  const job = currentJobs[0];
  const working = job && active(job.status);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const shared = ["share_title", "share_text", "share_url"].map(key => parameters.get(key)).filter(Boolean).join("\n").slice(0, 16000);
    if (shared) { setText(shared); window.history.replaceState(null, "", "/studio"); }
  }, []);

  useEffect(() => {
    let live = true;
    customerApi<StudioConfig>("/config").then(value => { if (live) setConfig(value); }).catch(() => { if (live) setError("Chưa kết nối được dịch vụ. Hãy thử tải lại trang."); });
    customerApi<CustomerUser>("/me").then(value => { if (live) setUser(value); }).catch(reason => { if (live && (!(reason instanceof StudioApiError) || reason.status !== 401)) setError("Chưa kết nối được dịch vụ."); });
    return () => { live = false; };
  }, []);
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const sequence = ++refreshSequence.current;
    const [account, recent, jobs, funds, conversation] = await Promise.all([
      customerApi<CustomerUser>("/me"), customerApi<Thread[]>("/threads"), customerApi<VideoJob[]>("/videos"), customerApi<Wallet>("/wallet"),
      threadId ? customerApi<{ messages: Message[] }>(`/threads/${threadId}`) : Promise.resolve({ messages: [] as Message[] }),
    ]);
    if (sequence !== refreshSequence.current) return;
    setUser(account); setThreads(recent); setVideos(jobs); setWallet(funds); setMessages(conversation.messages);
  }, [user?.id, threadId]);
  useEffect(() => {
    let live = true;
    const update = () => refresh().catch(reason => {
      if (!live) return;
      if (reason instanceof StudioApiError && reason.status === 401) { setUser(null); setThreads([]); setVideos([]); setMessages([]); setThreadId(null); setWallet(null); setOrder(null); setModal("auth"); }
      else setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu");
    });
    void update();
    const timer = setInterval(update, working || order?.status === "pending" ? 3000 : 10000);
    return () => { live = false; refreshSequence.current++; clearInterval(timer); };
  }, [refresh, working, order?.status]);
  useEffect(() => {
    if (!order || order.status !== "pending") return;
    let live = true;
    const timer = setInterval(() => { customerApi<Order>(`/orders/${order.id}`).then(value => { if (live) setOrder(value); }).catch(() => {}); }, 3000);
    return () => { live = false; clearInterval(timer); };
  }, [order?.id, order?.status]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);
  function openWallet() { setModal(user ? "wallet" : "auth"); }
  function newChat() { setThreadId(null); setMessages([]); setText(""); setDrive(""); setError(""); input.current?.focus(); }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !drive.trim()) return;
    if (!user) { setModal("auth"); return; }
    setBusy(true); setError("");
    try {
      const result = await customerApi<{ threadId: string; localError?: string }>("/chat", { message: [text.trim(), drive.trim()].filter(Boolean).join("\n"), ...(threadId ? { threadId } : {}) });
      if (threadId === result.threadId) await refresh();
      setThreadId(result.threadId); setText(""); setDrive(""); setShowDrive(false);
      if(result.localError) setError(result.localError);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không gửi được yêu cầu"); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!job) return;
    setBusy(true); setError("");
    try { await customerApi(`/videos/${job.id}/confirm`, {}); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không bắt đầu được"); if (reason instanceof StudioApiError && reason.status === 402) openWallet(); }
    finally { setBusy(false); }
  }
  async function logout() { await customerApi("/auth/logout", {}); refreshSequence.current++; setUser(null); setThreads([]); setVideos([]); setWallet(null); setOrder(null); newChat(); }

  return <div className="studio">
    <aside className="studio-sidebar">
      <a href="/studio" className="studio-brand"><Play size={32} strokeWidth={2.5} /><span>AIEV Studio</span></a>
      <button className="studio-new" onClick={newChat}><Plus size={20} />Cuộc trò chuyện mới</button>
      <nav aria-label="Điều hướng"><button onClick={() => setModal(user ? "videos" : "auth")}><Video size={20} />Video của tôi</button><button onClick={openWallet}><WalletIcon size={20} />Ví token</button></nav>
      {user?.role === "admin" ? <button className="studio-admin-button studio-secondary" onClick={() => setModal("admin")}><Shield size={18} />Quản trị</button> : null}
      {user ? <button className="studio-password-button studio-text-button" aria-label="Đổi mật khẩu" onClick={() => setModal("password")}><KeyRound size={18} /><span>Đổi mật khẩu</span></button> : null}
      <div className="studio-recent"><h2>Gần đây</h2>{threads.length ? threads.map(thread => <button key={thread.id} aria-current={threadId === thread.id ? "page" : undefined} onClick={() => { setThreadId(thread.id); setError(""); }}>{thread.title}</button>) : <p>Chưa có video</p>}</div>
      <div className="studio-account"><button className="studio-secondary" aria-label={user?.name || "Đăng nhập"} onClick={() => setModal(user ? "account" : "auth")}><UserRound size={20} /><span>{user?.name || "Đăng nhập"}</span></button>{user ? <button className="studio-icon" aria-label="Đăng xuất" onClick={() => { void logout().catch(() => setError("Không đăng xuất được")); }}><LogOut size={18} /></button> : null}</div>
    </aside>
    <main className="studio-main">
      <header className="studio-header"><div><h1>Trợ lý dựng video</h1><p>Từ ý tưởng đến video, trong một cuộc trò chuyện</p></div><InstallApp /><button className="studio-text-button" aria-label="Hướng dẫn" onClick={() => setModal("help")}><CircleHelp size={20} /><span>Hướng dẫn</span></button><button className="studio-mobile-wallet studio-icon" aria-label="Video của tôi" onClick={() => setModal(user ? "videos" : "auth")}><Video size={20} /></button><button className="studio-mobile-wallet studio-icon" aria-label="Mở ví token" onClick={openWallet}><WalletIcon size={22} /></button></header>
      <section className="studio-conversation" aria-label="Cuộc trò chuyện">
        {messages.length ? <div className="studio-messages" role="log" aria-live="polite">{messages.map((message, index) => <div key={`${message.created_at}-${index}`} className={`studio-message ${message.role === "user" ? "from-user" : "from-ai"}`}><span className="studio-message-label">{message.role === "user" ? "Bạn" : "AIEV"}</span><p>{message.content}</p></div>)}
          {["awaiting_confirmation", "local_running"].includes(job?.status || "") ? <div className="studio-quote"><strong>{number(job.tokens)} token cho lượt dựng này</strong><p>Video nguồn: {Math.ceil(job.duration)} giây. Số dư: {number(user?.balance || 0)} token.</p><button className="studio-primary" disabled={busy || !config?.aiReady} onClick={confirm}>{busy ? "Đang bắt đầu…" : job.status === "local_running" ? "Tiếp tục dựng trên máy" : "Xác nhận dựng video"}</button>{!config?.aiReady ? <small>Dịch vụ AI đang được cấu hình; bạn chưa bị trừ token.</small> : null}</div> : null}
          {working ? <p className="studio-job-stage"><LoaderCircle className="studio-spin" size={18} />{job.stage}</p> : null}
          {job?.status === "done" ? <div className="studio-mobile-result studio-result"><VideoResult job={job} /></div> : null}<div ref={messagesEnd} /></div> : <div className="studio-welcome"><h2>Bạn muốn làm video gì?</h2><p>{config?.processingMode === "local" ? "Chat với AI để trao đổi ý tưởng và chỉnh video. App Windows 0.3.0 dựng trên máy bạn; website có thể trò chuyện, Android/iPhone chưa dựng tại máy." : "Dán link Google Drive và mô tả video bạn muốn. Tôi sẽ lo phần dựng."}</p><div className="studio-examples">{examples.map((example, index) => <button key={example} onClick={() => { setText(example); input.current?.focus(); }}>{index === 0 ? <Scissors size={22} /> : index === 1 ? <Captions size={22} /> : <Video size={22} />}<span>{example}</span></button>)}</div></div>}
      </section>
      <div className="studio-compose-area">
        {error ? <p className="studio-error" role="alert">{error}</p> : null}
        <form className="studio-compose" onSubmit={send}><textarea ref={input} aria-label="Yêu cầu làm video" placeholder="Nhắn cho AI hoặc dán link Google Drive…" value={text} onChange={event => setText(event.target.value)} maxLength={7000} rows={2} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          {showDrive ? <label className="studio-drive-input">Link file Google Drive<input type="url" placeholder="https://drive.google.com/file/d/…" value={drive} onChange={event => setDrive(event.target.value)} maxLength={1000} /></label> : null}
          <div className="studio-compose-actions"><button type="button" className="studio-icon" aria-label="Thêm link Google Drive" aria-expanded={showDrive} onClick={() => setShowDrive(!showDrive)}><Paperclip size={21} /></button><button className="studio-send" aria-label="Gửi yêu cầu" disabled={busy || Boolean(working) || (!text.trim() && !drive.trim())}>{busy ? <LoaderCircle className="studio-spin" size={22} /> : <Send size={22} />}</button></div>
        </form><p className="studio-compose-note"><Info size={15} />Chat: 1 token/tin nhắn. Dựng: báo giá trước khi xác nhận.</p>
      </div>
    </main>
    <aside className="studio-output"><h2>Video của bạn</h2>{job?.status === "done" ? <div className="studio-result"><VideoResult job={job} /><p>{job.tokens} token · Video đã hoàn tất</p></div> : <div className="studio-preview-empty"><Film size={48} strokeWidth={1.5} /><p>{working ? job.stage : job?.status === "failed" ? "Video chưa hoàn tất" : "Video sẽ xuất hiện tại đây"}</p>{job?.status === "failed" ? <small>{job.error}</small> : null}</div>}
      <div className="studio-balance"><h3>Số dư</h3><p>{number(user?.balance || 0)} <span>token</span></p><button className="studio-primary" onClick={openWallet}>Nạp token</button><small>Dựng trên máy bạn. Lỗi trước khi nhận kế hoạch AI được hoàn token; có kế hoạch thì thử dựng lại miễn phí.</small></div>
    </aside>
    {modal ? <StudioModal title={modal === "auth" || modal === "account" ? "Tài khoản của bạn" : modal === "wallet" ? "Ví token" : modal === "videos" ? "Video của tôi" : modal === "admin" ? "Quản trị AIEV Studio" : modal === "password" ? "Đổi mật khẩu" : "Làm video bằng một cuộc trò chuyện"} close={() => setModal(null)}>
      {modal === "account" && user ? <div className="studio-form"><p>{user.name}<br />{user.email}</p>{user.role === "admin" ? <button className="studio-secondary" onClick={() => setModal("admin")}><Shield size={18} />Quản trị</button> : null}<button className="studio-secondary" onClick={() => setModal("password")}><KeyRound size={18} />Đổi mật khẩu</button><button className="studio-secondary" onClick={openWallet}><WalletIcon size={18} />Ví token</button></div> : null}
      {modal === "admin" && user?.role === "admin" ? <AdminPanel /> : null}
      {modal === "password" && user ? <PasswordForm /> : null}
      {modal === "auth" ? <AuthForm success={account => { setUser(account); setModal(null); setError(""); }} /> : modal === "wallet" ? <WalletPanel config={config} wallet={wallet} order={order} setOrder={setOrder} /> : modal === "videos" ? <div className="studio-video-list">{videos.length ? videos.map(video => <button key={video.id} className="studio-secondary" onClick={() => { setThreadId(video.thread_id); setModal(null); }}><Video size={20} /><span>{threads.find(thread => thread.id === video.thread_id)?.title || "Video của bạn"}<small>{video.stage}</small></span></button>) : <p>Chưa có video. Bắt đầu bằng cách nhắn cho AI và dán link Drive.</p>}</div> : modal === "help" ? <div className="studio-help"><ol><li>Đăng ký hoặc đăng nhập tài khoản.</li><li>Dán link một file video Google Drive có quyền tải xuống bằng đường liên kết.</li><li>Mô tả cách chỉnh: chọn đoạn hay, đổi khung hình, thêm phụ đề hoặc bỏ khoảng lặng.</li><li>Xem báo giá token, nạp qua chuyển khoản MB và xác nhận để bắt đầu.</li><li>Xem video, tải MP4 hoặc nhắn tiếp để chỉnh thêm.</li></ol><p>Mỗi yêu cầu dùng một file video Drive. {config ? config.maxMinutes > 0 || config.maxMegabytes > 0 ? `Giới hạn cấu hình: ${config.maxMinutes > 0 ? `${config.maxMinutes} phút` : "không giới hạn thời lượng"}, ${config.maxMegabytes > 0 ? `${config.maxMegabytes} MB` : "không giới hạn dung lượng file"}.` : "Không đặt giới hạn cố định về dung lượng file hoặc thời lượng. Video lớn hoặc dài được báo giá theo token." : "Đang tải cấu hình dịch vụ."} Link thư mục chưa được hỗ trợ; hãy mở từng file và bật quyền tải xuống cho bất kỳ ai có đường liên kết.</p><p>Chi phí: {config?.baseTokens ?? 10} token mỗi lượt + {config?.tokensPerMinute ?? 20} token mỗi phút nguồn (làm tròn lên) + {config?.tokensPerGiB ?? 10} token mỗi GiB nguồn (làm tròn chi phí lên token nguyên). Hệ thống báo tổng trước khi bạn xác nhận. App Windows tải nguồn và dựng tại máy bạn; VPS chỉ quản lý token và trung chuyển âm thanh tới AI. Nếu AI chưa trả kế hoạch và xử lý thất bại, token được hoàn. Đã nhận kế hoạch thì có thể thử dựng lại miễn phí, không hoàn phí AI. Máy bạn cần đủ chỗ lưu nguồn và file xuất.</p><p>Nếu yêu cầu hiệu ứng ngoài khả năng hiện tại, hãy mô tả rõ để được hỗ trợ trước khi dựng.</p></div> : null}
    </StudioModal> : null}
  </div>;
}
