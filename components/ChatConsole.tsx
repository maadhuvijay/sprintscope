"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  isInitial?: boolean;
  suggestions?: string[];
}

interface ChatConsoleProps {
  messages: Message[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatConsole({ messages, onSuggestionClick }: ChatConsoleProps) {
  const isInitialState = messages.length === 1 && messages[0].role === "assistant" && messages[0].isInitial;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Use setTimeout to ensure DOM has updated after message addition
      const timeoutId = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
    >
      {messages.map((message, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "rounded-xl p-5 relative",
            message.role === "user" 
              ? "glass-card neon-border-cyan ml-auto max-w-[90%]" 
              : "glass-card neon-border-purple mr-auto max-w-[95%]"
          )}
        >
          {message.role === "assistant" && (
            <div className="text-xs font-bold text-neon-purple uppercase tracking-widest mb-2 opacity-80">
              Assistant
            </div>
          )}
          
          <div className={cn(
            "text-[15px] leading-relaxed",
            message.role === "user" ? "text-white" : "text-gray-200"
          )}>
            {message.role === "assistant" ? (
              <AssistantText content={message.content} />
            ) : (
              message.content
            )}
          </div>

          {message.role === "assistant" && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                {isInitialState ? "Try asking something like:" : "If you'd like, I can:"}
              </p>
              <ul className="space-y-2">
                {((isInitialState 
                  ? [
                      "What issues are blocked in the current sprint?",
                      "How many stories were completed last sprint?",
                      "Which assignees have the most open issues?",
                      "Show bugs created in the last two weeks",
                      "What work is still in progress for Team ACCEL?"
                    ]
                  : message.suggestions && message.suggestions.length > 0
                    ? message.suggestions
                    : [
                        "Break this down by team",
                        "Compare with previous sprint",
                        "Export this view"
                      ]
                ) as string[]).map((suggestion, i) => (
                  <li 
                    key={i} 
                    className="flex items-center gap-3 group cursor-pointer"
                    onClick={() => onSuggestionClick?.(suggestion)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    <span className="text-sm text-gray-400 group-hover:text-neon-cyan transition-colors">
                      {suggestion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function AssistantText({ content }: { content: string }) {
  // Highlight keywords in content
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <p>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={i} className="text-neon-pink font-medium">
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      })}
    </p>
  );
}
