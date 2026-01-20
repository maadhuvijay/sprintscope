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

  const handleRunQuery = async (query: string) => {
    // Add user message
    const userMessage: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build chat history (exclude initial message)
      const chatHistory = messages
        .filter(msg => !msg.isInitial)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Call API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          chatHistory: chatHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response || 'I apologize, but I encountered an error processing your request.'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error calling chat API:', error);
      const errorMessage: Message = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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

