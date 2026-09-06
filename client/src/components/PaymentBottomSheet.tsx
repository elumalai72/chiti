import React, { useState } from 'react';
import { Member, Payment, PaymentMethod } from '../types';
import { formatINR } from '../engine/calculationEngine';
import { X, CheckCircle2, IndianRupee, QrCode, Banknote, Building2 } from 'lucide-react';

interface PaymentBottomSheetProps {
  member: Member;
  chitiName: string;
  monthNumber: number;
  monthlyDue?: number;
  expectedAmount?: number;
  existingPayment?: Payment;
  onClose: () => void;
  onConfirm?: (amountPaid: number, method: PaymentMethod, notes?: string) => void;
  onRecordPayment?: (amountPaid: number, method: PaymentMethod, notes?: string) => void;
}

export const PaymentBottomSheet: React.FC<PaymentBottomSheetProps> = ({
  member,
  chitiName,
  monthNumber,
  monthlyDue,
  expectedAmount,
  existingPayment,
  onClose,
  onConfirm,
  onRecordPayment
}) => {
  const baseDue = monthlyDue ?? expectedAmount ?? 3000;
  const initialAmount = existingPayment?.status === 'PARTIAL' 
    ? baseDue - existingPayment.amountPaid 
    : baseDue;

  const [amountPaid, setAmountPaid] = useState<number>(initialAmount);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    const handler = onConfirm || onRecordPayment;
    if (handler) {
      handler(amountPaid, method, notes);
    }
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: any }[] = [
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
    { id: 'OTHER', label: 'Cheque / Other', icon: IndianRupee }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Record Payment • {chitiName}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {member.fullName} <span style={{ fontSize: '13px', color: '#64748B' }}>#{member.memberNumber}</span>
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', minHeight: '36px' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Due Info Card */}
          <div 
            style={{ 
              background: 'var(--surface-muted)', 
              border: '1px solid #E2E8F0', 
              borderRadius: '16px', 
              padding: '14px', 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Installment Due (Month {monthNumber})</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }} className="tabular-nums">
                {formatINR(baseDue)}
              </div>
            </div>
            <span className="badge badge-violet">Month {monthNumber}</span>
          </div>

          {/* Amount Paid Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Amount Collected (₹) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748B', fontSize: '18px' }}>
                ₹
              </span>
              <input 
                type="number"
                inputMode="numeric"
                value={amountPaid || ''}
                onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
                style={{ 
                  paddingLeft: '38px', 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  color: '#0F172A',
                  minHeight: '48px'
                }}
                required
              />
            </div>

            {/* Quick Amount Presets */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => setAmountPaid(baseDue)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', padding: '4px 10px', minHeight: '32px' }}
              >
                Full Due ({formatINR(baseDue)})
              </button>
              <button 
                type="button" 
                onClick={() => setAmountPaid(Math.round(baseDue / 2))}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', padding: '4px 10px', minHeight: '32px' }}
              >
                Half ({formatINR(Math.round(baseDue / 2))})
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Payment Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {paymentMethods.map(pm => {
                const Icon = pm.icon;
                const isSelected = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      minHeight: '46px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid var(--primary-purple)' : '1px solid #CBD5E1',
                      background: isSelected ? 'rgba(124, 58, 237, 0.06)' : '#FFFFFF',
                      color: isSelected ? 'var(--primary-purple)' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={18} />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Notes / Transaction Reference (Optional)
            </label>
            <input 
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. GooglePay Ref #827182, Received by Cash"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className="btn btn-primary btn-block"
            style={{ 
              minHeight: '48px', 
              fontSize: '15px',
              marginTop: '4px'
            }}
          >
            <CheckCircle2 size={18} /> Confirm & Issue Receipt
          </button>
        </form>
      </div>
    </div>
  );
};
