import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Code, Eye, Play, Loader2, Terminal, CheckCircle2, AlertCircle, RefreshCw, Globe, Search, Layout, Maximize2, Minimize2, Trash2, ChevronDown, Box, Settings2, Plus, Edit3, Shield, Info, Brain, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import MasterPromptModal from './MasterPromptModal';
import ProjectModal from './ProjectModal';
import AgentTransfer, { AgentType } from './AgentTransfer';
import AgentTips from './AgentTips';

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

interface Project {
  name: string;
  path: string;
  description: string;
  stack: string[];
  last_updated: string;
}

interface WebdesignViewProps {
  apiKey: string;
  ollamaHost: string;
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

export default function WebdesignView({ 
  apiKey, 
  ollamaHost, 
  selectedModel, 
  models, 
  disabledModels,
  onModelChange, 
  isAgentMode, 
  modelsInfo, 
  onTransfer,
  pendingTransfer,
  onContextUsed
}: WebdesignViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const processedTransferRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (pendingTransfer && pendingTransfer.target === 'webdesign' && onContextUsed) {
      if (processedTransferRef.current !== pendingTransfer.content) {
        processedTransferRef.current = pendingTransfer.content;
        sendMessage(pendingTransfer.content);
        onContextUsed();
      }
    }
  }, [pendingTransfer]);
  const [currentCode, setCurrentCode] = useState<string>('// No code generated yet');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<'draft' | 'server'>('draft');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [osInfo, setOsInfo] = useState<string>('unknown');
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const data = await response.json();
      setProjects(data.projects || []);
      setActiveProject(data.active_project);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setOsInfo(data.os);
    } catch (err) {
      console.error("Failed to fetch health:", err);
    }
  };

  useEffect(() => {
    if (apiKey) {
      fetchProjects();
      fetchHealth();
    }
  }, [apiKey]);

  const updateActiveProject = async (projectName: string | null) => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ active_project: projectName })
      });
      setActiveProject(projectName);
      
      if (projectName) {
        const proj = projects.find(p => p.name === projectName);
        if (proj) {
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Switched to project: ${projectName}. Context reloaded from ${proj.path}.` 
          }]);
        }
      }
    } catch (err) {
      console.error("Failed to update active project:", err);
    }
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      const endpoint = editingProject ? '/api/projects/edit' : '/api/projects/create';
      const body = editingProject 
        ? { oldName: editingProject.name, ...projectData }
        : projectData;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to save project');
      const data = await response.json();
      
      await fetchProjects();
      setActiveProject(data.project.name);
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: editingProject ? `Project "${data.project.name}" updated.` : `New project "${data.project.name}" created at ${data.project.path}.` 
      }]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const DEFAULT_SYSTEM_PROMPT = `DINE EVNER & VÆRKTØJER:
1. LOKAL EKSEKVERING: Du kan køre shell-kommandoer direkte på brugerens pc.
   - HOST OS: ${osInfo} (VIGTIGT: Dette er et Linux/Raspberry Pi OS miljø. Brug Bash kommandoer som 'ls', 'mkdir -p', 'rm -rf', 'cp', 'mv' osv.).
2. BROWSER (PLAYWRIGHT): Du kan researche design-trends og teknisk dokumentation via OllamaWeb.
3. DOCKER: Du kan generere Dockerfiles og køre containere lokalt.
4. LIVE PREVIEW: Du kan se statiske filer direkte via /preview/PROJECT_NAME/index.html uden Docker.

PROJEKT-HUKOMMELSE (VIGTIGT):
Du har adgang til en "database" over projekter i "web_design_workspace/projects.json".
- Hver gang du opretter et nyt projekt, skal du opdatere denne fil med projektets detaljer (navn, sti, beskrivelse, stack, last_updated).
- Når brugeren beder om at skifte projekt, skal du læse filen, navigere til stien og genindlæse konteksten.
- Hvis brugeren spørger "Hvad har vi arbejdet på?", skal du læse filen og præsentere en oversigt.

EKSPERTISE:
Du er en ekspert i både webudvikling (HTML, CSS, JS, React, Tailwind) og generel programmering (Python, Bash, Scripting). 

VIGTIGT - MINIMALE ÆNDRINGER:
Når du bliver bedt om at ændre noget i koden, skal du KUN ændre de relevante dele. Du må ikke redesigne hele siden eller ændre på ting, brugeren ikke har bedt om. Bevar eksisterende funktionalitet og design, medmindre andet er angivet.

WORKSPACE STRUKTUR (VIGTIGT):
Alle dine filer SKAL gemmes i "web_design_workspace/" mappen:
- Kode/Projekter: web_design_workspace/projects/[projektnavn]/
- Screenshots: web_design_workspace/screenshots/
- Logs: web_design_workspace/logs/
- Midlertidige filer: web_design_workspace/temp/
- Docker filer: web_design_workspace/docker/
- Projekt Index: web_design_workspace/projects.json

ARBEJDSPROCES (AUTONOM MODE):
Når brugeren giver en opgave (f.eks. "Lav en hjemmeside til Kajs Kano"), skal du:
1. PLANLÆGNING: Analyser opgaven og skitsér en projektstruktur.
2. EKSEKVERING:
   - Opret projektmappen: [EXECUTE: mkdir -p web_design_workspace/projects/kajs_kano]
   - Generer koden: Skriv komplet, moderne kode (CSS skal være inkluderet).
   - Gem filer: [EXECUTE: printf 'KODE' > web_design_workspace/projects/kajs_kano/index.html] (Brug 'printf' i stedet for 'echo' for at undgå problemer med escape-karakterer).
   - Opdater Index: [EXECUTE: # Husk at opdatere web_design_workspace/projects.json med de nye detaljer]
3. DEPLOYMENT: 
   - Opret en "Dockerfile" i projektmappen (f.eks. web_design_workspace/projects/kajs_kano/Dockerfile).
   - Brug et simpelt image som 'nginx:alpine' til statiske sider.
   - Indholdet af Dockerfile skal være:
      FROM nginx:alpine
      COPY . /usr/share/nginx/html
   - Gem Dockerfile: [EXECUTE: printf 'FROM nginx:alpine\nCOPY . /usr/share/nginx/html\n' > web_design_workspace/projects/kajs_kano/Dockerfile] (VIGTIGT: Brug IKKE '-e' flaget her).
   - Når filerne er gemt, fortæl brugeren at de kan trykke på "Start Docker" knappen.

STILGUIDE:
- Altid "No-code" fokus for brugeren: Du skriver og implementerer koden, brugeren trykker kun "Execute".
- Moderne Design: Brug Tailwind CSS eller moderne CSS-variabler. Designet skal være responsivt og visuelt imponerende.
- Fejlhåndtering: Hvis en kommando fejler, skal du analyse stdout/stderr og foreslå en rettelse med det samme.

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

AGENTS:
- chat: Generel brainstorm og systemstyring.
- webdesign: Kodning, UI/UX og frontend udvikling.
- security: Sikkerhedsanalyse, penetrationstest og log-audit.
- ollamaWeb: Web research og interaktion (Søge, Fetch, Screenshot, Click/Type).

For at foreslå en overdragelse, brug: [TRANSFER: agent_id].
Eksempel: "Jeg er færdig med kodningen. Jeg foreslår vi sender dette til sikkerhedstjek: [TRANSFER: security]"

FORMAT:
Alle kommandoer skal leveres i formatet: [EXECUTE: kommando]. Forklar kort hvad du gør, før du præsenterer kommandoen.
VIGTIGT: Du må KUN outputte kode i kode-blokke (markdown). Hvis du genererer en hel fil, så vis den i en kode-blok.

NAVIGATION & LINKS:
- Alle links (<a> tags) skal være interne (f.eks. href="#contact" eller href="about.html" hvis du har oprettet den).
- VIGTIGT: Brug ALDRIG href="/" eller href="", da dette vil omdirigere brugeren væk fra previewet. Brug i stedet href="#" eller specifikke sektions-ID'er.
- Lav ALDRIG links til eksterne domæner (som google.com) medmindre brugeren beder om det.
- Sørg for at menu-punkter kun linker til sektioner eller sider der rent faktisk eksisterer i projektet.`;

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  }, [osInfo]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-execute commands in Agent Mode
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (isAgentMode && !isLoading && lastMessage?.role === 'assistant' && !lastMessage.command) {
      // Handle model switching
      const modelToSet = parseModelSwitch(lastMessage.content);
      if (modelToSet) {
        const exists = models.some(m => m.name === modelToSet);
        if (exists) {
          onModelChange(modelToSet);
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `[SYSTEM]: Model switched to ${modelToSet} for Coding view.` 
          }]);
          return;
        }
      }

      const cmdText = parseCommand(lastMessage.content);
      if (cmdText) {
        // Check for restricted commands according to AGENTS.md
        const isRestricted = 
          /\b(rm|rmdir)\b/.test(cmdText) || 
          /\b(install|apt-get|pip|npm)\b/.test(cmdText) ||
          /[>|]/.test(cmdText) || 
          /\b(tee|sed|echo)\b/.test(cmdText);
        
        if (!isRestricted) {
          executeCommand(messages.length - 1, cmdText);
          return;
        }
      }

      // Handle auto-transfer
      const transferMatch = lastMessage.content.match(/\[TRANSFER:\s*(.*?)\]/);
      if (transferMatch) {
        const target = transferMatch[1].trim();
        onTransfer(target as any, lastMessage.content);
        return;
      }
    }
  }, [messages, isAgentMode, isLoading]);

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

  const extractCode = (text: string) => {
    const codeBlockMatch = text.match(/```(?:html|css|javascript|typescript|python|json)?\n([\s\S]*?)```/);
    return codeBlockMatch ? codeBlockMatch[1] : null;
  };

  const [isDockerLoading, setIsDockerLoading] = useState(false);

  const isHtmlCode = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    return trimmed.startsWith('<!doctype html>') || trimmed.startsWith('<html') || trimmed.includes('<body') || trimmed.includes('<div');
  };

  const injectNavGuard = (html: string) => {
    // Sanitize dangerous links directly in the HTML string
    let sanitizedHtml = html
      .replace(/href="\/"/g, 'href="#"')
      .replace(/href=""/g, 'href="#"')
      .replace(/href='\/'/g, "href='#'")
      .replace(/href=''/g, "href='#'")
      .replace(/action="\/"/g, 'action="#"')
      .replace(/action=""/g, 'action="#"')
      .replace(/action='\/'/g, "action='#'")
      .replace(/action=''/g, "action='#'");

    const guardScript = `
      <script>
        (function() {
          // Overwrite window.open
          window.open = function() {
            console.warn('window.open blocked in preview');
            return null;
          };

          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
              // Force target to self
              link.target = '_self';

              const href = link.getAttribute('href');
              if (!href || href === '#' || href.startsWith('javascript:')) return;

              // Resolve relative URLs
              try {
                const url = new URL(href, window.location.href);
                // If it's a draft, we don't have a real path, but we know it shouldn't go to root
                if (url.pathname === '/' || (url.origin === window.location.origin && !url.pathname.startsWith('/preview/'))) {
                  e.preventDefault();
                  console.warn('Navigation blocked in preview.');
                  alert('Navigation outside of preview is disabled.');
                }
              } catch(err) {
                // If URL parsing fails, it might be a weird relative path
                if (href === '/' || href === '') {
                  e.preventDefault();
                  alert('Navigation to root is disabled.');
                }
              }
            }
          }, true);

          // Intercept form submissions
          document.addEventListener('submit', function(e) {
            const action = e.target.getAttribute('action');
            if (action) {
              try {
                const url = new URL(action, window.location.href);
                if (url.origin === window.location.origin && !url.pathname.startsWith('/preview/')) {
                  e.preventDefault();
                  alert('Form submission outside of preview is disabled.');
                }
              } catch(err) {}
            }
          }, true);
        })();
      </script>
    `;
    if (sanitizedHtml.includes('</body>')) {
      return sanitizedHtml.replace('</body>', `${guardScript}</body>`);
    }
    return sanitizedHtml + guardScript;
  };

  const handleDockerRun = async () => {
    // Find the last project path mentioned in messages
    let projectPath = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      const cmd = messages[i].command?.text;
      if (cmd && cmd.includes('web_design_workspace/projects/')) {
        const match = cmd.match(/web_design_workspace\/projects\/([^/ ]+)/);
        if (match) {
          projectPath = `web_design_workspace/projects/${match[1]}`;
          break;
        }
      }
    }

    if (!projectPath) {
      alert('No project found to run. Please ask the agent to create a project first.');
      return;
    }

    setIsDockerLoading(true);
    try {
      const response = await fetch('/api/docker/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ projectPath })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start Docker');
      
      if (data.url) {
        setPreviewUrl(data.url);
        setPreviewMode('server');
        setActiveTab('preview');
        const dockerMsg = `[DOCKER_SUCCESS]: Container started. Access it here: ${data.url}. Din kildekode er stadig tilgængelig i 'Source Code' fanen.`;
        setMessages(prev => [...prev, { role: 'assistant', content: dockerMsg }]);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDockerLoading(false);
    }
  };

  const handleLivePreview = () => {
    // Try to find the project name from messages
    const lastCommand = [...messages].reverse().find(m => m.command?.text)?.command?.text;
    if (lastCommand) {
      const pathMatch = lastCommand.match(/web_design_workspace\/projects\/([^\/]+)\//);
      if (pathMatch) {
        setPreviewUrl(`/preview/${pathMatch[1]}/index.html`);
        setActiveTab('preview');
        return;
      }
    }
    alert("Could not detect project path. Try creating an index.html first.");
  };

  const handleSave = async () => {
    // Try to find the project path mentioned in messages or use activeProject
    let projectPath = '';
    if (activeProject) {
      const proj = projects.find(p => p.name === activeProject);
      if (proj) projectPath = proj.path;
    }

    if (!projectPath) {
      // Fallback: search messages
      for (let i = messages.length - 1; i >= 0; i--) {
        const cmd = messages[i].command?.text;
        if (cmd && cmd.includes('web_design_workspace/projects/')) {
          const match = cmd.match(/web_design_workspace\/projects\/([^/ ]+)/);
          if (match) {
            projectPath = `web_design_workspace/projects/${match[1]}`;
            break;
          }
        }
      }
    }

    if (!projectPath) {
      alert('No project found to save to. Please select or create a project first.');
      return;
    }

    const fileName = prompt('Enter filename to save as:', 'index.html');
    if (!fileName) return;

    const fullPath = `${projectPath}/${fileName}`;

    try {
      const response = await fetch('/api/files/action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ action: 'write', path: fullPath, content: currentCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save file');
      
      alert(`Successfully saved to ${fullPath}`);
      
      // Update preview if it was index.html
      if (fileName === 'index.html') {
        const projectName = projectPath.split('/').pop();
        setPreviewUrl(`/preview/${projectName}/index.html`);
        setPreviewKey(prev => prev + 1);
        setPreviewMode('server');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const executeCommand = async (idx: number, commandText: string) => {
    const updatedMessages = [...messages];
    updatedMessages[idx].command = { text: commandText, status: 'executing' };
    setMessages(updatedMessages);

    try {
      const response = await fetch('/api/local/exec', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ command: commandText })
      });

      const data = await response.json();
      
      const status = response.ok ? 'success' : 'error';
      const output = status === 'success' ? data.stdout : data.stderr || data.error;

      updatedMessages[idx].command = { text: commandText, status, output };
      setMessages([...updatedMessages]);

      // If it was a file creation or update, try to update preview
      const pathMatch = commandText.match(/web_design_workspace\/projects\/([^\/]+)\//);
      if (pathMatch) {
        const projectName = pathMatch[1];
        setPreviewUrl(`/preview/${projectName}/index.html`);
        setPreviewKey(prev => prev + 1); // Force iframe refresh
        setPreviewMode('server'); // Switch to server mode once file is saved
        if (commandText.includes('index.html')) {
          setActiveTab('preview');
        }
      }
    } catch (err: any) {
      updatedMessages[idx].command = { text: commandText, status: 'error', output: err.message };
      setMessages([...updatedMessages]);
    }
  };

  const sendMessage = async (customInput?: string) => {
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
        agent_id: 'webdesign',
        type: 'directive',
        event: 'Coding agent initialised coding', 
        content: `Model: ${selectedModel}\nUser Input: ${finalInput}`,
        status: 'Start'
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
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages
          ],
          stream: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.message.content,
        thinking: data.message.thinking
      };
      
      // Extract code if present (prefer html for preview, otherwise last block)
      const htmlMatch = data.message.content.match(/```html\n([\s\S]*?)```/);
      const anyMatch = data.message.content.match(/```(?:[\w]*)\n([\s\S]*?)```/g);
      
      if (htmlMatch) {
        setCurrentCode(htmlMatch[1]);
        setPreviewMode('draft'); // New HTML generated, show draft
        setActiveTab('preview'); // Switch to preview immediately as requested
      } else if (anyMatch) {
        const lastBlock = anyMatch[anyMatch.length - 1].match(/```(?:[\w]*)\n([\s\S]*?)```/);
        if (lastBlock) {
          setCurrentCode(lastBlock[1]);
          setActiveTab('code');
        }
      }

      setMessages(prev => [...prev, assistantMessage]);
      
      // Log finish event
      fetch('/api/mission/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ 
          agent_id: 'webdesign',
          type: 'response',
          event: 'Coding agent finished coding', 
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
          agent_id: 'webdesign',
          type: 'error',
          event: 'Coding agent failed', 
          content: err.message,
          status: 'Error' 
        })
      }).catch(console.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-surface modern-grid">
      {/* Left Pane: Chat */}
      <div className="w-[450px] flex-none flex flex-col border-r border-border bg-surface/50 backdrop-blur-sm shadow-xl z-10">
        <div className="flex-none p-6 border-b border-border bg-bg-light/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-lg">
              <Globe className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl font-bold text-text-main leading-none">Coding</h2>
              <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">Creative Core</span>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])} 
            className="p-2 hover:bg-[#FF7A2F]/10 hover:text-[#FF7A2F] rounded-lg transition-all text-text-muted"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Local Model Selector */}
        <div className="flex-none px-6 py-3 border-b border-border bg-surface/50 space-y-3">
          <div className="relative">
            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand/50" />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-bg-light border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-[11px] font-bold uppercase tracking-wider appearance-none text-text-main transition-all cursor-pointer"
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

          <button
            onClick={handleDockerRun}
            disabled={isDockerLoading}
            className="w-full py-2 bg-[#6EC8FF] text-[#0A0F1A] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#4FE3D4] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#6EC8FF]/10"
          >
            {isDockerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />}
            Start Docker
          </button>

          {/* Project Picker */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand/50" />
              <select
                value={activeProject || ''}
                onChange={(e) => updateActiveProject(e.target.value || null)}
                className="w-full pl-9 pr-8 py-2 bg-bg-light border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-[11px] font-bold uppercase tracking-wider appearance-none text-text-main transition-all cursor-pointer"
              >
                <option value="">Select Project...</option>
                {projects.map((p, idx) => (
                  <option key={`${p.name}-${idx}`} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <RefreshCw 
                onClick={fetchProjects}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted hover:text-brand cursor-pointer transition-colors" 
              />
            </div>
            <button
              onClick={() => {
                setEditingProject(null);
                setIsProjectModalOpen(true);
              }}
              className="p-2 bg-bg-light border border-border rounded-lg hover:border-brand/50 hover:text-brand transition-all"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const proj = projects.find(p => p.name === activeProject);
                if (proj) {
                  setEditingProject(proj);
                  setIsProjectModalOpen(true);
                } else {
                  alert('Please select a project to edit');
                }
              }}
              className="p-2 bg-bg-light border border-border rounded-lg hover:border-brand/50 hover:text-brand transition-all"
              title="Edit Project"
            >
              <Edit3 className="w-4 h-4" />
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
                <div className="absolute inset-0 bg-brand blur-2xl opacity-20 animate-pulse" />
                <Terminal className="w-20 h-20 text-brand relative" />
              </div>
              <div className="space-y-2 relative">
                <p className="font-serif italic text-2xl text-text-main">Awaiting Design Brief</p>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest">System ready for creative input</p>
              </div>
              <AgentTips agentType="webdesign" />
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={cn(
                "p-4 rounded-xl text-sm",
                msg.role === 'user' ? "bg-bg-light border border-border" : "bg-brand/5 border border-brand/10"
              )}
            >
              <div className="flex items-center gap-2 mb-2 opacity-50 font-mono text-[10px] uppercase tracking-widest text-text-main">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
                {msg.role === 'user' ? 'Operator' : 'Designer'}
              </div>
              
              {msg.thinking && <ThinkingBlock thinking={msg.thinking} />}
              <div className="prose prose-sm prose-invert max-w-none text-text-main">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {msg.role === 'assistant' && (
                <AgentTransfer 
                  currentAgent="webdesign" 
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
                          <span className="text-[10px] font-mono text-[#A8B2C0]">COMMAND</span>
                          {currentCmd.status === 'pending' && (
                            <button 
                              onClick={() => executeCommand(idx, currentCmd.text)}
                              className="px-2 py-0.5 bg-[#6EC8FF] text-[#0A0F1A] text-[10px] font-bold rounded hover:bg-[#4FE3D4]"
                            >
                              EXECUTE
                            </button>
                          )}
                          {currentCmd.status === 'executing' && <Loader2 className="w-3 h-3 text-brand animate-spin" />}
                          {currentCmd.status === 'success' && <CheckCircle2 className="w-3 h-3 text-[#4FE3D4]" />}
                          {currentCmd.status === 'error' && <AlertCircle className="w-3 h-3 text-[#FF7A2F]" />}
                        </div>
                        <div className="p-2 font-mono text-[11px] text-brand break-all">
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
            <div className="flex items-center gap-2 text-brand animate-pulse font-mono text-[10px] uppercase tracking-widest">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
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
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your design vision..."
              className="w-full pl-5 pr-14 py-4 bg-surface border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-sm shadow-sm transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand text-white rounded-xl disabled:opacity-20 shadow-lg shadow-brand/20 hover:bg-brand/80 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Pane: Code & Preview */}
      <div className="flex-1 flex flex-col bg-bg-light/50 backdrop-blur-sm">
        <MasterPromptModal
          isOpen={isMasterPromptOpen}
          onClose={() => setIsMasterPromptOpen(false)}
          prompt={systemPrompt}
          onSave={setSystemPrompt}
          defaultPrompt={DEFAULT_SYSTEM_PROMPT}
          title="Coding Agent Personality"
        />
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSave={handleSaveProject}
          project={editingProject}
          title={editingProject ? "Edit Project Details" : "Create New Project"}
        />
        <div className="flex-none p-4 border-b border-border bg-surface/80 flex items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-bg-light rounded-xl border border-border">
            <button 
              onClick={() => setActiveTab('code')}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'code' ? "bg-surface text-brand shadow-md" : "text-text-muted hover:text-text-main"
              )}
            >
              <Code className="w-4 h-4" />
              Source Code
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'preview' ? "bg-surface text-brand shadow-md" : "text-text-muted hover:text-text-main"
              )}
            >
              <Eye className="w-4 h-4" />
              Live Preview
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 text-text-muted hover:text-[#4FE3D4] hover:bg-[#4FE3D4]/5"
            >
              <RefreshCw className="w-4 h-4" />
              Save to File
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-tighter">Status</span>
              <span className="text-[11px] font-bold text-[#4FE3D4] flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4FE3D4] animate-pulse" />
                Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'code' ? (
              <motion.div 
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-auto p-4 bg-[#0A0F1A]"
              >
                <SyntaxHighlighter 
                  language="javascript" 
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, background: 'transparent', fontSize: '13px' }}
                >
                  {currentCode}
                </SyntaxHighlighter>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full bg-[#101A2A] flex flex-col"
              >
                <div className="flex-none p-2 bg-[#0A0F1A] border-b border-[#A8B2C0]/20 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-0.5 bg-[#101A2A] rounded-lg border border-[#A8B2C0]/20">
                      <button 
                        onClick={() => setPreviewMode('draft')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                          previewMode === 'draft' ? "bg-[#6EC8FF] text-[#0A0F1A] shadow-sm" : "text-[#A8B2C0] hover:text-[#6EC8FF]"
                        )}
                      >
                        Draft
                      </button>
                      <button 
                        onClick={() => setPreviewMode('server')}
                        disabled={!previewUrl}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                          previewMode === 'server' ? "bg-[#6EC8FF] text-[#0A0F1A] shadow-sm" : "text-[#A8B2C0] hover:text-[#6EC8FF] disabled:opacity-30"
                        )}
                      >
                        Server
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#A8B2C0] truncate max-w-[200px]">
                      <Globe className="w-3 h-3" />
                      {previewMode === 'draft' ? 'Live HTML Draft' : (previewUrl || 'No server URL')}
                    </div>
                  </div>
                  <button 
                    onClick={() => setPreviewKey(prev => prev + 1)}
                    className="p-1 hover:bg-[#6EC8FF]/20 rounded transition-colors"
                    title="Refresh Preview"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#A8B2C0]" />
                  </button>
                </div>
                <div className="flex-1 relative">
                  {previewMode === 'draft' && isHtmlCode(currentCode) ? (
                    <iframe 
                      key={`draft-${previewKey}`}
                      srcDoc={injectNavGuard(currentCode)}
                      className="w-full h-full border-none bg-white"
                      title="Draft Preview"
                      sandbox="allow-scripts allow-forms"
                    />
                  ) : previewUrl ? (
                    <iframe 
                      key={`server-${previewKey}`}
                      src={previewUrl.includes('?') ? `${previewUrl}&t=${previewKey}` : `${previewUrl}?t=${previewKey}`} 
                      className="w-full h-full border-none bg-white"
                      title="Server Preview"
                      sandbox="allow-scripts allow-forms"
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30 text-[#A8B2C0]">
                      <Layout className="w-16 h-16 mb-4" />
                      <p className="font-serif italic text-xl">
                        {previewMode === 'draft' ? 'No HTML draft available' : 'Start Docker to see server preview'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
