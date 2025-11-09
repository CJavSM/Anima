import React from 'react';

/**
 * Reusable Logo component rendering the project's SVG as inline JSX.
 * Props:
 *  - width: number|string (default 80)
 *  - height: number|string (default 80)
 *  - className: optional CSS class
 *  - title: accessible label (aria-label)
 */
const Logo = ({ width = 80, height = 80, className = '', title = 'Anima logo' }) => (
  <svg
    viewBox="0 0 400 400"
    width={width}
    height={height}
    className={className}
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="gradMain" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="1" />
        <stop offset="50%" stopColor="#EC4899" stopOpacity="1" />
        <stop offset="100%" stopColor="#FBBF24" stopOpacity="1" />
      </linearGradient>

      <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="1" />
      </linearGradient>

      <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
        <stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
      </linearGradient>

      <radialGradient id="radialBg">
        <stop offset="0%" stopColor="#EC4899" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
      </radialGradient>

      <filter id="glowStrong">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="glowSoft">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Fondo radiante */}
    <circle cx="200" cy="200" r="190" fill="url(#radialBg)" />

    {/* Círculos de energía pulsante */}
    <circle
      cx="200"
      cy="205"
      r="160"
      fill="none"
      stroke="url(#gradMain)"
      strokeWidth="1.5"
      opacity="0.3"
      strokeDasharray="8 4"
    >
      <animate attributeName="r" values="160;170;160" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
    </circle>

    {/* Marco de enfoque de cámara (esquinas) */}
    <path d="M 90 90 L 90 120 M 90 90 L 120 90" stroke="url(#gradMain)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glowStrong)" />
    <path d="M 310 90 L 310 120 M 310 90 L 280 90" stroke="url(#gradMain)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glowStrong)" />
    <path d="M 90 310 L 90 280 M 90 310 L 120 310" stroke="url(#gradMain)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glowStrong)" />
    <path d="M 310 310 L 310 280 M 310 310 L 280 310" stroke="url(#gradMain)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glowStrong)" />

    {/* ============ SILUETA DEL ROSTRO MÁS GRANDE ============ */}

    {/* Cabeza - contorno superior (cráneo) */}
    <path
      d="M 140 195 Q 140 140 170 120 Q 200 105 230 120 Q 260 140 260 195"
      fill="none"
      stroke="url(#gradMain)"
      strokeWidth="4"
      strokeLinecap="round"
      filter="url(#glowSoft)"
    />

    {/* Laterales de la cara */}
    <path d="M 140 195 L 140 250 Q 145 280 165 295" fill="none" stroke="url(#gradMain)" strokeWidth="4" strokeLinecap="round" filter="url(#glowSoft)" />
    <path d="M 260 195 L 260 250 Q 255 280 235 295" fill="none" stroke="url(#gradMain)" strokeWidth="4" strokeLinecap="round" filter="url(#glowSoft)" />

    {/* Mentón */}
    <path d="M 165 295 Q 200 305 235 295" fill="none" stroke="url(#gradMain)" strokeWidth="4" strokeLinecap="round" filter="url(#glowSoft)" />

    {/* Cuello */}
    <path d="M 180 298 L 185 320" fill="none" stroke="url(#gradMain)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <path d="M 220 298 L 215 320" fill="none" stroke="url(#gradMain)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

    {/* ============ CARACTERÍSTICAS FACIALES ============ */}

    {/* CEJAS */}
    <path d="M 160 180 Q 170 175 183 178" fill="none" stroke="url(#gradMain)" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M 217 178 Q 230 175 240 180" fill="none" stroke="url(#gradMain)" strokeWidth="3.2" strokeLinecap="round" />

    {/* OJOS */}
    <ellipse cx="170" cy="205" rx="13" ry="10" fill="none" stroke="url(#gradMain)" strokeWidth="3" />
    <circle cx="170" cy="205" r="6" fill="url(#gradPurple)" />
    <circle cx="172" cy="203" r="2.5" fill="#FFFFFF" opacity="0.9" />

    <ellipse cx="230" cy="205" rx="13" ry="10" fill="none" stroke="url(#gradMain)" strokeWidth="3" />
    <circle cx="230" cy="205" r="6" fill="url(#gradPurple)" />
    <circle cx="232" cy="203" r="2.5" fill="#FFFFFF" opacity="0.9" />

    {/* NARIZ */}
    <path d="M 200 200 L 200 235" fill="none" stroke="url(#gradMain)" strokeWidth="2.8" strokeLinecap="round" opacity="0.7" />
    <path d="M 192 232 Q 200 238 208 232" fill="none" stroke="url(#gradMain)" strokeWidth="2.8" strokeLinecap="round" />

    {/* BOCA - Sonrisa serena */}
    <path d="M 175 260 Q 200 280 225 260" fill="none" stroke="url(#gradMain)" strokeWidth="3.5" strokeLinecap="round" filter="url(#glowSoft)" />
    <path d="M 182 264 Q 200 276 218 264" fill="none" stroke="url(#gradMain)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

    {/* ============ MALLA DE DETECCIÓN FACIAL ============ */}
    <g opacity="0.8">
      <circle cx="200" cy="140" r="3" fill="url(#gradGold)" filter="url(#glowSoft)" />

      <circle cx="162" cy="179" r="2.5" fill="url(#gradGold)" />
      <circle cx="176" cy="177" r="2.5" fill="url(#gradGold)" />
      <circle cx="224" cy="177" r="2.5" fill="url(#gradGold)" />
      <circle cx="238" cy="179" r="2.5" fill="url(#gradGold)" />

      <circle cx="157" cy="205" r="2.5" fill="url(#gradGold)" />
      <circle cx="183" cy="205" r="2.5" fill="url(#gradGold)" />
      <circle cx="217" cy="205" r="2.5" fill="url(#gradGold)" />
      <circle cx="243" cy="205" r="2.5" fill="url(#gradGold)" />

      <circle cx="192" cy="232" r="2.5" fill="url(#gradGold)" />
      <circle cx="208" cy="232" r="2.5" fill="url(#gradGold)" />

      <circle cx="175" cy="260" r="2.5" fill="url(#gradGold)" />
      <circle cx="200" cy="274" r="2.5" fill="url(#gradGold)" />
      <circle cx="225" cy="260" r="2.5" fill="url(#gradGold)" />

      <circle cx="140" cy="225" r="2.5" fill="url(#gradGold)" />
      <circle cx="260" cy="225" r="2.5" fill="url(#gradGold)" />
      <circle cx="165" cy="295" r="2.5" fill="url(#gradGold)" />
      <circle cx="235" cy="295" r="2.5" fill="url(#gradGold)" />
      <circle cx="200" cy="300" r="2.5" fill="url(#gradGold)" />
    </g>

    {/* Líneas de conexión de malla */}
    <g opacity="0.4">
      <line x1="162" y1="179" x2="176" y2="177" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="224" y1="177" x2="238" y2="179" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="157" y1="205" x2="183" y2="205" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="217" y1="205" x2="243" y2="205" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="170" y1="205" x2="200" y2="200" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="230" y1="205" x2="200" y2="200" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="192" y1="232" x2="200" y2="260" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="208" y1="232" x2="200" y2="260" stroke="url(#gradGold)" strokeWidth="1.2" />
      <line x1="175" y1="260" x2="225" y2="260" stroke="url(#gradGold)" strokeWidth="1.2" />
    </g>

    {/* ============ EFECTOS ALREDEDOR ============ */}
    <g transform="translate(200, 150)">
      <path
        d="M 0 -8 C 0 -12 -3 -14 -6 -14 C -8 -14 -10 -12.5 -10 -10 C -10 -12.5 -12 -14 -14 -14 C -17 -14 -20 -12 -20 -8 C -20 -2 -10 5 -10 5 C -10 5 0 -2 0 -8 Z"
        fill="url(#gradGold)"
        opacity="0.95"
        filter="url(#glowStrong)"
      />
    </g>

    <g opacity="0.5">
      <circle cx="200" cy="210" r="130" fill="none" stroke="url(#gradMain)" strokeWidth="2" strokeDasharray="5 5">
        <animate attributeName="r" values="130;140;130" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </g>

    {/* Notas musicales reducidas y estratégicas */}
    <g transform="translate(130, 120)" filter="url(#glowSoft)">
      <circle cx="0" cy="0" r="6.5" fill="url(#gradGold)" />
      <rect x="6.5" y="-19" width="3" height="20" fill="url(#gradGold)" />
      <path d="M 9.5 -19 Q 17 -20 18 -13" fill="none" stroke="url(#gradGold)" strokeWidth="2.5" />
    </g>

    <g transform="translate(270, 120)" filter="url(#glowSoft)">
      <circle cx="0" cy="0" r="6.5" fill="url(#gradGold)" />
      <rect x="6.5" y="-19" width="3" height="20" fill="url(#gradGold)" />
      <path d="M 9.5 -19 Q 17 -20 18 -13" fill="none" stroke="url(#gradGold)" strokeWidth="2.5" />
    </g>

    <g transform="translate(85, 205)" filter="url(#glowSoft)">
      <circle cx="0" cy="0" r="7" fill="url(#gradGold)" />
      <rect x="7" y="-19" width="3.2" height="20" fill="url(#gradGold)" />
      <path d="M 10.2 -19 Q 18 -20 19 -12" fill="none" stroke="url(#gradGold)" strokeWidth="2.5" />
    </g>

    <g transform="translate(315, 205)" filter="url(#glowSoft)">
      <circle cx="0" cy="0" r="7" fill="url(#gradGold)" />
      <rect x="7" y="-19" width="3.2" height="20" fill="url(#gradGold)" />
      <path d="M 10.2 -19 Q 18 -20 19 -12" fill="none" stroke="url(#gradGold)" strokeWidth="2.5" />
    </g>

    <g transform="translate(145, 310)">
      <circle cx="0" cy="0" r="6" fill="url(#gradGold)" />
      <rect x="6" y="-17" width="2.8" height="18" fill="url(#gradGold)" />
      <path d="M 8.8 -17 Q 15 -18 16 -11" fill="none" stroke="url(#gradGold)" strokeWidth="2.3" />
    </g>

    <g transform="translate(255, 310)">
      <circle cx="0" cy="0" r="6" fill="url(#gradGold)" />
      <rect x="6" y="-17" width="2.8" height="18" fill="url(#gradGold)" />
      <path d="M 8.8 -17 Q 15 -18 16 -11" fill="none" stroke="url(#gradGold)" strokeWidth="2.3" />
    </g>

    {/* Botón de captura */}
    <circle cx="200" cy="335" r="16" fill="none" stroke="url(#gradGold)" strokeWidth="3.5" filter="url(#glowStrong)" />
    <circle cx="200" cy="335" r="10" fill="url(#gradGold)" opacity="0.8">
      <animate attributeName="r" values="10;11;10" dur="1.5s" repeatCount="indefinite" />
    </circle>

    {/* Indicadores de escaneo activo */}
    <circle cx="105" cy="105" r="4.5" fill="url(#gradGold)" filter="url(#glowSoft)">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="295" cy="105" r="4.5" fill="url(#gradGold)" filter="url(#glowSoft)">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
    </circle>
    <circle cx="105" cy="295" r="4.5" fill="url(#gradGold)" filter="url(#glowSoft)">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
    </circle>
    <circle cx="295" cy="295" r="4.5" fill="url(#gradGold)" filter="url(#glowSoft)">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
    </circle>

    {/* Línea de escaneo dinámica */}
    <line x1="110" y1="210" x2="290" y2="210" stroke="url(#gradGold)" strokeWidth="1.5" opacity="0.4">
      <animate attributeName="y1" values="130;290;130" dur="3s" repeatCount="indefinite" />
      <animate attributeName="y2" values="130;290;130" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
    </line>
  </svg>
);

export default Logo;
