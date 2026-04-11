import React, { useState, useEffect, useCallback } from 'react';
import { Folder, File, ChevronLeft, Search, Trash2, Edit3, FolderPlus, Copy, Move, RefreshCw, HardDrive, Clock, FileText, X, Activity, Upload, Archive, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  path: string;
}

interface FileBrowserProps {
  apiKey: string;
  onFileSelect?: (file: FileEntry | null) => void;
  onAnalyze?: (file: FileEntry) => void;
}

export default function FileBrowser({ apiKey, onFileSelect, onAnalyze }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Notify parent of selection
  useEffect(() => {
    if (onFileSelect) {
      const selected = filteredFiles[selectedIdx] || null;
      onFileSelect(selected);
    }
  }, [selectedIdx, files, search]);

  const fetchFiles = useCallback(async (path?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL('/api/files/list', window.location.origin);
      if (path) url.searchParams.append('path', path);
      
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data.files);
      setCurrentPath(data.currentPath);
      setSelectedIdx(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const [modal, setModal] = useState<{
    type: 'prompt' | 'confirm' | 'alert' | 'view' | 'edit';
    title: string;
    message?: string;
    value?: string;
    onConfirm: (val?: string) => void;
  } | null>(null);

  const handleAction = async (action: string, targetPath: string, extra?: any) => {
    try {
      const response = await fetch('/api/files/action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ action, path: targetPath, ...extra })
      });
      if (!response.ok) throw new Error(`Action ${action} failed`);
      const data = await response.json();
      if (action !== 'read') {
        fetchFiles(currentPath);
      }
      return data;
    } catch (err: any) {
      setModal({
        type: 'alert',
        title: 'System Error',
        message: err.message,
        onConfirm: () => setModal(null)
      });
      return null;
    }
  };

  const navigate = (entry: FileEntry) => {
    if (entry.isDirectory) {
      fetchFiles(entry.path);
    }
  };

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    fetchFiles(parent);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || modal) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx(prev => Math.min(prev + 1, filteredFiles.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (filteredFiles[selectedIdx]) navigate(filteredFiles[selectedIdx]);
          break;
        case 'Backspace':
          navigateUp();
          break;
        case 'F1': // Help
          e.preventDefault();
          setModal({
            type: 'alert',
            title: 'System Help',
            message: 'Shortcuts:\nF1: Help\nF2: Rename\nF3: View\nF4: Edit\nF5: Copy\nF6: Move\nF7: Mkdir\nF8: Delete\nF9: Analyze\nF10: Quit',
            onConfirm: () => setModal(null)
          });
          break;
        case 'F2': // Rename
          e.preventDefault();
          if (filteredFiles[selectedIdx]) {
            setModal({
              type: 'prompt',
              title: 'Rename Resource',
              message: `Enter new name for ${filteredFiles[selectedIdx].name}:`,
              value: filteredFiles[selectedIdx].name,
              onConfirm: (name) => {
                if (name) handleAction('rename', filteredFiles[selectedIdx].path, { newName: name });
                setModal(null);
              }
            });
          }
          break;
        case 'F3': // View
          e.preventDefault();
          if (filteredFiles[selectedIdx] && !filteredFiles[selectedIdx].isDirectory) {
            handleAction('read', filteredFiles[selectedIdx].path).then((res: any) => {
              if (res && res.content) {
                setModal({
                  type: 'view',
                  title: `Viewing: ${filteredFiles[selectedIdx].name}`,
                  value: res.content,
                  onConfirm: () => setModal(null)
                });
              }
            });
          }
          break;
        case 'F4': // Edit
          e.preventDefault();
          if (filteredFiles[selectedIdx] && !filteredFiles[selectedIdx].isDirectory) {
            handleAction('read', filteredFiles[selectedIdx].path).then((res: any) => {
              if (res && res.content !== undefined) {
                setModal({
                  type: 'edit',
                  title: `Editing: ${filteredFiles[selectedIdx].name}`,
                  value: res.content,
                  onConfirm: (newContent) => {
                    if (newContent !== null) {
                      handleAction('write', filteredFiles[selectedIdx].path, { content: newContent });
                    }
                    setModal(null);
                  }
                });
              }
            });
          }
          break;
        case 'F5': // Copy
          e.preventDefault();
          if (filteredFiles[selectedIdx]) {
            setModal({
              type: 'prompt',
              title: 'Copy Resource',
              message: 'Enter destination path:',
              onConfirm: (dest) => {
                if (dest) handleAction('copy', filteredFiles[selectedIdx].path, { destination: dest });
                setModal(null);
              }
            });
          }
          break;
        case 'F6': // Move
          e.preventDefault();
          if (filteredFiles[selectedIdx]) {
            setModal({
              type: 'prompt',
              title: 'Move Resource',
              message: 'Enter destination path:',
              onConfirm: (dest) => {
                if (dest) handleAction('move', filteredFiles[selectedIdx].path, { destination: dest });
                setModal(null);
              }
            });
          }
          break;
        case 'F7': // Mkdir
          e.preventDefault();
          setModal({
            type: 'prompt',
            title: 'Create Directory',
            message: 'Enter new folder name:',
            onConfirm: (name) => {
              if (name) handleAction('mkdir', `${currentPath}/${name}`);
              setModal(null);
            }
          });
          break;
        case 'F8': // Delete
          e.preventDefault();
          if (filteredFiles[selectedIdx]) {
            setModal({
              type: 'confirm',
              title: 'Confirm Deletion',
              message: `Are you sure you want to delete ${filteredFiles[selectedIdx].name}?`,
              onConfirm: () => {
                handleAction('delete', filteredFiles[selectedIdx].path);
                setModal(null);
              }
            });
          }
          break;
        case 'F9': // Analyze
          e.preventDefault();
          if (filteredFiles[selectedIdx] && !filteredFiles[selectedIdx].isDirectory && onAnalyze) {
            onAnalyze(filteredFiles[selectedIdx]);
          }
          break;
        case 'F10': // Quit
          e.preventDefault();
          setModal({
            type: 'alert',
            title: 'System Status',
            message: 'Closing File Commander session...',
            onConfirm: () => setModal(null)
          });
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey && filteredFiles[selectedIdx]) {
            e.preventDefault();
            handleAction('zip', filteredFiles[selectedIdx].path);
          }
          break;
        case 'd':
        case 'D':
          if (e.ctrlKey && filteredFiles[selectedIdx] && !filteredFiles[selectedIdx].isDirectory) {
            e.preventDefault();
            const url = `/api/files/download?path=${encodeURIComponent(filteredFiles[selectedIdx].path)}`;
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filteredFiles[selectedIdx].name);
            link.setAttribute('target', '_blank');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, selectedIdx, currentPath, modal]);

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        await handleAction('write', `${currentPath}/${file.name}`, { content: base64, isBase64: true });
        fetchFiles(currentPath);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Upload failed");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#101A2A] border-l border-[#A8B2C0]/20 shadow-2xl">
      {/* NC Header */}
      <div className="flex-none p-4 border-b border-[#A8B2C0]/20 bg-[#0A0F1A]/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#6EC8FF]" />
            <h2 className="font-serif italic text-lg font-bold text-[#A8B2C0]">File Commander</h2>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-[#6EC8FF]/20 rounded-md transition-colors" title="Upload File">
              <Upload className="w-4 h-4 text-[#A8B2C0]" />
            </button>
            <button onClick={() => fetchFiles(currentPath)} className="p-1.5 hover:bg-[#6EC8FF]/20 rounded-md transition-colors" title="Refresh">
              <RefreshCw className={cn("w-4 h-4 text-[#A8B2C0]", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0A0F1A] border border-[#A8B2C0]/20 rounded-lg px-3 py-1.5 shadow-sm">
          <ChevronLeft className="w-4 h-4 text-[#6EC8FF] cursor-pointer hover:text-[#4FE3D4]" onClick={navigateUp} />
          <div className="flex-1 font-mono text-xs text-[#A8B2C0] truncate">
            {currentPath || 'Root'}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6EC8FF]" />
            <input 
              type="text" 
              placeholder="Filter..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-2 py-1 bg-[#101A2A] border-none text-xs focus:ring-0 w-32 rounded-md text-[#A8B2C0] placeholder:text-[#6EC8FF]"
            />
          </div>
        </div>
      </div>

      {/* NC Grid Header */}
      <div className="flex-none grid grid-cols-[1fr_100px_150px] gap-4 px-4 py-2 bg-[#0A0F1A] border-b border-[#A8B2C0]/20 text-[10px] font-mono uppercase tracking-widest text-[#A8B2C0] font-bold">
        <div>Name</div>
        <div>Size</div>
        <div>Modified</div>
      </div>

      {/* NC List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {error ? (
          <div className="p-8 text-center text-[#FF7A2F] font-mono text-xs">
            [FS ERROR]: {error}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-[#6EC8FF] font-serif italic">
            No files found in this sector
          </div>
        ) : (
          filteredFiles.map((file, idx) => (
            <div 
              key={file.path}
              onClick={() => setSelectedIdx(idx)}
              onDoubleClick={() => navigate(file)}
              className={cn("nc-row", selectedIdx === idx && "selected")}
            >
              <div className="flex items-center gap-2 truncate">
                {file.isDirectory ? (
                  <Folder className="w-4 h-4 text-[#6EC8FF] fill-[#6EC8FF]/20" />
                ) : (
                  <FileText className="w-4 h-4 text-[#4FE3D4]" />
                )}
                <span className="truncate">{file.name}</span>
              </div>
              <div className="text-right opacity-60">{file.isDirectory ? '<DIR>' : formatSize(file.size)}</div>
              <div className="text-right opacity-60 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                {new Date(file.modified).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* NC Footer / Shortcuts */}
      <div className="flex-none grid grid-cols-5 md:grid-cols-10 gap-px bg-[#A8B2C0]/20 border-t border-[#A8B2C0]/20">
        {[
          { key: 'F3', label: 'View', icon: FileText, action: 'view' },
          { key: 'F4', label: 'Edit', icon: Edit3, action: 'edit' },
          { key: 'F5', label: 'Copy', icon: Copy, action: 'copy' },
          { key: 'F6', label: 'Move', icon: Move, action: 'move' },
          { key: 'F7', label: 'Mkdir', icon: FolderPlus, action: 'mkdir' },
          { key: 'F8', label: 'Delete', icon: Trash2, action: 'delete' },
          { key: 'F2', label: 'Rename', icon: Edit3, action: 'rename' },
          { key: 'F9', label: 'Analyze', icon: Activity, action: 'analyze' },
          { key: 'ZIP', label: 'Zip', icon: Archive, action: 'zip' },
          { key: 'DL', label: 'Get', icon: Download, action: 'download' },
          { key: 'F10', label: 'Quit', icon: X, action: 'quit' },
          { key: 'F1', label: 'Help', icon: Search, action: 'help' },
        ].map((btn) => (
          <button 
            key={btn.key}
            onClick={() => {
              if (btn.action === 'mkdir') {
                setModal({
                  type: 'prompt',
                  title: 'Create Directory',
                  message: 'Enter new folder name:',
                  onConfirm: (name) => {
                    if (name) handleAction('mkdir', `${currentPath}/${name}`);
                    setModal(null);
                  }
                });
              } else if (btn.action === 'quit') {
                setModal({
                  type: 'alert',
                  title: 'System Status',
                  message: 'Closing File Commander session...',
                  onConfirm: () => setModal(null)
                });
              } else if (btn.action === 'help') {
                setModal({
                  type: 'alert',
                  title: 'System Help',
                  message: 'Shortcuts:\nF1: Help\nF2: Rename\nF3: View\nF4: Edit\nF5: Copy\nF6: Move\nF7: Mkdir\nF8: Delete\nF9: Analyze\nZIP: Compress\nDL: Download\nF10: Quit',
                  onConfirm: () => setModal(null)
                });
              } else if (filteredFiles[selectedIdx]) {
                if (btn.action === 'delete') {
                  setModal({
                    type: 'confirm',
                    title: 'Confirm Deletion',
                    message: `Are you sure you want to delete ${filteredFiles[selectedIdx].name}?`,
                    onConfirm: () => {
                      handleAction('delete', filteredFiles[selectedIdx].path);
                      setModal(null);
                    }
                  });
                } else if (btn.action === 'zip') {
                  handleAction('zip', filteredFiles[selectedIdx].path);
                } else if (btn.action === 'download') {
                  if (filteredFiles[selectedIdx].isDirectory) {
                    setModal({
                      type: 'alert',
                      title: 'Download Error',
                      message: 'Cannot download directory directly. Please Zip it first.',
                      onConfirm: () => setModal(null)
                    });
                  } else {
                    const url = `/api/files/download?path=${encodeURIComponent(filteredFiles[selectedIdx].path)}`;
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', filteredFiles[selectedIdx].name);
                    link.setAttribute('target', '_blank');
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                } else if (btn.action === 'rename') {
                  setModal({
                    type: 'prompt',
                    title: 'Rename Resource',
                    message: `Enter new name for ${filteredFiles[selectedIdx].name}:`,
                    value: filteredFiles[selectedIdx].name,
                    onConfirm: (name) => {
                      if (name) handleAction('rename', filteredFiles[selectedIdx].path, { newName: name });
                      setModal(null);
                    }
                  });
                } else if (btn.action === 'view') {
                  if (!filteredFiles[selectedIdx].isDirectory) {
                    handleAction('read', filteredFiles[selectedIdx].path).then((res: any) => {
                      if (res && res.content) {
                        setModal({
                          type: 'view',
                          title: `Viewing: ${filteredFiles[selectedIdx].name}`,
                          value: res.content,
                          onConfirm: () => setModal(null)
                        });
                      }
                    });
                  }
                } else if (btn.action === 'edit') {
                  if (!filteredFiles[selectedIdx].isDirectory) {
                    handleAction('read', filteredFiles[selectedIdx].path).then((res: any) => {
                      if (res && res.content !== undefined) {
                        setModal({
                          type: 'edit',
                          title: `Editing: ${filteredFiles[selectedIdx].name}`,
                          value: res.content,
                          onConfirm: (newContent) => {
                            if (newContent !== null) {
                              handleAction('write', filteredFiles[selectedIdx].path, { content: newContent });
                            }
                            setModal(null);
                          }
                        });
                      }
                    });
                  }
                } else if (btn.action === 'analyze') {
                  if (!filteredFiles[selectedIdx].isDirectory && onAnalyze) {
                    onAnalyze(filteredFiles[selectedIdx]);
                  }
                } else {
                  setModal({
                    type: 'prompt',
                    title: `${btn.label} Resource`,
                    message: `Enter destination path for ${filteredFiles[selectedIdx].name}:`,
                    onConfirm: (dest) => {
                      if (dest) handleAction(btn.action, filteredFiles[selectedIdx].path, { destination: dest });
                      setModal(null);
                    }
                  });
                }
              }
            }}
            className="bg-[#101A2A] hover:bg-[#6EC8FF]/10 py-2 flex flex-col items-center justify-center gap-0.5 transition-colors group border-r border-[#A8B2C0]/10 last:border-r-0"
          >
            <span className="text-[8px] font-mono font-bold text-[#6EC8FF] group-hover:text-[#4FE3D4]">{btn.key}</span>
            <btn.icon className="w-3.5 h-3.5 text-[#A8B2C0] group-hover:text-[#4FE3D4]" />
            <span className="text-[9px] font-bold uppercase tracking-tighter text-[#A8B2C0] group-hover:text-[#4FE3D4]">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0A0F1A] border border-[#6EC8FF]/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#6EC8FF]/10 flex items-center justify-between bg-[#6EC8FF]/5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#6EC8FF]">{modal.title}</h3>
              <button onClick={() => setModal(null)} className="text-[#A8B2C0] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modal.message && <p className="text-sm text-[#A8B2C0] font-serif italic">{modal.message}</p>}
              
              {(modal.type === 'prompt' || modal.type === 'edit') && (
                modal.type === 'edit' ? (
                  <textarea
                    autoFocus
                    value={modal.value}
                    onChange={(e) => setModal({ ...modal, value: e.target.value })}
                    className="w-full h-64 px-4 py-3 bg-[#101A2A] border border-[#6EC8FF]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6EC8FF]/50 text-xs font-mono text-[#A8B2C0] scrollbar-thin"
                  />
                ) : (
                  <input
                    autoFocus
                    type="text"
                    value={modal.value}
                    onChange={(e) => setModal({ ...modal, value: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && modal.onConfirm(modal.value)}
                    className="w-full px-4 py-3 bg-[#101A2A] border border-[#6EC8FF]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6EC8FF]/50 text-sm font-mono text-[#A8B2C0]"
                  />
                )
              )}

              {modal.type === 'view' && (
                <div className="w-full h-64 px-4 py-3 bg-[#101A2A] border border-[#6EC8FF]/20 rounded-xl overflow-y-auto scrollbar-thin">
                  <pre className="text-xs font-mono text-[#A8B2C0] whitespace-pre-wrap">{modal.value}</pre>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setModal(null)}
                  className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#A8B2C0] hover:bg-white/5 transition-all"
                >
                  {modal.type === 'alert' || modal.type === 'view' ? 'Close' : 'Cancel'}
                </button>
                {(modal.type !== 'alert' && modal.type !== 'view') && (
                  <button
                    onClick={() => modal.onConfirm(modal.value)}
                    className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-[#6EC8FF] text-[#0A0F1A] hover:bg-[#4FE3D4] transition-all shadow-[0_0_15px_rgba(110,200,255,0.3)]"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
