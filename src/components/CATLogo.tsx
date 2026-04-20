import React from 'react';

export default function CATLogo() {
  return (
    <svg viewBox="0 0 200 60" className="w-32 h-10 overflow-visible">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="50%" stopColor="#66FFFF" />
          <stop offset="100%" stopColor="#00BFFF" />
        </linearGradient>
      </defs>
      
      {/* Background decorative lines */}
      <path d="M5 15 L15 15 L15 5" fill="none" stroke="#00BFFF" strokeWidth="1" opacity="0.5" />
      <path d="M185 45 L175 45 L175 55" fill="none" stroke="#00BFFF" strokeWidth="1" opacity="0.5" />
      
      {/* Main Text with Glow */}
      <text 
        x="100" 
        y="35" 
        fontFamily="Orbitron, sans-serif" 
        fontSize="18" 
        fill="url(#textGradient)" 
        filter="url(#glow)" 
        letterSpacing="2" 
        fontWeight="900"
        textAnchor="middle"
        className="animate-pulse"
      >
        BRAIN CLOUD
      </text>
      
      {/* Tech accents */}
      <rect x="25" y="42" width="150" height="1" fill="#00BFFF" opacity="0.2" />
      <rect x="25" y="42" width="30" height="1" fill="#00BFFF" opacity="0.6" />
      <rect x="145" y="42" width="30" height="1" fill="#00BFFF" opacity="0.6" />
    </svg>
  );
}
