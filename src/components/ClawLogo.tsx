import React from 'react';

export default function ClawLogo() {
  return (
    <svg width="240" height="100" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="480" height="200" fill="#0A0F1A"/>

      {/* Neon gradient */}
      <defs>
        <linearGradient id="neon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#66FFFF"/>
          <stop offset="100%" stopColor="#00BFFF"/>
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00BFFF" floodOpacity="1"/>
        </filter>
      </defs>

      {/* CLAW 1 */}
      <path d="M70 25
               C45 75, 55 140, 85 180
               C105 135, 115 75, 95 30
               Z"
            fill="#000000"
            stroke="url(#neon)"
            strokeWidth="3"
            filter="url(#glow)"/>

      {/* CLAW 2 */}
      <path d="M150 20
               C125 70, 135 140, 165 180
               C185 135, 195 70, 175 25
               Z"
            fill="#000000"
            stroke="url(#neon)"
            strokeWidth="3"
            filter="url(#glow)"/>

      {/* CLAW 3 */}
      <path d="M230 22
               C205 75, 215 145, 245 182
               C265 140, 275 75, 255 28
               Z"
            fill="#000000"
            stroke="url(#neon)"
            strokeWidth="3"
            filter="url(#glow)"/>

      {/* CLAW 4 */}
      <path d="M310 30
               C285 80, 295 145, 325 182
               C345 140, 355 80, 335 35
               Z"
            fill="#000000"
            stroke="url(#neon)"
            strokeWidth="3"
            filter="url(#glow)"/>
    </svg>
  );
}
