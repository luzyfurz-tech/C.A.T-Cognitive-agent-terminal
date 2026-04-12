import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CATLogo from './CATLogo';

const BOOT_MESSAGES = [
  "INITIALIZING D.E.X C.A.T PROTOCOL...",
  "ESTABLISHING SECURE LINK...",
  "ENCRYPTION ACTIVE • CHANNEL SEALED",
  "LOADING NODE REGISTRY...",
  "SCANNING PRINTER NODES [ OK ]",
  "AUTHENTICATING RINKHALS NODES...",
  "BOOTSTRAPPING FARM COMMANDER...",
  "LOADING C.A.T INTERFACE MODULES...",
  "SYSTEM READY"
];

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
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

    // Text Sequence Logic
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < BOOT_MESSAGES.length - 1) return prev + 1;
        clearInterval(messageInterval);
        setTimeout(() => setIsFadingOut(true), 1000);
        return prev;
      });
    }, 800);

    // Completion
    setTimeout(() => {
      clearInterval(interval);
      onComplete();
    }, BOOT_MESSAGES.length * 800 + 6000);

    return () => {
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0A0F1A] flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-50" />
      
      <div className="relative z-10 text-center">
        <AnimatePresence mode="wait">
          {!isFadingOut ? (
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-[#00BFFF] font-mono text-xl tracking-widest drop-shadow-[0_0_8px_rgba(0,191,255,0.8)]"
            >
              {BOOT_MESSAGES[currentMessageIndex]}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 flex flex-col items-center"
            >
              <CATLogo />
              <div className="text-6xl font-serif italic font-black text-[#00BFFF] drop-shadow-[0_0_15px_rgba(0,191,255,0.8)]">
                C.A.T
              </div>
              <div className="text-sm font-mono text-[#00BFFF] tracking-[0.5em] uppercase">
                Cognitive Agent Terminal
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
