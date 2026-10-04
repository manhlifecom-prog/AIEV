"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { StudioModal } from "./StudioModal";
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null), [open, setOpen] = useState(false), [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState("other");
  const [downloads, setDownloads] = useState<{ windows: string; android: string } | null>(null);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const detect = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone) || /AIEV(Desktop|Android|iOS)\//.test(navigator.userAgent));
    detect();
    setPlatform(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "other");
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const complete = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    window.addEventListener("beforeinstallprompt", available); window.addEventListener("appinstalled", complete); standalone.addEventListener("change", detect);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/studio/sw.js", { scope: "/studio", updateViaCache: "none" }).catch(() => {});
    let live = true;
    void fetch("/studio/apps.json").then(response => response.ok ? response.json() : null).then(value => { if (live && value?.windows === "/studio/downloads/AIEV-Studio-Setup-0.4.0.exe" && value?.android === "/studio/downloads/AIEV-Studio-0.1.0.apk") setDownloads(value); }).catch(() => {});
    return () => { live = false; window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", complete); standalone.removeEventListener("change", detect); };
  }, []);
  async function install() {
    if (!prompt) return;
    await prompt.prompt(); const result = await prompt.userChoice; setPrompt(null); if (result.outcome === "accepted") setOpen(false);
  }
  if (installed) return null;
  return <><button className="studio-text-button studio-install" aria-label="Cài ứng dụng" onClick={() => setOpen(true)}><Download size={20} /><span>Cài app</span></button>{open ? <StudioModal title="Cài AIEV Studio" close={() => setOpen(false)}><div className="studio-form studio-install-guide"><p>Mở Studio từ biểu tượng trên màn hình. Tài khoản, token và lịch sử video dùng chung với website.</p>{prompt ? <button className="studio-primary" onClick={() => { void install(); }}><Download size={18} />Cài ứng dụng</button> : null}<>{downloads ? <div className="studio-app-downloads"><a className="studio-secondary" href={downloads.android} download><Download size={18} />Tải app Android · APK</a><a className="studio-secondary" href={downloads.windows} download><Download size={18} />Tải app Windows · EXE</a><small>Android 10 trở lên · Windows 10/11 64-bit</small></div> : null}</><h3>{platform === "ios" ? "Trên iPhone / iPad" : platform === "android" ? "Trên Android" : "Cài trên thiết bị của bạn"}</h3>{platform === "ios" ? <p>Mở trang này bằng Safari → Chia sẻ → Thêm vào Màn hình chính → Thêm.</p> : platform === "android" ? <p>Mở bằng Chrome → menu ⋮ → Cài ứng dụng hoặc Thêm vào màn hình chính.</p> : <p>Trong Chrome hoặc Edge, nhấn biểu tượng cài đặt ở thanh địa chỉ hoặc chọn menu → Cài AIEV Studio. Trên iPhone, dùng Safari → Chia sẻ → Thêm vào Màn hình chính.</p>}<p>Windows 0.4.0 tải và dựng video tại máy. Cần Internet để gọi AI và quản lý token. Android/iPhone hiện chỉ mở website, chưa dựng tại máy.</p></div></StudioModal> : null}</>;
}
