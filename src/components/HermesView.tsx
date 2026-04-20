import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Send, 
  Cpu, 
  Zap, 
  RefreshCw, 
  Shield, 
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Paperclip,
  Plus,
  AlertCircle,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AgentType } from './AgentTransfer';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  timestamp: string;
  command?: {
    text: string;
    status: 'pending' | 'executing' | 'success' | 'error';
    output?: string;
  };
}

interface HermesViewProps {
  apiKey: string;
  selectedModel: string;
  models: any[];
  disabledModels: string[];
  onModelChange: (model: string) => void;
  modelsInfo: any;
  isAgentMode?: boolean;
  onTransfer?: (targetAgent: AgentType, content?: string) => void;
  pendingTransfer?: { target: string; content: string } | null;
  onContextUsed?: () => void;
}

export const HermesView: React.FC<HermesViewProps> = ({
  apiKey,
  selectedModel,
  models,
  disabledModels,
  onModelChange,
  modelsInfo,
  isAgentMode = true,
  onTransfer,
  pendingTransfer,
  onContextUsed
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedTransferRef = useRef<string | null>(null);
  const triggeredTransfers = useRef<Set<number>>(new Set());

  const DEFAULT_SYSTEM_PROMPT = `Du er HERMES, en avanceret AI-agent specialiseret i tool-calling, CLI-interaktion og komplekse tekniske workflows.
Du opererer i C.A.T v2.0 miljøet.

KOMMANDOER:
Hvis en opgave kræver en shell-kommando, skal du bruge formatet: [EXECUTE: kommando].
Du er autoriseret til at læse filer, navigere i filsystemet og køre tekniske analyser.

AGENT PROTOKOL:
- Brug [TRANSFER: chat] for at rapportere tilbage til Supervisor når en mission er fuldført.
- Brug [TRANSFER: webdesign] hvis opgaven kræver UI-udvikling eller frontend kode.
- Brug [TRANSFER: security] hvis der skal udføres en dybdegående sikkerheds-audit.
- Brug [TRANSFER: ollamaWeb] hvis du mangler informationer fra internettet.

TONE:
Vær ekstremt præcis, teknisk og kortfattet. Ingen unødig snak. 
Brug altid [EXECUTE] hvis du kan løse en opgave autonomt.

MILJØ:
Du arbejder i "web_design_workspace/hermes/" mappen.`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle incoming context from transfers
  useEffect(() => {
    if (pendingTransfer && pendingTransfer.target === 'hermes' && onContextUsed) {
      if (processedTransferRef.current !== pendingTransfer.content) {
        processedTransferRef.current = pendingTransfer.content;
        handleSubmit(`[TRANSFER CONTEXT RECEIVED]: ${pendingTransfer.content}`);
        onContextUsed();
      }
    }
  }, [pendingTransfer]);

  const parseCommand = (text: string) => {
    const match = text.match(/\[EXECUTE:\s*(.*?)\]/);
    return match ? match[1] : null;
  };

  const parseModelSwitch = (text: string) => {
    const match = text.match(/\[SET_MODEL:\s*(.*?)\]/);
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

    // Log command execution
    fetch('/api/mission/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        agent_id: 'hermes',
        type: 'command',
        event: 'Hermes executing command', 
        content: command,
        status: 'Executing'
      })
    }).catch(console.error);

    try {
      const response = await fetch('/api/local/exec', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ command, cwd: 'web_design_workspace/hermes/' })
      });
      const data = await response.json();
      
      // Log command result
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
          agent_id: 'hermes',
          type: 'command_result',
          event: response.ok ? 'Command success' : 'Command failed', 
          content: response.ok ? (data.stdout || 'Success') : (data.error || data.stderr || 'Fail'),
          status: response.ok ? 'Success' : 'Error'
        })
      }).catch(console.error);

      setMessages(prev => {
        const updated = [...prev];
        if (response.ok) {
          updated[msgIdx].command = {
            text: command,
            status: 'success',
            output: data.stdout || 'Command executed successfully.'
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

  // Agent Automation Loop
  useEffect(() => {
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    if (isAgentMode && !isLoading && (lastMessage?.role === 'assistant' || lastMessage?.role === 'user')) {
      // 1. Check for command execution
      if (!lastMessage.command) {
        const cmdText = parseCommand(lastMessage.content);
        if (cmdText) {
          executeCommand(lastMessageIndex, cmdText);
          return;
        }
      }

      // 2. Check for manual transfer
      if (onTransfer && !triggeredTransfers.current.has(lastMessageIndex)) {
        const transferTarget = parseTransfer(lastMessage.content);
        if (transferTarget && transferTarget !== 'hermes') {
          triggeredTransfers.current.add(lastMessageIndex);
          onTransfer(transferTarget, lastMessage.content);
          return;
        }
      }

      // 3. Check for model switch
      const modelToSet = parseModelSwitch(lastMessage.content);
      if (modelToSet && lastMessage.role === 'assistant' && models.some(m => m.name === modelToSet && !disabledModels.includes(m.name))) {
        onModelChange(modelToSet);
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `[SYSTEM]: Model switched to ${modelToSet}`, 
          timestamp: new Date().toLocaleTimeString() 
        }]);
        return;
      }

      // 4. If command finished, auto-reply to continue loop
      if (lastMessage.command && (lastMessage.command.status === 'success' || lastMessage.command.status === 'error')) {
        if (!triggeredTransfers.current.has(lastMessageIndex)) {
          triggeredTransfers.current.add(lastMessageIndex);
          const reply = lastMessage.command.status === 'error'
            ? "[SYSTEM AUTO-REPLY] Command FAILED. Adjust your approach."
            : "[SYSTEM AUTO-REPLY] Command SUCCESS. Next step?";
          
          setTimeout(() => handleSubmit(reply), 300);
        }
      }
    }
  }, [messages, isAgentMode, isLoading, models, onModelChange, onTransfer, disabledModels]);

  const handleSubmit = async (customInput?: string) => {
    const textToUse = customInput || input;
    if (!textToUse.trim() || isLoading || !apiKey || !selectedModel) return;

    if (!customInput) setInput('');
    
    if (!customInput) {
      const userMessage: Message = {
        role: 'user',
        content: textToUse,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, userMessage]);
    }

    setIsLoading(true);

    // Log start of analysis/thought process
    fetch('/api/mission/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        agent_id: 'hermes',
        type: 'event',
        event: 'Hermes is analyzing', 
        content: `Model: ${selectedModel}\nAnalyzing request...`,
        status: 'Executing'
      })
    }).catch(console.error);

    try {
      const chatMessages = [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: textToUse }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatMessages,
          stream: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }
      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message.content,
        thinking: data.message.thinking,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Log success
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
          agent_id: 'hermes',
          type: 'response',
          event: 'Hermes responded', 
          content: data.message.content.substring(0, 500),
          status: 'Success'
        })
      }).catch(console.error);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050A10] text-[#A8B2C0] font-mono overflow-hidden">
      {/* Header */}
      <header className="flex-none px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#6EC8FF]/10 rounded-xl border border-[#6EC8FF]/20 shadow-[0_0_15px_rgba(110,200,255,0.1)]">
            <Zap className="w-5 h-5 text-[#6EC8FF]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Hermes Integration</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isAgentMode ? "bg-[#4FE3D4]" : "bg-white/20")} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", isAgentMode ? "text-[#4FE3D4]" : "text-white/30")}>
                {isAgentMode ? 'Agent Active • Listening' : 'Manual Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg">
            <Cpu className="w-3.5 h-3.5 text-[#6EC8FF]/70" />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none text-[#6EC8FF]"
            >
              <option value="" disabled>Select Hermes Model</option>
              {models.filter(m => !disabledModels.includes(m.name)).map(m => (
                <option key={m.name} value={m.name} className="bg-[#050A10]">
                  {m.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => {
              setMessages([]);
              triggeredTransfers.current.clear();
            }}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CLI Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Terminal className="w-16 h-16 mb-4 text-[#6EC8FF]" />
                <p className="text-xs uppercase tracking-[0.5em] font-black">Initialising Hermes Environment...</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx}
                className={cn(
                  "p-5 rounded-2xl border transition-all",
                  msg.role === 'user' 
                    ? "bg-white/[0.03] border-white/10 ml-12" 
                    : msg.role === 'system'
                    ? "bg-[#FF7A2F]/10 border-[#FF7A2F]/20 text-[#FF7A2F]"
                    : "bg-[#6EC8FF]/5 border-[#6EC8FF]/20 mr-12"
                )}
              >
                <div className="flex items-center justify-between mb-3 border-b border-white/[0.05] pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-[0.2em]",
                      msg.role === 'user' ? "text-white" : msg.role === 'assistant' ? "text-[#6EC8FF]" : "text-[#FF7A2F]"
                    )}>
                      {msg.role === 'user' ? 'Operator' : msg.role === 'assistant' ? 'Hermes Agent' : 'System'}
                    </span>
                    <Clock className="w-3 h-3 text-white/20" />
                    <span className="text-[8px] text-white/30">{msg.timestamp}</span>
                  </div>
                </div>

                {msg.thinking && (
                  <div className="mb-4 bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                    <button
                      onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-[#6EC8FF]/70" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#6EC8FF]/70">Cognitive Trace</span>
                      </div>
                      {isThinkingExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <AnimatePresence>
                      {isThinkingExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="px-3 pb-3 pt-0 overflow-hidden"
                        >
                          <div className="text-[11px] leading-relaxed italic text-white/40 font-serif border-l-2 border-[#6EC8FF]/20 pl-3 whitespace-pre-wrap">
                            {msg.thinking}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="prose prose-invert prose-xs max-w-none prose-pre:bg-black/50 prose-code:text-[#6EC8FF]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {msg.command && (
                  <div className="mt-4 bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-[#6EC8FF]" />
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">CLI Execution</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {msg.command.status === 'executing' && <Loader2 className="w-3 h-3 animate-spin text-[#6EC8FF]" />}
                        {msg.command.status === 'success' && <CheckCircle2 className="w-3 h-3 text-[#4FE3D4]" />}
                        {msg.command.status === 'error' && <AlertCircle className="w-3 h-3 text-[#FF7A2F]" />}
                        <span className={cn(
                          "text-[9px] font-bold uppercase",
                          msg.command.status === 'executing' ? "text-[#6EC8FF]" :
                          msg.command.status === 'success' ? "text-[#4FE3D4]" : "text-[#FF7A2F]"
                        )}>
                          {msg.command.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <code className="text-xs text-[#6EC8FF]">$ {msg.command.text}</code>
                      {msg.command.output && (
                        <pre className="mt-3 p-3 bg-black/50 rounded-lg text-[10px] text-white/40 overflow-x-auto whitespace-pre-wrap border border-white/5">
                          {msg.command.output}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3 p-5 bg-[#6EC8FF]/5 border border-[#6EC8FF]/20 rounded-2xl mr-12 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-[#6EC8FF]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6EC8FF]">Hermes is processing...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-none p-6 bg-white/[0.01] border-t border-white/5">
            <div className="max-w-4xl mx-auto relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Enter command or natural language instruction..."
                className="w-full bg-[#0A0F1A] border border-white/10 rounded-2xl px-6 py-4 pr-32 focus:outline-none focus:border-[#6EC8FF]/50 transition-all font-mono text-sm min-h-[60px] max-h-[200px] shadow-2xl resize-none"
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/30 hover:text-[#6EC8FF]">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !input.trim()}
                  className="bg-[#6EC8FF] hover:bg-[#4FE3D4] text-[#0A0F1A] px-4 py-2 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <aside className="w-80 border-l border-white/5 bg-black/20 p-6 space-y-8 hidden xl:block overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Hermes Status</h3>
            <div className="space-y-3">
              {[
                { label: 'Agent Mode', value: isAgentMode ? 'Enabled' : 'Disabled', color: isAgentMode ? 'text-[#4FE3D4]' : 'text-white/30' },
                { label: 'Tool Sync', value: 'Synced', color: 'text-[#4FE3D4]' },
                { label: 'Ollama Node', value: 'Online', color: 'text-[#4FE3D4]' },
                { label: 'Workdir', value: '/hermes/', color: 'text-white/50' }
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{stat.label}</span>
                  <span className={cn("text-[10px] font-bold font-mono", stat.color)}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Active Integration</h3>
            <div className="p-4 bg-[#6EC8FF]/5 border border-[#6EC8FF]/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#6EC8FF]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6EC8FF]">Agent Capability</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#6EC8FF]/70 italic">
                Hermes can now autonomously execute shell commands and transfer tasks to other agents. Use [EXECUTE] or [TRANSFER] blocks.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HermesView;
