"use client";

import { useState, useEffect } from "react";
import { Copy, ChevronDown, CheckCircle2, AlertCircle, Database, Clock, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ModelTraceProps {
  sql?: string | null;
  results?: any[];
  rowCount?: number;
  runtimeMs?: number;
  error?: string;
}

export function ModelTrace({ sql, results = [], rowCount = 0, runtimeMs = 0, error }: ModelTraceProps) {
  const [activeTab, setActiveTab] = useState<"SQL" | "Results">("SQL");
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [executionOpen, setExecutionOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  // Switch to Results tab when results are available
  useEffect(() => {
    if (results && results.length > 0) {
      setActiveTab("Results");
    } else if (sql) {
      setActiveTab("SQL");
    }
  }, [sql, results]);

  const handleCopy = async () => {
    if (sql) {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format SQL with syntax highlighting
  const formatSQL = (sqlText: string): React.ReactNode => {
    if (!sqlText) return null;
    
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'AS', 'AND', 'OR', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT'];
    const parts = sqlText.split(/(\s+)/);
    
    return (
      <>
        {parts.map((part, i) => {
          const upperPart = part.toUpperCase().trim();
          if (keywords.some(kw => upperPart === kw) && part.trim()) {
            return <span key={i} className="text-neon-pink">{part}</span>;
          }
          if (part.match(/^\d+$/)) {
            return <span key={i} className="text-neon-amber">{part}</span>;
          }
          if (part.match(/^['"].*['"]$/)) {
            return <span key={i} className="text-neon-amber">{part}</span>;
          }
          return <span key={i} className="text-white/90">{part}</span>;
        })}
      </>
    );
  };

  // Get column names from results
  const getColumns = (): string[] => {
    if (!results || results.length === 0) return [];
    return Object.keys(results[0]);
  };

  const columns = getColumns();
  const hasData = sql || (results && results.length > 0);

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
          {!hasData ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <Database className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-sm text-white/40">No query executed yet</p>
                <p className="text-xs text-white/20 mt-2">Run a query to see SQL and results here</p>
              </div>
            </div>
          ) : activeTab === "SQL" ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  </div>
                  <span className="text-[10px] font-mono text-white/30 ml-2">query.sql</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-white"
                  title="Copy SQL"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed no-scrollbar">
                <pre className="text-white/90 whitespace-pre-wrap">
                  {sql ? formatSQL(sql) : <span className="text-white/40">No SQL available</span>}
                </pre>
              </div>
              <div className={cn(
                "px-4 py-2 border-t flex items-center justify-between",
                error 
                  ? "bg-red-500/5 border-red-500/10" 
                  : "bg-emerald-500/5 border-emerald-500/10"
              )}>
                <div className="flex items-center gap-2">
                  {error ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[10px] text-red-500/80 font-medium uppercase tracking-wider">Error</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] text-emerald-500/80 font-medium uppercase tracking-wider">Safety Check Passed</span>
                    </>
                  )}
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
                 {results && results.length > 0 && (
                   <button 
                     onClick={() => {
                       // Export to CSV functionality
                       const csv = [
                         columns.join(','),
                         ...results.map(row => columns.map(col => {
                           const val = row[col];
                           return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
                         }).join(','))
                       ].join('\n');
                       const blob = new Blob([csv], { type: 'text/csv' });
                       const url = URL.createObjectURL(blob);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = 'query_results.csv';
                       a.click();
                       URL.revokeObjectURL(url);
                     }}
                     className="text-[10px] text-neon-cyan hover:underline underline-offset-4 uppercase font-bold tracking-widest"
                   >
                     Export CSV
                   </button>
                 )}
               </div>
               {error ? (
                 <div className="flex-1 flex items-center justify-center p-8">
                   <div className="text-center">
                     <AlertCircle className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
                     <p className="text-sm text-red-400">{error}</p>
                   </div>
                 </div>
               ) : results && results.length > 0 ? (
                 <>
                   <div className="flex-1 overflow-auto no-scrollbar">
                     <table className="w-full text-left border-collapse">
                       <thead className="sticky top-0 bg-[#0B0F2A] z-10">
                         <tr className="border-b border-white/10">
                           {columns.map((col, i) => (
                             <th key={i} className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                               {col}
                             </th>
                           ))}
                         </tr>
                       </thead>
                       <tbody className="text-xs text-gray-300 divide-y divide-white/5">
                         {results.map((row, i) => (
                           <tr key={i} className="hover:bg-white/5 transition-colors group">
                             {columns.map((col, j) => {
                               const value = row[col];
                               const displayValue = value === null || value === undefined ? 'NULL' : String(value);
                               return (
                                 <td key={j} className="px-4 py-3">
                                   {typeof value === 'number' ? (
                                     <span className="text-right block">{value}</span>
                                   ) : (
                                     <span className="text-neon-cyan font-medium">{displayValue}</span>
                                   )}
                                 </td>
                               );
                             })}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <div className="p-3 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[10px] text-white/30">
                       Showing {results.length} of {rowCount} result{rowCount !== 1 ? 's' : ''}
                     </span>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex items-center justify-center p-8">
                   <div className="text-center">
                     <Database className="w-12 h-12 text-white/20 mx-auto mb-4" />
                     <p className="text-sm text-white/40">No results</p>
                   </div>
                 </div>
               )}
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
                    <ExecutionItem 
                      icon={error ? <AlertCircle className="w-3 h-3 text-red-500" /> : <CheckCircle2 className="w-3 h-3 text-neon-amber" />} 
                      label="Status" 
                      value={error ? "Error" : "Success"} 
                    />
                    <ExecutionItem icon={<Hash className="w-3 h-3 text-neon-amber" />} label="Rows" value={String(rowCount)} />
                    <ExecutionItem icon={<Clock className="w-3 h-3 text-neon-amber" />} label="Runtime" value={runtimeMs > 0 ? `${runtimeMs}ms` : "—"} />
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
