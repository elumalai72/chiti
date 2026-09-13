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

  const renderLafluenceSymbol = (dim: number) => (
    <div 
      style={{
        width: dim,
        height: dim,
        borderRadius: dim > 30 ? '12px' : '8px',
        backgroundImage: `url('/lafluence-logo-raw.png')`,
        backgroundPosition: 'center',
        backgroundSize: '300%', // Zoom into the center of the screenshot
        backgroundColor: '#000', // Matches the black square of the logo
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    />
  );

  if (variant === 'icon' || variant === 'mark') {
    return renderLafluenceSymbol(size);
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: `${Math.round(size * 0.3)}px`, userSelect: 'none' }}>
      {renderLafluenceSymbol(size)}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-family)',
            fontWeight: 900,
            fontSize: `${Math.round(size * 0.45)}px`,
            letterSpacing: '1px',
            lineHeight: 1,
            color: textColor
          }}
        >
          LAFLUENCE
        </div>
        {showSubtitle && (
          <div
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: `${Math.max(10, Math.round(size * 0.18))}px`,
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: subtitleColor,
              marginTop: '4px',
              lineHeight: 1
            }}
          >
            COLLABORATE • EXECUTE • ELEVATE
          </div>
        )}
      </div>
    </div>
  );
};
