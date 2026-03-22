"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Overlay({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={onClose} />

      {/* Panel */}
      <div className="animate-slideUp relative w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-[#0e0e12] border border-white/[0.06] shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.04]">
          <h2 className="text-lg font-bold text-white leading-tight pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-2 -mr-2 rounded-xl hover:bg-white/[0.04]"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-7 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
