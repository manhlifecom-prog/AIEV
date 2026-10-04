"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { StudioModal } from "./StudioModal";
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
  const needsUpdate=Boolean(desktopVersion && (!['0.5.0','0.6.0'].includes(desktopVersion) || !window.aievDesktop));
  const needsRenderer=installed && ['windows','macos','ios'].includes(platform) && !window.aievDesktop;
  if (installed && !needsUpdate && !needsRenderer) return null;
  const nativeLabel=platform==='macos'?'Mac':platform==='ios'?'iPhone/iPad':'Windows';
  return <>
    <button className="studio-text-button studio-install" aria-label={needsUpdate ? "Cập nhật app" : needsRenderer ? "Bộ dựng "+nativeLabel : "Cài ứng dụng"} onClick={() => setOpen(true)}><Download size={20}/><span>{needsUpdate ? "Cập nhật app" : needsRenderer ? "Bộ dựng "+nativeLabel : "Cài app"}</span></button>
    {open ? <StudioModal title="Cài AIEV Studio" close={() => setOpen(false)}><div className="studio-form studio-install-guide">
      <p>{needsRenderer ? "Bạn đang dùng app web, có thể chat với AI. Để dựng trên thiết bị, cần bản cài có bộ dựng bên dưới." : "Tài khoản, token và cuộc trò chuyện dùng chung. Video nguồn và bản xuất được lưu trên thiết bị đã dựng."}</p>
      {needsUpdate ? <p>Đóng app trước khi cập nhật. Với app Windows/Mac cũ, chọn menu AIEV Studio → Mở bằng trình duyệt để tải bản mới. Tài khoản và video đã lưu được giữ lại.</p> : null}
      {downloads ? <div className="studio-app-downloads">
        <a className="studio-secondary" href={downloads.windows} target="_blank" rel="noopener noreferrer"><Download size={18}/>Windows · Tải EXE</a>
        <small>Windows 10/11 64-bit · Cài xong mở AIEV Studio từ Start Menu.</small>
        <h3>MacBook / iMac</h3>
        {downloads.apple?.macos?.arm64 || downloads.apple?.macos?.x64 ? <>
          {downloads.apple.macos.arm64 ? <a className="studio-secondary" href={downloads.apple.macos.arm64} target="_blank" rel="noopener noreferrer"><Download size={18}/>Mac chip M · Tải DMG</a> : null}
          {downloads.apple.macos.x64 ? <a className="studio-secondary" href={downloads.apple.macos.x64} target="_blank" rel="noopener noreferrer"><Download size={18}/>Mac Intel · Tải DMG</a> : null}
          <small>macOS 13 trở lên · Mở DMG, kéo AIEV Studio vào Applications rồi mở app. Bản thử chưa được Apple xác thực; macOS có thể yêu cầu mở trong Cài đặt hệ thống → Quyền riêng tư &amp; bảo mật.</small>
        </> : <p>App Mac đang được kiểm thử; chưa có bản cài để tải.</p>}
        <h3>iPhone / iPad</h3>
        {downloads.apple?.ios?.testFlight ? <a className="studio-secondary" href={downloads.apple.ios.testFlight} target="_blank" rel="noopener noreferrer">Cài bản thử qua TestFlight</a> : <p>App iPhone/iPad chưa phát hành. Bạn có thể chat bằng Safari trong lúc chờ bản cài có bộ dựng.</p>}
        <h3>Android</h3><a className="studio-secondary" href={downloads.android} download><Download size={18}/>Android · Tải APK</a><small>Android 10 trở lên · Hiện hỗ trợ chat, chưa dựng tại máy.</small>
      </div> : <p role="status">Chưa tải được danh sách bản cài. Đóng hướng dẫn rồi thử lại.</p>}
      {!needsRenderer ? <>
        <h3>Lối tắt chat trên màn hình</h3>
        {prompt ? <button className="studio-secondary" onClick={() => { void install(); }}>Cài lối tắt chat</button> : null}
        <p>{platform==='ios' ? "Safari → Chia sẻ → Thêm vào Màn hình chính. Lối tắt này dùng để chat; không có bộ dựng native." : "Chrome/Edge → menu → Cài ứng dụng. Đây là lối tắt web để chat với AI."}</p>
      </> : null}
      <p>App có bộ dựng cần Internet để kết nối AI và quản lý token. Với iPhone/iPad, giữ app trên màn hình khi xuất video; thiết bị cần đủ chỗ lưu nguồn và MP4.</p>
    </div></StudioModal> : null}
  </>;
}
