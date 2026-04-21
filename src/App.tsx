import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Key, Settings, Loader2, RefreshCw, Trash2, ChevronDown, X, Globe, Shield, Terminal, Play, CheckCircle2, AlertCircle, Layout, Maximize2, Minimize2, Box, Search, Info, Brain, ChevronRight, Zap, FileText, Database, Code, HelpCircle } from 'lucide-react';
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
import CatomeDashboard from './components/CatomeDashboard';
import BootSequence from './components/BootSequence';
import { MainframeLogo } from './components/MainframeLogo';
import ModelInfoModal from './components/ModelInfoModal';
import { FAQModal } from './components/FAQModal';
import AgentTransfer, { AgentType } from './components/AgentTransfer';
import { Catome, CatomeStore } from './types/catomes';
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
  images?: string[]; // Base64 encoded images
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
const PORT = 3939;

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
  const [currentView, setCurrentView] = useState<'chat' | 'webdesign' | 'docker' | 'ollamaWeb' | 'security' | 'hermes' | 'dashboard'>('chat');
  const [isFollowAgentActive, setIsFollowAgentActive] = useState(true);
  const [globalCode, setGlobalCode] = useState<string>('// No code generated yet');
  const [rightPaneTab, setRightPaneTab] = useState<'files' | 'preview'>('files');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
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
  const [catomeStore, setCatomeStore] = useState<CatomeStore>({ active_mission: null, catomes: [] });
  const [visionFrame, setVisionFrame] = useState<string | null>(null);
  
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
      fetchCatomes();
    } else {
      setConnectionStatus('idle');
      setModels([]);
    }
  }, [apiKey, ollamaHost]);

  const fetchCatomes = async () => {
    if (!apiKey) return;
    try {
      const response = await fetch('/api/catomes', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCatomeStore(data);
      }
    } catch (err) {
      console.error('Failed to fetch catomes:', err);
    }
  };

  const createCatome = async (catome: Partial<Catome>) => {
    if (!apiKey) return;
    try {
      const response = await fetch('/api/catomes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` 
        },
        body: JSON.stringify(catome)
      });
      if (response.ok) {
        fetchCatomes();
      }
    } catch (err) {
      console.error('Failed to create catome:', err);
    }
  };

  const updateCatome = async (id: string, updates: Partial<Catome>) => {
    if (!apiKey) return;
    try {
      const response = await fetch(`/api/catomes/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` 
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchCatomes();
      }
    } catch (err) {
      console.error('Failed to update catome:', err);
    }
  };

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

  // Reactive UI: Follow Active CATOME
  useEffect(() => {
    if (!isFollowAgentActive || !isAgentMode) return;
    
    const activeCatome = catomeStore.catomes.find(c => c.status === 'running');
    if (activeCatome) {
      const agentToView: Record<string, typeof currentView> = {
        'hermes': 'hermes',
        'security': 'security',
        'webdesign': 'webdesign',
        'ollamaWeb': 'ollamaWeb',
        'docker': 'docker'
      };
      
      const targetView = agentToView[activeCatome.agent];
      if (targetView && targetView !== currentView) {
        setCurrentView(targetView);
      }
    }
  }, [catomeStore.catomes, isFollowAgentActive, isAgentMode, currentView]);

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

      // Check for Memory protocols
      const memSaveMatch = lastMessage.content.match(/\[MEM_SAVE:\s*(\{.*?\})\]/s);
      if (memSaveMatch && !triggeredTransfers.current.has(lastMessageIndex + 1000)) {
        triggeredTransfers.current.add(lastMessageIndex + 1000);
        try {
          const data = JSON.parse(memSaveMatch[1]);
          fetch('/api/knowledge/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(data)
          }).then(() => sendMessage("[SYSTEM]: Knowledge stored in Neural Memory. (indexed by " + (data.tags || "default") + ")"));
        } catch (e) {
          sendMessage("[SYSTEM ERROR]: Failed to parse MEM_SAVE JSON.");
        }
      }

      const memLoadMatch = lastMessage.content.match(/\[MEM_LOAD:\s*(.*?)\]/);
      if (memLoadMatch && !triggeredTransfers.current.has(lastMessageIndex + 2000)) {
        triggeredTransfers.current.add(lastMessageIndex + 2000);
        const query = memLoadMatch[1].trim();
        fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        .then(r => r.json())
        .then(data => {
          const results = data.results.map((r: any) => `[${r.key}]: ${r.value} (${r.tags})`).join('\n---\n');
          sendMessage(`[SYSTEM]: Neural Memory Results for "${query}":\n\n${results || "No entries found."}`);
        });
      }

      // Snapshot / Rollback
      if (lastMessage.content.includes('[SNAPSHOT]') && !triggeredTransfers.current.has(lastMessageIndex + 3000)) {
        triggeredTransfers.current.add(lastMessageIndex + 3000);
        fetch('/api/system/snapshot', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` }
        })
        .then(r => r.json())
        .then(data => sendMessage(`[SYSTEM]: Snapshot created successfully: ${data.snapshotId}`));
      }

      const rollbackMatch = lastMessage.content.match(/\[ROLLBACK:\s*(.*?)\]/);
      if (rollbackMatch && !triggeredTransfers.current.has(lastMessageIndex + 4000)) {
        triggeredTransfers.current.add(lastMessageIndex + 4000);
        const sid = rollbackMatch[1].trim();
        fetch('/api/system/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ snapshotId: sid })
        })
        .then(r => r.json())
        .then(data => {
          if (data.status === 'Success') {
            sendMessage(`[SYSTEM]: ROLLBACK COMPLETE. System restored to state: ${sid}.`);
          } else {
            sendMessage(`[SYSTEM ERROR]: Rollback failed: ${data.error}`);
          }
        });
      }

      // Vision QA
      if (lastMessage.content.includes('[VISION_QA]') && !triggeredTransfers.current.has(lastMessageIndex + 5000)) {
        triggeredTransfers.current.add(lastMessageIndex + 5000);
        // We capture the preview (usually rasp.local:3939/preview/...)
        // For simplicity, we assume we capture the currently active project
        fetch('/api/vision/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ url: `http://localhost:${PORT}/preview/index.html` }) // Simplified for demo
        })
        .then(r => r.json())
        .then(data => {
          if (data.base64) {
             const visualAnalysisPrompt = "[VISUAL CONTEXT RECEIVED]: I have captured the current Live Preview. Analyze the attached frame and correlate with requirements. What is your visual assessment?";
             // In a more complex setup, we'd send the image to the model here.
             // For now, we simulate the "Sight" by providing the image data to the next prompt.
             setVisionFrame(data.base64);
             sendMessage(visualAnalysisPrompt);
          } else {
            sendMessage("[SYSTEM ERROR]: Vision sensor failed to capture preview.");
          }
        });
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

    const userMessage: Message = { 
      role: 'user', 
      content,
      images: visionFrame ? [visionFrame.split(',')[1] || visionFrame] : undefined
    };
    
    // Clear vision frame after use
    if (visionFrame) setVisionFrame(null);
    
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
    
    // Limit context window to last 20 messages for token efficiency in agent loops
    const historyLimit = 20;
    const historyToInclude = messages.slice(-historyLimit);
    
    // Inject file context if a file is selected in the browser
    let contextualMessages = [...historyToInclude, userMessage];
    if (selectedFile) {
      const fileContext = `[REFERENCE CONTEXT: The user has highlighted the file "${selectedFile.name}" at path "${selectedFile.path}" in their browser. This is for situational awareness.]`;
      contextualMessages = [
        ...historyToInclude,
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
                  content: `SYSTEM: C.A.T. SUPERVISOR (Main Orchestrator)
ROLE: Plan, delegate, and oversee missions. Do NOT write code/audits yourself.
PROTOCOLS:
- [TRANSFER: agent_id]: Hand off mission to a specialist.
- [EXECUTE: command]: Run system/file checks (Bash/Linux).
- [SET_MODEL: model_name]: Switch active model based on needs.
- [CATOME: {json}]: Task specific sub-goals.
- [MEM_SAVE: {key, value, tags}]: Save knowledge for future missions.
- [MEM_LOAD: query]: Retrieve knowledge from the Knowledge Base.
- [SNAPSHOT]: Take a state snapshot before major changes.
- [ROLLBACK: id]: Revert back to a known snapshot.
- [VISION_QA]: Request a visual check of the web preview (Supervisor will provide the image).

AGENT RECOGNITION:
- chat: You (Supervisor/Management).
- webdesign: All coding, UI, Docker, frontend work.
- security: Security audits, pentesting, logs.
- ollamaWeb: Web research, interaction, screenshots.
- hermes: Advanced tool-calling, APIs, CLI.

EFFICIENCY:
- NO CHITCHAT. High density, low token usage.
- DIRECT HANDOFFS: Specialists can transfer between each other.
- AUTONOMY: ${isFullAutonomy ? 'FULL AUTONOMY. Execute all commands (write/install/del) and delegate without asking.' : 'RESTRICTED. Ask before Writing/Deleting files or Installing packages.'}

ENVIRONMENT:
- CWD: ${currentCwd} | OS: ${osInfo} (Raspberry Pi/Linux).
- REF FILE: ${selectedFile ? selectedFile.path : 'None'}. (Do NOT assume this directory is the project root for new projects).

MODEL CAPABILITIES:
${models.filter(m => !disabledModels.includes(m.name)).map(m => {
  const info = (modelsInfo as any)[m.name];
  return `- ${m.name}: ${info?.description || 'General'} | Capabilities: ${JSON.stringify(info?.capabilities || {})}`;
}).join('\n')}` 
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

      <div className={cn("h-screen bg-bg-light text-text-main font-sans flex overflow-hidden selection:bg-brand/30 modern-grid", isBooting && "opacity-0")}>
        {/* Sidebar Nav Rail */}
        <nav className="flex-none w-16 border-r border-border bg-surface/80 backdrop-blur-xl flex flex-col items-center py-6 gap-3 z-30">
          <div className="flex flex-col gap-3 flex-1">
            <button
              onClick={() => setCurrentView('chat')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 relative group",
                currentView === 'chat' ? "bg-brand/20 text-brand shadow-[0_0_15px_rgba(110,200,255,0.2)]" : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
              title="Supervisor Agent"
            >
              <Bot className="w-5 h-5" />
              {currentView === 'chat' && <motion.div layoutId="nav-glow" className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-brand rounded-r-full" />}
            </button>

            <button
              onClick={() => setCurrentView('ollamaWeb')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 relative group",
                currentView === 'ollamaWeb' ? "bg-brand/20 text-brand shadow-[0_0_15px_rgba(110,200,255,0.2)]" : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
              title="Web Research"
            >
              <Globe className="w-5 h-5" />
              {currentView === 'ollamaWeb' && <motion.div layoutId="nav-glow" className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-brand rounded-r-full" />}
            </button>

            <button
              onClick={() => setCurrentView('webdesign')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 relative group",
                currentView === 'webdesign' ? "bg-brand/20 text-brand shadow-[0_0_15px_rgba(110,200,255,0.2)]" : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
              title="Coding Engine"
            >
              <Code className="w-5 h-5" />
              {currentView === 'webdesign' && <motion.div layoutId="nav-glow" className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-brand rounded-r-full" />}
            </button>

            <button
              onClick={() => setCurrentView('hermes')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 relative group",
                currentView === 'hermes' ? "bg-brand/20 text-brand shadow-[0_0_15px_rgba(110,200,255,0.2)]" : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
              title="Hermes CLI"
            >
              <Zap className="w-5 h-5" />
              {currentView === 'hermes' && <motion.div layoutId="nav-glow" className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-brand rounded-r-full" />}
            </button>

            <button
              onClick={() => setCurrentView('security')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 relative group",
                currentView === 'security' ? "bg-brand/20 text-brand shadow-[0_0_15px_rgba(110,200,255,0.2)]" : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
              title="Security Audits"
            >
              <Shield className="w-5 h-5" />
              {currentView === 'security' && <motion.div layoutId="nav-glow" className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-brand rounded-r-full" />}
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 relative group",
                currentView === 'dashboard' ? "bg-brand/20 text-brand shadow-[0_0_15px_rgba(110,200,255,0.2)]" : "text-text-muted hover:text-text-main hover:bg-white/5"
              )}
              title="CATOMES Control"
            >
              <Database className="w-5 h-5" />
              {currentView === 'dashboard' && <motion.div layoutId="nav-glow" className="absolute -left-[1px] top-1/4 bottom-1/4 w-[2px] bg-brand rounded-r-full" />}
            </button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header / Config Bar */}
          <header className="flex-none border-b border-border py-3 px-6 bg-surface/50 backdrop-blur-md z-20">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsModelInfoOpen(true)}
                    className="p-1.5 bg-bg-light border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/50 transition-all flex-none"
                    title="Model Knowledge Base"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-1.5 bg-bg-light border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/50 transition-all"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowFileBrowser(!showFileBrowser)}
                    className={cn(
                      "p-1.5 border rounded-lg transition-all",
                      showFileBrowser ? "bg-[#4FE3D4]/10 border-[#4FE3D4]/50 text-[#4FE3D4]" : "bg-bg-light border-border text-text-muted hover:bg-white/5"
                    )}
                    title="File Browser"
                  >
                    <Layout className="w-4 h-4" />
                  </button>

                  <button
                    onClick={fetchModels}
                    className="p-1.5 bg-bg-light border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/50 transition-all"
                    title="Refresh Models"
                  >
                    <RefreshCw className={cn("w-4 h-4", isFetchingModels && "animate-spin")} />
                  </button>

                  <button
                    onClick={clearChat}
                    className="p-1.5 bg-bg-light border border-border rounded-lg text-text-muted hover:text-claw hover:border-claw/50 transition-all"
                    title="Clear Current Logs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsFAQOpen(true)}
                    className="p-1.5 bg-bg-light border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/50 transition-all flex items-center justify-center"
                    title="System Guide"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-border mx-2" />

                {/* Status Overlays */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAgentMode(!isAgentMode)}
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-black tracking-widest transition-all cursor-pointer hover:ring-1 hover:ring-white/20", 
                        isAgentMode ? "bg-brand text-[#0A0F1A]" : "bg-white/5 text-text-muted"
                      )}
                      title={isAgentMode ? "Disable Agent Mode" : "Enable Agent Mode"}
                    >
                      AGENT
                    </button>
                    <button 
                      onClick={() => setIsFullAutonomy(!isFullAutonomy)}
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-black tracking-widest transition-all cursor-pointer hover:ring-1 hover:ring-white/20", 
                        isFullAutonomy ? "bg-brand text-[#0A0F1A]" : "bg-white/5 text-text-muted"
                      )}
                      title={isFullAutonomy ? "Disable Full Autonomy" : "Enable Full Autonomy"}
                    >
                      AUTO
                    </button>
                    <button 
                      onClick={() => setIsFollowAgentActive(!isFollowAgentActive)}
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-black tracking-widest transition-all cursor-pointer hover:ring-1 hover:ring-white/20", 
                        isFollowAgentActive ? "bg-emerald-500 text-[#0A0F1A]" : "bg-white/5 text-text-muted"
                      )}
                      title={isFollowAgentActive ? "Stop Following Mission" : "Follow Active Mission"}
                    >
                      FOLLOW
                    </button>
                  </div>
                </div>

                <div className="h-4 w-[1px] bg-border mx-2" />

                {/* Neural Memory & Snapshots */}
                <div className="flex items-center gap-2">
                   <div 
                     className={cn(
                       "flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 transition-all",
                       "hover:border-brand/40 group"
                     )}
                     title="Neural Memory Status"
                   >
                     <Database className="w-3 h-3 text-brand/60 group-hover:text-brand" />
                     <span className="text-[8px] font-black tracking-tighter text-text-muted uppercase">MEM: ONLINE</span>
                   </div>

                   <div 
                     className={cn(
                       "flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 transition-all",
                       "hover:border-emerald-400/40 group"
                     )}
                     title="System Guard Protection"
                   >
                     <Shield className="w-3 h-3 text-emerald-400/60 group-hover:text-emerald-400" />
                     <span className="text-[8px] font-black tracking-tighter text-text-muted uppercase">GUARD: ACTIVE</span>
                   </div>

                   {visionFrame && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="flex items-center gap-1.5 px-2 py-1 rounded bg-brand/20 border border-brand/40"
                       title="Visual Data Pending for next prompt"
                     >
                        <Maximize2 className="w-3 h-3 text-brand animate-pulse" />
                        <span className="text-[8px] font-black tracking-tighter text-brand uppercase">SIGHT PENDING</span>
                     </motion.div>
                   )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionStatus === 'connected' ? "bg-[#4FE3D4] shadow-[0_0_8px_rgba(79,227,212,0.6)]" : 
                  connectionStatus === 'connecting' ? "bg-[#6EC8FF] animate-pulse" :
                  connectionStatus === 'error' ? "bg-[#FF7A2F]" : "bg-text-muted"
                )} />
              </div>
            </div>
          </header>
          
          {/* Content Area Overlay Context */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {/* Main Content Area - Full Screen for views */}
            <div className="flex-1 flex overflow-hidden relative bg-bg-light/40">
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
            catomeStore={catomeStore}
            onUpdateCatome={updateCatome}
            currentCode={globalCode}
            onCodeChange={setGlobalCode}
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
            catomeStore={catomeStore}
            onUpdateCatome={updateCatome}
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
            catomeStore={catomeStore}
            onUpdateCatome={updateCatome}
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
            catomeStore={catomeStore}
            onUpdateCatome={updateCatome}
          />
        </div>

        {/* CATOMES Dashboard View */}
        <div className={cn("absolute inset-0 flex overflow-hidden", currentView !== 'dashboard' && "hidden")}>
          <CatomeDashboard 
            apiKey={apiKey}
            catomeStore={catomeStore}
            onRefresh={fetchCatomes}
            onCreateCatome={createCatome}
            onUpdateCatome={updateCatome}
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
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
              {/* Large Background Logo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <svg className="w-[1200px] h-[1200px]" viewBox="0 0 1920 1080">
                  <g fill="currentColor" className="text-[#6EC8FF]">
                    <MainframeLogo />
                  </g>
                </svg>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-[#6EC8FF] blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity animate-pulse" />
                <div className="relative transition-all duration-700 group-hover:scale-110">
                  <div className="w-24 h-24 text-[#6EC8FF] opacity-20">
                    <svg viewBox="0 0 1920 1080" className="w-full h-full">
                       <MainframeLogo />
                    </svg>
                  </div>
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
            className="w-1/2 h-full border-l border-border bg-surface flex flex-col"
          >
            {/* Right Pane Tab Switcher */}
            <div className="flex-none px-4 py-3 border-b border-border bg-bg-light/30 flex items-center justify-between">
              <div className="flex gap-4">
                <button 
                  onClick={() => setRightPaneTab('files')}
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-[0.2em] font-black transition-all",
                    rightPaneTab === 'files' ? "text-brand" : "text-text-muted hover:text-text-main"
                  )}
                >
                  File Browser
                </button>
                <div className="w-[1px] h-3 bg-border" />
                <button 
                  onClick={() => setRightPaneTab('preview')}
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-[0.2em] font-black transition-all",
                    rightPaneTab === 'preview' ? "text-brand underline decoration-2 underline-offset-4" : "text-text-muted hover:text-text-main"
                  )}
                >
                  Live Preview
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                <span className="text-[8px] font-mono text-text-muted uppercase tracking-widest leading-none">System Active</span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {rightPaneTab === 'files' ? (
                <FileBrowser 
                  apiKey={apiKey} 
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile} 
                  onAnalyze={(file) => {
                    setAnalyzeTarget({ ...file, _t: Date.now() });
                    setCurrentView('chat');
                    sendMessage(`Analyze this file: ${file.path}`);
                  }}
                />
              ) : (
                <div className="h-full w-full bg-white flex flex-col">
                  <div className="flex-none px-4 py-2 border-b border-border bg-bg-light flex items-center justify-between">
                    <span className="text-[10px] font-mono text-text-muted uppercase font-bold tracking-widest">Sandbox Preview</span>
                    <button 
                      onClick={() => {
                        const blob = new Blob([globalCode], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      }}
                      className="p-1 hover:bg-brand/10 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <Maximize2 className="w-3 h-3 text-brand" />
                    </button>
                  </div>
                  <iframe 
                    srcDoc={globalCode}
                    className="flex-1 w-full h-full border-none"
                    title="Global Preview"
                    sandbox="allow-scripts allow-forms allow-modals"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>
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

                {/* Sub-menu: Advanced Tools */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-[10px] font-mono uppercase text-text-muted tracking-[0.2em] font-bold">Advanced Subsystems</label>
                  <button
                    onClick={() => {
                      setCurrentView('docker');
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-bg-light border border-border rounded-xl hover:border-brand/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Box className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold uppercase tracking-wider text-text-main">Docker Controls</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                  </button>
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

      <FAQModal 
        isOpen={isFAQOpen}
        onClose={() => setIsFAQOpen(false)}
      />
    </div>
  </>
);
}
