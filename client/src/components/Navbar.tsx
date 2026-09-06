import React, { useState } from 'react';
import { AgentAccount } from '../types';
import { ChitiLogo } from './ChitiLogo';
import { LogOut, Building, MapPin, Phone, ShieldCheck, ChevronDown, User, Calculator, Download } from 'lucide-react';

interface NavbarProps {
  agent: AgentAccount;
  onLogout: () => void;
  onNavigateHome: () => void;
  onOpenCalculator?: () => void;
  onOpenInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  agent,
  onLogout,
  onNavigateHome,
  onOpenCalculator,
  onOpenInstall
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header 
      style={{
        background: '#070B14',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 16px',
        paddingTop: 'calc(10px + var(--safe-top))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        color: '#FFFFFF',
        width: '100%'
      }}
    >
      {/* Brand Logo & Name */}
      <div 
        onClick={onNavigateHome}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <ChitiLogo variant="full" size={34} theme="dark" showSubtitle={false} />
      </div>

      {/* Right Controls: Calculator & Agent Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenCalculator && (
          <button
            onClick={onOpenCalculator}
            className="btn btn-glass btn-sm"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px',
              minHeight: '40px',
              borderRadius: '9999px',
              color: '#DDD6FE',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              background: 'rgba(124, 58, 237, 0.14)'
            }}
            title="Open Chiti Calculator"
            aria-label="Open Calculator"
          >
            <Calculator size={17} color="#A78BFA" />
            <span style={{ fontWeight: 700, fontSize: '13px' }} className="desktop-only">Calculator</span>
          </button>
        )}

        {onOpenInstall && (
          <button
            onClick={onOpenInstall}
            className="btn btn-primary btn-sm"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px',
              minHeight: '40px',
              borderRadius: '9999px',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.45)',
              fontSize: '12px',
              fontWeight: 700
            }}
            title="Install CHITI App on Mobile"
            aria-label="Install App"
          >
            <Download size={15} strokeWidth={2.5} />
            <span>Install</span>
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="btn btn-glass btn-sm"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '6px 12px',
              minHeight: '40px',
              borderRadius: '9999px'
            }}
            aria-label="Agent Profile Menu"
          >
            <span 
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#10B981', 
                boxShadow: '0 0 8px #10B981'
              }} 
            />
            <span style={{ fontWeight: 700, fontSize: '13px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.name.split(' ')[0]}
            </span>
            <ChevronDown size={14} color="#94A3B8" />
          </button>

          {showProfileMenu && (
            <>
              {/* Backdrop for closing */}
              <div 
                onClick={() => setShowProfileMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 140 }}
              />
              <div 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '280px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '16px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
                  zIndex: 150,
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  animation: 'slideUp 0.18s ease-out'
                }}
              >
                <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        background: 'rgba(124, 58, 237, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#7C3AED'
                      }}
                    >
                      <User size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>{agent.name}</div>
                      <span className="badge badge-violet" style={{ fontSize: '10px', padding: '2px 8px' }}>Verified Agent</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                    <Building size={13} color="#94A3B8" /> {agent.businessName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <MapPin size={13} color="#94A3B8" /> {agent.town}, {agent.state}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <Phone size={13} color="#94A3B8" /> {agent.phone}
                  </div>
                </div>

                {onOpenInstall && (
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenInstall();
                    }}
                    className="btn btn-primary btn-block btn-sm"
                    style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 700 }}
                  >
                    <Download size={14} /> Install CHITI Mobile App
                  </button>
                )}

                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="btn btn-secondary btn-block btn-sm"
                  style={{ color: '#EF4444', borderColor: '#FEE2E2', background: '#FEF2F2', fontSize: '13px' }}
                >
                  <LogOut size={14} /> Log Out of Agent Hub
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
