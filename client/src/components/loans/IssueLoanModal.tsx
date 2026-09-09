import React, { useState } from 'react';
import { Member, ChitMonth } from '../../types';
import { dbService } from '../../services/dbService';
import { X } from 'lucide-react';

interface IssueLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  chitiId: string;
  members: Member[];
  chitMonths: ChitMonth[]; // to select which month this was issued in
  onSuccess: () => void;
}

export const IssueLoanModal: React.FC<IssueLoanModalProps> = ({ isOpen, onClose, agentId, chitiId, members, chitMonths, onSuccess }) => {
  const [memberId, setMemberId] = useState('');
  const [issuedMonthId, setIssuedMonthId] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [expectedInterest, setExpectedInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !issuedMonthId || !principalAmount || !expectedInterest) return;
    
    setIsSubmitting(true);
    try {
      await dbService.issueLoan({
        agentId,
        chitiId,
        issuedMonthId,
        memberId,
        principalAmount: Number(principalAmount),
        expectedInterest: Number(expectedInterest),
        notes
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to issue loan', err);
      alert('Failed to issue loan. Check console for details.');
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

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Issue Loan</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Select Member</label>
            <select required value={memberId} onChange={e => setMemberId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }}>
              <option value="">-- Choose Member --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.phone})</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Issued Month</label>
            <select required value={issuedMonthId} onChange={e => setIssuedMonthId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }}>
              <option value="">-- Choose Month --</option>
              {chitMonths.map(m => <option key={m.id} value={m.id}>Month {m.monthNumber}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Principal Amount (₹)</label>
            <input required type="number" value={principalAmount} onChange={e => setPrincipalAmount(e.target.value)} placeholder="e.g. 5000" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Expected Interest (₹)</label>
            <input required type="number" value={expectedInterest} onChange={e => setExpectedInterest(e.target.value)} placeholder="e.g. 300" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Issuing...' : 'Issue Loan'}
          </button>
        </form>
      </div>
    </div>
  );
};
