import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Matrix Rain Logic
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20);
    const drops = Array(columns).fill(1);
    const speeds = Array(columns).fill(0).map(() => Math.random() * 2 + 1);

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 15, 26, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00BFFF';
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speeds[i];
      }
    };

    const interval = setInterval(draw, 33);

    // Progress Logic
    const duration = 5000; // 5 seconds boot
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          clearInterval(interval);
          onComplete();
        }, 1000);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0A0F1A] flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-50" />
      
      <div className="relative z-10 text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="space-y-4 flex flex-col items-center"
        >
          <div className="text-8xl font-serif italic font-black text-[#00BFFF] drop-shadow-[0_0_20px_rgba(0,191,255,0.8)]">
            Brain Cloud
          </div>
          <div className="text-sm font-mono text-[#00BFFF] tracking-[0.5em] uppercase opacity-80">
            Neuro-Agentic Platform
          </div>
        </motion.div>

        <div className="space-y-4">
          {/* Loading Bar Container */}
          <div className="w-72 h-1 bg-white/5 rounded-full overflow-hidden mx-auto relative border border-white/5">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-[#00BFFF] shadow-[0_0_15px_#00BFFF]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          
          <div className="text-[10px] font-mono text-[#00BFFF]/40 uppercase tracking-[0.3em] animate-pulse">
            System Initializing... {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}
