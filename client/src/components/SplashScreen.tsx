import React, { useEffect, useState } from 'react';
import { ChitiLogo } from './ChitiLogo';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 1200
}) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const closeTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 350);
      return () => clearTimeout(closeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#070B14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fading ? 'none' : 'auto'
      }}
    >
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.28) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', textAlign: 'center' }}>
        <ChitiLogo variant="icon" size={88} theme="dark" />
        
        <div style={{ marginTop: '20px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              letterSpacing: '2px',
              color: '#FFFFFF',
              margin: 0,
              fontFamily: 'var(--font-family)'
            }}
          >
            CHITI
          </h1>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '3px',
              color: '#A78BFA',
              textTransform: 'uppercase',
              marginTop: '6px'
            }}
          >
            Chiti Management Platform
          </p>
        </div>

        {/* Minimal Subtle Loading Bar */}
        <div
          style={{
            width: '120px',
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            margin: '28px auto 0',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, #7C3AED, #C084FC)',
              borderRadius: '9999px',
              animation: 'chitiSplashPulse 1.2s infinite ease-in-out'
            }}
          />
        </div>
      </div>
    </div>
  );
};
