import React from 'react';
import { X, Zap, Shield, Code, Globe, Bot, Info, Star, Cpu, Brain, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModelData {
  description: string;
  tags: string[];
  agents: string[];
  capabilities: {
    reasoning: number;
    coding: number;
    vision: number;
    tools: number;
    speed: number;
    context: number;
  };
}

interface ModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelsInfo: Record<string, ModelData>;
  availableModels: string[];
  disabledModels: string[];
  onToggleModel: (name: string) => void;
}

export default function ModelInfoModal({ 
  isOpen, 
  onClose, 
  modelsInfo, 
  availableModels,
  disabledModels,
  onToggleModel
}: ModelInfoModalProps) {
  if (!isOpen) return null;

  const CapabilityBar = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-text-muted">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-brand" />
          {label}
        </div>
        <span>{value}/10</span>
      </div>
      <div className="h-1.5 bg-bg-light border border-border rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          className="h-full bg-brand shadow-[0_0_10px_rgba(79,227,212,0.3)]"
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-dark/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-5xl max-h-[85vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-bg-light/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-lg">
                <Brain className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-text-main">Brain Cloud Intelligence</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Neuro-Agentic Matrix v3.0</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-bg-light rounded-lg transition-colors text-text-muted hover:text-text-main"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(modelsInfo).map(([name, data]) => {
                const isDisabled = disabledModels.includes(name);
                const isActive = !isDisabled;
                
                return (
                  <motion.div 
                    key={name}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onToggleModel(name)}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-300 group cursor-pointer relative overflow-hidden",
                      isActive 
                        ? "bg-bg-light/50 border-brand/50 shadow-[0_0_20px_rgba(79,227,212,0.05)]" 
                        : "bg-surface/10 border-border opacity-30 grayscale hover:opacity-60 hover:grayscale-0"
                    )}
                  >
                    {/* Cloud Accent Line */}
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-0.5 transition-colors",
                      isActive ? "bg-brand/50" : "bg-border"
                    )} />

                    {/* Active Glow Effect */}
                    {isActive && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 blur-3xl -mr-12 -mt-12 group-hover:bg-brand/10 transition-colors" />
                    )}

                    <div className="flex items-start justify-between mb-3 relative z-10">
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-black text-sm uppercase tracking-tight transition-colors mt-2",
                          isActive ? "text-brand" : "text-text-main group-hover:text-brand"
                        )}>
                          {name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {data.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-brand/5 border border-brand/10 rounded text-[8px] uppercase font-bold text-brand/80">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={cn(
                          "px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider shadow-sm",
                          isActive 
                            ? "bg-brand text-bg-dark" 
                            : "bg-red-500/20 text-red-500 border border-red-500/20"
                        )}>
                          {isActive ? 'Cloud Active' : 'Disconnected'}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-text-muted mb-4 line-clamp-2 leading-relaxed italic relative z-10">
                      "{data.description}"
                    </p>

                    <div className="space-y-3 relative z-10">
                      <CapabilityBar label="Reasoning" value={data.capabilities.reasoning} icon={Brain} />
                      <CapabilityBar label="Coding" value={data.capabilities.coding} icon={Code} />
                      <CapabilityBar label="Vision" value={data.capabilities.vision} icon={Eye} />
                      <CapabilityBar label="Tools" value={data.capabilities.tools} icon={Zap} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
                      <div className="flex gap-1.5">
                        {data.agents.map(agent => (
                          <div key={agent} title={`Optimized for ${agent}`} className="p-1.5 bg-bg-dark rounded-lg text-text-muted group-hover:text-brand transition-colors">
                            {agent === 'chat' && <Bot className="w-3 h-3" />}
                            {agent === 'coding' && <Code className="w-3 h-3" />}
                            {agent === 'research' && <Globe className="w-3 h-3" />}
                            {agent === 'security' && <Shield className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted/50">
                        {data.capabilities.speed}/10 SPD
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border bg-bg-light/30 flex items-center justify-between text-[10px] text-text-muted font-bold uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand" />
                <span>Cloud Link Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <span>Cloud Link Severed</span>
              </div>
            </div>
            <div>
              CLOUD BRAIN CAPACITY: {Object.keys(modelsInfo).filter(m => !disabledModels.includes(m)).length} / {Object.keys(modelsInfo).length}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
