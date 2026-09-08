import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Edit3, Plus, X } from 'lucide-react';

interface FloatingActionMenuProps {
  onOpenCalculator: () => void;
  onOpenNotepad: () => void;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  onOpenCalculator,
  onOpenNotepad
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 80px)', // Above bottom nav
        right: '20px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px'
      }}
    >
      {/* Expanded Options */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '12px',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'bottom right'
        }}
      >
        <button
          onClick={() => {
            setIsOpen(false);
            onOpenNotepad();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span style={{ 
            background: '#FFFFFF', 
            padding: '6px 12px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#334155',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            Notepad
          </span>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            color: '#4F46E5'
          }}>
            <Edit3 size={20} />
          </div>
        </button>

        <button
          onClick={() => {
            setIsOpen(false);
            onOpenCalculator();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span style={{ 
            background: '#FFFFFF', 
            padding: '6px 12px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#334155',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            Calculator
          </span>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            color: '#C084FC'
          }}>
            <Calculator size={20} />
          </div>
        </button>
      </div>

      {/* Main FAB Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.5)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease'
        }}
        aria-label="Agent Tools"
      >
        <div style={{
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Plus size={28} />
        </div>
      </button>
    </div>
  );
};
