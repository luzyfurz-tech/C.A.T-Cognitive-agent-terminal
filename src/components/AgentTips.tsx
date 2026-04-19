import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Tip {
  id: number;
  text: string;
  category: string;
}

const TIPS: Record<string, Tip[]> = {
  chat: [
    { id: 1, text: "Use [SET_MODEL: name] to switch AI cores on the fly.", category: "PRO TIP" },
    { id: 2, text: "Agent mode can execute terminal commands automatically.", category: "AUTOMATION" },
    { id: 3, text: "The 'Brain' section shows the AI's step-by-step reasoning.", category: "COGNITION" },
    { id: 4, text: "Handoff context to specialized agents using the buttons below messages.", category: "WORKFLOW" }
  ],
  webdesign: [
    { id: 5, text: "Ask the agent to 'Create a project' to start a new workspace.", category: "PROJECTS" },
    { id: 6, text: "The preview tab updates in real-time as code is generated.", category: "LIVE VIEW" },
    { id: 7, text: "You can run full Docker containers for complex backends.", category: "DOCKER" },
    { id: 8, text: "Use the 'Master Prompt' to set global design rules.", category: "CONFIG" }
  ],
  ollamaWeb: [
    { id: 9, text: "OllamaWeb can search, fetch, and even click buttons on websites.", category: "CAPABILITY" },
    { id: 10, text: "Ask for a 'screenshot' to see what the agent is looking at.", category: "VISION" },
    { id: 11, text: "The agent status bar shows real-time tool execution steps.", category: "STATUS" },
    { id: 12, text: "Tool results are collapsed by default to keep the chat clean.", category: "UI" }
  ],
  security: [
    { id: 13, text: "Aegis can perform automated security audits on your files.", category: "AUDIT" },
    { id: 14, text: "Use the terminal to run custom penetration testing tools.", category: "TOOLS" },
    { id: 15, text: "The security agent has high autonomy in Agent Mode.", category: "AUTONOMY" },
    { id: 16, text: "Check the audit logs for a history of all security actions.", category: "LOGS" }
  ]
};

interface AgentTipsProps {
  agentType: string;
}

export default function AgentTips({ agentType }: AgentTipsProps) {
  const tips = TIPS[agentType] || TIPS.chat;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips]);

  const nextTip = () => setCurrentIndex((prev) => (prev + 1) % tips.length);
  const prevTip = () => setCurrentIndex((prev) => (prev - 1 + tips.length) % tips.length);

  return (
    <div className="max-w-md mx-auto mt-8 px-6 py-4 bg-brand/5 border border-brand/10 rounded-2xl backdrop-blur-sm relative group overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-brand/20" />
      
      <div className="flex items-start gap-4">
        <div className="mt-1 p-2 bg-brand/10 rounded-xl text-brand">
          <Lightbulb className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-1"
            >
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand/60">
                {tips[currentIndex].category}
              </span>
              <p className="text-[11px] text-text-muted leading-relaxed font-medium">
                {tips[currentIndex].text}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={prevTip} className="p-1 hover:text-brand transition-colors">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button onClick={nextTip} className="p-1 hover:text-brand transition-colors">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="flex gap-1 mt-3 justify-center">
        {tips.map((_, i) => (
          <div 
            key={i} 
            className={`h-0.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-4 bg-brand' : 'w-1 bg-brand/20'}`} 
          />
        ))}
      </div>
    </div>
  );
}
