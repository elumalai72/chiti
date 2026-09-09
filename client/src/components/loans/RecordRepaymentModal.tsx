import React, { useState } from 'react';
import { Loan, ChitMonth } from '../../types';
import { dbService } from '../../services/dbService';
import { X } from 'lucide-react';

interface RecordRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  loan: Loan | null;
  chitMonths: ChitMonth[]; // to select which month this repayment was received in
  onSuccess: () => void;
}

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({ isOpen, onClose, agentId, loan, chitMonths, onSuccess }) => {
  const [repaymentMonthId, setRepaymentMonthId] = useState('');
  const [principalRepaid, setPrincipalRepaid] = useState('0');
  const [interestRepaid, setInterestRepaid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentMonthId || principalRepaid === '' || interestRepaid === '') return;
    
    setIsSubmitting(true);
    try {
      await dbService.repayLoan({
        agentId,
        loanId: loan.id,
        repaymentMonthId,
        principalRepaid: Number(principalRepaid),
        interestRepaid: Number(interestRepaid)
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to record repayment', err);
      alert('Failed to record repayment. Check console for details.');
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

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Record Repayment</h2>
        <div style={{ marginBottom: '16px', fontSize: '13px', color: '#64748B', background: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
          <strong>Loan to:</strong> {loan.memberName}<br/>
          <strong>Remaining Principal:</strong> ₹{loan.principalAmount - loan.repaidAmount}<br/>
          <strong>Expected Interest:</strong> ₹{loan.expectedInterest}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Collection Month</label>
            <select required value={repaymentMonthId} onChange={e => setRepaymentMonthId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }}>
              <option value="">-- Choose Month --</option>
              {chitMonths.map(m => <option key={m.id} value={m.id}>Month {m.monthNumber}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Interest Collected (₹)</label>
            <input required type="number" value={interestRepaid} onChange={e => setInterestRepaid(e.target.value)} placeholder={`e.g. ${loan.expectedInterest}`} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Principal Collected (₹)</label>
            <input required type="number" value={principalRepaid} onChange={e => setPrincipalRepaid(e.target.value)} placeholder="0 if only paying interest" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '15px' }} />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Recording...' : 'Record Repayment'}
          </button>
        </form>
      </div>
    </div>
  );
};
