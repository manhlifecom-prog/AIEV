import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "Mạnh AI Studio | Chat để làm video", description: "Dán link Google Drive và trò chuyện với AI để dựng video.", manifest: "/studio/app.webmanifest", appleWebApp: { capable: true, title: "Mạnh AI Studio", statusBarStyle: "black-translucent" }, icons: { icon: "/studio/icon-192.png", apple: "/studio/apple-touch-icon.png" } };
export const viewport: Viewport = { themeColor: "#11131a", viewportFit: "cover" };
export default function StudioLayout({ children }: { children: ReactNode }) { return children; }
