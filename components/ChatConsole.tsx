"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Hourglass } from "lucide-react";
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
  isLoading?: boolean;
}

export function ChatConsole({ messages, onSuggestionClick, isLoading }: ChatConsoleProps) {
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
                {message.isInitial ? "Try asking something like:" : "If you'd like, I can:"}
              </p>
              <ul className="space-y-2">
                {((message.isInitial
                  ? [
                      "What issues are blocked in the current sprint?",
                      "Show all issues assigned to Team ACCEL",
                      "Which users have the most open issues?",
                      "What issues are in QA status for Team ACCEL?",
                      "Show issues completed in the last two weeks?"
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
      
      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="glass-card neon-border-purple mr-auto max-w-[95%] rounded-xl p-5"
          >
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-neon-purple animate-spin" />
                <div className="absolute inset-0 bg-neon-purple/30 rounded-full blur-lg animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-200">Working on it...</p>
                  <Hourglass className="w-4 h-4 text-neon-cyan animate-pulse" />
                </div>
                <p className="text-xs text-gray-400">Analyzing your data and generating response</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssistantText({ content }: { content: string }) {
  // Remove "If you'd like" section as it's handled separately
  const mainContent = content.split(/If you'd like, I can:/i)[0].trim();
  
  // Split content into paragraphs (double newlines)
  const paragraphs = mainContent.split(/\n\n+/).filter(p => p.trim());
  
  // If no double newlines, try to split by sentence boundaries for long paragraphs
  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    // Split long paragraph into sentences, but keep related sentences together
    const sentences = paragraphs[0].split(/(?<=[.!?])\s+(?=[A-Z])/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    sentences.forEach((sentence, idx) => {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      // Break into chunks of 2-3 sentences or at natural breaks
      if (idx % 2 === 1 || sentence.endsWith('.')) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    });
    
    if (currentChunk) chunks.push(currentChunk);
    
    return (
      <div className="space-y-3">
        {chunks.map((chunk, idx) => (
          <p key={idx} className="leading-relaxed">
            {formatInlineText(chunk)}
          </p>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, pIdx) => {
        const trimmed = paragraph.trim();
        
        // Split by single newlines for line breaks within paragraphs
        const lines = trimmed.split(/\n/).filter(l => l.trim());
        
        return (
          <div key={pIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              // Check if line contains bullet points or numbered lists
              if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 ml-2">
                    <span className="text-neon-cyan mt-1.5">•</span>
                    <span className="leading-relaxed">{formatInlineText(line.replace(/^[-•*]\s|\d+\.\s/, ''))}</span>
                  </div>
                );
              }
              
              // Regular paragraph line
              return (
                <p key={lIdx} className="leading-relaxed">
                  {formatInlineText(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatInlineText(text: string) {
  // Split by markdown bold (**text**), issue keys, and other patterns
  const patterns = [
    /(\*\*.*?\*\*)/g,  // Bold text
    /([A-Z]+-\d+)/g,   // Issue keys like ACCEL-0013
    /(\d+\s+story\s+points?)/gi,  // Story points
    /(priority\s+p\d+)/gi,  // Priority
  ];
  
  // Combine all patterns
  const combinedPattern = new RegExp(
    patterns.map(p => p.source).join('|'),
    'gi'
  );
  
  const parts = text.split(combinedPattern).filter(p => p);
  
  return (
    <>
      {parts.map((part, i) => {
        // Bold text
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={i} className="text-neon-pink font-medium">
              {part.slice(2, -2)}
            </span>
          );
        }
        // Issue keys
        if (part.match(/^[A-Z]+-\d+$/)) {
          return (
            <span key={i} className="text-neon-cyan font-mono font-semibold">
              {part}
            </span>
          );
        }
        // Story points
        if (part.match(/\d+\s+story\s+points?/i)) {
          return (
            <span key={i} className="text-neon-amber font-medium">
              {part}
            </span>
          );
        }
        // Priority
        if (part.match(/priority\s+p\d+/i)) {
          return (
            <span key={i} className="text-neon-purple font-medium">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
