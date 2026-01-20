"use client";

import { useState } from "react";
import { Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onRunQuery: (query: string) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function Composer({ onRunQuery, onReset, isLoading }: ComposerProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onRunQuery(input);
      setInput("");
    }
  };

  return (
    <div className="p-6 border-t border-white/5 bg-white/[0.02]">
      <form onSubmit={handleSubmit} className="flex items-center gap-4 max-w-6xl mx-auto">
        <div className="flex-1 relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your sprint data..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-neon-purple/40 focus:ring-1 focus:ring-neon-purple/40 transition-all"
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-cyan opacity-0 group-focus-within:opacity-5 -z-10 transition-opacity blur-xl" />
        </div>
        
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 text-xs font-bold text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Session
          </button>
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 relative group overflow-hidden",
              input.trim() && !isLoading
                ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? "Running..." : "Run Query"}
              {!isLoading && <Send className="w-4 h-4" />}
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>
      </form>
    </div>
  );
}
