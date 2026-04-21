import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Link as LinkIcon, Loader2, ExternalLink, FileText, ChevronRight, History, Bot, User, Terminal, Send, Trash2, Info, ChevronDown, X, Copy, Check, Maximize2, Brain, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import AgentTransfer, { AgentType } from './AgentTransfer';
import { Catome, CatomeStore } from '../types/catomes';
import AgentTips from './AgentTips';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  thinking?: string;
}

interface OllamaWebViewProps {
  apiKey: string;
  selectedModel: string;
  models: any[];
  disabledModels: string[];
  onModelChange: (model: string) => void;
  isAgentMode: boolean;
  modelsInfo: any;
  onTransfer: (target: AgentType, content?: string) => void;
  pendingTransfer?: { target: string; content: string } | null;
  onContextUsed?: () => void;
  catomeStore?: CatomeStore;
  onUpdateCatome?: (id: string, updates: Partial<Catome>) => void;
}

export default function OllamaWebView({ 
  apiKey, 
  selectedModel, 
  models, 
  disabledModels,
  onModelChange, 
  isAgentMode, 
  modelsInfo, 
  onTransfer,
  pendingTransfer,
  onContextUsed,
  catomeStore,
  onUpdateCatome
}: OllamaWebViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedTransferRef = useRef<string | null>(null);
  const triggeredTransfers = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (pendingTransfer && pendingTransfer.target === 'ollamaWeb' && onContextUsed) {
      if (processedTransferRef.current !== pendingTransfer.content) {
        processedTransferRef.current = pendingTransfer.content;
        sendMessage(pendingTransfer.content);
        onContextUsed();
      }
    }
  }, [pendingTransfer]);

  const ThinkingBlock = ({ thinking }: { thinking: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div className="mb-4 rounded-xl border border-brand/20 bg-bg-dark/60 overflow-hidden shadow-[0_0_20px_rgba(79,227,212,0.05)] backdrop-blur-md">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-brand/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-lg group-hover:bg-brand/20 transition-colors border border-brand/20">
              <Brain className="w-4 h-4 text-brand animate-pulse" />
            </div>
            <div className="flex flex-col items-start">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/90 leading-none mb-1">Cognitive Process</h4>
              <span className="text-[8px] font-mono text-text-muted/60 uppercase tracking-widest font-bold">L3-HEURISTIC-REASONING</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-brand/40 uppercase tracking-widest">
              {isExpanded ? 'SECURE_VIEW' : 'ACCESS_LOG'}
            </span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-brand/50" /> : <ChevronRight className="w-3.5 h-3.5 text-brand/50" />}
          </div>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-black/40 border-t border-brand/10"
            >
              <div className="px-5 pb-5 pt-3 text-[11px] text-brand/90 leading-relaxed font-serif italic selection:bg-brand/20">
                {thinking}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const ToolResultBlock = ({ content }: { content: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const toolName = content.match(/\[TOOL_RESULT:\s*(.*?)\]/)?.[1] || 'Unknown';
    const resultData = content.replace(/\[TOOL_RESULT:\s*.*?\]/, '').trim();
    
    return (
      <div className="rounded-xl border border-brand/20 bg-bg-dark/50 overflow-hidden">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-brand/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand/10 rounded-lg group-hover:bg-brand/20 transition-colors">
              <Terminal className="w-3.5 h-3.5 text-brand" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand/70">Tool Execution</span>
              <span className="text-[8px] font-mono text-text-muted uppercase tracking-widest">Result: {toolName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-text-muted uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {isExpanded ? 'Collapse Logs' : 'Expand Logs'}
            </span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
          </div>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-brand/5">
                <pre className="text-[10px] font-mono text-brand/80 whitespace-pre-wrap leading-tight bg-black/20 p-3 rounded-lg border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {resultData}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const DEFAULT_SYSTEM_PROMPT = `Du er OllamaWeb, systemets RESEARCH AGENT.

CATOMES RESEARCH PROTOKOL:
Du eksekverer CATOMES af typen 'research'.
Dit output skal være faktuelt, valideret og klar til brug i 'compute' eller 'io' CATOMES.

Når du har afsluttet en CATOME til tildelt dig selv, skal du ALTID afslutte dit svar med: [CATOME_COMPLETE: id]
Hvis opgaven returnerer data, skal du inkludere en JSON blok i dit svar med resultaterne.

TOOLS:
- web_search: [SEARCH: query]
- web_fetch: [FETCH: url]
- web_action: interaction...

AUTONOMY:
Du skal bruge CATOMES til at strukturere din research-pipeline.
Afslut altid med at rapportere tilbage via [TRANSFER: chat] eller den agent der bestilte CATOMEN.`;

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-execute model switching and handle transfers
  useEffect(() => {
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    if (isAgentMode && !isLoading && (lastMessage?.role === 'assistant' || lastMessage?.role === 'user')) {
      // Handle model switching
      const modelToSet = parseModelSwitch(lastMessage.content);
      if (modelToSet && lastMessage.role === 'assistant') {
        const canSwitch = models.some(m => m.name === modelToSet && !disabledModels.includes(m.name));
        if (canSwitch) {
          onModelChange(modelToSet);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `[SYSTEM]: Model switched to ${modelToSet} for Search view.` 
          }]);
          return;
        }
      }

      // Handle auto-transfer
      const transferTarget = parseTransfer(lastMessage.content);
      if (transferTarget && transferTarget !== 'ollamaWeb' && !triggeredTransfers.current.has(lastMessageIndex)) {
        triggeredTransfers.current.add(lastMessageIndex);
        onTransfer(transferTarget, lastMessage.content);
        return;
      }
    }
  }, [messages, isAgentMode, isLoading, models, disabledModels, onModelChange, onTransfer]);

  const parseModelSwitch = (text: string) => {
    const match = text.match(/\[SET_MODEL:\s*(.*?)\]/);
    return match ? match[1] : null;
  };

  const parseTransfer = (text: string) => {
    const match = text.match(/\[TRANSFER:\s*(.*?)\]/);
    return match ? match[1] as AgentType : null;
  };

  const handleSearch = async (query: string) => {
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  };

  const handleFetch = async (url: string, screenshot: boolean = false) => {
    const response = await fetch('/api/web-fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ url, screenshot })
    });
    if (!response.ok) throw new Error('Fetch failed');
    const data = await response.json();
    if (data.currentUrl) setLastUrl(data.currentUrl);
    return data;
  };

  const handleAction = async (action: string, params: any) => {
    const response = await fetch('/api/web-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ ...params, action, url: lastUrl })
    });
    if (!response.ok) throw new Error('Action failed');
    const data = await response.json();
    if (data.currentUrl) setLastUrl(data.currentUrl);
    return data;
  };

  // Reactive CATOME Task Execution
  useEffect(() => {
    if (!isAgentMode || isLoading || !catomeStore || !onUpdateCatome) return;

    const myPendingCatome = catomeStore.catomes.find(c => c.agent === 'ollamaWeb' && c.status === 'pending');
    if (myPendingCatome) {
      // 1. Claim it
      onUpdateCatome(myPendingCatome.id, { status: 'running' });
      
      // 2. Start working on it
      const prompt = `[CATOME TASK ACTIVATED]
ID: ${myPendingCatome.id}
TASK: ${myPendingCatome.description}
INPUT: ${JSON.stringify(myPendingCatome.input)}
EXPECTED OUTPUT: ${myPendingCatome.output_expected}

Please research this and report back with [CATOME_COMPLETE: ${myPendingCatome.id}] when finished, providing the result in JSON format.`;
      
      sendMessage(prompt);
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

  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedModel || !apiKey || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setAgentStatus('Thinking...');

    // Log start event
    fetch('/api/mission/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        agent_id: 'ollamaWeb',
        type: 'directive',
        event: 'Web agent initialised', 
        content: `Model: ${selectedModel}\nUser Input: ${content}`,
        status: 'Start'
      })
    }).catch(console.error);

    try {
      await processTurn(newMessages);
    } catch (error) {
      console.error('Chat error:', error);
      setAgentStatus('Error occurred');
    } finally {
      setIsLoading(false);
      setAgentStatus(null);
    }
  };

  const processTurn = async (history: Message[]) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: 'system', content: systemPrompt }, ...history],
        stream: false
      })
    });

    if (!response.ok) throw new Error('Chat failed');
    const data = await response.json();
    const assistantMsg = data.message.content;
    
    setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg, thinking: data.message.thinking }]);

    // Log finish event
    fetch('/api/mission/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        agent_id: 'ollamaWeb',
        type: 'response',
        event: 'Web agent responded', 
        content: assistantMsg,
        status: 'Success' 
      })
    }).catch(console.error);

    // Check for tool calls in content
    const searchMatch = assistantMsg.match(/\[SEARCH:\s*(.*?)\]/);
    const fetchMatch = assistantMsg.match(/\[FETCH:\s*([^|\]]*)(?:\s*\|\s*(.*))?\]/);
    const actionMatch = assistantMsg.match(/\[ACTION:\s*([^|\]]*)(?:\s*\|\s*([^|\]]*))?(?:\s*\|\s*(.*))?\]/);

    if (isAgentMode) {
      const transferMatch = assistantMsg.match(/\[TRANSFER:\s*(.*?)\]/);
      if (transferMatch) {
        const target = transferMatch[1].trim();
        setAgentStatus(`Transferring to ${target}...`);
        onTransfer(target as any, assistantMsg);
        return;
      }

      if (searchMatch) {
        const query = searchMatch[1];
        setAgentStatus(`Searching for: ${query}`);
        const results = await handleSearch(query);
        const toolContent = `[TOOL_RESULT: web_search]\n${JSON.stringify(results, null, 2)}`;
        const assistantTurn: Message = { role: 'assistant', content: assistantMsg };
        const toolTurn: Message = { role: 'user', content: toolContent };
        const updatedHistory = [...history, assistantTurn, toolTurn];
        setMessages(prev => [...prev, toolTurn]);
        setAgentStatus('Analyzing search results...');
        await processTurn(updatedHistory);
      } else if (fetchMatch) {
        const url = fetchMatch[1].trim();
        const needsScreenshot = fetchMatch[2]?.trim() === 'screenshot';
        setAgentStatus(needsScreenshot ? `Capturing screenshot of ${url}` : `Fetching content from ${url}`);
        setLastUrl(url);
        const result = await handleFetch(url, needsScreenshot);
        const toolContent = `[TOOL_RESULT: web_fetch]\n${JSON.stringify(result, null, 2)}`;
        const assistantTurn: Message = { role: 'assistant', content: assistantMsg };
        const toolTurn: Message = { role: 'user', content: toolContent };
        const updatedHistory = [...history, assistantTurn, toolTurn];
        setMessages(prev => [...prev, toolTurn]);
        setAgentStatus('Processing page content...');
        await processTurn(updatedHistory);
      } else if (actionMatch) {
        const action = actionMatch[1].trim();
        const param1 = actionMatch[2]?.trim();
        const param2 = actionMatch[3]?.trim();
        
        let params: any = {};
        if (action === 'click') params.selector = param1;
        if (action === 'type') { params.selector = param1; params.text = param2; }
        if (action === 'press') params.key = param1;

        setAgentStatus(`Executing ${action} on ${param1 || 'page'}`);
        const result = await handleAction(action, params);
        const toolContent = `[TOOL_RESULT: web_action]\n${JSON.stringify(result, null, 2)}`;
        const assistantTurn: Message = { role: 'assistant', content: assistantMsg };
        const toolTurn: Message = { role: 'user', content: toolContent };
        const updatedHistory = [...history, assistantTurn, toolTurn];
        setMessages(prev => [...prev, toolTurn]);
        setAgentStatus('Verifying action result...');
        await processTurn(updatedHistory);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    triggeredTransfers.current.clear();
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-bg-light/30">
      {/* Header */}
      <div className="flex-none px-6 py-3 border-b border-border bg-surface/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-[200px] flex gap-1">
            <div className="relative flex-1">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand/50" />
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-bg-light border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-[11px] font-bold uppercase tracking-wider appearance-none text-text-main transition-all cursor-pointer"
              >
                {models
                  .filter(m => !disabledModels.includes(m.name) || m.name === selectedModel)
                  .map((m, idx) => (
                    <option key={idx} value={m.name}>
                      {m.name} {disabledModels.includes(m.name) ? '(Deactivated)' : ''}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-text-muted" />
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-xs font-black uppercase tracking-tighter text-text-main">OllamaWeb Search Agent</h2>
            <p className="text-[8px] uppercase tracking-[0.2em] text-text-muted font-bold">Augmented Research Matrix</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={clearChat}
            className="p-2 bg-bg-light border border-border rounded-lg hover:border-[#FF7A2F]/50 hover:text-[#FF7A2F] transition-all group"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4 transition-transform group-active:scale-90" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Content */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-dot-pattern">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
                <div className="relative">
                  <Globe className="w-16 h-16 text-brand animate-pulse" />
                  <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-widest text-text-main">Awaiting Research Query</h3>
                  <p className="text-xs font-mono text-text-muted">Ollama Web Search Protocol Ready</p>
                </div>
                <AgentTips agentType="ollamaWeb" />
              </div>
            )}

            {messages.map((msg, idx) => {
              const isToolResult = msg.role === 'user' && msg.content.startsWith('[TOOL_RESULT:');
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-4 p-5 rounded-2xl border transition-all max-w-4xl",
                    msg.role === 'user' ? (isToolResult ? "bg-bg-dark/30 border-brand/10 p-3" : "bg-surface border-border") : 
                    msg.role === 'tool' ? "bg-bg-dark/30 border-brand/10 p-3" :
                    "bg-brand/5 border-brand/10"
                  )}
                >
                  <div className="flex-none">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border",
                      msg.role === 'user' ? (isToolResult ? "bg-bg-light border-border/50" : "bg-bg-light border-border") : "bg-brand/20 border-brand/30 ring-4 ring-brand/5"
                    )}>
                      {msg.role === 'user' ? (isToolResult ? <Terminal className="w-5 h-5 text-text-muted" /> : <User className="w-5 h-5 text-text-main" />) : <Bot className="w-5 h-5 text-brand" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                        {msg.role === 'user' ? (isToolResult ? 'Tool Loop' : 'Directive') : 'Response'}
                      </span>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-mono text-emerald-500 uppercase font-black tracking-widest">Active</span>
                        </div>
                      )}
                      <button 
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        {copiedId === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-text-muted" />}
                      </button>
                    </div>

                    {msg.thinking && <ThinkingBlock thinking={msg.thinking} />}

                    {isToolResult ? (
                      <ToolResultBlock content={msg.content} />
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none text-text-main selection:bg-brand/30 prose-p:leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {msg.role === 'assistant' && (
                      <AgentTransfer 
                        currentAgent="ollamaWeb" 
                        onTransfer={onTransfer}
                        suggestedAgent={parseTransfer(msg.content)}
                        content={msg.content}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-3 text-brand">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono animate-pulse">Matrix Processing...</span>
              </div>
            )}
          </div>

          <div className="p-6 bg-surface/50 backdrop-blur-xl border-t border-border">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="relative max-w-4xl mx-auto group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/20 to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Synchronize with research matrix..."
                className="w-full pl-5 pr-14 py-4 bg-surface border border-border rounded-2xl focus:outline-none focus:border-brand/40 text-sm shadow-xl transition-all text-text-main relative"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand text-bg-dark rounded-xl disabled:opacity-20 shadow-lg shadow-brand/20 hover:scale-105 transition-all active:scale-95 z-10"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Intelligence Matrix (Sidebar on the right) */}
        <div className="w-[400px] border-l border-border bg-[#050505] flex flex-col relative shrink-0">
          <div className="absolute inset-0 pointer-events-none bg-scanline opacity-[0.03] z-10" />
          
          <div className="p-4 border-b border-brand/10 bg-surface flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/5 border border-brand/20 rounded-lg">
                <Brain className="w-5 h-5 text-brand" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-main">Intelligence Matrix</h3>
            </div>
            <div className="px-2 py-1 bg-emerald-500/10 rounded text-[8px] font-mono text-emerald-500 uppercase font-black">
              LIVE_FEED
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-10">
            {/* Visual Persp */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Maximize2 className="w-3.5 h-3.5 text-brand" />
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-text-main">Visual Capture</h4>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {(() => {
                  const screenshots = messages
                    .map(m => {
                      const match = m.content.match(/\/preview\/(?:web|action)-snap-\d+\.png/);
                      return match ? match[0] : null;
                    })
                    .filter(Boolean)
                    .reverse();

                  if (screenshots.length === 0) {
                    return (
                      <div className="aspect-video rounded-xl bg-bg-dark/40 border border-brand/10 border-dashed flex items-center justify-center">
                        <span className="text-[9px] font-mono text-brand/20 uppercase tracking-[0.2em]">Viewport Sync Pending...</span>
                      </div>
                    );
                  }

                  return screenshots.map((url, i) => (
                    <div key={i} className="group relative rounded-xl overflow-hidden border border-brand/20 shadow-2xl">
                      <img src={url!} alt="Viewport" className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a href={url!} target="_blank" rel="noreferrer" className="px-4 py-2 bg-brand text-bg-dark text-[10px] font-black rounded-lg">INSPECT SOURCE</a>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-2 pt-6 border-t border-brand/10">
              <div className="p-3 bg-brand/5 rounded-xl border border-brand/10">
                <div className="text-[7px] font-mono text-text-muted uppercase mb-1">Logic Node</div>
                <div className="text-[9px] font-black text-brand uppercase truncate">{selectedModel}</div>
              </div>
              <div className="p-3 bg-brand/5 rounded-xl border border-brand/10">
                <div className="text-[7px] font-mono text-text-muted uppercase mb-1">Status</div>
                <div className="text-[9px] font-black text-emerald-500 uppercase">SYNCHRONIZED</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
