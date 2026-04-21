import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Terminal, Search, Lock, Unlock, Activity, Loader2, Bot, User, ChevronDown, Trash2, AlertTriangle, Eye, Zap, CheckCircle2, AlertCircle, Send, Settings2, Code, Globe, Info, Brain, ChevronRight } from 'lucide-react';
import MasterPromptModal from './MasterPromptModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import AgentTransfer, { AgentType } from './AgentTransfer';
import { Catome, CatomeStore } from '../types/catomes';
import AgentTips from './AgentTips';
import CommandCenterView from './CommandCenterView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  scan?: {
    target: string;
    type: string;
    status: 'idle' | 'scanning' | 'completed' | 'failed';
    findings: string[];
  };
  command?: {
    text: string;
    status: 'pending' | 'executing' | 'success' | 'error';
    output?: string;
  };
}

interface SecurityViewProps {
  apiKey: string;
  selectedModel: string;
  models: any[];
  disabledModels: string[];
  onModelChange: (model: string) => void;
  analyzeTarget?: any;
  isAgentMode: boolean;
  modelsInfo: any;
  onTransfer: (target: AgentType, content?: string) => void;
  pendingTransfer?: { target: string; content: string } | null;
  onContextUsed?: () => void;
  onGlobalMessage?: (msg: string) => void;
  catomeStore?: CatomeStore;
  onUpdateCatome?: (id: string, updates: Partial<Catome>) => void;
}

export default function SecurityView({ 
  apiKey, 
  selectedModel, 
  models, 
  disabledModels,
  onModelChange, 
  analyzeTarget, 
  isAgentMode, 
  modelsInfo, 
  onTransfer,
  pendingTransfer,
  onContextUsed,
  onGlobalMessage,
  catomeStore,
  onUpdateCatome
}: SecurityViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const processedTransferRef = useRef<string | null>(null);
  const [osInfo, setOsInfo] = useState<string>('unknown');
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'console' | 'comms'>('comms');
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggeredTransfers = useRef<Set<number>>(new Set());

  const ThinkingBlock = ({ thinking }: { thinking: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div className="mb-4 rounded-xl border border-[#4FE3D4]/10 bg-[#0A0F1A]/40 overflow-hidden shadow-inner text-left">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#4FE3D4]/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#4FE3D4]/10 rounded-lg group-hover:bg-[#4FE3D4]/20 transition-colors">
              <Brain className="w-3.5 h-3.5 text-[#4FE3D4]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4FE3D4]/70">Cognitive Process</span>
              <span className="text-[8px] font-mono text-text-muted uppercase tracking-widest">Internal Reasoning Log</span>
            </div>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 text-[11px] text-text-muted italic leading-relaxed border-t border-[#4FE3D4]/5 font-serif">
                {thinking}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  useEffect(() => {
    if (pendingTransfer && pendingTransfer.target === 'security' && onContextUsed) {
      if (processedTransferRef.current !== pendingTransfer.content) {
        processedTransferRef.current = pendingTransfer.content;
        handleSubmit(undefined, pendingTransfer.content);
        onContextUsed();
      }
    }
  }, [pendingTransfer]);

  const DEFAULT_SYSTEM_PROMPT = `Du er AEGIS, systemets AUDIT LAYER (C.A.T Security Core).

CATOMES AUDIT PROTOKOL:
Din primære opgave er at overvåge og validere CATOMES eksekveret af andre agenter.
Du skal:
1. Validere output fra 'validate' CATOMES.
2. Sikre at 'risk_level' overholdes.
3. Rapportere overtrædelser direkte i din audit-log.

Når du har afsluttet en CATOME til tildelt dig selv, skal du ALTID afslutte dit svar med: [CATOME_COMPLETE: id]
Hvis opgaven returnerer data, skal du inkludere en JSON blok i dit svar med resultaterne.

EFFICIENCY & TONE:
- NO CHITCHAT. Vær ekstremt kortfattet. Output kun din tekniske vurdering via [EXECUTE] eller [TRANSFER].

AUTONOMY RULES:
1. Du er autoriseret til at køre shell-kommandoer [EXECUTE] for at verificere systemets tilstand autonomt.
2. Du skal overvåge og logge efterlevelse af CATOME intentioner.

HOST OS: ${osInfo}.
Du arbejder i "web_design_workspace/security/" mappen.`;

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  }, [osInfo]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setOsInfo(data.os);
      } catch (err) {
        console.error("Failed to fetch health:", err);
      }
    };
    fetchHealth();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchAuditLogs = async () => {
      if (!apiKey) return;
      try {
        const response = await fetch('/api/logs/audit', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        
        if (!response.ok) {
          if (response.status === 401) return; // Silent on unauthorized
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Expected JSON but got:", text.substring(0, 100));
          return;
        }

        const data = await response.json();
        if (isMounted) {
          setAuditLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(fetchAuditLogs, 5000);
        }
      }
    };
    
    fetchAuditLogs();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [apiKey]);

  const parseCommand = (text: string) => {
    const match = text.match(/\[EXECUTE: (.*?)\]/);
    return match ? match[1] : null;
  };

  const parseTransfer = (text: string) => {
    const match = text.match(/\[TRANSFER:\s*(.*?)\]/);
    return match ? match[1] as AgentType : null;
  };

  const executeCommand = async (msgIdx: number, command: string) => {
    const newMessages = [...messages];
    newMessages[msgIdx].command = { text: command, status: 'executing' };
    setMessages(newMessages);

    try {
      const response = await fetch('/api/local/exec', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ command, cwd: 'web_design_workspace/security/' })
      });
      const data = await response.json();
      
      setMessages(prev => {
        const updated = [...prev];
        if (response.ok) {
          updated[msgIdx].command = {
            text: command,
            status: 'success',
            output: data.stdout || 'Command executed successfully (no output).'
          };
        } else {
          updated[msgIdx].command = {
            text: command,
            status: 'error',
            output: data.error || data.stderr || 'Execution failed.'
          };
        }
        return updated;
      });
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIdx].command = { text: command, status: 'error', output: err.message };
        return updated;
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-execute commands and auto-reply in Agent Mode
  useEffect(() => {
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    if (isAgentMode && !isLoading && (lastMessage?.role === 'assistant' || lastMessage?.role === 'user')) {
      if (!lastMessage.command) {
        // Handle model switching
        const modelMatch = lastMessage.content.match(/\[SET_MODEL:\s*(.*?)\]/);
        if (modelMatch && lastMessage.role === 'assistant') { // Model switch restricted to assistant
          const modelToSet = modelMatch[1].trim();
          const canSwitch = models.some(m => m.name === modelToSet && !disabledModels.includes(m.name));
          if (canSwitch) {
            onModelChange(modelToSet);
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `[SYSTEM]: Model switched to ${modelToSet} for Security view.` 
            }]);
            return;
          }
        }

        const cmdText = parseCommand(lastMessage.content);
        if (cmdText) {
          executeCommand(lastMessageIndex, cmdText);
          return;
        }

        // Handle auto-transfer
        const transferMatch = lastMessage.content.match(/\[TRANSFER:\s*(.*?)\]/);
        if (transferMatch && !triggeredTransfers.current.has(lastMessageIndex)) {
          triggeredTransfers.current.add(lastMessageIndex);
          const target = transferMatch[1].trim();
          onTransfer(target as any, lastMessage.content);
          return;
        }
      } else if (lastMessage.command.status === 'success' || lastMessage.command.status === 'error') {
        if (!triggeredTransfers.current.has(lastMessageIndex)) {
          triggeredTransfers.current.add(lastMessageIndex);
          
          if (lastMessage.command.status === 'success') {
            // If the message also contained a transfer, execute it now instead of replying
            const transferMatch = lastMessage.content.match(/\[TRANSFER:\s*(.*?)\]/);
            if (transferMatch) {
              const target = transferMatch[1].trim();
              onTransfer(target as any, lastMessage.content);
              return;
            }
          }

          const cmdStatusMsg = lastMessage.command.status === 'error'
            ? "[SYSTEM AUTO-REPLY] Command FAILED! Check the output for errors and adjust your security analysis immediately."
            : "[SYSTEM AUTO-REPLY] Command execution finished. What is your next step? If the analysis is completely done, use [TRANSFER: chat] to report back, or transfer directly to [TRANSFER: webdesign] if you need them to fix the code.";
          // The command finished executing. Trigger the next loop for full autonomy.
          setTimeout(() => {
            handleSubmit(undefined, cmdStatusMsg);
          }, 300);
        }
      }
    }
  }, [messages, isAgentMode, isLoading, models, disabledModels, onModelChange, onTransfer]);

  useEffect(() => {
    if (analyzeTarget && analyzeTarget.path) {
      const prompt = `Analyser denne fil for bugs, sårbarheder og optimeringsmuligheder: ${analyzeTarget.path}`;
      handleSubmit(undefined, prompt);
    }
  }, [analyzeTarget]);

  // Reactive CATOME Task Execution
  useEffect(() => {
    if (!isAgentMode || isLoading || !catomeStore || !onUpdateCatome) return;

    const myPendingCatome = catomeStore.catomes.find(c => c.agent === 'security' && c.status === 'pending');
    if (myPendingCatome) {
      // 1. Claim it
      onUpdateCatome(myPendingCatome.id, { status: 'running' });
      
      // 2. Start working on it
      const prompt = `[CATOME TASK ACTIVATED]
ID: ${myPendingCatome.id}
TASK: ${myPendingCatome.description}
INPUT: ${JSON.stringify(myPendingCatome.input)}
EXPECTED OUTPUT: ${myPendingCatome.output_expected}

Please execute this security audit/task and report back with [CATOME_COMPLETE: ${myPendingCatome.id}] when finished, providing the result in JSON format.`;
      
      handleSubmit(undefined, prompt);
    }
  }, [catomeStore?.catomes, isAgentMode, isLoading]);

  // Handle CATOME Completion Reporting
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content.includes('[CATOME_COMPLETE:') && onUpdateCatome) {
      const match = lastMessage.content.match(/\[CATOME_COMPLETE:\s*(.*?)\]/);
      if (match) {
        const catomeId = match[1].trim();
        let result = {};
        try {
          const jsonMatch = lastMessage.content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) result = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.warn("Failed to parse CATOME result JSON", e);
        }
        
        onUpdateCatome(catomeId, { 
          status: 'success', 
          result,
          updated_at: new Date().toISOString()
        });
      }
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = customInput || input;
    if (!finalInput.trim() || !selectedModel || !apiKey || isLoading) return;

    const userMessage: Message = { role: 'user', content: finalInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!customInput) setInput('');
    setIsLoading(true);

    // Log start event
    fetch('/api/mission/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        agent_id: 'security',
        type: 'directive',
        event: 'Security agent initialised analysis', 
        content: `Model: ${selectedModel}\nUser Input: ${finalInput}`,
        status: 'Start'
      })
    }).catch(console.error);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages.map(m => {
              let ctx = m.content;
              if (m.command && m.command.status !== 'executing') {
                ctx += `\n\n[COMMAND EXECUTION RESULT]\n$ ${m.command.text}\n${m.command.output}`;
              }
              return { role: m.role, content: ctx };
            })
          ],
          stream: false
        })
      });

      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.message.content,
        thinking: data.message.thinking
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Log finish event
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
          agent_id: 'security',
          type: 'response',
          event: 'Security agent finished analysis', 
          content: data.message.content,
          status: 'Success' 
        })
      }).catch(console.error);
    } catch (err: any) {
      console.error(err);
      // Log error event
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
          agent_id: 'security',
          type: 'error',
          event: 'Security agent failed', 
          content: err.message,
          status: 'Error' 
        })
      }).catch(console.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-surface modern-grid">
      {/* Shared Header */}
      <div className="flex-none p-6 border-b border-border bg-bg-light/80 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#4FE3D4]/10 rounded-lg">
            <Shield className="w-5 h-5 text-[#4FE3D4]" />
          </div>
          <div>
            <h2 className="font-serif italic text-xl font-bold text-text-main leading-none">Aegis</h2>
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">Security Core</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-light p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveView('console')}
              className={cn(
                "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                activeView === 'console' ? "bg-[#4FE3D4]/20 text-[#4FE3D4] shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              Console
            </button>
            <button
              onClick={() => setActiveView('comms')}
              className={cn(
                "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                activeView === 'comms' ? "bg-brand/20 text-brand shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              Agent Comms
            </button>
          </div>
          <button 
            onClick={() => {
              setMessages([]);
              triggeredTransfers.current.clear();
            }} 
            className="p-2 hover:bg-[#FF7A2F]/10 hover:text-[#FF7A2F] rounded-lg transition-all text-text-muted"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeView === 'comms' ? (
          <CommandCenterView apiKey={apiKey} onGlobalMessage={onGlobalMessage} />
        ) : (
          <>
            {/* Left Pane: Security Logs / Findings */}
            <div className="w-[450px] flex-none flex flex-col border-r border-border bg-bg-light/50 backdrop-blur-sm z-10">
              <MasterPromptModal
                isOpen={isMasterPromptOpen}
                onClose={() => setIsMasterPromptOpen(false)}
                prompt={systemPrompt}
                onSave={setSystemPrompt}
                defaultPrompt={DEFAULT_SYSTEM_PROMPT}
                title="Aegis Security Personality"
              />
              <div className="flex-none p-4 border-b border-border bg-surface/80 flex items-center justify-between">
                <div className="flex items-center gap-2 p-1 bg-bg-light rounded-xl border border-border">
                  <button 
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-surface text-[#4FE3D4] shadow-md flex items-center gap-2"
                  >
                    <Terminal className="w-4 h-4" />
                    Console
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-tighter">Threat Level</span>
                    <span className="text-[11px] font-bold text-[#4FE3D4] flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4FE3D4]" />
                      LOW
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="p-4 bg-[#0A0F1A] rounded-2xl border border-[#A8B2C0]/20 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#4FE3D4]" />
                        <h3 className="text-[10px] font-mono font-bold text-[#A8B2C0] uppercase tracking-widest">Audit Matrix</h3>
                      </div>
                      <div className="px-2 py-0.5 bg-[#4FE3D4]/10 rounded text-[8px] font-mono text-[#4FE3D4] animate-pulse">
                        LIVE
                      </div>
                    </div>
                    
                    <div className="space-y-3 font-mono text-[10px]">
                      {auditLogs.map((log, i) => (
                        <div key={i} className="p-2 bg-black/50 rounded border border-white/5 text-[#A8B2C0]">
                          <div className="flex items-center justify-between mb-1">
                            <div className={cn(
                              "font-bold",
                              log.status === 'Success' || log.status === 'Start' ? "text-[#4FE3D4]" : 
                              log.status === 'Error' ? "text-[#FF7A2F]" : "text-[#6EC8FF]"
                            )}>
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </div>
                            <div className="text-[8px] opacity-50">{log.type === 'event' ? 'CORE' : 'EXEC'}</div>
                          </div>
                          <div className="truncate opacity-80">
                            {log.command || log.event}
                          </div>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <div className="text-[#A8B2C0]/50 italic">Waiting for activity...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane: Chat / Directives */}
            <div className="flex-1 flex flex-col bg-surface/50 backdrop-blur-sm">
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Local Model Selector & Security Tools */}
                <div className="flex-none px-6 py-3 border-b border-border bg-surface/50 space-y-3">
                  <div className="relative">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4FE3D4]/50" />
                    <select
                      value={selectedModel}
                      onChange={(e) => onModelChange(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-bg-light border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4FE3D4]/20 focus:border-[#4FE3D4]/50 text-[11px] font-bold uppercase tracking-wider appearance-none text-text-main transition-all cursor-pointer"
                    >
                      {models.length === 0 ? (
                        <option>No models found</option>
                      ) : (
                        models
                          .filter(m => !disabledModels.includes(m.name) || m.name === selectedModel)
                          .map((m, idx) => (
                            <option key={`${m.name}-${m.digest}-${idx}`} value={m.name}>
                              {m.name} {disabledModels.includes(m.name) ? '(Deactivated)' : ''}
                            </option>
                          ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-text-muted" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSubmit(undefined, "Kør en hurtig sikkerhedsscanning af det aktuelle projekt.")}
                      className="py-2 bg-[#6EC8FF] text-[#0A0F1A] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#4FE3D4] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4FE3D4]/20"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Quick Scan
                    </button>
                    <button
                      onClick={() => handleSubmit(undefined, "Vis netværksmonitorering og log-analyse.")}
                      className="py-2 bg-bg-light border border-border text-text-main rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-[#4FE3D4] transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Activity className="w-3.5 h-3.5 text-[#4FE3D4]" />
                      Monitor
                    </button>
                  </div>
                </div>

                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin"
                >
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 p-8">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#4FE3D4] blur-2xl opacity-20 animate-pulse" />
                        <Shield className="w-20 h-20 text-[#4FE3D4] relative" />
                      </div>
                      <div className="space-y-2 relative">
                        <p className="font-serif italic text-2xl text-text-main">Security Protocol Active</p>
                        <p className="text-xs text-text-muted font-mono uppercase tracking-widest">Awaiting defensive directives</p>
                      </div>
                      <AgentTips agentType="security" />
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-4 rounded-xl text-sm",
                        msg.role === 'user' ? "bg-bg-light border border-border" : "bg-[#4FE3D4]/5 border border-[#4FE3D4]/20"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2 opacity-50 font-mono text-[10px] uppercase tracking-widest text-text-main">
                        {msg.role === 'user' ? <User className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {msg.role === 'user' ? 'Operator' : 'Aegis'}
                      </div>
                      
                      {msg.thinking && <ThinkingBlock thinking={msg.thinking} />}
                      
                      <div className="prose prose-sm prose-invert max-w-none text-text-main">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.role === 'assistant' && (
                        <AgentTransfer 
                          currentAgent="security" 
                          onTransfer={onTransfer}
                          suggestedAgent={parseTransfer(msg.content)}
                          content={msg.content}
                        />
                      )}

                      {msg.role === 'assistant' && (
                        <div className="mt-3">
                          {(() => {
                            const cmdText = parseCommand(msg.content);
                            if (!cmdText && !msg.command) return null;
                            const currentCmd = msg.command || { text: cmdText!, status: 'pending' };
                            
                            return (
                              <div className="bg-[#0A0F1A] rounded-lg overflow-hidden border border-[#A8B2C0]/20">
                                <div className="px-3 py-1.5 bg-white/5 flex items-center justify-between border-b border-white/5">
                                  <span className="text-[10px] font-mono text-[#A8B2C0]">SECURITY COMMAND</span>
                                  {currentCmd.status === 'pending' && (
                                    <button 
                                      onClick={() => executeCommand(idx, currentCmd.text)}
                                      className="px-2 py-0.5 bg-[#6EC8FF] text-[#0A0F1A] text-[10px] font-bold rounded hover:bg-[#4FE3D4]"
                                    >
                                      EXECUTE
                                    </button>
                                  )}
                                  {currentCmd.status === 'executing' && <Loader2 className="w-3 h-3 text-[#4FE3D4] animate-spin" />}
                                  {currentCmd.status === 'success' && <CheckCircle2 className="w-3 h-3 text-[#4FE3D4]" />}
                                  {currentCmd.status === 'error' && <AlertCircle className="w-3 h-3 text-[#FF7A2F]" />}
                                </div>
                                <div className="p-2 font-mono text-[11px] text-[#4FE3D4] break-all">
                                  $ {currentCmd.text}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-[#4FE3D4] animate-pulse font-mono text-[10px] uppercase tracking-widest">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analyzing...
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border bg-surface/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setIsMasterPromptOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-bg-light border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-brand hover:border-brand/50 transition-all shadow-sm"
                    >
                      <Settings2 className="w-3 h-3" />
                      Master Prompt
                    </button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative group">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter security directive..."
                      className="w-full pl-5 pr-14 py-4 bg-surface border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4FE3D4]/20 focus:border-[#4FE3D4]/50 text-sm shadow-sm transition-all text-text-main"
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#6EC8FF] text-[#0A0F1A] rounded-xl disabled:opacity-20 shadow-lg shadow-[#4FE3D4]/20 hover:bg-[#4FE3D4] transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  </div>
);
}
