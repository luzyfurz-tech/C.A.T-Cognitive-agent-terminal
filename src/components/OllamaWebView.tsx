import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Link as LinkIcon, Loader2, ExternalLink, FileText, ChevronRight, History, Bot, User, Terminal, Send, Trash2, Info, ChevronDown, X, Copy, Check, Maximize2, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import AgentTransfer, { AgentType } from './AgentTransfer';
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
  onContextUsed
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
      <div className="mb-4 rounded-xl border border-brand/10 bg-bg-dark/40 overflow-hidden shadow-inner">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-brand/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand/10 rounded-lg group-hover:bg-brand/20 transition-colors">
              <Brain className="w-3.5 h-3.5 text-brand" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand/70">Cognitive Process</span>
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
              <div className="px-4 pb-4 pt-2 text-[11px] text-text-muted italic leading-relaxed border-t border-brand/5 font-serif">
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

  const DEFAULT_SYSTEM_PROMPT = `You are OllamaWeb, an autonomous search agent.
You use Ollama's Web Search and Web Fetch APIs to find information and reduce hallucinations.

TOOLS:
- web_search: Search the web for a query. Returns a list of results with title, url, and snippet.
- web_fetch: Fetch the full text content of a specific URL. Use [FETCH: url | screenshot] if you need a visual.
- web_action: Interact with a page. Use [ACTION: click | selector], [ACTION: type | selector | text], or [ACTION: press | key].

CAPABILITIES:
- You can perform multi-turn research tasks.
- You can synthesize information from multiple sources.
- You can switch models if needed using [SET_MODEL: model_name].
- You can hand off to other agents using [TRANSFER: agent_name].
- If you use a model with Vision (like gemini-3-flash-preview), you can analyze screenshots.

EFFICIENCY & TONE:
- NO CHITCHAT. Be extremely concise. Output only your technical findings and the next [FETCH]/[SEARCH]/[TRANSFER] command.
- DIRECT HANDOFFS: If a coding task depends on your research, transfer directly to [TRANSFER: webdesign] when you have the info. Only transfer to supervisor (chat) when the total mission is concluded or you need direction.

MODEL KNOWLEDGE BASE — C.A.T v2.0
Du har adgang til følgende Ollama Cloud‑modeller.
Hver model har en beskrivelse, tags, anbefalet agent‑brug og en capability‑matrix (0–10).

Brug disse data til at forstå modellernes styrker, vælge den bedste model til en opgave og skifte model autonomt via [SET_MODEL: model_name].

MODEL DATABASE:
${models.map(m => {
  const info = (modelsInfo as any)[m.name];
  if (!info) return `- ${m.name}: Generel AI model`;
  return `- ${m.name}: ${info.description} | Tags: ${info.tags.join(', ')} | Agents: ${info.agents.join(', ')} | Capabilities: ${JSON.stringify(info.capabilities)}`;
}).join('\n')}

Når du modtager en opgave, skal du:
1. Identificere opgavens behov (reasoning, coding, vision, tools, context, speed)
2. Matche behovene mod capability‑matrixen
3. Vælge modellen med højeste matchscore
4. Skifte model autonomt hvis nødvendigt ([SET_MODEL: model_name])

AGENT HANDOFF PROTOCOL:
- chat: General brainstorm and system management.
- webdesign: Coding, UI/UX and frontend development.
- security: Security analysis and log audit.
- ollamaWeb: You (Web Search API).

For at overdrage opgaver, brug: [TRANSFER: agent_id].
Eksempel: "Jeg har fundet de nødvendige informationer på nettet. Jeg foreslår vi sender dem til kodning: [TRANSFER: webdesign]".
VIGTIGT: NÅR DU ER HELT FÆRDIG MED DIN RESEARCH-OPGAVE OG HAR FUNDET SVARET TIL BRUGEREN, SKAL DU RAPPORTERE TILBAGE TIL SUPERVISOR VED AT SKRIVE: [TRANSFER: chat] efterfulgt af den samlede opsummering.

When you need to search, use: [SEARCH: your query]
When you need to fetch a page, use: [FETCH: https://url.com] or [FETCH: https://url.com | screenshot]
When you need to interact, use: [ACTION: click | #button-id] or [ACTION: type | #input-id | some text]

VISUAL FEEDBACK:
The system automatically detects screenshot paths (e.g., /preview/web-snap-xxx.png) in your messages and renders them in a high-quality viewer. 
- DO NOT use Markdown image syntax (![alt](path)). Just mention the path or the tool result.
- If you have a screenshot, describe what you see in it to help the user.
`;

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

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 bg-bg-light border border-border rounded-lg hover:border-[#FF7A2F]/50 hover:text-[#FF7A2F] transition-all"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
            <Globe className="w-16 h-16 text-brand animate-pulse" />
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 p-5 rounded-2xl border transition-all",
                msg.role === 'user' ? (isToolResult ? "bg-bg-dark/30 border-brand/10 p-3" : "bg-surface border-border") : 
                msg.role === 'tool' ? "bg-bg-dark/30 border-brand/10 p-3" :
                "bg-brand/5 border-brand/10"
              )}
            >
              <div className="flex-shrink-0">
                {msg.role === 'user' ? (
                  isToolResult ? (
                    <div className="w-8 h-8 bg-brand/5 border border-brand/10 rounded-lg flex items-center justify-center text-brand/40">
                      <Terminal className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-bg-light border border-border rounded-lg flex items-center justify-center text-text-muted">
                      <User className="w-5 h-5" />
                    </div>
                  )
                ) : (
                  <div className="w-8 h-8 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-center text-brand">
                    <Bot className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {!isToolResult && (
                  <div className="text-[9px] font-mono uppercase text-text-muted mb-2 tracking-widest font-bold">
                    {msg.role === 'user' ? 'Operator' : 'OllamaWeb'}
                  </div>
                )}
                
                {msg.thinking && <ThinkingBlock thinking={msg.thinking} />}
                
                {isToolResult ? (
                  <ToolResultBlock content={msg.content} />
                ) : (
                  <div className="text-sm leading-relaxed prose prose-invert max-w-none text-text-main relative group">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    
                    {/* Visual Feedback for Screenshots */}
                    {(() => {
                      const screenshotMatch = msg.content.match(/\/preview\/(?:web|action)-snap-\d+\.png/);
                      if (screenshotMatch) {
                        const screenshotUrl = screenshotMatch[0];
                        return (
                          <div className="mt-4 rounded-xl overflow-hidden border border-brand/20 shadow-2xl bg-bg-dark/50">
                            <div className="px-3 py-1.5 bg-brand/10 border-b border-brand/10 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                <span className="text-[9px] font-mono text-brand uppercase tracking-widest font-bold">Visual Capture</span>
                              </div>
                              <Maximize2 className="w-3 h-3 text-brand/50" />
                            </div>
                            <img 
                              src={screenshotUrl} 
                              alt="Web Screenshot" 
                              className="w-full h-auto object-contain max-h-[600px] bg-white/5"
                              referrerPolicy="no-referrer"
                              onLoad={(e) => {
                                // Ensure scroll to bottom when image loads
                                if (scrollRef.current) {
                                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                                }
                              }}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {msg.role !== 'tool' && (
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="absolute -top-2 -right-2 p-1.5 bg-bg-light border border-border rounded-md opacity-0 group-hover:opacity-100 transition-all hover:border-brand/50 hover:text-brand"
                        title="Copy to clipboard"
                      >
                        {copiedId === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}
                
                {msg.role === 'assistant' && !isToolResult && (
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
          <div className="flex gap-4 p-5 bg-brand/5 border border-brand/10 rounded-2xl animate-pulse">
            <div className="w-8 h-8 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-center text-brand/50">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-2 bg-brand/10 rounded w-1/4"></div>
              <div className="h-2 bg-brand/10 rounded w-3/4"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-none p-6 border-t border-border bg-surface/80 backdrop-blur-xl">
        <AnimatePresence>
          {agentStatus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-4xl mx-auto mb-4 flex items-center gap-3 px-4 py-2 bg-brand/5 border border-brand/20 rounded-xl"
            >
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 rounded-full bg-brand animate-bounce" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand font-black">
                Agent State: <span className="text-text-main ml-2">{agentStatus}</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }} 
          className="flex gap-3 max-w-4xl mx-auto w-full"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter research query..."
            disabled={isLoading || !apiKey}
            className="flex-1 px-5 py-4 bg-bg-light border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand/50 text-sm text-text-main placeholder:text-text-muted transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !apiKey}
            className="px-8 py-4 bg-brand text-bg-dark font-black uppercase tracking-widest text-xs rounded-xl disabled:opacity-20 flex items-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(79,227,212,0.3)]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute</span>
          </button>
        </form>
      </div>
    </div>
  );
}
