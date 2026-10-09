"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Shell } from "./Shell";
import { LanguageProvider } from "@/lib/i18n";
import { EventsProvider } from "@/lib/useEvents";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/studio" || pathname.startsWith("/studio/")) return children;
  return <LanguageProvider><EventsProvider><Shell>{children}</Shell></EventsProvider></LanguageProvider>;
}
