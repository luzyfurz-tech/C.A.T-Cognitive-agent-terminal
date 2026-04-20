import React, { useState } from 'react';
import { Share2, Code, Shield, Globe, Bot, ArrowRight, Copy, Check, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AgentType = 'chat' | 'webdesign' | 'security' | 'ollamaWeb' | 'hermes';

interface AgentTransferProps {
  currentAgent: AgentType;
  onTransfer: (targetAgent: AgentType, content?: string) => void;
  suggestedAgent?: AgentType | null;
  content?: string;
}

const AGENTS: { id: AgentType; label: string; icon: any; color: string }[] = [
  { id: 'chat', label: 'Main Chat', icon: Bot, color: 'text-[#6EC8FF]' },
  { id: 'webdesign', label: 'Coding', icon: Code, color: 'text-[#4FE3D4]' },
  { id: 'security', label: 'Security', icon: Shield, color: 'text-[#FF7A2F]' },
  { id: 'ollamaWeb', label: 'OllamaWeb', icon: Globe, color: 'text-brand' },
  { id: 'hermes', label: 'Hermes', icon: Zap, color: 'text-[#6EC8FF]' },
];

export default function AgentTransfer({ currentAgent, onTransfer, suggestedAgent, content }: AgentTransferProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-3 h-3 text-brand/50" />
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest font-bold">Protocol Handoff</span>
        </div>
        
        {content && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-light/50 border border-border hover:border-brand/30 hover:text-brand transition-all group"
          >
            {copied ? <Check className="w-3 h-3 text-brand" /> : <Copy className="w-3 h-3 text-text-muted group-hover:text-brand" />}
            <span className="text-[9px] font-black uppercase tracking-tight">{copied ? 'Copied' : 'Copy Output'}</span>
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {AGENTS.filter(a => a.id !== currentAgent).map((agent) => {
          const isSuggested = suggestedAgent === agent.id;
          
          return (
            <motion.button
              key={agent.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTransfer(agent.id, content)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300",
                isSuggested 
                  ? "bg-brand/10 border-brand/50 text-brand shadow-[0_0_15px_rgba(79,227,212,0.1)]" 
                  : "bg-bg-light/30 border-border hover:border-brand/30 hover:bg-bg-light/50 text-text-muted hover:text-text-main"
              )}
            >
              <agent.icon className={cn("w-3.5 h-3.5", isSuggested ? "text-brand" : agent.color)} />
              <span className="text-[10px] font-black uppercase tracking-tight">{agent.label}</span>
              {isSuggested && (
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-brand/20">
                  <ArrowRight className="w-3 h-3 animate-pulse" />
                  <span className="text-[8px] font-bold">Suggested</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
