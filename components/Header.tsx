"use client";

import { HelpCircle } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.5)]">
          <span className="text-[10px] font-bold text-white">SS</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          SprintScope
        </h1>
      </div>
      <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/60 hover:text-white">
        <HelpCircle className="w-5 h-5" />
      </button>
    </header>
  );
}
