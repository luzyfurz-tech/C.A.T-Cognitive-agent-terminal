import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Activity, Shield, Globe, Bot, User, Brain, ChevronRight, AlertCircle, CheckCircle2, Loader2, Zap, History, LayoutGrid, MessageSquare, Send } from 'lucide-react';

interface AgentLog {
  id: number;
  timestamp: string;
  agent_id: string;
  type: string;
  event: string;
  content: string;
  status: string;
  metadata: string;
}

interface MissionState {
  active_mission: string | null;
  global_vars: Record<string, any>;
  agent_statuses: Record<string, 'idle' | 'thinking' | 'working' | 'error'>;
  last_updated: string;
}

export default function CommandCenterView({ apiKey, onGlobalMessage }: { apiKey: string, onGlobalMessage?: (msg: string) => void }) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [state, setState] = useState<MissionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleGlobalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !onGlobalMessage) return;
    
    // Log the user's message to the database so it shows up in the feed immediately
    fetch('/api/mission/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        agent_id: 'user',
        type: 'directive',
        event: 'Global Directive Issued',
        content: input,
        status: 'Success'
      })
    }).catch(console.error);

    onGlobalMessage(input);
    setInput('');
    // Optimistically fetch data to show the new log
    setTimeout(fetchData, 500);
  };

  const fetchData = async () => {
    try {
      const [logsRes, stateRes] = await Promise.all([
        fetch('/api/mission/history?limit=50', {
          headers: { Authorization: `Bearer ${apiKey}` }
        }),
        fetch('/api/mission/state', {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
      ]);

      const logsData = await logsRes.json();
      const stateData = await stateRes.json();

      setLogs(logsData.logs || []);
      setState(stateData);
    } catch (error) {
      console.error("Failed to fetch command center data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [apiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'chat': return <Bot className="w-4 h-4" />;
      case 'webdesign': return <LayoutGrid className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'ollamaWeb': return <Globe className="w-4 h-4" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-brand animate-pulse';
      case 'thinking': return 'text-[#6EC8FF] animate-pulse';
      case 'error': return 'text-[#FF7A2F]';
      default: return 'text-text-muted';
    }
  };

  if (isLoading && !state) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0F1A] text-text-main font-mono overflow-hidden">
      {/* Header */}
      <div className="flex-none p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/20 rounded-xl">
              <Activity className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest">Mission Control</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-[0.3em]">Autonomous Agent Mesh Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-brand/70 uppercase tracking-widest">System Status</span>
              <span className="text-[10px] text-brand font-bold">OPERATIONAL</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Last Sync</span>
              <span className="text-[10px] text-text-muted">{new Date(state?.last_updated || '').toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Column: Agent Mesh Feed */}
        <div className="flex-1 flex flex-col bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex-none p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-brand" />
              <span className="text-xs font-black uppercase tracking-widest">Agent Mesh Feed</span>
            </div>
            <div className="px-2 py-0.5 bg-brand/10 rounded text-[9px] text-brand font-bold uppercase tracking-widest">Real-time Log</div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {logs.map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
              >
                <div className={cn(
                  "mt-1 p-1.5 rounded-lg",
                  log.agent_id === 'user' ? "bg-[#6EC8FF]/10 text-[#6EC8FF]" :
                  log.status === 'Error' ? "bg-[#FF7A2F]/10 text-[#FF7A2F]" : "bg-brand/10 text-brand"
                )}>
                  {log.agent_id === 'user' ? <User className="w-4 h-4" /> : getAgentIcon(log.agent_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      log.agent_id === 'user' ? "text-[#6EC8FF]/70" : "text-brand/70"
                    )}>
                      {log.agent_id} • {log.type}
                    </span>
                    <span className="text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className={cn(
                    "text-[11px] leading-relaxed break-words font-medium",
                    log.agent_id === 'user' ? "text-[#6EC8FF]" : "text-text-main"
                  )}>
                    {log.event}
                  </p>
                  {log.content && (
                    <div className="mt-2 p-2 bg-black/40 rounded-lg border border-white/5 text-[9px] text-text-muted font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                      {log.content}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Global Chat Input */}
          <div className="flex-none p-4 border-t border-white/5 bg-black/20">
            <form onSubmit={handleGlobalSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Issue global directive to Supervisor..."
                className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 text-xs text-text-main placeholder:text-text-muted transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-brand text-[#0A0F1A] rounded-lg disabled:opacity-20 hover:bg-brand/80 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Missions & Shared State */}
        <div className="w-80 flex flex-col gap-6">
          {/* Active Mission Card */}
          <div className="bg-brand/5 rounded-2xl border border-brand/20 p-5 space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Current Mission</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">
                {state?.active_mission || "NO ACTIVE MISSION"}
              </h3>
              <p className="text-[10px] text-text-muted leading-relaxed">
                {state?.active_mission ? "Agents are coordinated and executing sub-tasks." : "System idle. Awaiting strategic intent from Commander."}
              </p>
            </div>
            {state?.active_mission && (
              <div className="pt-2">
                <div className="w-full h-1 bg-brand/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-brand"
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] text-text-muted uppercase">Progress</span>
                  <span className="text-[9px] text-brand font-bold">65%</span>
                </div>
              </div>
            )}
          </div>

          {/* Agent Status Grid */}
          <div className="bg-white/5 rounded-2xl border border-white/5 p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-black uppercase tracking-widest">Agent Status</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {Object.entries(state?.agent_statuses || {}).map(([agent, status]) => (
                <div key={agent} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/5 rounded-lg text-text-muted">
                      {getAgentIcon(agent)}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider">{agent}</span>
                  </div>
                  <div className={cn("text-[9px] font-black uppercase tracking-widest", getStatusColor(status))}>
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Context */}
          <div className="bg-black/40 rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-[#6EC8FF]" />
              <span className="text-xs font-black uppercase tracking-widest">Shared Context</span>
            </div>
            <div className="space-y-2">
              {Object.entries(state?.global_vars || {}).length > 0 ? (
                Object.entries(state?.global_vars || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-[10px]">
                    <span className="text-text-muted uppercase">{key}:</span>
                    <span className="text-brand font-bold">{String(val)}</span>
                  </div>
                ))
              ) : (
                <p className="text-[9px] text-text-muted italic">No shared variables active.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
