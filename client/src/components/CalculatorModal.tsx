import React from 'react';
import { ChitiCalculator } from './ChitiCalculator';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          padding: '0',
          background: 'transparent',
          boxShadow: 'none',
          border: 'none'
        }}
      >
        <ChitiCalculator onClose={onClose} />
      </div>
    </div>
  );
};
