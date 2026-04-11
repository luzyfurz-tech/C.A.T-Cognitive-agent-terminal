import React from 'react';
import { Share2, Code, Shield, Globe, Bot, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AgentType = 'chat' | 'webdesign' | 'security' | 'openclaw';

interface AgentTransferProps {
  currentAgent: AgentType;
  onTransfer: (targetAgent: AgentType) => void;
  suggestedAgent?: AgentType | null;
}

const AGENTS: { id: AgentType; label: string; icon: any; color: string }[] = [
  { id: 'chat', label: 'Main Chat', icon: Bot, color: 'text-[#6EC8FF]' },
  { id: 'webdesign', label: 'Coding', icon: Code, color: 'text-[#4FE3D4]' },
  { id: 'security', label: 'Security', icon: Shield, color: 'text-[#FF7A2F]' },
  { id: 'openclaw', label: 'Browser', icon: Globe, color: 'text-[#A8B2C0]' },
];

export default function AgentTransfer({ currentAgent, onTransfer, suggestedAgent }: AgentTransferProps) {
  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-3 h-3 text-brand/50" />
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest font-bold">Protocol Handoff</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {AGENTS.filter(a => a.id !== currentAgent).map((agent) => {
          const isSuggested = suggestedAgent === agent.id;
          
          return (
            <motion.button
              key={agent.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTransfer(agent.id)}
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
