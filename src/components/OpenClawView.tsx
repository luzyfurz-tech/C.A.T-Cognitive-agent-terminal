import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, MousePointer2, Camera, Code, Loader2, Bot, User, ChevronDown, Trash2, ExternalLink, Layout, Maximize2, Minimize2, Shield, Terminal, Settings2, Send, Info } from 'lucide-react';
import MasterPromptModal from './MasterPromptModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import AgentTransfer, { AgentType } from './AgentTransfer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: 'goto' | 'screenshot' | 'script' | 'click' | 'type' | 'press';
    url?: string;
    script?: string;
    selector?: string;
    text?: string;
    key?: string;
    status: 'idle' | 'executing' | 'success' | 'error';
    result?: any;
  };
}

interface OpenClawViewProps {
  apiKey: string;
  selectedModel: string;
  models: any[];
  onModelChange: (model: string) => void;
  isAgentMode: boolean;
  remoteEndpoint?: string;
  modelsInfo: any;
  onTransfer: (target: AgentType) => void;
}

export default function OpenClawView({ apiKey, selectedModel, models, onModelChange, isAgentMode, remoteEndpoint, modelsInfo, onTransfer }: OpenClawViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [browserContent, setBrowserContent] = useState<string>('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [remoteSelector, setRemoteSelector] = useState('');
  const [remoteText, setRemoteText] = useState('');
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const DEFAULT_SYSTEM_PROMPT = `You are OpenClaw, an autonomous web research agent. 
You can browse the web using Playwright to research design trends, technical documentation, or any information the user needs.

WORKSPACE: web_design_workspace/openclaw/
All research data, logs, and findings should be organized here.
ENVIRONMENT: Linux/Raspberry Pi OS.

ANTI-BOT & STEALTH:
- You use a persistent browser context to maintain login sessions.
- You use stealth plugins and human-like delays to avoid detection.
- When performing multiple actions, wait a few seconds between them.

COMMANDS:
- To navigate to a URL: [BROWSER: goto https://example.com]
- To take a screenshot: [BROWSER: screenshot]
- To click an element: [BROWSER: click #login-button]
- To type text: [BROWSER: type #username | myuser]
- To press a key: [BROWSER: press Enter]
- To run a script: [BROWSER: script | document.title]

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

Brug altid modeller med tools når du skal bruge terminal, filsystem eller browser.
Brug altid modeller med vision når du skal analysere billeder eller websider.
Brug altid modeller med thinking når opgaven kræver dyb reasoning.

AGENT HANDOFF PROTOCOL:
Du kan foreslå at overdrage opgaven til en anden specialiseret agent hvis du mener de er bedre egnet.
Agenter:
- chat: Generel brainstorm og systemstyring.
- webdesign: Kodning, UI/UX og frontend udvikling.
- security: Sikkerhedsanalyse, penetrationstest og log-audit.
- openclaw: Browser-baseret research og automation.

For at foreslå en overdragelse, brug: [TRANSFER: agent_id].
Eksempel: "Jeg har fundet de nødvendige informationer på nettet. Jeg foreslår vi sender dem til kodning: [TRANSFER: webdesign]"

Always explain what you are looking for before executing a browser command.
When you get the content or screenshot, analyze it and summarize the findings for the user.`;

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const executeBrowserAction = async (idx: number, actionType: any, params: any) => {
    const updatedMessages = [...messages];
    updatedMessages[idx].action = { type: actionType, ...params, status: 'executing' };
    setMessages(updatedMessages);

    try {
      const baseUrl = remoteEndpoint || '';
      const response = await fetch(`${baseUrl}/api/browser/exec`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ action: actionType, ...params })
      });

      const data = await response.ok ? await response.json() : { error: await response.text() };
      
      if (response.ok) {
        updatedMessages[idx].action!.status = 'success';
        if (actionType === 'goto') setBrowserContent(data.content);
        if (actionType === 'screenshot') setScreenshot(data.path);
        updatedMessages[idx].action!.result = data;
      } else {
        updatedMessages[idx].action!.status = 'error';
        updatedMessages[idx].action!.result = data.error;
      }
      setMessages([...updatedMessages]);
    } catch (err: any) {
      updatedMessages[idx].action!.status = 'error';
      updatedMessages[idx].action!.result = err.message;
      setMessages([...updatedMessages]);
    }
  };

  const handleRemoteAction = async (action: 'click' | 'type' | 'press', params: any) => {
    setIsRemoteLoading(true);
    try {
      const baseUrl = remoteEndpoint || '';
      const response = await fetch(`${baseUrl}/api/browser/exec`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ action, ...params })
      });
      
      if (response.ok) {
        // Auto-refresh screenshot after interaction
        const snapRes = await fetch(`${baseUrl}/api/browser/exec`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({ action: 'screenshot' })
        });
        const snapData = await snapRes.json();
        setScreenshot(snapData.path);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoteLoading(false);
    }
  };

  // Auto-execute browser commands in Agent Mode
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (isAgentMode && !isLoading && lastMessage?.role === 'assistant' && !lastMessage.action) {
      // Handle model switching
      const modelToSet = parseModelSwitch(lastMessage.content);
      if (modelToSet) {
        const exists = models.some(m => m.name === modelToSet);
        if (exists) {
          onModelChange(modelToSet);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `[SYSTEM]: Model switched to ${modelToSet} for Research view.` 
          }]);
          return;
        }
      }

      const commands = lastMessage.content.matchAll(/\[BROWSER:\s*(goto|screenshot|script|click|type|press)\s*([^|\]]*)(?:\s*\|\s*(.*))?\]/g);
      
      const executeAll = async () => {
        let currentIdx = messages.length - 1;
        for (const match of commands) {
          const action = match[1] as any;
          const param1 = match[2]?.trim();
          const param2 = match[3]?.trim();
          
          let params: any = {};
          if (action === 'goto') params.url = param1;
          if (action === 'screenshot') params.url = param1 || undefined;
          if (action === 'click') params.selector = param1;
          if (action === 'type') { params.selector = param1; params.text = param2; }
          if (action === 'press') params.key = param1;
          if (action === 'script') params.script = param1;

          await executeBrowserAction(currentIdx, action, params);
        }
      };

      executeAll();
    }
  }, [messages, isAgentMode, isLoading]);

  const parseModelSwitch = (text: string) => {
    const match = text.match(/\[SET_MODEL:\s*(.*?)\]/);
    return match ? match[1] : null;
  };

  const parseTransfer = (text: string) => {
    const match = text.match(/\[TRANSFER:\s*(.*?)\]/);
    return match ? match[1] as AgentType : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel || !apiKey || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

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
            ...newMessages.map(m => ({ role: m.role, content: m.content }))
          ],
          stream: false
        })
      });

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.message.content };
      
      // Check for browser commands
      const browserMatch = assistantMessage.content.match(/\[BROWSER:\s*(goto|screenshot|script|click|type|press)\s*([^|\]]*)(?:\s*\|\s*(.*))?\]/);
      
      setMessages(prev => [...prev, assistantMessage]);

      if (browserMatch) {
        const action = browserMatch[1] as any;
        const param1 = browserMatch[2]?.trim();
        const param2 = browserMatch[3]?.trim();
        
        let params: any = {};
        if (action === 'goto') params.url = param1;
        if (action === 'screenshot') params.url = param1 || undefined;
        if (action === 'click') params.selector = param1;
        if (action === 'type') { params.selector = param1; params.text = param2; }
        if (action === 'press') params.key = param1;
        if (action === 'script') params.script = param1;

        await executeBrowserAction(newMessages.length, action, params);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-surface modern-grid">
      {/* Left Pane: Research Chat */}
      <div className="w-[450px] flex-none flex flex-col border-r border-border bg-surface/50 backdrop-blur-sm shadow-xl z-10">
        <div className="flex-none p-6 border-b border-border bg-bg-light/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF7A2F]/10 rounded-lg">
              <Search className="w-5 h-5 text-[#FF7A2F]" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl font-bold text-text-main leading-none">OpenClaw</h2>
              <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">Autonomous Research</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-[#4FE3D4]/10 border border-[#4FE3D4]/20 rounded-full text-[8px] text-[#4FE3D4] font-bold uppercase tracking-tighter">
              <Shield className="w-2.5 h-2.5" />
              Stealth
            </div>
            <button onClick={() => setMessages([])} className="p-2 hover:bg-[#FF7A2F]/10 hover:text-[#FF7A2F] rounded-lg transition-all text-text-muted">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex-none px-6 py-3 border-b border-border bg-surface/50">
          <div className="relative">
            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FF7A2F]/50" />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-bg-light border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A2F]/20 focus:border-[#FF7A2F]/50 text-[11px] font-bold uppercase tracking-wider appearance-none text-text-main transition-all cursor-pointer"
            >
              {models.map((m, idx) => (
                <option key={idx} value={m.name}>{m.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-text-muted" />
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex flex-col gap-3", msg.role === 'user' ? "items-end" : "items-start")}>
              <div className={cn("max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm", msg.role === 'user' ? "bg-bg-light border border-border text-text-main" : "bg-[#FF7A2F]/5 border border-[#FF7A2F]/20 text-text-main")}>
                <div className="markdown-body prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#0A0F1A] prose-pre:text-[#A8B2C0] prose-invert">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.role === 'assistant' && (
                  <AgentTransfer 
                    currentAgent="openclaw" 
                    onTransfer={onTransfer}
                    suggestedAgent={parseTransfer(msg.content)}
                  />
                )}
              </div>
              {msg.action && (
                <div className="w-full bg-[#0A0F1A] border border-[#A8B2C0]/20 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {msg.action.type === 'goto' && <Globe className="w-4 h-4 text-[#6EC8FF]" />}
                    {msg.action.type === 'screenshot' && <Camera className="w-4 h-4 text-[#FF7A2F]" />}
                    {msg.action.type === 'script' && <Code className="w-4 h-4 text-[#FF7A2F]" />}
                    {msg.action.type === 'click' && <MousePointer2 className="w-4 h-4 text-[#FF7A2F]" />}
                    {msg.action.type === 'type' && <Terminal className="w-4 h-4 text-[#4FE3D4]" />}
                    <span className="text-[10px] font-mono text-[#A8B2C0] truncate max-w-[200px]">{msg.action.url || msg.action.selector || msg.action.key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {msg.action.status === 'executing' && <Loader2 className="w-3 h-3 animate-spin text-[#FF7A2F]" />}
                    <span className={cn("text-[9px] font-black uppercase tracking-tighter", msg.action.status === 'success' ? "text-[#4FE3D4]" : msg.action.status === 'error' ? "text-[#FF7A2F]" : "text-text-muted")}>
                      {msg.action.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-[#FF7A2F] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-widest">OpenClaw Thinking...</span>
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
          <form onSubmit={handleSubmit} className="relative group">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Research design trends..."
              className="w-full pl-5 pr-14 py-4 bg-surface border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-sm shadow-sm transition-all"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#FF7A2F] text-[#0A0F1A] rounded-xl disabled:opacity-20 shadow-lg shadow-[#FF7A2F]/20 hover:bg-[#FF7A2F]/80 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Pane: Browser View */}
      <div className="flex-1 flex flex-col bg-[#101A2A] relative">
        <MasterPromptModal
          isOpen={isMasterPromptOpen}
          onClose={() => setIsMasterPromptOpen(false)}
          prompt={systemPrompt}
          onSave={setSystemPrompt}
          defaultPrompt={DEFAULT_SYSTEM_PROMPT}
          title="OpenClaw Researcher Personality"
        />
        <div className="flex-none h-12 bg-[#0A0F1A] border-b border-[#A8B2C0]/20 flex items-center px-4 gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF7A2F]" />
            <div className="w-3 h-3 rounded-full bg-[#6EC8FF]" />
            <div className="w-3 h-3 rounded-full bg-[#4FE3D4]" />
          </div>
          <div className="flex-1 bg-[#101A2A] rounded-lg h-8 flex items-center px-3 gap-2 border border-[#A8B2C0]/20">
            <Globe className="w-3.5 h-3.5 text-[#A8B2C0]" />
            <span className="text-xs text-[#A8B2C0] font-mono truncate">
              {remoteEndpoint ? `Remote: ${remoteEndpoint}` : 'Local Research Environment'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleRemoteAction('press', { key: 'Enter' })}
              disabled={isRemoteLoading}
              className="p-1.5 bg-[#101A2A] border border-[#A8B2C0]/20 rounded hover:bg-[#6EC8FF]/10 transition-all text-[#A8B2C0]"
              title="Press Enter"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => executeBrowserAction(messages.length, 'screenshot', {})}
              disabled={isRemoteLoading}
              className="p-1.5 bg-[#101A2A] border border-[#A8B2C0]/20 rounded hover:bg-[#6EC8FF]/10 transition-all text-[#A8B2C0]"
              title="Refresh Screenshot"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-8 flex flex-col items-center gap-6">
          {screenshot ? (
            <div className="relative max-w-full shadow-2xl rounded-xl overflow-hidden border border-[#A8B2C0]/20 group">
              <img 
                src={screenshot.startsWith('http') ? screenshot : `/preview/${screenshot.split('/').pop()}`} 
                alt="Browser Screenshot" 
                className="max-w-full h-auto" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                <span className="bg-[#0A0F1A]/90 text-[#4FE3D4] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">Remote Control Active</span>
              </div>
            </div>
          ) : browserContent ? (
            <div className="w-full h-full bg-[#0A0F1A] rounded-xl shadow-sm border border-[#A8B2C0]/20 p-8 font-mono text-xs overflow-auto text-[#A8B2C0]">
              <pre>{browserContent}</pre>
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-20 mt-20 text-[#A8B2C0]">
              <Globe className="w-24 h-24 mx-auto" />
              <p className="font-serif italic text-xl">Awaiting Research Action</p>
            </div>
          )}

          {/* Remote Control Panel */}
          <div className="w-full max-w-2xl bg-[#0A0F1A] border border-[#A8B2C0]/20 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="flex-1 relative">
              <MousePointer2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8B2C0]" />
              <input 
                value={remoteSelector}
                onChange={(e) => setRemoteSelector(e.target.value)}
                placeholder="Selector (e.g. #login-btn)"
                className="w-full pl-9 pr-4 py-2 bg-[#101A2A] border border-[#A8B2C0]/20 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]/50 text-[#A8B2C0] placeholder:text-[#A8B2C0]/50"
              />
            </div>
            <div className="flex-1 relative">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8B2C0]" />
              <input 
                value={remoteText}
                onChange={(e) => setRemoteText(e.target.value)}
                placeholder="Text to type..."
                className="w-full pl-9 pr-4 py-2 bg-[#101A2A] border border-[#A8B2C0]/20 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF7A2F]/50 text-[#A8B2C0] placeholder:text-[#A8B2C0]/50"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleRemoteAction('click', { selector: remoteSelector })}
                disabled={isRemoteLoading || !remoteSelector}
                className="px-4 py-2 bg-[#FF7A2F] text-[#0A0F1A] text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#FF7A2F]/80 transition-all disabled:opacity-50"
              >
                Click
              </button>
              <button 
                onClick={() => handleRemoteAction('type', { selector: remoteSelector, text: remoteText })}
                disabled={isRemoteLoading || !remoteSelector || !remoteText}
                className="px-4 py-2 bg-[#6EC8FF] text-[#0A0F1A] text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#6EC8FF]/80 transition-all disabled:opacity-50"
              >
                Type
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
