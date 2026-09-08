import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Trash2 } from 'lucide-react';

interface NotepadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotepadModal: React.FC<NotepadModalProps> = ({ isOpen, onClose }) => {
  const [note, setNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('chiti_notepad');
      if (saved) setNote(saved);
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('chiti_notepad', note);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your notes?')) {
      setNote('');
      localStorage.removeItem('chiti_notepad');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '400px',
          height: '60vh',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#E0E7FF', padding: '6px', borderRadius: '10px' }}>
              <Edit3 size={18} color="#4F46E5" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Quick Notepad</h3>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', border: 'none', color: '#64748B', cursor: 'pointer',
              padding: '4px', borderRadius: '50%', display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type your notes here... (Saves automatically when you click Save)"
            style={{
              flex: 1,
              width: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: '#334155',
              lineHeight: 1.5,
              background: 'transparent'
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#EF4444',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} /> Clear
          </button>
          
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
          >
            {isSaved ? 'Saved!' : 'Save Note'} <Save size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
