import React, { useState } from 'react';
import { X, Save, RotateCcw, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onSave: (newPrompt: string) => void;
  defaultPrompt: string;
  title: string;
}

export default function MasterPromptModal({ isOpen, onClose, prompt, onSave, defaultPrompt, title }: MasterPromptModalProps) {
  const [editedPrompt, setEditedPrompt] = useState(prompt);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-border flex items-center justify-between bg-bg-light/50">
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-brand" />
              <div>
                <h2 className="font-serif italic text-xl font-bold text-text-main leading-none">Master Prompt</h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mt-1">{title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-light rounded-lg transition-colors text-text-muted hover:text-text-main"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase text-text-muted tracking-[0.2em] font-bold">
                System Personality & Instructions
              </label>
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="flex-1 w-full p-4 bg-bg-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 text-sm font-mono text-text-main resize-none scrollbar-thin"
                placeholder="Enter system instructions..."
              />
            </div>
          </div>

          <div className="p-6 border-t border-border bg-bg-light/30 flex items-center justify-between gap-4">
            <button
              onClick={() => setEditedPrompt(defaultPrompt)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-brand transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-text-muted hover:bg-bg-light rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSave(editedPrompt);
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2 btn-primary text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
