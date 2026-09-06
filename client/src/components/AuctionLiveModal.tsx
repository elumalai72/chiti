import React, { useState } from 'react';
import { Chiti, ChitMember, ChitMonth, Payout } from '../types';
import { calculateAuctionOutcome, formatINR } from '../engine/calculationEngine';
import { X, Gavel, Award, Sparkles, CheckCircle2, AlertCircle, ArrowDown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuctionLiveModalProps {
  chiti: Chiti;
  month?: ChitMonth;
  monthNumber?: number;
  eligibleMembers: ChitMember[];
  onClose: () => void;
  onConfirmPayout: (params: {
    winnerMemberId: string;
    winningBid: number;
    payoutMethod: Payout['payoutMethod'];
    notes?: string;
  }) => void;
}

export const AuctionLiveModal: React.FC<AuctionLiveModalProps> = ({
  chiti,
  month,
  monthNumber,
  eligibleMembers,
  onClose,
  onConfirmPayout
}) => {
  const monthNumberVal = month?.monthNumber ?? monthNumber ?? chiti.currentMonth;
  const openingCarryForward = month?.openingCarryForward ?? 0;
  const pool = chiti.expectedMonthlyPool + openingCarryForward;

  // Pre-select first eligible member or default
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    eligibleMembers[0]?.memberId || ''
  );
  const [bidAmount, setBidAmount] = useState<number>(Math.round(pool * 0.88));
  const [payoutMethod, setPayoutMethod] = useState<Payout['payoutMethod']>('UPI');
  const [notes, setNotes] = useState<string>(`Won at Month ${monthNumberVal} reverse auction`);

  // Run calculation dynamically
  let calculation = null;
  let calculationError = '';

  try {
    if (bidAmount > 0 && bidAmount <= pool) {
      calculation = calculateAuctionOutcome({
        grossMonthlyPool: chiti.expectedMonthlyPool,
        openingCarryForward,
        winningBid: bidAmount,
        totalMembers: chiti.totalMembers,
        monthlyContribution: chiti.monthlyContribution,
        rule: chiti.rule
      });
    } else {
      calculationError = `Bid amount must be between ₹1 and total pool (${formatINR(pool)})`;
    }
  } catch (err: any) {
    calculationError = err.message;
  }

  const selectedMember = eligibleMembers.find(m => m.memberId === selectedMemberId);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert('Please select the winning member');
      return;
    }
    if (!calculation) {
      alert('Please fix calculation errors before confirming');
      return;
    }

    // Celebrate with confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {}

    onConfirmPayout({
      winnerMemberId: selectedMemberId,
      winningBid: bidAmount,
      payoutMethod,
      notes
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <Gavel size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>
                Live Reverse Auction Floor
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                Month {monthNumberVal} of {chiti.durationMonths} • {chiti.name}
              </h3>
            </div>
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

        {/* Pool Summary Strip */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #0D1322 0%, #070B14 100%)',
            borderRadius: '16px',
            padding: '16px',
            color: '#FFFFFF',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Available Monthly Collection Pool</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }} className="tabular-nums">
              {formatINR(pool)}
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              {chiti.totalMembers} Members × {formatINR(chiti.monthlyContribution)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Rule Type</div>
            <span className="badge badge-violet" style={{ marginTop: '4px' }}>
              Reverse (Lowest Bid Wins)
            </span>
          </div>
        </div>

        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Winner Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Select Winning Member ({eligibleMembers.length} eligible) *
            </label>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              style={{ fontWeight: 600 }}
              required
            >
              <option value="">-- Choose Member --</option>
              {eligibleMembers.map(m => (
                <option key={m.memberId} value={m.memberId}>
                  #{m.memberNumber} - {m.fullName} {m.phone ? `(${m.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Winning Bid Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Winning Bid Amount (₹) *
              </label>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Lowest bid wins payout
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748B', fontSize: '18px' }}>
                ₹
              </span>
              <input 
                type="number"
                inputMode="numeric"
                value={bidAmount || ''}
                onChange={e => setBidAmount(Number(e.target.value))}
                step={500}
                min={1000}
                max={pool}
                style={{
                  paddingLeft: '38px',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#0F172A',
                  border: '2px solid #7C3AED'
                }}
                required
              />
            </div>
          </div>

          {/* Dynamic Calculation Engine Output */}
          {calculation && (
            <div 
              style={{ 
                background: '#FAF5FF', 
                border: '1px solid #E9D5FF', 
                borderRadius: '16px', 
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Sparkles size={16} color="#7C3AED" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Financial Calculation Breakdown
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #F3E8FF' }}>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Winner Net Payout</div>
                  <div style={{ fontWeight: 800, color: '#10B981', fontSize: '16px', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(calculation.netPayout)}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #F3E8FF' }}>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Auction Discount</div>
                  <div style={{ fontWeight: 800, color: '#7C3AED', fontSize: '16px', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(calculation.grossDiscount)}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #F3E8FF' }}>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Agent Commission</div>
                  <div style={{ fontWeight: 800, color: '#D97706', fontSize: '16px', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(calculation.agentCommission)}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #F3E8FF' }}>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Surplus Amount</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '16px', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(calculation.surplusAmount)}
                  </div>
                </div>
              </div>

              {/* Surplus Distribution Note */}
              <div 
                style={{ 
                  marginTop: '10px', 
                  padding: '8px 12px', 
                  background: '#FFFFFF', 
                  borderRadius: '10px', 
                  border: '1px solid #F3E8FF',
                  fontSize: '12px',
                  color: '#475569',
                  lineHeight: 1.4
                }}
              >
                {chiti.rule.surplusStrategy === 'DIVIDEND_DEDUCTION' ? (
                  <div style={{ color: '#059669' }}>
                    ✓ <strong>{formatINR(calculation.perMemberDividend)} rebate</strong> credited per member off Month {monthNumberVal + 1} dues (New Due: {formatINR(calculation.nextMonthMemberDue)}). Remainder {formatINR(calculation.closingCarryForward)} carried forward.
                  </div>
                ) : (
                  <div style={{ color: '#3B82F6' }}>
                    ✓ Surplus {formatINR(calculation.surplusAmount)} will be carried forward to Month {monthNumberVal + 1} pool.
                  </div>
                )}
              </div>
            </div>
          )}

          {calculationError && (
            <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{calculationError}</span>
            </div>
          )}

          {/* Payout Settlement Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Payout Settlement Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['UPI', 'CASH', 'BANK_TRANSFER'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayoutMethod(m)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    border: payoutMethod === m ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                    background: payoutMethod === m ? 'rgba(124, 58, 237, 0.08)' : '#FFFFFF',
                    color: payoutMethod === m ? '#7C3AED' : '#475569',
                    fontWeight: 700,
                    minHeight: '40px'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Payout CTA */}
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            style={{ minHeight: '50px', fontSize: '15px', marginTop: '6px' }}
            disabled={!calculation}
          >
            <Award size={18} /> Award Auction & Settle Payout
          </button>
        </form>
      </div>
    </div>
  );
};
