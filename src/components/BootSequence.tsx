/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { MainframeLogo } from "./MainframeLogo";

// --- Components ---

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const characters = "01";
    const fontSize = 14;
    const columns = Math.ceil(width / fontSize);

    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -height;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(2, 4, 10, 0.1)"; 
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#00FFC8";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        const opacity = Math.random() * 0.5 + 0.1;
        ctx.fillStyle = `rgba(0, 255, 200, ${opacity})`;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    const interval = setInterval(draw, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-40 z-0"
      style={{ filter: "blur(0.5px)" }}
    />
  );
};

// --- Main App Logic ---

const BOOT_MESSAGES = [
  "[INFO] Initializing core modules...",
  "[PROBE] Establishing network connection...",
  "[AUTH] Verifying credentials...",
  "[DATABASE] Synchronizing neural datasets...",
  "[SYSTEM] OS Kernel loaded.",
  "[SECURITY] Firewall active. Admin channel secured.",
  "[READY] CATOMES MAINFRAME ONLINE"
];

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [bootProgress, setBootProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isBursting, setIsBursting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setBootProgress((prev) => {
        if (prev < 100) return prev + 0.5;
        return 100;
      });
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (bootProgress >= 100) {
      const timeout = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [bootProgress, onComplete]);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMessageIndex((prev) => (prev < BOOT_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(msgTimer);
  }, []);

  const handleLogoClick = useCallback(() => {
    setIsBursting(true);
    setTimeout(() => setIsBursting(false), 1000);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#02040A] overflow-hidden select-none font-mono selection:bg-[#00FFC8]/30">
      {/* Matrix Background Effect */}
      <MatrixRain />

      {/* Mainframe Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: "linear-gradient(#0A1018 1px, transparent 1px), linear-gradient(90deg, #0A1018 1px, transparent 1px)",
          backgroundSize: "80px 80px"
        }}
      />

      {/* System Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-20 font-orbitron">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#00FFC8] opacity-50">System Identification</div>
          <div className="text-xs text-[#00FFC8]">CATOMES_MAINFRAME_V2.4.0_STABLE</div>
          <div className="text-xs text-[#00FFC8] opacity-60">KERNEL-TYPE: NEURAL_DYNAMICS_CORE</div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#00FFC8] opacity-50">Connection Status</div>
          <div className="text-xs text-[#00FFC8] flex items-center justify-end gap-2 uppercase">
            SECURE CHANNEL <span className="w-2 h-2 rounded-full bg-[#00FFC8] shadow-[0_0_8px_#00FFC8] animate-pulse"></span>
          </div>
          <div className="text-xs text-[#00FFC8] opacity-60 uppercase tracking-tighter italic">LATENCY: 12ms // SYNC: ACTIVE</div>
        </div>
      </div>

      {/* Central Assembly */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          {/* Background Logo Backdrop */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <svg className="w-[1000px] h-[1000px] pointer-events-none" viewBox="0 0 1920 1080">
              <defs>
                <linearGradient id="logoStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00FFC8">
                    <animate attributeName="stop-color" values="#00FFC8;#00AACC;#00FFC8" dur="4s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#00AACC">
                    <animate attributeName="stop-color" values="#00AACC;#00FFC8;#00AACC" dur="4s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="25" floodColor="#00FFC8" floodOpacity="0.5" />
                </filter>
              </defs>

              <AnimatePresence>
                {isBursting && Array.from({ length: 30 }).map((_, i) => (
                  <motion.text
                    key={`burst-${i}`}
                    x={960}
                    y={540}
                    fill="#00FFC8"
                    fontSize="16"
                    fontFamily="Courier New, monospace"
                    initial={{ opacity: 0.8, x: 960, y: 540, scale: 1 }}
                    animate={{ 
                      opacity: 0, 
                      x: 960 + (Math.random() - 0.5) * 1200, 
                      y: 540 + (Math.random() - 0.5) * 1200,
                      scale: 0.5
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  >
                    {Math.random() > 0.5 ? "1" : "0"}
                  </motion.text>
                ))}
              </AnimatePresence>

              <motion.g
                initial={{ opacity: 0, scale: 0.8, x: 960, y: 540 }}
                animate={{ opacity: 1, scale: 1.2 }}
                whileHover={{ scale: 1.25, filter: "brightness(1.5) drop-shadow(0 0 25px #00FFC8)" }}
                whileTap={{ scale: 1.15 }}
                onClick={handleLogoClick}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="cursor-pointer pointer-events-auto"
                style={{ transformOrigin: "960px 540px" }}
                filter="url(#softGlow)"
              >
                <MainframeLogo />
                <circle cx="0" cy="0" r="180" fill="none" stroke="url(#logoStroke)" strokeWidth="1" opacity="0.15">
                  <animate attributeName="r" values="180;200;180" dur="8s" repeatCount="indefinite" />
                </circle>
              </motion.g>
            </svg>
          </div>

          {/* Central Glow Core (Behind Text) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="blur-[120px] w-[500px] h-[500px] rounded-full bg-[#00FFC8] opacity-5"></div>
          </div>
          
          {/* Main Branding Text Layered in Front */}
          <div className="relative text-center space-y-4 z-20 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, letterSpacing: "0.2em" }}
              animate={{ opacity: 1, letterSpacing: "0.6em" }}
              transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
              className="text-7xl font-black text-white ml-[0.6em] drop-shadow-[0_0_15px_rgba(0,255,200,0.3)] font-sans uppercase" 
            >
              Catomes
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 2, duration: 1 }}
              className="text-xs tracking-[0.4em] text-[#6FFFE9] uppercase"
            >
              Neural Dynamics · Mainframe v4.20
            </motion.div>
          </div>
        </div>
      </div>

      {/* Peripheral HUD Elements */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col gap-6 z-20 opacity-30">
        <div className="space-y-1">
          <div className="w-16 h-1 bg-[#00FFC8]"></div>
          <div className="w-12 h-1 bg-[#00FFC8]"></div>
          <div className="w-14 h-1 bg-[#00FFC8]"></div>
        </div>
        <div className="text-[10px] text-[#00FFC8] rotate-90 origin-right whitespace-nowrap tracking-widest uppercase">NODE_CLUSTER_04</div>
      </div>

      <div className="absolute top-1/2 left-8 -translate-y-1/2 flex flex-col gap-6 z-20 opacity-30">
        <div className="text-[10px] text-[#00FFC8] -rotate-90 origin-left whitespace-nowrap tracking-widest uppercase mb-12">DATA_OVERFLOW_SHIELD</div>
        <div className="space-y-1">
          <div className="w-16 h-1 bg-[#00FFC8]"></div>
          <div className="w-14 h-1 bg-[#00FFC8]"></div>
        </div>
      </div>

      {/* Bottom Status Monitor */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-end border-t border-[#00FFC8]/10 bg-black/40 backdrop-blur-sm z-[1001]">
        <div className="space-y-1.5 h-16 overflow-hidden flex flex-col justify-end">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-[#00FFC8] text-xs uppercase flex flex-col gap-1"
            >
              <div className="flex items-center gap-2">
                <span className="opacity-40">{BOOT_MESSAGES[messageIndex].split(" ")[0]}</span> 
                {BOOT_MESSAGES[messageIndex].split(" ").slice(1).join(" ")}
              </div>
              {messageIndex > 0 && (
                <div className="opacity-30 text-[10px]">
                   {BOOT_MESSAGES[messageIndex-1]}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          <div className="flex items-center gap-2 text-[#00FFC8] text-xs font-bold uppercase tracking-wider mt-2">
            <span className="opacity-40">[SYSTEM]</span> BUFFER: <span className="text-white">OK</span> | SYNC: <span className="text-white">ACTIVE</span> | TEMP: <span className="text-white">34°C</span>
          </div>
        </div>
        
        <div className="w-64 h-12 flex flex-col justify-end gap-2">
          <div className="flex justify-between text-[10px] text-[#00FFC8] opacity-60 uppercase tracking-widest">
            <span>Loading Modules</span>
            <span>{Math.floor(bootProgress)}%</span>
          </div>
          <div className="w-full h-1 bg-[#0A1018] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#00FFC8] shadow-[0_0_10px_#00FFC8]" 
              initial={{ width: 0 }}
              animate={{ width: `${bootProgress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
