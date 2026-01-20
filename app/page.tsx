"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { ChatConsole } from "@/components/ChatConsole";
import { ModelTrace } from "@/components/ModelTrace";
import { Composer } from "@/components/Composer";

interface Message {
  role: "user" | "assistant";
  content: string;
  isInitial?: boolean;
}

export default function SprintScopePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to **SprintScope**. I'm ready to help you analyze your sprint data. What would you like to know?",
      isInitial: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunQuery = (query: string) => {
    // Add user message
    const userMessage: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const gibberish = generateGibberish();
      const assistantMessage: Message = { 
        role: "assistant", 
        content: `Based on the **sprint analysis**, I've found that ${gibberish}. The data suggests a **${Math.floor(Math.random() * 20) + 10}%** increase in velocity.` 
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Session reset. How can I help you today?",
        isInitial: true
      }
    ]);
  };

  return (
    <div className="h-screen flex flex-col relative z-10 overflow-hidden p-4 md:p-6 lg:p-8">
      {/* Outer rounded frame with neon border */}
      <div className="flex-1 flex flex-col glass-panel rounded-[24px] border border-neon-purple/30 shadow-[0_0_50px_rgba(236,72,153,0.1),0_0_30px_rgba(34,211,238,0.05)] overflow-hidden">
        
        <Header />

        <main className="flex-1 flex overflow-hidden">
          {/* Left Column: Chat Console */}
          <div className="w-[62%] border-r border-white/5 flex flex-col bg-white/[0.01]">
            <ChatConsole 
              messages={messages} 
              onSuggestionClick={handleRunQuery}
            />
          </div>

          {/* Right Column: Model Trace */}
          <div className="w-[38%] flex flex-col">
            <ModelTrace />
          </div>
        </main>

        <Composer onRunQuery={handleRunQuery} onReset={handleReset} isLoading={isLoading} />
      </div>
    </div>
  );
}

function generateGibberish() {
  const words = ["velocity", "sprint", "backlog", "burndown", "throughput", "alignment", "stakeholders", "refining", "increment", "agile", "scrum", "kanban", "deployment", "integration"];
  const count = Math.floor(Math.random() * 5) + 5;
  let result = "";
  for (let i = 0; i < count; i++) {
    result += words[Math.floor(Math.random() * words.length)] + (i === count - 1 ? "" : " ");
  }
  return result;
}
