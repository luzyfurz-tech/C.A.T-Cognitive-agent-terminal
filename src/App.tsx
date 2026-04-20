import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Key, Settings, Loader2, RefreshCw, Trash2, ChevronDown, X, Globe, Shield, Terminal, Play, CheckCircle2, AlertCircle, Layout, Maximize2, Minimize2, Box, Search, Info, Brain, ChevronRight, Zap, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import FileBrowser from './components/FileBrowser';
import WebdesignView from './components/WebdesignView';
import DockerView from './components/DockerView';
import SecurityView from './components/SecurityView';
import OllamaWebView from './components/OllamaWebView';
import HermesView from './components/HermesView';
import BootSequence from './components/BootSequence';
import CATLogo from './components/CATLogo';
import ModelInfoModal from './components/ModelInfoModal';
import AgentTransfer, { AgentType } from './components/AgentTransfer';
import AgentTips from './components/AgentTips';
import modelsInfo from '../models_info.json';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  command?: {
    text: string;
    status: 'pending' | 'executing' | 'success' | 'error';
    output?: string;
  };
}

interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

const DEFAULT_API_KEY = '177ce4df955743d8a338c841383e5002.0Lus05Xg-KF5ilWRNqSegtPo';
const DEFAULT_HOST = 'https://ollama.com';

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('ollama_api_key') || DEFAULT_API_KEY);
  const ollamaHost = DEFAULT_HOST;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [viewModels, setViewModels] = useState<Record<string, string>>({
    chat: localStorage.getItem('chat_model') || '',
    webdesign: localStorage.getItem('webdesign_model') || '',
    docker: localStorage.getItem('docker_model') || '',
    ollamaWeb: localStorage.getItem('ollamaweb_model') || '',
    security: localStorage.getItem('security_model') || '',
    hermes: localStorage.getItem('hermes_model') || ''
  });
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('app_theme') || 'modern');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isAgentMode, setIsAgentMode] = useState(true);
  const [isFullAutonomy, setIsFullAutonomy] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(true);
  const [pendingTransfer, setPendingTransfer] = useState<{ target: string; content: string } | null>(null);
  const [transferNotification, setTransferNotification] = useState<{ target: string; show: boolean }>({ target: '', show: false });
  const [currentView, setCurrentView] = useState<'chat' | 'webdesign' | 'docker' | 'ollamaWeb' | 'security' | 'hermes'>('chat');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [disabledModels, setDisabledModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('disabled_models');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('disabled_models', JSON.stringify(disabledModels));
  }, [disabledModels]);

  const toggleModelStatus = (modelName: string) => {
    setDisabledModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    );
  };
  const [analyzeTarget, setAnalyzeTarget] = useState<any>(null);
  const [osInfo, setOsInfo] = useState<string>('Linux');
  const [currentCwd, setCurrentCwd] = useState<string>('');
  const [isBooting, setIsBooting] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggeredTransfers = useRef<Set<number>>(new Set());

  const ThinkingBlock = ({ thinking }: { thinking: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div className="mb-4 rounded-xl border border-[#6EC8FF]/10 bg-[#0A0F1A]/40 overflow-hidden shadow-inner">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#6EC8FF]/5 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#6EC8FF]/10 rounded-lg group-hover:bg-[#6EC8FF]/20 transition-colors">
              <Brain className="w-3.5 h-3.5 text-[#6EC8FF]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6EC8FF]/70">Cognitive Process</span>
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
              <div className="px-4 pb-4 pt-2 text-[11px] text-text-muted italic leading-relaxed border-t border-[#6EC8FF]/5 font-serif">
                {thinking}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Save API key to local storage
  useEffect(() => {
    localStorage.setItem('ollama_api_key', apiKey);
  }, [apiKey]);

  // Fetch models when API key or host changes
  useEffect(() => {
    if (apiKey && ollamaHost) {
      fetchModels();
    } else {
      setConnectionStatus('idle');
      setModels([]);
    }
  }, [apiKey, ollamaHost]);

  // Load chat history on mount
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setOsInfo(data.os);
        if (data.cwd) setCurrentCwd(data.cwd);
      } catch (err) {
        console.error("Failed to fetch health:", err);
      }
    };
    fetchHealth();

    fetch(`/api/chat/history/chat_main`)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(console.error);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (pendingTransfer && pendingTransfer.target === 'chat' && currentView === 'chat') {
      sendMessage(pendingTransfer.content);
      setPendingTransfer(null);
    }
  }, [pendingTransfer, currentView]);

  // Auto-execute commands and transfers in Agent Mode
  useEffect(() => {
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    if (isAgentMode && !isLoading && (lastMessage?.role === 'assistant' || lastMessage?.role === 'user') && !lastMessage.command) {
      // Handle model switching
      const modelToSet = parseModelSwitch(lastMessage.content);
      if (modelToSet && lastMessage.role === 'assistant') { // Model switching still restricted to assistant for flow consistency
        const canSwitch = models.some(m => m.name === modelToSet && !disabledModels.includes(m.name));
        if (canSwitch) {
          setViewModels(prev => ({ ...prev, [currentView]: modelToSet }));
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `[SYSTEM]: Model switched to ${modelToSet} for ${currentView} view.` 
          }]);
          return;
        } else {
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `[SYSTEM]: Cannot switch to ${modelToSet}. Model is either not available or deactivated.` 
          }]);
        }
      }

      // Handle auto-transfer
      const transferTarget = parseTransfer(lastMessage.content);
      if (transferTarget && !triggeredTransfers.current.has(lastMessageIndex)) {
        triggeredTransfers.current.add(lastMessageIndex);
        handleTransfer(transferTarget, lastMessage.content);
        return;
      }

      const cmdText = parseCommand(lastMessage.content);
      if (cmdText) {
        // Full autonomy enabled - execute all commands (including user-initiated ones for rapid workflow)
        executeCommand(lastMessageIndex, cmdText);
      }
    } else if (isAgentMode && !isLoading && lastMessage?.role === 'assistant' && lastMessage.command) {
      if (lastMessage.command.status === 'success' || lastMessage.command.status === 'error') {
        if (!triggeredTransfers.current.has(lastMessageIndex)) {
          triggeredTransfers.current.add(lastMessageIndex);
          
          if (lastMessage.command.status === 'success') {
            const transferTarget = parseTransfer(lastMessage.content);
            if (transferTarget) {
              handleTransfer(transferTarget, lastMessage.content);
              return;
            }
          }

          const autoReply = lastMessage.command.status === 'error'
            ? "[SYSTEM AUTO-REPLY] Command FAILED! Process the error output and correct your command immediately."
            : "[SYSTEM AUTO-REPLY] Command executed successfully. View the outcome block. If the mission is fully completed, summarize it to the user. If more work is needed, delegate or execute.";
          setTimeout(() => {
            sendMessage(autoReply);
          }, 300); // Super fast 300ms loop
        }
      }
    }
  }, [messages, isAgentMode, isLoading, models, currentView, disabledModels]);

  useEffect(() => {
    localStorage.setItem('chat_model', viewModels.chat);
    localStorage.setItem('webdesign_model', viewModels.webdesign);
    localStorage.setItem('docker_model', viewModels.docker || '');
    localStorage.setItem('ollamaweb_model', viewModels.ollamaWeb || '');
    localStorage.setItem('security_model', viewModels.security || '');
    localStorage.setItem('hermes_model', viewModels.hermes || '');
  }, [viewModels]);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const fetchModels = async () => {
    if (!apiKey) return;
    setIsFetchingModels(true);
    setConnectionStatus('connecting');
    setError(null);
    try {
      // Fetch OS info first
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      setOsInfo(healthData.os);

      const response = await fetch('/api/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-ollama-host': ollamaHost,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch models. Check your API key.');
      const data = await response.json();
      const modelList = data.models || [];
      setModels(modelList);
      setConnectionStatus('connected');
      if (modelList.length > 0) {
        setViewModels(prev => ({
          chat: prev.chat || modelList[0].name,
          webdesign: prev.webdesign || modelList[0].name,
          docker: prev.docker || modelList[0].name,
          security: prev.security || modelList[0].name,
          ollamaWeb: prev.ollamaWeb || modelList[0].name
        }));
      }
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !viewModels.chat || !apiKey || isLoading) return;

    const userMessage: Message = { role: 'user', content };
    
    // Log user directive and set supervisor to working
    if (content !== '[SYSTEM AUTO-REPLY] Command execution finished. Output is in the system context. What is your next step? If the user\'s mission is fully completed, summarize the outcome.') {
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          agent_id: 'chat', // Log under chat to trigger mission active state
          type: 'directive',
          event: 'User Directive / Supervisor Tasked',
          content: content,
          status: 'Start'
        })
      }).catch(console.error);
    } else {
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          agent_id: 'chat',
          type: 'event',
          event: 'Supervisor processing Auto-Reply',
          content: 'Processing execution results...',
          status: 'Start'
        })
      }).catch(console.error);
    }
    
    // Inject file context if a file is selected in the browser
    let contextualMessages = [...messages, userMessage];
    if (selectedFile) {
      const fileContext = `[REFERENCE CONTEXT: The user has highlighted the file "${selectedFile.name}" at path "${selectedFile.path}" in their browser. This is for your situational awareness and reference only. It does NOT necessarily define the project root or target directory for new operations unless explicitly requested.]`;
      contextualMessages = [
        ...messages,
        { role: 'user', content: `${fileContext}\n\n${content}` }
      ];
    }

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Save to persistent DB
    fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        view_id: 'chat_main',
        role: 'user',
        content: content
      })
    }).catch(console.error);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'x-ollama-host': ollamaHost,
        },
        body: JSON.stringify({
          model: viewModels.chat,
          messages: isAgentMode 
            ? [
                { 
                  role: 'system', 
                  content: `You are the SUPERVISOR (C.A.T. Main Agent). You have high autonomy but a VERY SPECIFIC role.

CRITICAL ROLE CONSTRAINT: 
You are the SUPERVISOR. You do NOT write code, you do NOT perform security audits, and you do NOT browse the web yourself. 
Your ONLY job is to understand the user's request, break it down into a plan, and DELEGATE the actual work to the specialist agents using [TRANSFER: agent_id]. 
If the user asks for a website, you MUST transfer to 'webdesign'. If they ask for a security scan, transfer to 'security'. DO NOT attempt to do their jobs.

If a task requires a quick system check, you can EXECUTE shell commands directly by wrapping them in [EXECUTE: command]. 
Example: [EXECUTE: ls -la].

MODEL KNOWLEDGE BASE — C.A.T v2.0
Du har adgang til følgende Ollama Cloud‑modeller.
Hver model har en beskrivelse, tags, anbefalet agent‑brug og en capability‑matrix (0–10).

Brug disse data til at forstå modellernes styrker, vælge den bedste model til en opgave og skifte model autonomt via [SET_MODEL: model_name].

MODEL DATABASE:
${models.filter(m => !disabledModels.includes(m.name)).map(m => {
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

AGENT HANDOFF PROTOCOL & MULTI-AGENT ORCHESTRATION:
Du SKAL overdrage opgaven til en specialiseret agent, så snart planen er lagt. Når agenterne er færdige, vil de automatisk returnere et AGENT REPORT tilbage til dig.
Din opgave er at vurdere denne rapport. Skal resultatet videregives til en anden agent for næste skridt? Hvis ja, brug [TRANSFER] med det samme. Hvis opgaven er 100% løst, så rapportér det til brugeren.
VIGTIGT: Når Web-agenten har færdiggjort koden, skal du ALTID spørge brugeren om tilladelse før du beder systemet om at "Launch Docker" eller "Start Container". Du må ikke deploye autonomt uden at have spurgt om lov til netop deployment-delen til sidst.

Agenter:
- chat: Dig (Supervisor). Generel brainstorm, godkendelse af agentrapporter og systemstyring.
- webdesign: Kodning, UI/UX, Docker og frontend udvikling. BRUG DENNE TIL AL KODNING.
- security: Sikkerhedsanalyse, penetrationstest og log-audit.
- ollamaWeb: Web research og interaktion (Søge, Fetch, Screenshot, Click/Type).
- hermes: Avanceret tool-calling, API integrationer og CLI-baseret interaktion. BRUG DENNE til integrationer eller komplekse tool-tasks.

For at overdrage, brug: [TRANSFER: agent_id].
Eksempel 1 (Uddelegering): "Jeg starter researchfasen: [TRANSFER: ollamaWeb]"
Eksempel 2 (Modtaget rapport, videresender): "Web agenten har fundet dokumentationen. Jeg sender det videre til kodning: [TRANSFER: webdesign]"

EFFICIENCY & TONE:
- NO CHITCHAT. Vær ekstremt kortfattet for at spare tokens og tid.
- Direkte Handoffs: Fortæl agenterne at de gerne må overdrage direkte til hinanden (f.eks. Code -> Security) hvis opgaven kræver det, uden at runde dig først, medmindre de er helt færdige med missionen.

AUTONOMY RULES:
1. You are authorized to execute most commands (reading files, listing directories, checking system status) autonomously without asking.
2. EXCEPTIONS: ${isFullAutonomy ? 'You are in FULL AUTONOMY mode. You are authorized to delegate tasks, switch models, and execute commands (including writing files and installing packages) to complete the mission without further input. Use [DELEGATE: agent_id] to coordinate.' : 'You MUST ask for explicit user confirmation BEFORE: Deleting any file or directory, Installing any new package, or Editing/Writing to files.'}

For all other actions, just do it. If you need to analyze a file, read it first using 'cat' or 'head'.
HOST OS: ${osInfo}. (VIGTIGT: Dette er et Linux/Raspberry Pi OS miljø. Brug Bash kommandoer). 
ABSOLUT ROD-STI (CWD): ${currentCwd}. Brug altid relative stier fra denne rod. Husk at agenterne skal oprette mapper med 'mkdir -p' før de skriver filer for at undgå fejl.
${selectedFile ? `The user has a file highlighted: "${selectedFile.path}". Use this for reference, but ALWAYS confirm the target directory before starting a new project or performing bulk operations. Do NOT assume the highlighted file's directory is the project root. If the user says "start project", ask where.` : 'No file is currently highlighted for reference.'}
${showFileBrowser ? 'The File Browser is currently visible.' : 'The File Browser is currently MINIMIZED (Minimalisme mode).'}
CRITICAL: If the user requests a new project or a bulk operation, you MUST identify the target directory. If a file is highlighted in [REFERENCE CONTEXT], do NOT assume its directory is the project root. Always ask for clarification if the target path is ambiguous.` 
                },
                ...contextualMessages.map(m => {
                  let ctx = m.content;
                  if (m.command && m.command.status !== 'executing') {
                    ctx += `\n\n[COMMAND EXECUTION RESULT]\n$ ${m.command.text}\n${m.command.output}`;
                  }
                  return { role: m.role, content: ctx };
                })
              ]
            : contextualMessages,
          stream: streamEnabled,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get response');
      }

      if (streamEnabled) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const assistantMessage: Message = { role: 'assistant', content: '' };
        setMessages((prev) => [...prev, assistantMessage]);

        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let accumulatedThinking = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.message?.content) {
                  accumulatedContent += data.message.content;
                }
                if (data.message?.thinking) {
                  accumulatedThinking += data.message.thinking;
                }
                
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulatedContent,
                    thinking: accumulatedThinking || undefined
                  };
                  return updated;
                });
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
        
        // Log the final response to the mission feed
        if (accumulatedContent) {
          fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              view_id: 'chat_main',
              role: 'assistant',
              content: accumulatedContent,
              thinking: accumulatedThinking
            })
          }).catch(console.error);

          fetch('/api/mission/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              agent_id: 'chat',
              type: 'response',
              event: 'Supervisor responded',
              content: accumulatedContent,
              status: 'Success'
            })
          }).catch(console.error);
        }
      } else {
        const data = await response.json();
        if (data.message?.content) {
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: data.message.content,
            thinking: data.message.thinking
          };
          setMessages((prev) => [...prev, assistantMessage]);
          
          fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              view_id: 'chat_main',
              role: 'assistant',
              content: data.message.content,
              thinking: data.message.thinking
            })
          }).catch(console.error);

          // Log the final response to the mission feed
          fetch('/api/mission/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              agent_id: 'chat',
              type: 'response',
              event: 'Supervisor responded',
              content: data.message.content,
              status: 'Success'
            })
          }).catch(console.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
    setInput('');
  };

  const executeCommand = async (msgIndex: number, commandText: string) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = {
        ...updated[msgIndex],
        command: { text: commandText, status: 'executing' }
      };
      return updated;
    });

    try {
      const response = await fetch('/api/local/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ command: commandText }),
      });

      const data = await response.json();
      
      setMessages(prev => {
        const updated = [...prev];
        if (response.ok) {
          updated[msgIndex] = {
            ...updated[msgIndex],
            command: { 
              text: commandText, 
              status: 'success', 
              output: data.stdout || 'Command executed successfully (no output).' 
            }
          };
        } else {
          updated[msgIndex] = {
            ...updated[msgIndex],
            command: { 
              text: commandText, 
              status: 'error', 
              output: data.error || data.stderr || 'Execution failed.' 
            }
          };
        }
        return updated;
      });
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIndex] = {
          ...updated[msgIndex],
          command: { text: commandText, status: 'error', output: err.message }
        };
        return updated;
      });
    }
  };

  const parseCommand = (content: string) => {
    const match = content.match(/\[EXECUTE:\s*(.*?)\]/);
    return match ? match[1].trim() : null;
  };

  const parseTransfer = (text: string) => {
    const match = text.match(/\[TRANSFER:\s*(.*?)\]/);
    return match ? match[1].trim() as AgentType : null;
  };

  const buildTaskContext = (target: string, content?: string) => {
    if (!content) return "";
    
    if (target === 'chat') {
      return `AGENT REPORT:
A specialist agent has returned with results.
CONTEXT / RESULTS:
${content}

Please review this report. If the overarching mission requires further steps, delegate to the next agent. If the mission is fully complete, summarize the final outcome for the user.`;
    }

    return `TASK BRIEF FOR ${target.toUpperCase()}:
The Supervisor has delegated this task to you.
CONTEXT / INSTRUCTIONS:
${content}

Please acknowledge, proceed with the mission, and report back to the supervisor via [TRANSFER: chat] when finished.`;
  };

  const handleTransfer = (target: AgentType, content?: string) => {
    const taskBrief = buildTaskContext(target, content);
    setPendingTransfer({ target, content: taskBrief });
    
    // Show notification
    setTransferNotification({ target, show: true });
    setTimeout(() => setTransferNotification(prev => ({ ...prev, show: false })), 3000);

    setCurrentView(target);
  };

  const parseModelSwitch = (content: string) => {
    const match = content.match(/\[SET_MODEL:\s*(.*?)\]/);
    return match ? match[1].trim() : null;
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    triggeredTransfers.current.clear();
    fetch('/api/chat/history/chat_main', { method: 'DELETE' }).catch(console.error);
  };

  return (
    <>
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      
      {/* Transfer Notification Banner */}
      <AnimatePresence>
        {transferNotification.show && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-brand text-[#0A0F1A] rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Agent Handoff</span>
              <span className="text-xs font-bold uppercase tracking-wider">Transferring to {transferNotification.target}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("h-screen bg-bg-light text-text-main font-sans flex flex-col selection:bg-brand/30 overflow-hidden modern-grid", isBooting && "opacity-0")}>
        {/* Header / Config Bar */}
      <header className="flex-none border-b border-border py-4 px-8 bg-surface/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="w-full flex flex-col md:flex-row gap-6 items-center">
          <div className="flex items-center gap-4 mr-auto group">
            <div className="flex flex-col items-start">
              <CATLogo />
            </div>
          </div>
          
          <div className={cn(
            "w-3.5 h-3.5 rounded-full border-2 border-surface z-10 mr-4",
            connectionStatus === 'connected' ? "bg-[#4FE3D4] shadow-[0_0_8px_rgba(79,227,212,0.6)]" : 
            connectionStatus === 'connecting' ? "bg-[#6EC8FF] animate-pulse" :
            connectionStatus === 'error' ? "bg-[#FF7A2F]" : "bg-surface"
          )} />

          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-bg-light rounded-xl border border-border">
              <button
                onClick={() => setCurrentView('chat')}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  currentView === 'chat' ? "bg-surface text-[#4FE3D4] panel-active" : "text-text-muted hover:text-text-main border border-transparent"
                )}
              >
                Agent
              </button>
              <button
                onClick={() => setCurrentView('webdesign')}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  currentView === 'webdesign' ? "bg-surface text-[#4FE3D4] panel-active" : "text-text-muted hover:text-text-main border border-transparent"
                )}
              >
                Coding
              </button>
              <button
                onClick={() => setCurrentView('docker')}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  currentView === 'docker' ? "bg-surface text-[#4FE3D4] panel-active" : "text-text-muted hover:text-text-main border border-transparent"
                )}
              >
                <Box className="w-3.5 h-3.5" />
                Docker
              </button>
              <button
                onClick={() => setCurrentView('ollamaWeb')}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  currentView === 'ollamaWeb' ? "bg-surface text-[#4FE3D4] panel-active" : "text-text-muted hover:text-text-main border border-transparent"
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                OllamaWeb
              </button>
              <button
                onClick={() => setCurrentView('security')}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  currentView === 'security' ? "bg-surface text-[#4FE3D4] panel-active" : "text-text-muted hover:text-text-main border border-transparent"
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Security
              </button>
              <button
                onClick={() => setCurrentView('hermes')}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  currentView === 'hermes' ? "bg-surface text-[#4FE3D4] panel-active" : "text-text-muted hover:text-text-main border border-transparent"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Hermes
              </button>
            </div>

            {/* Agent Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-light border border-border rounded-lg">
              <Terminal className={cn("w-3 h-3", isAgentMode ? "text-brand" : "text-text-muted")} />
              <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider">Agent</span>
              <button
                onClick={() => setIsAgentMode(!isAgentMode)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                  isAgentMode ? "bg-brand" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 transform rounded-full bg-surface transition-transform",
                    isAgentMode ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Full Autonomy Toggle */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 border rounded-lg transition-all",
              isFullAutonomy ? "bg-brand/10 border-brand/50 shadow-[0_0_10px_rgba(255,122,47,0.2)]" : "bg-bg-light border-border"
            )}>
              <Zap className={cn("w-3 h-3", isFullAutonomy ? "text-brand" : "text-text-muted")} />
              <span className={cn("text-[10px] font-mono uppercase tracking-wider", isFullAutonomy ? "text-brand" : "text-text-muted")}>Autonomy</span>
              <button
                onClick={() => setIsFullAutonomy(!isFullAutonomy)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                  isFullAutonomy ? "bg-brand" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 transform rounded-full bg-surface transition-transform",
                    isFullAutonomy ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Selected Context Indicator */}
            {selectedFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-brand/10 border border-brand/30 rounded-lg animate-in fade-in slide-in-from-right-4">
                <FileText className="w-3.5 h-3.5 text-brand" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-brand/70">Ref Context</span>
                  <span className="text-[10px] font-mono text-text-main truncate max-w-[120px]">
                    {selectedFile.name}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="ml-1 p-1 hover:bg-brand/20 rounded-md transition-colors text-brand"
                  title="Clear Reference Context"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* File Browser Toggle */}
            <button
              onClick={() => setShowFileBrowser(!showFileBrowser)}
              className={cn(
                "p-2 border rounded-lg transition-all flex items-center gap-2",
                showFileBrowser ? "bg-[#4FE3D4]/10 border-[#4FE3D4]/50 text-[#4FE3D4] shadow-[0_0_10px_rgba(79,227,212,0.2)]" : "bg-bg-light border-border text-text-muted hover:text-text-main"
              )}
              title="Toggle File Browser"
            >
              <Layout className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline">Files</span>
            </button>

            <button
              onClick={fetchModels}
              disabled={isFetchingModels || !apiKey}
              className="p-2 bg-bg-light border border-border rounded-lg hover:border-brand/50 hover:text-brand transition-all disabled:opacity-50"
              title="Refresh Models"
            >
              <RefreshCw className={cn("w-4 h-4", isFetchingModels && "animate-spin")} />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-bg-light border border-border rounded-lg hover:border-brand/50 hover:text-brand transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={clearChat}
              className="p-2 bg-bg-light border border-border rounded-lg hover:border-[#FF7A2F]/50 hover:text-[#FF7A2F] transition-all"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      {/* Main Content Area - Split Screen */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Webdesign View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'webdesign' && "hidden")}>
          <WebdesignView 
            apiKey={apiKey} 
            ollamaHost={ollamaHost} 
            selectedModel={viewModels.webdesign}
            models={models}
            disabledModels={disabledModels}
            onModelChange={(model) => setViewModels(prev => ({ ...prev, webdesign: model }))}
            isAgentMode={isAgentMode}
            modelsInfo={modelsInfo}
            onTransfer={handleTransfer}
            pendingTransfer={pendingTransfer}
            onContextUsed={() => setPendingTransfer(null)}
          />
        </div>

        {/* Docker View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'docker' && "hidden")}>
          <DockerView apiKey={apiKey} />
        </div>

        {/* Security View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'security' && "hidden")}>
          <SecurityView 
            apiKey={apiKey} 
            selectedModel={viewModels.security} 
            models={models} 
            disabledModels={disabledModels}
            onModelChange={(model) => setViewModels(prev => ({ ...prev, security: model }))} 
            analyzeTarget={analyzeTarget}
            isAgentMode={isAgentMode}
            modelsInfo={modelsInfo}
            onTransfer={handleTransfer}
            pendingTransfer={pendingTransfer}
            onContextUsed={() => setPendingTransfer(null)}
            onGlobalMessage={sendMessage}
          />
        </div>

        {/* OllamaWeb View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'ollamaWeb' && "hidden")}>
          <OllamaWebView 
            apiKey={apiKey} 
            selectedModel={viewModels.ollamaWeb}
            models={models}
            disabledModels={disabledModels}
            onModelChange={(model) => setViewModels(prev => ({ ...prev, ollamaWeb: model }))}
            isAgentMode={isAgentMode}
            modelsInfo={modelsInfo}
            onTransfer={handleTransfer}
            pendingTransfer={pendingTransfer}
            onContextUsed={() => setPendingTransfer(null)}
          />
        </div>

        {/* Hermes View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'hermes' && "hidden")}>
          <HermesView 
            apiKey={apiKey} 
            selectedModel={viewModels.hermes}
            models={models}
            disabledModels={disabledModels}
            onModelChange={(model) => setViewModels(prev => ({ ...prev, hermes: model }))}
            modelsInfo={modelsInfo}
            isAgentMode={isAgentMode}
            onTransfer={handleTransfer}
            pendingTransfer={pendingTransfer}
            onContextUsed={() => setPendingTransfer(null)}
          />
        </div>

        {/* Main Chat View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'chat' && "hidden")}>
          {/* Left: Chat Area */}
          <main className={cn(
            "flex flex-col relative transition-all duration-300 ease-in-out h-full",
            showFileBrowser ? "w-1/2" : "w-full max-w-5xl mx-auto"
          )}>
            {/* Local Model Selector for Agent */}
            <div className="flex-none px-6 py-3 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="relative w-full max-w-[200px] flex gap-1">
                <div className="relative flex-1">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand/50" />
                  <select
                    value={viewModels.chat}
                    onChange={(e) => setViewModels(prev => ({ ...prev, chat: e.target.value }))}
                    className="w-full pl-9 pr-8 py-2 bg-bg-light border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-[11px] font-bold uppercase tracking-wider appearance-none text-text-main transition-all cursor-pointer"
                  >
                    {models.map((m, idx) => (
                      <option key={idx} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-text-muted" />
                </div>
                <button
                  onClick={() => setIsModelInfoOpen(true)}
                  className="p-2 bg-bg-light border border-border rounded-lg hover:border-brand/50 hover:text-brand transition-all flex-none"
                  title="Model Knowledge Base"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  connectionStatus === 'connected' ? "bg-[#4FE3D4]" : "bg-text-muted"
                )} />
                <span className={cn(
                  "text-[8px] font-mono uppercase tracking-[0.3em] font-black",
                  connectionStatus === 'connected' ? "text-[#4FE3D4] drop-shadow-[0_0_3px_rgba(79,227,212,0.4)]" : 
                  connectionStatus === 'connecting' ? "text-[#6EC8FF]" :
                  connectionStatus === 'error' ? "text-[#FF7A2F]" : "text-text-muted"
                )}>
                  Cognitive Agent Terminal
                </span>
                <span className="text-[7px] font-mono text-text-muted/40 font-bold ml-2">v2.4.0_SECURE</span>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-brand/10 scrollbar-track-transparent"
            >
          {messages.length === 0 && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-[#6EC8FF] blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity animate-pulse" />
                <div className="w-64 h-32 opacity-10 relative transition-all duration-700 group-hover:opacity-30 group-hover:scale-110">
                  <CATLogo />
                </div>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="mb-2">
                  <h1 className="text-5xl font-black tracking-[0.2em] text-[#6EC8FF] drop-shadow-[0_0_15px_rgba(110,200,255,0.3)] font-sans">C.A.T</h1>
                  <p className="text-[10px] font-mono text-[#6EC8FF]/60 tracking-[0.5em] uppercase font-bold mt-1">Cognitive Agent Terminal</p>
                </div>
                <p className="font-serif italic text-3xl text-text-muted/80 tracking-tight">Awaiting Command</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-[1px] w-8 bg-[#4FE3D4]/30" />
                  <p className="text-[10px] font-mono text-[#4FE3D4] tracking-[0.4em] uppercase font-bold">Encryption active • System ready</p>
                  <div className="h-[1px] w-8 bg-[#4FE3D4]/30" />
                </div>
                <AgentTips agentType="chat" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-[#FF7A2F]/10 border border-[#FF7A2F]/20 text-[#FF7A2F] text-xs font-mono rounded-lg">
              <span className="font-bold mr-2">[SYSTEM ERROR]:</span> {error}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={`msg-${idx}-${msg.role}`}
              className={cn(
                "flex gap-5 p-6 rounded-2xl transition-all group",
                msg.role === 'user' 
                  ? "bg-surface border border-border shadow-sm" 
                  : "bg-[#6EC8FF]/5 border border-[#6EC8FF]/10"
              )}
            >
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'user' ? (
                  <div className="w-10 h-10 bg-bg-light border border-border rounded-xl flex items-center justify-center text-text-muted group-hover:text-[#6EC8FF] transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-[#6EC8FF]/10 border border-[#6EC8FF]/20 rounded-xl flex items-center justify-center text-[#6EC8FF]">
                    <Terminal className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono uppercase text-text-muted mb-2 tracking-[0.2em] font-bold">
                  {msg.role === 'user' ? 'Operator' : 'AI Core'}
                </div>
                
                {msg.thinking && <ThinkingBlock thinking={msg.thinking} />}
                
                <div className={cn(
                  "text-[15px] leading-relaxed prose prose-invert max-w-none text-text-main",
                  "prose-pre:bg-[#0A0F1A] prose-pre:text-[#A8B2C0] prose-code:text-[#6EC8FF] prose-code:bg-[#6EC8FF]/5 prose-code:px-1 prose-code:rounded"
                )}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {msg.role === 'assistant' && (
                  <AgentTransfer 
                    currentAgent="chat" 
                    onTransfer={handleTransfer}
                    suggestedAgent={parseTransfer(msg.content)}
                    content={msg.content}
                  />
                )}

                {/* Command Execution UI */}
                {msg.role === 'assistant' && (
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const cmdText = parseCommand(msg.content);
                      if (!cmdText && !msg.command) return null;
                      
                      const currentCmd = msg.command || { text: cmdText!, status: 'pending' };
                      
                      return (
                        <div className="bg-[#0A0F1A] border border-[#A8B2C0]/20 rounded-xl overflow-hidden shadow-lg">
                          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <Terminal className="w-3 h-3 text-[#6EC8FF]" />
                              <span className="text-[10px] font-mono text-[#A8B2C0] uppercase tracking-widest">Proposed Command</span>
                            </div>
                            {currentCmd.status === 'pending' && (
                              <button
                                onClick={() => executeCommand(idx, currentCmd.text)}
                                className="flex items-center gap-2 px-3 py-1 bg-[#6EC8FF] hover:bg-[#4FE3D4] text-[#0A0F1A] text-[10px] font-bold uppercase tracking-wider rounded-md transition-all active:scale-95"
                              >
                                <Play className="w-3 h-3" />
                                Execute
                              </button>
                            )}
                            {currentCmd.status === 'executing' && (
                              <div className="flex items-center gap-2 text-[#6EC8FF] animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Running...</span>
                              </div>
                            )}
                            {currentCmd.status === 'success' && (
                              <div className="flex items-center gap-2 text-[#4FE3D4]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Success</span>
                              </div>
                            )}
                            {currentCmd.status === 'error' && (
                              <div className="flex items-center gap-2 text-[#FF7A2F]">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Failed</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 font-mono text-xs">
                            <div className="text-[#6EC8FF] mb-2">$ {currentCmd.text}</div>
                            {currentCmd.output && (
                              <div className={cn(
                                "p-3 rounded-lg bg-black/50 border border-white/5 whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin",
                                currentCmd.status === 'error' ? "text-[#FF7A2F]" : "text-[#A8B2C0]"
                              )}>
                                {currentCmd.output}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-5 p-6 bg-[#6EC8FF]/5 border border-[#6EC8FF]/10 rounded-2xl animate-pulse">
              <div className="w-10 h-10 bg-[#6EC8FF]/10 border border-[#6EC8FF]/20 rounded-xl flex items-center justify-center text-[#6EC8FF]/50">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="flex-1 space-y-3 py-1">
                <div className="h-2 bg-[#6EC8FF]/10 rounded w-1/4"></div>
                <div className="h-2 bg-[#6EC8FF]/10 rounded w-3/4"></div>
                <div className="h-2 bg-[#6EC8FF]/10 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-none p-6 border-t border-border bg-surface/80 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={apiKey ? "Transmit data..." : "Awaiting Authorization Key"}
                disabled={!apiKey || isLoading}
                className="w-full px-5 py-4 bg-bg-light border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand/50 text-sm text-text-main placeholder:text-text-muted transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || !apiKey || isLoading || !viewModels.chat}
              className="px-8 py-4 btn-primary uppercase tracking-widest text-xs rounded-xl disabled:opacity-20 disabled:grayscale flex items-center gap-3"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Execute</span>
            </button>
          </form>
          <div className="mt-4 flex justify-between text-[9px] font-mono text-text-muted uppercase tracking-[0.3em] max-w-4xl mx-auto w-full">
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-brand" />
              Core: {viewModels[currentView] || 'Standby'}
            </span>
            <span>C.A.T Protocol v2.0</span>
          </div>
        </div>
      </main>

      {/* Right: File Browser */}
      <AnimatePresence>
        {showFileBrowser && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-1/2 h-full border-l border-border"
          >
            <FileBrowser 
              apiKey={apiKey} 
              onFileSelect={setSelectedFile} 
              onAnalyze={(file) => {
                setAnalyzeTarget({ ...file, _t: Date.now() }); // Add timestamp to trigger effect even if same file
                setCurrentView('chat');
                sendMessage(`Analyze this file: ${file.path}`);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-brand" />
                  <h2 className="font-serif italic text-xl font-bold text-text-main tracking-tight">System Configuration</h2>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-bg-light rounded-lg transition-colors text-text-muted hover:text-text-main"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Ollama Host */}
                <div className="space-y-2 opacity-60">
                  <label className="text-[10px] font-mono uppercase text-text-muted tracking-[0.2em] font-bold flex items-center gap-2">
                    <Globe className="w-3 h-3 text-brand/50" />
                    Ollama Host (Locked)
                  </label>
                  <input
                    type="text"
                    value={ollamaHost}
                    readOnly
                    className="w-full px-4 py-3 bg-bg-light border border-border rounded-xl focus:outline-none text-sm font-mono text-text-main/50 cursor-not-allowed transition-all"
                  />
                  <p className="text-[9px] text-text-muted font-mono italic">This instance is configured to always use https://ollama.com.</p>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-text-muted tracking-[0.2em] font-bold flex items-center gap-2">
                    <Shield className="w-3 h-3 text-brand/50" />
                    Access Token / API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API Key"
                      className="w-full pl-10 pr-4 py-3 bg-bg-light border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand/50 text-sm font-mono text-text-main transition-all"
                    />
                  </div>
                  <p className="text-[9px] text-text-muted font-mono italic">Required for authentication with Ollama Cloud services.</p>
                </div>

                {/* Theme Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-text-muted tracking-[0.2em] font-bold flex items-center gap-2">
                    <Layout className="w-3 h-3 text-brand/50" />
                    Interface Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['modern', 'cyberpunk', 'nordic', 'terminal'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                          theme === t 
                            ? "bg-[#6EC8FF] border-[#6EC8FF] text-[#0A0F1A] shadow-[0_0_10px_rgba(110,200,255,0.3)]" 
                            : "bg-bg-light border-border text-text-muted hover:border-brand/50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      fetchModels();
                    }}
                    className="w-full py-3 btn-primary uppercase tracking-widest text-xs rounded-xl active:scale-[0.98]"
                  >
                    Apply Configuration
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#6EC8FF]/5 border-t border-border text-center">
                <p className="text-[9px] font-mono text-[#6EC8FF]/50 uppercase tracking-widest">Neuro-Link Established</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ModelInfoModal 
        isOpen={isModelInfoOpen} 
        onClose={() => setIsModelInfoOpen(false)} 
        modelsInfo={modelsInfo as any}
        availableModels={models.map(m => m.name)}
        disabledModels={disabledModels}
        onToggleModel={toggleModelStatus}
      />
    </div>
  </>
);
}
