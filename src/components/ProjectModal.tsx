import React, { useState, useEffect } from 'react';
import { X, Layout, Info, Layers, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Project {
  name: string;
  path: string;
  description: string;
  stack: string[];
  last_updated: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  project?: Project | null;
  title: string;
}

export default function ProjectModal({ isOpen, onClose, onSave, project, title }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setStack(project.stack.join(', '));
    } else {
      setName('');
      setDescription('');
      setStack('HTML, CSS, JS, Tailwind');
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      stack: stack.split(',').map(s => s.trim()).filter(s => s !== '')
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-[#0A0F1A] border border-[#6EC8FF]/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#6EC8FF]/10 flex items-center justify-between bg-[#6EC8FF]/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#6EC8FF]/10 rounded-lg">
                  <Layout className="w-4 h-4 text-[#6EC8FF]" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#6EC8FF]">{title}</h3>
              </div>
              <button onClick={onClose} className="text-[#A8B2C0] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#A8B2C0]">
                    <Layout className="w-3 h-3" />
                    Project Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Awesome Portfolio"
                    className="w-full px-4 py-3 bg-[#101A2A] border border-[#6EC8FF]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6EC8FF]/50 text-sm font-mono text-[#A8B2C0]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#A8B2C0]">
                    <Info className="w-3 h-3" />
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this project about?"
                    className="w-full h-24 px-4 py-3 bg-[#101A2A] border border-[#6EC8FF]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6EC8FF]/50 text-sm font-mono text-[#A8B2C0] resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#A8B2C0]">
                    <Layers className="w-3 h-3" />
                    Tech Stack (comma separated)
                  </label>
                  <input
                    type="text"
                    value={stack}
                    onChange={(e) => setStack(e.target.value)}
                    placeholder="e.g., React, Tailwind, Node.js"
                    className="w-full px-4 py-3 bg-[#101A2A] border border-[#6EC8FF]/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6EC8FF]/50 text-sm font-mono text-[#A8B2C0]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#A8B2C0] hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-[#6EC8FF] text-[#0A0F1A] hover:bg-[#4FE3D4] transition-all shadow-[0_0_15px_rgba(110,200,255,0.3)] flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
