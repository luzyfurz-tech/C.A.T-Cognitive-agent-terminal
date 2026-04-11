import React, { useState, useEffect, useCallback } from 'react';
import { Box, Play, Square, Trash2, RefreshCw, Activity, Terminal, ExternalLink, HardDrive, Cpu, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Container {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  Ports: string;
  State: string;
}

interface DockerViewProps {
  apiKey: string;
}

export default function DockerView({ apiKey }: DockerViewProps) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setWarning(null);
    try {
      const response = await fetch('/api/docker/ps', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!response.ok) throw new Error('Failed to fetch containers');
      const data = await response.json();
      setContainers(data.containers);
      if (data.warning) setWarning(data.warning);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const handleAction = async (action: string, containerId: string) => {
    try {
      const response = await fetch('/api/docker/action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ action, containerId })
      });
      if (!response.ok) throw new Error(`Action ${action} failed`);
      fetchContainers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex-none p-6 bg-bg-light border-b border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6EC8FF]/10 rounded-lg">
              <Box className="w-6 h-6 text-[#6EC8FF]" />
            </div>
            <div>
              <h2 className="font-serif italic text-2xl font-bold text-text-main">Docker Fleet</h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase tracking-widest">
                <Activity className="w-3 h-3 text-[#4FE3D4] animate-pulse" />
                Live Monitoring Active
              </div>
            </div>
          </div>
          <button 
            onClick={fetchContainers} 
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:border-[#6EC8FF]/50 transition-all text-sm font-bold text-text-main"
          >
            <RefreshCw className={cn("w-4 h-4 text-[#6EC8FF]", isLoading && "animate-spin")} />
            Sync
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex-none grid grid-cols-3 gap-4 p-6">
        {[
          { label: 'Active Containers', value: containers.filter(c => c.State === 'running').length, icon: Cpu, color: 'text-[#4FE3D4]' },
          { label: 'Total Images', value: 'Local', icon: Layers, color: 'text-[#6EC8FF]' },
          { label: 'Disk Usage', value: 'Optimized', icon: HardDrive, color: 'text-[#FF7A2F]' },
        ].map((stat, i) => (
          <div key={i} className="bg-bg-light p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className={cn("p-2 bg-surface rounded-lg", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{stat.label}</div>
              <div className="text-lg font-bold text-text-main">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Container List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {error && (
          <div className="bg-[#FF7A2F]/10 border border-[#FF7A2F]/20 p-4 rounded-xl text-[#FF7A2F] font-mono text-xs mb-4">
            [DOCKER_DAEMON_ERROR]: {error}
          </div>
        )}

        {warning && (
          <div className="bg-[#6EC8FF]/10 border border-[#6EC8FF]/20 p-4 rounded-xl text-[#6EC8FF] font-mono text-xs mb-4">
            [DOCKER_SYSTEM_NOTICE]: {warning}
          </div>
        )}

        <div className="space-y-4">
          {containers.length === 0 ? (
            <div className="bg-bg-light border border-dashed border-border p-12 rounded-2xl text-center">
              <Box className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-text-main font-bold">No active containers</h3>
              <p className="text-text-muted text-sm italic font-serif">The fleet is currently docked.</p>
            </div>
          ) : (
            containers.map((container) => (
              <div key={container.ID} className="bg-bg-light border border-border rounded-2xl p-6 shadow-sm hover:border-[#6EC8FF]/50 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-colors",
                      container.State === 'running' ? "bg-[#4FE3D4]/10 text-[#4FE3D4]" : "bg-surface text-text-muted"
                    )}>
                      <Box className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-text-main">{container.Names}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                          container.State === 'running' ? "bg-[#4FE3D4]/10 text-[#4FE3D4]" : "bg-surface text-text-muted"
                        )}>
                          {container.State}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-text-muted mb-3">{container.Image}</div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-text-muted" />
                          <span className="text-[10px] font-mono text-text-muted">{container.ID.substring(0, 12)}</span>
                        </div>
                        {container.Ports && (
                          <div className="flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-[#6EC8FF]" />
                            <span className="text-[10px] font-mono text-[#6EC8FF] font-bold">{container.Ports}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {container.State === 'running' ? (
                      <button 
                        onClick={() => handleAction('stop', container.ID)}
                        className="p-2 hover:bg-[#FF7A2F]/10 text-[#FF7A2F] rounded-lg transition-colors"
                        title="Stop Container"
                      >
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAction('start', container.ID)}
                        className="p-2 hover:bg-[#4FE3D4]/10 text-[#4FE3D4] rounded-lg transition-colors"
                        title="Start Container"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (confirm(`Remove container ${container.Names}?`)) handleAction('remove', container.ID);
                      }}
                      className="p-2 hover:bg-[#FF7A2F]/10 text-[#FF7A2F] rounded-lg transition-colors"
                      title="Remove Container"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {container.Status && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>Uptime: {container.Status}</span>
                    <div className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", container.State === 'running' ? "bg-[#4FE3D4] animate-pulse" : "bg-surface")} />
                      Health Check Passed
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
