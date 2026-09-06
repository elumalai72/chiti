import React from 'react';
import { Home, Layers, Users, CreditCard, BookOpen } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chitis', label: 'Chitis', icon: Layers },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'payments', label: 'Collect', icon: CreditCard },
    { id: 'ledger', label: 'Ledger', icon: BookOpen }
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 12px',
                borderRadius: '12px',
                backgroundColor: isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                transition: 'background-color 0.2s ease'
              }}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? 'var(--primary-purple)' : '#64748B'} 
              />
            </div>
            <span style={{ fontSize: '11px', lineHeight: 1.2 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
