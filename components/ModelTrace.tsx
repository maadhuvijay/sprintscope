"use client";

import { useState } from "react";
import { Copy, ChevronDown, CheckCircle2, AlertCircle, Database, Clock, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ModelTrace() {
  const [activeTab, setActiveTab] = useState<"SQL" | "Results">("SQL");
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [executionOpen, setExecutionOpen] = useState(true);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em]">Model Trace</h2>
        <div className="flex bg-white/5 p-1 rounded-lg">
          {(["SQL", "Results"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200",
                activeTab === tab 
                  ? "bg-neon-purple/20 text-neon-purple shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        {/* Main Content Area (SQL or Results) */}
        <div className="flex-1 glass-card rounded-xl overflow-hidden flex flex-col relative">
          {activeTab === "SQL" ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  </div>
                  <span className="text-[10px] font-mono text-white/30 ml-2">query_v1.sql</span>
                </div>
                <button className="p-1.5 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed no-scrollbar">
                <pre className="text-white/90">
                  <span className="text-neon-pink">SELECT</span>{"\n"}
                  {"  "}s.sprint_name,{"\n"}
                  {"  "}COUNT(i.id) <span className="text-neon-pink">AS</span> issue_count,{"\n"}
                  {"  "}SUM(i.story_points) <span className="text-neon-pink">AS</span> total_points{"\n"}
                  <span className="text-neon-pink">FROM</span> sprints s{"\n"}
                  <span className="text-neon-pink">JOIN</span> issues i <span className="text-neon-pink">ON</span> i.sprint_id = s.id{"\n"}
                  <span className="text-neon-pink">WHERE</span> s.status = <span className="text-neon-amber">'ACTIVE'</span>{"\n"}
                  <span className="text-neon-pink">GROUP BY</span> s.sprint_name{"\n"}
                  <span className="text-neon-pink">ORDER BY</span> total_points <span className="text-neon-pink">DESC</span>{"\n"}
                  <span className="text-neon-pink">LIMIT</span> <span className="text-neon-amber">10</span>;
                </pre>
              </div>
              <div className="px-4 py-2 bg-emerald-500/5 border-t border-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500/80 font-medium uppercase tracking-wider">Safety Check Passed</span>
                </div>
                <div className="flex gap-3 text-[10px] text-white/30 font-mono">
                  <span>SELECT-only</span>
                  <span>LIMIT applied</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
               <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                 <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Query Results</span>
                 <button className="text-[10px] text-neon-cyan hover:underline underline-offset-4 uppercase font-bold tracking-widest">
                   Export CSV
                 </button>
               </div>
               <div className="flex-1 overflow-auto no-scrollbar">
                 <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-[#0B0F2A] z-10">
                     <tr className="border-b border-white/10">
                       <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Sprint Name</th>
                       <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Issues</th>
                       <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Points</th>
                     </tr>
                   </thead>
                   <tbody className="text-xs text-gray-300 divide-y divide-white/5">
                     {[
                       { name: "Sprint 42", issues: 24, points: 86 },
                       { name: "Sprint 41", issues: 18, points: 72 },
                       { name: "Sprint 40", issues: 22, points: 68 },
                       { name: "Sprint 39", issues: 15, points: 54 },
                     ].map((row, i) => (
                       <tr key={i} className="hover:bg-white/5 transition-colors group">
                         <td className="px-4 py-3 text-neon-cyan font-medium">{row.name}</td>
                         <td className="px-4 py-3 text-right">{row.issues}</td>
                         <td className="px-4 py-3 text-right">{row.points}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               <div className="p-3 border-t border-white/5 flex items-center justify-between">
                 <span className="text-[10px] text-white/30">Showing 1-4 of 4 results</span>
                 <div className="flex gap-2">
                    <button className="p-1 text-white/20 hover:text-white transition-colors"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                    <button className="p-1 text-white/20 hover:text-white transition-colors"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Accordion Sections */}
        <div className="space-y-2">
          {/* Assumptions */}
          <div className="glass-card rounded-xl overflow-hidden">
            <button 
              onClick={() => setAssumptionsOpen(!assumptionsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-white/60 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-neon-purple" />
                <span className="text-xs font-bold uppercase tracking-widest">Assumptions</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", assumptionsOpen ? "rotate-180" : "")} />
            </button>
            <AnimatePresence>
              {assumptionsOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {[
                      "Filtering for issues associated with active sprints only",
                      "Excluding sub-tasks from the issue count",
                      "Using 'story_points' as the primary metric for capacity"
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="w-1 h-1 rounded-full bg-neon-purple mt-1.5 shrink-0" />
                        <span className="text-[11px] text-gray-400 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Execution */}
          <div className="glass-card rounded-xl overflow-hidden">
            <button 
              onClick={() => setExecutionOpen(!executionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-white/60 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-neon-amber" />
                <span className="text-xs font-bold uppercase tracking-widest">Execution</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", executionOpen ? "rotate-180" : "")} />
            </button>
            <AnimatePresence>
              {executionOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                    <ExecutionItem icon={<CheckCircle2 className="w-3 h-3 text-neon-amber" />} label="Status" value="Success" />
                    <ExecutionItem icon={<Hash className="w-3 h-3 text-neon-amber" />} label="Rows" value="4" />
                    <ExecutionItem icon={<Clock className="w-3 h-3 text-neon-amber" />} label="Runtime" value="12ms" />
                    <ExecutionItem icon={<Database className="w-3 h-3 text-neon-amber" />} label="DB" value="Supabase" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutionItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
      {icon}
      <div className="flex flex-col">
        <span className="text-[8px] text-white/30 uppercase font-bold tracking-tighter">{label}</span>
        <span className="text-[10px] text-gray-200 font-mono">{value}</span>
      </div>
    </div>
  );
}
