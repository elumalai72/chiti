import React from 'react';

interface ChitiLogoProps {
  variant?: 'full' | 'mark' | 'icon';
  size?: number;
  theme?: 'dark' | 'light';
  showSubtitle?: boolean;
}

export const ChitiLogo: React.FC<ChitiLogoProps> = ({
  variant = 'full',
  size = 40,
  theme = 'dark',
  showSubtitle = true
}) => {
  const textColor = theme === 'dark' ? '#FFFFFF' : '#0F172A';
  const subtitleColor = theme === 'dark' ? '#94A3B8' : '#64748B';

  // Minimal, high-contrast calculator icon inside a rounded navy container
  const renderCalculatorSymbol = (dim: number) => (
    <svg 
      width={dim} 
      height={dim} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Navy Rounded Container */}
        <linearGradient id="chitiNavyBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D1322" />
          <stop offset="100%" stopColor="#070B14" />
        </linearGradient>

        {/* Purple/Violet Calculator Body Gradient */}
        <linearGradient id="calcBodyGrad" x1="33" y1="20" x2="67" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>

        {/* Glow Shadow */}
        <filter id="calcShadow" x="20%" y="10%" width="60%" height="80%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7C3AED" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Rounded Square App Icon Container */}
      <rect 
        width="100" 
        height="100" 
        rx="26" 
        fill="url(#chitiNavyBg)" 
      />
      <rect 
        x="0.75" 
        y="0.75" 
        width="98.5" 
        height="98.5" 
        rx="25.25" 
        stroke="rgba(255, 255, 255, 0.08)" 
        strokeWidth="1.5" 
      />

      {/* Calculator Body - Clean, Centered, Small Modern Symbol */}
      <g filter="url(#calcShadow)">
        <rect 
          x="33" 
          y="22" 
          width="34" 
          height="56" 
          rx="8" 
          fill="url(#calcBodyGrad)" 
        />
        {/* Subtle Highlight on top border */}
        <path 
          d="M 37 22 L 63 22" 
          stroke="rgba(255, 255, 255, 0.45)" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
        />

        {/* Calculator Display Screen */}
        <rect 
          x="38" 
          y="28" 
          width="24" 
          height="12" 
          rx="3.5" 
          fill="#0B0F19" 
        />
        {/* Display Screen Indicator Dots/Bars */}
        <rect x="42" y="32" width="6" height="3.5" rx="1.5" fill="#C084FC" />
        <rect x="51" y="32" width="7" height="3.5" rx="1.5" fill="#A855F7" />

        {/* Keypad Buttons - 2 Columns x 3 Rows */}
        {/* Row 1 */}
        <circle cx="43.5" cy="48.5" r="3" fill="#FFFFFF" fillOpacity="0.95" />
        <circle cx="56.5" cy="48.5" r="3" fill="#FFFFFF" fillOpacity="0.95" />

        {/* Row 2 */}
        <circle cx="43.5" cy="58.5" r="3" fill="#FFFFFF" fillOpacity="0.95" />
        <circle cx="56.5" cy="58.5" r="3" fill="#FFFFFF" fillOpacity="0.95" />

        {/* Row 3 (Accent Action Button) */}
        <circle cx="43.5" cy="68.5" r="3" fill="#DDD6FE" />
        <rect x="52.5" y="66" width="8" height="5" rx="2" fill="#F43F5E" />
      </g>
    </svg>
  );

  if (variant === 'icon' || variant === 'mark') {
    return renderCalculatorSymbol(size);
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: `${Math.round(size * 0.28)}px`, userSelect: 'none' }}>
      {renderCalculatorSymbol(size)}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-family)',
            fontWeight: 900,
            fontSize: `${Math.round(size * 0.5)}px`,
            letterSpacing: '1px',
            lineHeight: 1,
            color: textColor
          }}
        >
          CHITI
        </div>
        {showSubtitle && (
          <div
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: `${Math.max(10, Math.round(size * 0.22))}px`,
              fontWeight: 700,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              color: subtitleColor,
              marginTop: '3px',
              lineHeight: 1
            }}
          >
            AGENT PLATFORM
          </div>
        )}
      </div>
    </div>
  );
};
