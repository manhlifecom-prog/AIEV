"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { StudioModal } from "./StudioModal";
import { DesktopUpdate } from './DesktopUpdate';
import { browserSupported } from './browser-engine';
import { appDownloads, type AppDownloads } from './app-downloads';
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null), [open, setOpen] = useState(false), [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState("other");
  const [desktopVersion,setDesktopVersion]=useState<string|null>(null);
  const [downloads, setDownloads] = useState<AppDownloads | null>(null);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const detect = () => {setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone) || /AIEV(Desktop|Android|iOS)\//.test(navigator.userAgent));setDesktopVersion(window.aievDesktop?.version || navigator.userAgent.match(/AIEVDesktop\/([\d.]+)/)?.[1] || null);};
    detect();
    setPlatform(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(navigator.userAgent) ? "android" : /Windows/.test(navigator.userAgent) ? "windows" : /Mac/.test(navigator.userAgent) ? "macos" : "other");
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const complete = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    window.addEventListener("beforeinstallprompt", available); window.addEventListener("appinstalled", complete); standalone.addEventListener("change", detect);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/studio/sw.js", { scope: "/studio", updateViaCache: "none" }).catch(() => {});
    let live = true;
    void fetch("/studio/apps.json", {cache:'no-store'}).then(response => response.ok ? response.json() : null).then(value => { if (live) setDownloads(appDownloads(value)); }).catch(() => {});
    return () => { live = false; window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", complete); standalone.removeEventListener("change", detect); };
  }, []);
  async function install() {
    if (!prompt) return;
    await prompt.prompt(); const result = await prompt.userChoice; setPrompt(null); if (result.outcome === "accepted") setOpen(false);
  }
  const needsUpdate=Boolean(desktopVersion && (desktopVersion !== (platform==='macos'?'0.6.0':downloads?.version || '1.2.1') || !window.aievDesktop));
  const needsRenderer=installed && ['windows','macos','ios'].includes(platform) && !window.aievDesktop && !browserSupported();
  if (typeof window!=='undefined' && window.aievDesktop?.update && window.aievDesktop?.onUpdate) return <DesktopUpdate/>;
  if (installed && !needsUpdate && !needsRenderer) return null;
  const nativeLabel=platform==='macos'?'Mac':platform==='ios'?'iPhone/iPad':'Windows';
  return <>
    <button className="studio-text-button studio-install" aria-label={needsUpdate ? "Cập nhật app" : needsRenderer ? "Bộ dựng "+nativeLabel : "Cài ứng dụng"} onClick={() => setOpen(true)}><Download size={20}/><span>{needsUpdate ? "Cập nhật app" : needsRenderer ? "Bộ dựng "+nativeLabel : "Cài app"}</span></button>
    {open ? <StudioModal title="Cài AIEV Studio" close={() => setOpen(false)}><div className="studio-form studio-install-guide">
      <p>{needsRenderer ? "Web có thể dựng và xuất MP4 ngay trên thiết bị. App Windows phù hợp nguồn lớn; Android 0.2.0 có bộ chọn video trên điện thoại." : "Tài khoản, token và cuộc trò chuyện dùng chung. Video nguồn và bản xuất được lưu trên thiết bị đã dựng."}</p>
      {needsUpdate ? <p>Bản Windows hiện tại chưa có bộ tự cập nhật. Cài bản 1.2.1 một lần để bật nút Cập nhật và tải bản mới tự động về sau. Đóng app trước khi chạy bộ cài; tài khoản và video được giữ lại.</p> : null}
      {downloads ? <div className="studio-app-downloads">
        <a className="studio-secondary" href={downloads.windows} target="_blank" rel="noopener noreferrer"><Download size={18}/>Windows · Tải EXE</a>
        <small>Windows 10/11 64-bit · Bản 1.2.1 tự cập nhật, xem trước ngay trong Studio và xuất Full HD. Cài xong mở AIEV Studio từ Start Menu. Bộ cài hiện chưa có chữ ký nhà phát hành.</small>
        <h3>MacBook / iMac</h3>
        {downloads.apple?.macos?.arm64 || downloads.apple?.macos?.x64 ? <>
          {downloads.apple.macos.arm64 ? <a className="studio-secondary" href={downloads.apple.macos.arm64} target="_blank" rel="noopener noreferrer"><Download size={18}/>Mac chip M · Tải DMG</a> : null}
          {downloads.apple.macos.x64 ? <a className="studio-secondary" href={downloads.apple.macos.x64} target="_blank" rel="noopener noreferrer"><Download size={18}/>Mac Intel · Tải DMG</a> : null}
          <small>macOS 13 trở lên · Các DMG bên trên là bản 0.6.0 chưa có xác thực Apple. Bản chính thức 1.0.0 đang chờ chứng chỉ phát hành và xác thực Apple.</small>
        </> : <p>App Mac đang được kiểm thử; chưa có bản cài để tải.</p>}
        <h3>iPhone / iPad</h3>
        {downloads.apple?.ios?.testFlight ? <a className="studio-secondary" href={downloads.apple.ios.testFlight} target="_blank" rel="noopener noreferrer">Cài bản thử qua TestFlight</a> : <p>App iPhone/iPad chưa phát hành. Bạn có thể dùng web trên Safari trong lúc chờ bản cài. Dựng web cần đủ bộ nhớ và giữ tab mở.</p>}
        <h3>Android</h3><a className="studio-secondary" href={downloads.android} download><Download size={18}/>Android · Tải APK</a><small>Android 10 trở lên · Chọn video từ thư viện, chat và dựng trên thiết bị. Giữ app mở trong lúc dựng.</small>
      </div> : <p role="status">Chưa tải được danh sách bản cài. Đóng hướng dẫn rồi thử lại.</p>}
      {!needsRenderer ? <>
        <h3>Cài web trên màn hình</h3>
        {prompt ? <button className="studio-secondary" onClick={() => { void install(); }}>Cài ứng dụng web</button> : null}
        <p>{platform==='ios' ? "Safari → Chia sẻ → Thêm vào Màn hình chính. Web dựng trong trình duyệt; giữ màn hình mở khi xuất MP4." : "Chrome/Edge → menu → Cài ứng dụng. Web dùng máy của bạn để dựng video và xuất MP4."}</p>
      </> : null}
      <p>App có bộ dựng cần Internet để kết nối AI và quản lý token. Với iPhone/iPad, giữ app trên màn hình khi xuất video; thiết bị cần đủ chỗ lưu nguồn và MP4.</p>
    </div></StudioModal> : null}
  </>;
}
