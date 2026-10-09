"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Play, Plus, Video, Wallet as WalletIcon, UserRound, Send, Paperclip, CircleHelp, Film, Scissors, Captions, Info, LogOut, Download, LoaderCircle, Shield, KeyRound, Square, RotateCcw, Monitor, Globe } from "lucide-react";
import { customerApi, StudioApiError, number, type CustomerUser, type StudioConfig, type VideoJob, type Thread, type Message, type Order, type Wallet } from "@/components/customer/api";
import { StudioModal } from "@/components/customer/StudioModal";
import { TemplateGallery } from "@/components/customer/TemplateGallery";
import { AuthForm } from "@/components/customer/AuthForm";
import { WalletPanel } from "@/components/customer/WalletPanel";
import { PasswordForm } from "@/components/customer/PasswordForm";
import { InstallApp } from "@/components/customer/InstallApp";
import { VideoResult } from "@/components/customer/VideoResult";
import { customerChat } from '@/components/customer/chat';
import { ChatContent } from '@/components/customer/ChatContent';
import { browserSupported } from '@/components/customer/browser-engine';
import { MediaLibraryPanel } from '@/components/customer/MediaLibraryPanel';
import "./studio.css";

const examples = ["Viết kịch bản video 60 giây giới thiệu sản phẩm", "Lên 5 ý tưởng content cho tuần này", "Dựng video từ các clip của tôi"];
const active = (status: string) => ["inspecting", "queued", "running", "local_running"].includes(status);
export default function StudioPage() {
  const [user, setUser] = useState<CustomerUser | null>(null), [config, setConfig] = useState<StudioConfig | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]), [videos, setVideos] = useState<VideoJob[]>([]), [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null), [text, setText] = useState(""), [drive, setDrive] = useState(""), [showDrive, setShowDrive] = useState(false);
  const [modal, setModal] = useState<"auth" | "wallet" | "videos" | "help" | "password" | "account" | "templates" | null>(null), [wallet, setWallet] = useState<Wallet | null>(null), [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null), messagesEnd = useRef<HTMLDivElement>(null), refreshSequence = useRef(0);
  const [elapsed,setElapsed]=useState(0);
  const [activity,setActivity]=useState(''), [liveReply,setLiveReply]=useState(''), [canStop,setCanStop]=useState(false);
  const [nativeStage,setNativeStage]=useState('');
  const [browserReady,setBrowserReady]=useState(false);
  const [device,setDevice]=useState<'windows'|'macos'|'ios'|'linux'|'web'|'disconnected'>('web');
  const [retry,setRetry]=useState<{message:string;requestId:string;threadId?:string}|null>(null);
  const sending=useRef(false), abortChat=useRef<AbortController|null>(null), failedTurn=useRef(false), pinned=useRef(true), conversation=useRef<HTMLElement|null>(null);
  const activeRequest=useRef<string|null>(null);
  useEffect(()=>{if(!busy)return;const start=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[busy]);
  const unlimited = Boolean(user?.unlimitedTokens);
  const currentJobs = videos.filter(job => job.thread_id === threadId);
  const job = currentJobs[0];
  const working = job && active(job.status);

  useEffect(() => window.aievDesktop?.onActivity?.(event=>{if(event.type==='status' && event.data.cancellable===false && event.requestId!==activeRequest.current)setNativeStage(event.data.label || '');}), []);
  useEffect(() => { setBrowserReady(browserSupported()); setDevice(window.aievDesktop ? window.aievDesktop.platform || 'windows' : /AIEV(?:Desktop|iOS)\//.test(navigator.userAgent) ? 'disconnected' : 'web'); return () => { abortChat.current?.abort(); }; }, []);
  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.has("google")) setModal("auth");
    const shared = ["share_title", "share_text", "share_url"].map(key => parameters.get(key)).filter(Boolean).join("\n").slice(0, 16000);
    if (shared) { setText(shared); window.history.replaceState(null, "", "/studio"); }
  }, []);

  useEffect(() => {
    let live = true;
    customerApi<StudioConfig>("/config").then(value => { if (live) setConfig(value); }).catch(() => { if (live) setError("Chưa kết nối được dịch vụ. Hãy thử tải lại trang."); });
    customerApi<CustomerUser>("/me").then(value => { if (live) setUser(value); }).catch(reason => { if (live && (!(reason instanceof StudioApiError) || reason.status !== 401)) setError("Chưa kết nối được dịch vụ."); });
    return () => { live = false; };
  }, []);
  useEffect(()=>{const status=(event:Event)=>setNativeStage((event as CustomEvent<string>).detail);const failure=(event:Event)=>setError((event as CustomEvent<string>).detail);window.addEventListener('aiev-browser-stage',status);window.addEventListener('aiev-browser-error',failure);return()=>{window.removeEventListener('aiev-browser-stage',status);window.removeEventListener('aiev-browser-error',failure);};},[]);
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const sequence = ++refreshSequence.current;
    const [account, recent, jobs, funds, conversation] = await Promise.all([
      customerApi<CustomerUser>("/me"), customerApi<Thread[]>("/threads"), customerApi<VideoJob[]>("/videos"), customerApi<Wallet>("/wallet"),
      threadId ? customerApi<{ messages: Message[] }>(`/threads/${threadId}`) : Promise.resolve({ messages: [] as Message[] }),
    ]);
    if (sequence !== refreshSequence.current) return;
    setUser(account); setThreads(recent); setVideos(jobs); setWallet(funds); if(!sending.current && !failedTurn.current) setMessages(conversation.messages);
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
  useEffect(() => { if(pinned.current && conversation.current) conversation.current.scrollTop=conversation.current.scrollHeight; }, [messages,liveReply,activity]);
  function openWallet() { setModal(user ? "wallet" : "auth"); }
  function newChat() { if(sending.current) return; failedTurn.current=false;setRetry(null); setLiveReply(""); setThreadId(null); setMessages([]); setText(""); setDrive(""); setError(""); input.current?.focus(); }
  async function submit(reuse?: {message:string;requestId:string;threadId?:string}) {
    if(sending.current || busy) return;
    const message=reuse?.message || [text.trim(),drive.trim()].filter(Boolean).join('\n');
    if(!message) return;
    if(!user) {setModal('auth');return;}
    sending.current=true; refreshSequence.current++; pinned.current=true;
    const request=reuse || {message,requestId:crypto.randomUUID(),...(threadId?{threadId}:{})};
    activeRequest.current=request.requestId;
    const controller=new AbortController(); abortChat.current=controller;
    setBusy(true);setError('');setRetry(null);setLiveReply('');setActivity('Đang gửi yêu cầu…');setCanStop(!window.aievDesktop || Boolean(window.aievDesktop.cancelChat));
    if(!reuse)setMessages(previous=>[...previous,{role:'user',content:message,created_at:Date.now()}]);
    setText('');setDrive('');setShowDrive(false); input.current?.focus();
    let received=false;
    try {
      const result=await customerChat(request,event=>{
        if(event.type==='accepted' && event.data.threadId){request.threadId=event.data.threadId;setThreadId(event.data.threadId);setCanStop(!window.aievDesktop || Boolean(window.aievDesktop.cancelChat));}
        if(event.type==='status'){setActivity(event.data.label || 'Đang xử lý');if(event.data.cancellable===false)setCanStop(false);}
        if(event.type==='reply'){setLiveReply(event.data.text || '');setActivity('AI đang trả lời');}
      },controller.signal);
      received=true;failedTurn.current=false;setThreadId(result.threadId);if(result.localError)setError(result.localError);
      const latest=await customerApi<{messages:Message[]}>('/threads/'+result.threadId);setMessages(latest.messages);setLiveReply('');
    } catch(reason) {
      if(received){setError('Yêu cầu đã gửi thành công; đang đồng bộ lịch sử.');setLiveReply('');return;}
      setError(controller.signal.aborted ? 'Đã dừng trả lời. Bạn có thể thử lại tin nhắn.' : reason instanceof Error?reason.message:'Không gửi được tin nhắn');failedTurn.current=true;setRetry(request);
    } finally {activeRequest.current=null;sending.current=false;abortChat.current=null;setBusy(false);setCanStop(false);setActivity('');}
  }
  async function send(event: FormEvent) {event.preventDefault();await submit();}
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
      <button className="studio-new" disabled={busy} onClick={newChat}><Plus size={20} />Cuộc trò chuyện mới</button>
      <nav aria-label="Điều hướng"><button onClick={() => setModal(user ? "videos" : "auth")}><Video size={20} />Video của tôi</button><button onClick={openWallet}><WalletIcon size={20} />Ví token</button></nav>
      {user?.role === "admin" ? <a className="studio-admin-button studio-secondary" href="/studio/admin"><Shield size={18} />Quản trị</a> : null}
      {user ? <button className="studio-password-button studio-text-button" aria-label="Đổi mật khẩu" onClick={() => setModal("password")}><KeyRound size={18} /><span>Đổi mật khẩu</span></button> : null}
      <div className="studio-recent"><h2>Gần đây</h2>{threads.length ? threads.map(thread => <button key={thread.id} disabled={busy} aria-current={threadId === thread.id ? "page" : undefined} onClick={() => { failedTurn.current=false;setRetry(null);setLiveReply("");setThreadId(thread.id);setMessages([]); setError(""); }}>{thread.title}</button>) : <p>Chưa có video</p>}</div>
      <div className="studio-account"><button className="studio-secondary" aria-label={user?.name || "Đăng nhập"} onClick={() => setModal(user ? "account" : "auth")}><UserRound size={20} /><span>{user?.name || "Đăng nhập"}</span></button>{user ? <button className="studio-icon" aria-label="Đăng xuất" disabled={busy} onClick={() => { void logout().catch(() => setError("Không đăng xuất được")); }}><LogOut size={18} /></button> : null}</div>
    </aside>
    <main className="studio-main">
      <header className="studio-header"><div><h1>Trợ lý sáng tạo AI</h1><p>Từ ý tưởng đến video, trong một cuộc trò chuyện</p><small className={'studio-device '+(device==='disconnected'?'is-error':'' )}>{['windows','macos','ios','linux'].includes(device)?<Monitor size={13}/>:<Globe size={13}/>} {device==='windows'?'App Windows · Dựng tại máy':device==='macos'?'App Mac · Dựng tại máy':device==='ios'?'App iPhone/iPad · Dựng tại thiết bị':device==='linux'?'App Linux':device==='disconnected'?'App chưa kết nối bộ dựng':browserReady?'Trình duyệt · Dựng tại thiết bị':'Trình duyệt · Chat với AI'}</small></div><button className="studio-text-button" aria-label="Mẫu video" onClick={()=>setModal("templates")}><Film size={20}/><span>Mẫu video</span></button><InstallApp /><button className="studio-text-button" aria-label="Hướng dẫn" onClick={() => setModal("help")}><CircleHelp size={20} /><span>Hướng dẫn</span></button><button className="studio-mobile-wallet studio-icon" aria-label="Video của tôi" onClick={() => setModal(user ? "videos" : "auth")}><Video size={20} /></button><button className="studio-mobile-wallet studio-icon" aria-label="Mở ví token" onClick={openWallet}><WalletIcon size={22} /></button></header>
      <section ref={conversation} onScroll={event=>{const element=event.currentTarget;pinned.current=element.scrollHeight-element.scrollTop-element.clientHeight<100;}} className="studio-conversation" aria-label="Cuộc trò chuyện">
        {messages.length ? <div className="studio-messages" role="log" aria-live="polite">{messages.map((message, index) => <div key={`${message.created_at}-${index}`} className={`studio-message ${message.role === "user" ? "from-user" : "from-ai"}`}><span className="studio-message-label">{message.role === "user" ? "Bạn" : "AIEV"}</span><ChatContent content={message.content}/></div>)}
          {liveReply || busy ? <div className="studio-message from-ai studio-live"><span className="studio-message-label">AIEV</span>{liveReply ? <ChatContent content={liveReply}/> : null}{busy ? <div className="studio-chat-activity" role="status"><span className="studio-activity-dot"/><span>{activity || 'Đang xử lý…'}{elapsed>0 ? <small> · {elapsed}s</small> : null}</span></div> : <small>Phản hồi chưa hoàn tất</small>}</div> : null}
          {["awaiting_confirmation", "local_running"].includes(job?.status || "") ? <div className="studio-quote"><strong>{unlimited ? "Miễn token cho quản trị" : `${number(job.tokens)} token cho lượt dựng này`}</strong><p>Video nguồn: {Math.ceil(job.duration)} giây. {unlimited ? `Chi phí ước tính: ${number(job.tokens)} token · Không trừ số dư.` : `Số dư: ${number(user?.balance || 0)} token.`}</p><button className="studio-primary" disabled={busy || !config?.aiReady} onClick={confirm}>{busy ? "Đang bắt đầu…" : job.status === "local_running" ? "Tiếp tục dựng trên máy" : "Xác nhận dựng video"}</button>{!config?.aiReady ? <small>Dịch vụ AI đang được cấu hình; bạn chưa bị trừ token.</small> : null}</div> : null}
          {working ? <p className="studio-job-stage"><LoaderCircle className="studio-spin" size={18} />{nativeStage || job.stage}</p> : null}
          {["done", "local_running"].includes(job?.status || "") ? <div className="studio-mobile-result studio-result"><VideoResult job={job!} pendingLabel={nativeStage || job?.stage} /></div> : null}<div ref={messagesEnd} /></div> : <div className="studio-welcome"><h2>Bạn muốn sáng tạo gì hôm nay?</h2><p>Trao đổi ý tưởng, viết kịch bản và content ngay trong chat — chưa cần chọn video.</p><p>{config?.processingMode === "local" ? browserReady ? "Chọn video hoặc thư mục ở dưới khung chat, rồi nói với AI cách bạn muốn dựng. Web xử lý video ngay trên thiết bị và xuất MP4; không cần cài app." : "Chat với AI để chuẩn bị yêu cầu. Mở web trong Chrome/Edge để chọn video và dựng ngay trên thiết bị, hoặc dùng app Windows." : "Dán link Google Drive và mô tả video bạn muốn. Tôi sẽ lo phần dựng."}</p><div className="studio-examples">{examples.map((example, index) => <button key={example} onClick={() => { setText(example); input.current?.focus(); }}>{index === 0 ? <Scissors size={22} /> : index === 1 ? <Captions size={22} /> : <Video size={22} />}<span>{example}</span></button>)}</div></div>}
      </section>
      <div className="studio-compose-area">
        {user?<MediaLibraryPanel owner={user.id} chatBusy={busy}/>:null}
        {error ? <div className="studio-error" role="alert">{error}{retry ? <button type="button" className="studio-retry" disabled={busy} onClick={()=>{void submit(retry);}}><RotateCcw size={15}/>Thử lại tin nhắn</button> : null}</div> : null}
        <form className="studio-compose" onSubmit={send}><textarea ref={input} aria-label="Nhắn cho AI" placeholder="Trao đổi ý tưởng, viết kịch bản, content hoặc yêu cầu dựng video…" value={text} onChange={event => setText(event.target.value)} maxLength={7000} rows={2} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          {showDrive ? <label className="studio-drive-input">Link file hoặc thư mục Google Drive<input type="url" placeholder="https://drive.google.com/…" value={drive} onChange={event => setDrive(event.target.value)} maxLength={1000} /></label> : null}
          <div className="studio-compose-actions"><button type="button" className="studio-icon" aria-label="Thêm link Google Drive" aria-expanded={showDrive} onClick={() => setShowDrive(!showDrive)}><Paperclip size={21} /></button>{busy && canStop ? <button type="button" className="studio-send" aria-label="Dừng trả lời" onClick={()=>{setCanStop(false);setActivity('Đang dừng trả lời…');abortChat.current?.abort();}}><Square size={18} fill="currentColor"/></button> : <button className="studio-send" aria-label="Gửi yêu cầu" disabled={busy || (!text.trim() && !drive.trim())}>{busy ? <LoaderCircle className="studio-spin" size={22} /> : <Send size={22} />}</button>}</div>
        </form><p className="studio-compose-note"><Info size={15} />{unlimited ? "Miễn token cho quản trị · Chat và dựng video không trừ số dư." : "Chat: 1 token/tin nhắn. Dựng: báo giá trước khi xác nhận."}</p>
      </div>
    </main>
    <aside className="studio-output"><h2>Video của bạn</h2>{["done", "local_running"].includes(job?.status || "") ? <div className="studio-result"><VideoResult job={job!} pendingLabel={nativeStage || job?.stage} /><p>{unlimited ? "Miễn token cho quản trị" : `${job!.tokens} token`} · {job?.status === "done" ? "Video đã hoàn tất" : "Đang dựng tại thiết bị"}</p></div> : <div className="studio-preview-empty"><Film size={48} strokeWidth={1.5} /><p>{working ? nativeStage || job.stage : job?.status === "failed" ? "Video chưa hoàn tất" : "Video sẽ xuất hiện tại đây"}</p>{job?.status === "failed" ? <small>{job.error}</small> : null}</div>}
      <div className="studio-balance"><h3>Số dư</h3><p>{unlimited ? "Không giới hạn" : <>{number(user?.balance || 0)} <span>token</span></>}</p><button className="studio-primary" onClick={openWallet}>{unlimited ? "Lịch sử sử dụng" : "Nạp token"}</button><small>{unlimited ? "Miễn token cho quản trị. Chat, dựng và sửa tiếp không trừ số dư." : "Dựng trên máy bạn. Lỗi trước khi nhận kế hoạch AI được hoàn token; có kế hoạch thì thử dựng lại miễn phí."}</small></div>
    </aside>
    {modal ? <StudioModal title={modal === "templates" ? "Thư viện mẫu video" : modal === "auth" || modal === "account" ? "Tài khoản của bạn" : modal === "wallet" ? "Ví token" : modal === "videos" ? "Video của tôi" : modal === "password" ? "Đổi mật khẩu" : "Làm video bằng một cuộc trò chuyện"} close={() => setModal(null)}>
      {modal === "templates" ? <TemplateGallery select={prompt=>{setText(prompt);setModal(null);input.current?.focus();}}/> : null}
      {modal === "account" && user ? <div className="studio-form"><p>{user.name}<br />{user.email}</p>{user.role === "admin" ? <><p className="studio-success">Quản trị · Token không giới hạn</p><a className="studio-secondary" href="/studio/admin"><Shield size={18} />Quản trị</a></> : null}<button className="studio-secondary" onClick={() => setModal("password")}><KeyRound size={18} />Đổi mật khẩu</button><button className="studio-secondary" onClick={openWallet}><WalletIcon size={18} />Ví token</button></div> : null}
      {modal === "password" && user ? <PasswordForm /> : null}
      {modal === "auth" ? <AuthForm success={account => { if (account.role === "admin") { window.location.assign("/studio/admin"); return; } setUser(account); setModal(null); setError(""); }} /> : modal === "wallet" ? <WalletPanel unlimitedTokens={unlimited} config={config} wallet={wallet} order={order} setOrder={setOrder} /> : modal === "videos" ? <div className="studio-video-list">{videos.length ? videos.map(video => <button key={video.id} className="studio-secondary" disabled={busy} onClick={() => { failedTurn.current=false;setRetry(null);setLiveReply("");setMessages([]);setThreadId(video.thread_id); setModal(null); }}><Video size={20} /><span>{threads.find(thread => thread.id === video.thread_id)?.title || "Video của bạn"}<small>{video.stage}</small></span></button>) : <p>Chưa có video. Bắt đầu bằng cách nhắn cho AI và dán link Drive.</p>}</div> : modal === "help" ? <div className="studio-help"><ol><li>Đăng ký hoặc đăng nhập tài khoản.</li><li>Chọn video hoặc thư mục trên máy. Với Drive, tải nguồn về rồi chọn trong web; app Windows hỗ trợ tải trực tiếp từ Drive.</li><li>Mô tả cách chỉnh: chọn đoạn hay, đổi khung hình, thêm phụ đề hoặc bỏ khoảng lặng.</li><li>{unlimited ? "Quản trị được miễn token; xác nhận để bắt đầu dựng." : "Xem báo giá token, nạp qua chuyển khoản MB và xác nhận để bắt đầu."}</li><li>Xem video, tải MP4 hoặc nhắn tiếp để chỉnh thêm.</li></ol><p>Có thể dùng một file hoặc thư mục chứa nhiều video, kể cả thư mục con. {config ? config.maxMinutes > 0 || config.maxMegabytes > 0 ? `Giới hạn cấu hình: ${config.maxMinutes > 0 ? `${config.maxMinutes} phút` : "không giới hạn thời lượng"}, ${config.maxMegabytes > 0 ? `${config.maxMegabytes} MB` : "không giới hạn dung lượng file"}.` : "Không đặt giới hạn cố định về dung lượng file hoặc thời lượng. Video lớn hoặc dài được báo giá theo token." : "Đang tải cấu hình dịch vụ."} Bật quyền chia sẻ và tải xuống cho bất kỳ ai có đường liên kết.</p><p>Chi phí: {config?.baseTokens ?? 10} token mỗi lượt + {config?.tokensPerMinute ?? 20} token mỗi phút nguồn (làm tròn lên) + {config?.tokensPerGiB ?? 10} token mỗi GiB nguồn (làm tròn chi phí lên token nguyên). Hệ thống báo tổng trước khi bạn xác nhận. Web và app dựng video tại thiết bị; máy chủ quản lý tài khoản, token và kết nối AI. Web xuất MP4 720p, cần giữ tab mở. Trình duyệt có giới hạn bộ nhớ; dùng app Windows khi nguồn quá lớn. Âm thanh lời thoại được gửi tới dịch vụ AI để nhận diện, video gốc không tải lên VPS. iPhone/iPad nhận MP4/MOV/M4V và cần giữ app trên màn hình khi dựng. Video xuất nằm trên thiết bị đã dựng, chưa đồng bộ sang thiết bị khác. Nếu AI chưa trả kế hoạch và xử lý thất bại, token được hoàn. Đã nhận kế hoạch thì có thể thử dựng lại miễn phí, không hoàn phí AI. Máy bạn cần đủ chỗ lưu nguồn và file xuất.</p><p>Nếu yêu cầu hiệu ứng ngoài khả năng hiện tại, hãy mô tả rõ để được hỗ trợ trước khi dựng.</p></div> : null}
    </StudioModal> : null}
  </div>;
}
