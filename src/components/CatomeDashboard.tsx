import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Activity, Shield, Terminal, Settings, 
  Plus, Trash2, RefreshCw, Play, Pause, Save, 
  ChevronRight, Brain, AlertTriangle, CheckCircle2,
  Cpu, Layers, Search, Clock, Info, ExternalLink,
  Bot, Filter, List, Grid, Maximize2, History, X,
  Zap, MoreHorizontal, ChevronDown, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Catome, 
  CatomeType, 
  CatomePriority, 
  CatomeAgent, 
  CatomeStore,
  CatomeRiskLevel,
  CatomeCommanderOrigin
} from '../types/catomes';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CatomeDashboardProps {
  apiKey: string;
  catomeStore: CatomeStore;
  onRefresh: () => void;
  onCreateCatome: (catome: Partial<Catome>) => void;
  onUpdateCatome: (id: string, updates: Partial<Catome>) => void;
}

const AGENTS = ['ALL', 'HERMES', 'SUPERVISOR', 'WEBDESIGN', 'SECURITY', 'OLLAMAWEB', 'DOCKER'];
const STATUSES = ['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SLEEPING'];

export default function CatomeDashboard({ 
  apiKey, 
  catomeStore, 
  onRefresh, 
  onCreateCatome,
  onUpdateCatome
}: CatomeDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAgent, setFilterAgent] = useState<string>('ALL');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [fireEventName, setFireEventName] = useState('');

  const stats = useMemo(() => {
    return {
      total: catomeStore.catomes.length,
      pending: catomeStore.catomes.filter(c => c.status === 'pending').length,
      running: catomeStore.catomes.filter(c => c.status === 'running').length,
      success: catomeStore.catomes.filter(c => c.status === 'success').length,
      failed: catomeStore.catomes.filter(c => c.status === 'failed').length,
      sleeping: catomeStore.catomes.filter(c => c.status as any === 'sleeping').length,
    };
  }, [catomeStore.catomes]);

  const filteredCatomes = useMemo(() => {
    return catomeStore.catomes.filter(c => {
      const matchStatus = filterStatus === 'ALL' || c.status.toUpperCase() === filterStatus;
      const matchAgent = filterAgent === 'ALL' || (c.agent as string).toUpperCase() === filterAgent;
      return matchStatus && matchAgent;
    });
  }, [catomeStore.catomes, filterStatus, filterAgent]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleDelete = (id: string) => {
    // In a real app we'd have a delete action
    console.log("Delete catome", id);
  };

  return (
    <div className="flex flex-col h-full bg-[#050608] text-[#E4E3E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-[#0A0C12]/40 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand/10 rounded-lg">
            <Layers className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[0.15em] text-white uppercase font-sans">CATOMES</h1>
            <p className="text-[10px] font-mono text-brand/70 tracking-[0.3em] uppercase -mt-1 font-black">
              Cognitive Autonomous Task Modules
            </p>
          </div>
        </div>

        {/* Stats Blocks */}
        <div className="flex items-center gap-3">
          {[
            { label: 'TOTAL', count: stats.total, color: 'text-white' },
            { label: 'PENDING', count: stats.pending, color: 'text-blue-400' },
            { label: 'RUNNING', count: stats.running, color: 'text-amber-500' },
            { label: 'SUCCESS', count: stats.success, color: 'text-emerald-400' },
            { label: 'FAILED', count: stats.failed, color: 'text-rose-500' },
            { label: 'SLEEPING', count: stats.sleeping, color: 'text-purple-400' },
          ].map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded text-[10px] font-mono">
              <span className="text-text-muted font-black">{idx + 1}</span>
              <span className={cn("font-bold tracking-widest", stat.color)}>{stat.label}</span>
              <span className="bg-white/10 px-1.5 py-0.5 rounded ml-1">{stat.count}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={handleRefresh}
            className={cn(
              "p-2 hover:bg-white/10 rounded-full transition-all text-text-muted hover:text-white",
              isRefreshing && "animate-spin"
            )}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center gap-3 px-6 py-2.5 bg-[#F0712F] hover:bg-[#ff8544] text-[#0A0F1A] rounded-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(240,113,47,0.2)]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="text-xs font-black uppercase tracking-widest">New Catome</span>
          </button>
        </div>
      </header>

      {/* Sub-Header: Filters */}
      <div className="px-8 py-3 bg-[#0A0C12]/20 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-12">
          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono font-black text-text-muted uppercase tracking-widest">Status</span>
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              {STATUSES.map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                    filterStatus === status ? "bg-[#F0712F]/20 text-[#F0712F]" : "text-text-muted hover:text-white"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Filter */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono font-black text-text-muted uppercase tracking-widest">Agent</span>
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              {AGENTS.map(agent => (
                <button
                  key={agent}
                  onClick={() => setFilterAgent(agent)}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                    filterAgent === agent ? "bg-brand/20 text-brand" : "text-text-muted hover:text-white"
                  )}
                >
                  {agent}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fire Event */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono font-black text-text-muted uppercase tracking-widest">Fire Event</span>
          <div className="flex items-stretch gap-2">
            <input 
              type="text" 
              placeholder="event_name"
              value={fireEventName}
              onChange={(e) => setFireEventName(e.target.value)}
              className="bg-black/40 border border-white/10 border-r-0 rounded-l-lg px-4 py-2 text-[11px] font-mono w-48 focus:outline-none focus:border-brand/50 transition-all placeholder:text-white/10"
            />
            <button className="px-3 bg-brand/10 border border-white/10 border-l-0 rounded-r-lg hover:bg-brand/20 text-brand transition-all">
              <Zap className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Catomes List */}
      <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
        {filteredCatomes.map((catome) => (
          <CatomeItem 
            key={catome.id} 
            catome={catome} 
            onDelete={() => handleDelete(catome.id)}
            onExecute={() => onUpdateCatome(catome.id, { status: 'running' })}
          />
        ))}

        {filteredCatomes.length === 0 && (
          <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 opacity-20">
            <Brain className="w-16 h-16" />
            <div>
              <p className="text-xl font-serif italic">No Active Modules Detected</p>
              <p className="text-xs font-mono uppercase tracking-widest">System standby • Awaiting Injection</p>
            </div>
          </div>
        )}
      </div>

      <CatomeBuilderModal 
        isOpen={isBuilderOpen} 
        onClose={() => setIsBuilderOpen(false)} 
        onCreate={onCreateCatome}
      />
    </div>
  );
}

function CatomeItem({ catome, onDelete, onExecute }: { catome: Catome; onDelete: () => void; onExecute: () => void }) {
  const isSuccess = catome.status === 'success';
  const isFailed = catome.status === 'failed';
  const isRunning = catome.status === 'running';
  const commanderOrigin = catome.intention?.commander_origin || 'system';
  const priority = catome.priority || 'normal';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex items-center gap-6 px-6 py-4 bg-[#0A0C12]/40 border border-white/5 rounded-xl hover:border-white/20 transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]"
    >
      {/* Left indicator */}
      <div className={cn(
        "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
        isSuccess ? "bg-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.5)]" :
        isFailed ? "bg-rose-500 shadow-[0_0_100px_rgba(244,63,94,0.5)]" :
        isRunning ? "bg-amber-500 animate-pulse shadow-[0_0_100px_rgba(245,158,11,0.5)]" :
        "bg-brand shadow-[0_0_100px_rgba(110,200,255,0.5)]"
      )} />

      {/* Meta Info */}
      <div className="flex items-center gap-3 flex-none w-[200px]">
        <Zap className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold text-text-muted tracking-widest">{catome.id}</span>
          <div className="flex items-center gap-2">
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px] font-mono text-text-muted uppercase font-black">
              {commanderOrigin}
            </span>
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest",
              priority === 'high' ? 'text-rose-500' : 
              priority === 'critical' ? 'text-rose-600' : 'text-amber-500'
            )}>
              {priority}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
          {catome.description}
        </h3>
      </div>

      {/* Actions / Status */}
      <div className="flex items-center gap-4 flex-none">
        {/* Status Badge */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.2em]",
          isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
          isFailed ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
          isRunning ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
          "bg-white/5 border-white/10 text-text-muted"
        )}>
          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
          {isFailed && <AlertTriangle className="w-3 h-3" />}
          {isRunning && <RefreshCw className="w-3 h-3 animate-spin" />}
          <span>{catome.status}</span>
        </div>

        {/* Agent Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-text-muted">
          <Bot className="w-3 h-3" />
          <span className="text-[9px] font-mono font-black uppercase tracking-widest">{catome.agent}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onExecute}
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg transition-all active:scale-90"
            title="Execute CATOME"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg transition-all active:scale-90"
            title="Purge CATOME"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CatomeBuilderModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (c: Partial<Catome>) => void }) {
  const [formData, setFormData] = useState({
    mission_id: 'default',
    type: 'compute' as CatomeType,
    priority: 'normal' as CatomePriority,
    agent: 'hermes' as CatomeAgent,
    description: '',
    tool: 'shell',
    command: '',
    cwd: 'web_design_workspace/hermes/',
    output_expected: 'raw text',
    dependencies: '',
    conflicts: '',
    heartbeat_mode: 'none' as any,
    trigger_type: 'none' as any,
    goal: '',
    context: '',
    risk_level: 'low' as CatomeRiskLevel,
    commander_origin: 'user' as CatomeCommanderOrigin
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCatome: Partial<Catome> = {
      id: `CAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      mission_id: formData.mission_id,
      type: formData.type,
      priority: formData.priority,
      agent: formData.agent,
      description: formData.description,
      tool: formData.tool,
      input: { command: formData.command, cwd: formData.cwd },
      output_expected: formData.output_expected,
      dependencies: formData.dependencies.split(',').map(s => s.trim()).filter(Boolean),
      conflicts: formData.conflicts.split(',').map(s => s.trim()).filter(Boolean),
      heartbeat: { mode: formData.heartbeat_mode, value: '60s' },
      sleeper_activation: { trigger_type: formData.trigger_type, trigger_value: '', cooldown: 60, max_activations: 10 },
      intention: {
        goal: formData.goal,
        context: formData.context,
        risk_level: formData.risk_level,
        commander_origin: formData.commander_origin
      }
    };
    onCreate(newCatome);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A0C13] border border-white/10 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex-none px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <Database className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-xl font-serif italic font-bold text-white tracking-widest uppercase">CATOME BUILDER</h2>
                  <p className="text-[10px] font-mono text-brand/70 tracking-[0.2em] uppercase font-black">
                    Define a new Cognitive Autonomous Task Module
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
              
              {/* CORE IDENTITY */}
              <section className="space-y-6">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-[#F0712F] flex items-center gap-4">
                  CORE IDENTITY
                  <div className="flex-1 h-[1px] bg-white/5" />
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <FormField label="MISSION ID">
                    <input 
                      type="text" 
                      value={formData.mission_id}
                      onChange={e => setFormData({...formData, mission_id: e.target.value})}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="TYPE">
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="form-input appearance-none"
                    >
                      {['compute', 'io', 'transform', 'validate', 'research', 'system'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="PRIORITY">
                    <select 
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value as any})}
                      className="form-input appearance-none"
                    >
                      {['low', 'normal', 'high', 'critical'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="EXECUTION AGENT">
                    <select 
                      value={formData.agent}
                      onChange={e => setFormData({...formData, agent: e.target.value as any})}
                      className="form-input appearance-none"
                    >
                      {['hermes', 'supervisor', 'webdesign', 'security', 'ollamaweb', 'docker'].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="DESCRIPTION">
                  <input 
                    type="text" 
                    placeholder="Short technical description of this task"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="form-input"
                  />
                </FormField>
              </section>

              {/* TDDL & INPUT */}
              <section className="space-y-6">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-[#F0712F] flex items-center gap-4">
                  TDDL & INPUT
                  <div className="flex-1 h-[1px] bg-white/5" />
                </h3>
                <div className="space-y-6">
                  <FormField label="TDDL">
                    <select 
                      value={formData.tool}
                      onChange={e => setFormData({...formData, tool: e.target.value})}
                      className="form-input appearance-none"
                    >
                      <option value="shell">shell</option>
                      <option value="api_call">api_call</option>
                      <option value="file_op">file_op</option>
                      <option value="research">research</option>
                    </select>
                  </FormField>
                  <FormField label="COMMAND">
                    <textarea 
                      placeholder="bash command(s) to execute..."
                      value={formData.command}
                      onChange={e => setFormData({...formData, command: e.target.value})}
                      className="form-input min-h-[100px] resize-none"
                    />
                  </FormField>
                  <FormField label="WORKING DIRECTORY (OPTIONAL)">
                    <input 
                      type="text" 
                      value={formData.cwd}
                      onChange={e => setFormData({...formData, cwd: e.target.value})}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="OUTPUT EXPECTED">
                     <select 
                      value={formData.output_expected}
                      onChange={e => setFormData({...formData, output_expected: e.target.value})}
                      className="form-input appearance-none"
                    >
                      <option value="raw text">raw text</option>
                      <option value="json">json</option>
                      <option value="boolean">boolean</option>
                      <option value="file">file</option>
                    </select>
                  </FormField>
                </div>
              </section>

              {/* DEPENDENCIES & CONFLICTS */}
              <section className="space-y-6">
                 <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-[#F0712F] flex items-center gap-4">
                  DEPENDENCIES & CONFLICTS
                  <div className="flex-1 h-[1px] bg-white/5" />
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <FormField label="DEPENDENCIES (COMMA-SEPARATED IDS)">
                    <input 
                      type="text" 
                      placeholder="id1, id2, ..."
                      value={formData.dependencies}
                      onChange={e => setFormData({...formData, dependencies: e.target.value})}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="CONFLICTS (COMMA-SEPARATED IDS)">
                    <input 
                      type="text" 
                      placeholder="id1, id2, ..."
                      value={formData.conflicts}
                      onChange={e => setFormData({...formData, conflicts: e.target.value})}
                      className="form-input"
                    />
                  </FormField>
                </div>
              </section>

              {/* HEARTBEAT */}
              <section className="space-y-6">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-[#F0712F] flex items-center gap-4">
                  HEARTBEAT
                  <div className="flex-1 h-[1px] bg-white/5" />
                </h3>
                <FormField label="MODE">
                  <select 
                    value={formData.heartbeat_mode}
                    onChange={e => setFormData({...formData, heartbeat_mode: e.target.value as any})}
                    className="form-input appearance-none"
                  >
                    <option value="none">none</option>
                    <option value="interval">interval</option>
                    <option value="continuous">continuous</option>
                    <option value="event">event</option>
                  </select>
                </FormField>
              </section>

              {/* SLEEPER ACTIVATION */}
              <section className="space-y-6">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-[#F0712F] flex items-center gap-4">
                  SLEEPER ACTIVATION
                  <div className="flex-1 h-[1px] bg-white/5" />
                </h3>
                <FormField label="TRIGGER TYPE">
                  <select 
                    value={formData.trigger_type}
                    onChange={e => setFormData({...formData, trigger_type: e.target.value as any})}
                    className="form-input appearance-none"
                  >
                    <option value="none">none</option>
                    <option value="time">time</option>
                    <option value="event">event</option>
                    <option value="data">data</option>
                    <option value="threshold">threshold</option>
                  </select>
                </FormField>
              </section>

              {/* INTENTION MODEL */}
              <section className="space-y-6 pb-4">
                <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.3em] text-[#F0712F] flex items-center gap-4">
                  INTENTION MODEL
                  <div className="flex-1 h-[1px] bg-white/5" />
                </h3>
                <div className="space-y-6">
                  <FormField label="GOAL">
                    <input 
                      type="text" 
                      placeholder="Technical goal of this CATOME"
                      value={formData.goal}
                      onChange={e => setFormData({...formData, goal: e.target.value})}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="CONTEXT">
                    <input 
                      type="text" 
                      placeholder="System context"
                      value={formData.context}
                      onChange={e => setFormData({...formData, context: e.target.value})}
                      className="form-input"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="RISK LEVEL">
                      <select 
                        value={formData.risk_level}
                        onChange={e => setFormData({...formData, risk_level: e.target.value as any})}
                        className="form-input appearance-none"
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </FormField>
                    <FormField label="COMMANDER ORIGIN">
                      <select 
                        value={formData.commander_origin}
                        onChange={e => setFormData({...formData, commander_origin: e.target.value as any})}
                        className="form-input appearance-none"
                      >
                        <option value="user">user</option>
                        <option value="supervisor">supervisor</option>
                        <option value="hermes">hermes</option>
                        <option value="security">security</option>
                        <option value="system">system</option>
                      </select>
                    </FormField>
                  </div>
                </div>
              </section>

            </form>

            {/* Footer Buttons */}
            <div className="flex-none p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-text-muted hover:text-white transition-all"
              >
                CANCEL
              </button>
              <button 
                type="submit"
                onClick={handleSubmit}
                className="px-10 py-3 bg-[#F0712F] hover:bg-[#ff8544] text-[#0A0F1A] rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_0_20px_rgba(240,113,47,0.3)] flex items-center gap-3"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                CREATE CATOME
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 relative">
      <label className="text-[10px] font-mono font-black text-text-muted uppercase tracking-[0.2em] ml-1">
        {label}
      </label>
      {children}
      {/* Dropdown indicator for selects */}
      {React.isValidElement(children) && children.type === 'select' && (
        <ChevronDown className="absolute right-4 bottom-3.5 w-4 h-4 text-text-muted pointer-events-none" />
      )}
    </div>
  );
}
