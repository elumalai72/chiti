import React, { useState, useEffect } from 'react';
import { Loan } from '../../types';
import { dbService } from '../../services/dbService';
import { X } from 'lucide-react';

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onSuccess: () => void;
}

export const EditLoanModal: React.FC<EditLoanModalProps> = ({ isOpen, onClose, loan, onSuccess }) => {
  const [memberName, setMemberName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [expectedInterest, setExpectedInterest] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loan) {
      setMemberName(loan.memberName || '');
      setPrincipalAmount(String(loan.principalAmount));
      setExpectedInterest(String(loan.expectedInterest));
      // Format datetime-local string
      const dateObj = new Date(loan.issuedDate);
      const isoString = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString();
      setIssuedDate(isoString.slice(0, 16));
      setNotes(loan.notes || '');
    }
  }, [loan]);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalAmount || !expectedInterest || !memberName || !issuedDate) return;
    
    setIsSubmitting(true);
    try {
      await dbService.updateLoan(loan.id, {
        memberName,
        principalAmount: Number(principalAmount),
        expectedInterest: Number(expectedInterest),
        issuedDate: new Date(issuedDate).toISOString(),
        notes
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to edit loan', err);
      alert('Failed to edit loan. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', background: '#FFFFFF', borderRadius: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Edit Loan Details</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Member Name</label>
            <input required type="text" value={memberName} onChange={e => setMemberName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Principal Amount (₹)</label>
            <input required type="number" value={principalAmount} onChange={e => setPrincipalAmount(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Expected Interest (₹)</label>
            <input required type="number" value={expectedInterest} onChange={e => setExpectedInterest(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Date & Time</label>
            <input required type="datetime-local" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
