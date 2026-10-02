"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function StudioModal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog className="studio-modal" ref={ref} aria-labelledby="studio-dialog-title" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="studio-modal-header"><h2 id="studio-dialog-title">{title}</h2><button aria-label="Đóng" className="studio-icon" onClick={close}><X size={20} /></button></div>{children}
  </dialog>;
}
