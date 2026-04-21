import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Cpu, Shield, Zap, Terminal, Globe, Layout, Database } from 'lucide-react';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQ_SECTIONS = [
  {
    title: "System Badges",
    icon: Cpu,
    items: [
      {
        q: "AGENT Mode",
        a: "Når aktiv, tænker systemet som en autonom agent. Det planlægger selvstændigt og bruger værktøjer til at løse opgaver."
      },
      {
        q: "AUTO (Full Autonomy)",
        a: "Giver agenten tilladelse til at skrive filer, installere pakker og udføre kommandoer uden at spørge om bekræftelse."
      },
      {
        q: "FOLLOW",
        a: "Systemet skifter automatisk dit view (f.eks. til Webdesign), så du kan følge med i hvad agenten arbejder på i realtid."
      }
    ]
  },
  {
    title: "Agent Views",
    icon: Terminal,
    items: [
      {
        q: "Web Research",
        a: "Specialiseret i at søge på nettet, læse dokumentation og hente informationer fra URL'er."
      },
      {
        q: "Coding / Webdesign",
        a: "Fokuseret på at skrive kode, bygge UI'er og køre live previews af dine projekter."
      },
      {
        q: "Hermes (Runtime)",
        a: "Systemets motor til at køre CLI-kommandoer, scripts og styre lokale processer."
      },
      {
        q: "AEGIS (Security)",
        a: "Analyserer kode for sårbarheder, tjekker audit logs og sikrer systemets integritet."
      }
    ]
  },
  {
    title: "Features",
    icon: Zap,
    items: [
      {
        q: "File Commander",
        a: "En indbygget fil-browser (NC-style). Du kan låse en fil som 'Context' for at gøre agenten opmærksom på en specifik fil."
      },
      {
        q: "CATOMES Control",
        a: "Dashboard til at overvåge og styre komplekse missions-forløb på tværs af forskellige agenter."
      }
    ]
  }
];

export const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#02040A]/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[80vh] bg-[#0A0F1A] border border-[#A8B2C0]/20 rounded-3xl shadow-2xl p-8 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 border border-brand/30 rounded-xl">
                  <HelpCircle className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif italic font-bold text-text-main">System FAQ & Manual</h2>
                  <p className="text-xs text-text-muted font-mono uppercase tracking-widest">Operator Guidance Protocol</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-text-main"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin space-y-8">
              {FAQ_SECTIONS.map((section, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <section.icon className="w-4 h-4 text-brand" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand/80">{section.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {section.items.map((item, i) => (
                      <div key={i} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-brand/30 transition-all duration-300">
                        <h4 className="text-brand font-bold mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                          {item.q}
                        </h4>
                        <p className="text-sm text-text-muted leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4FE3D4]" />
                <span className="text-[10px] font-mono text-text-muted">SYSTEM STATUS: OPTIMAL</span>
              </div>
              <p className="text-[10px] font-mono text-text-muted/50">OPERATOR: {localStorage.getItem('user_email') || 'UNKNOWN'}</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
