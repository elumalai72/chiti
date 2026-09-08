import React, { useState } from 'react';
import { Chiti, ChitMember, ChitMonth, Payout } from '../types';
import { calculateAuctionOutcome, formatINR } from '../engine/calculationEngine';
import { X, Gavel, Award, Sparkles, AlertCircle, Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuctionLiveModalProps {
  chiti: Chiti;
  month?: ChitMonth;
  monthNumber?: number;
  eligibleMembers: ChitMember[];
  onClose: () => void;
  onConfirmPayout: (params: {
    winners: Array<{
      winnerMemberId: string;
      winningBid: number;
      payoutMethod: Payout['payoutMethod'];
    }>;
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
  
  const baseCollection = chiti.expectedMonthlyPool;
  const loansRecovered = month?.loansRecovered || 0;
  const interestEarned = month?.interestEarned || 0;
  const openingCarryForward = month?.openingCarryForward || 0;
  
  const pool = baseCollection + loansRecovered + interestEarned + openingCarryForward;

  const [winners, setWinners] = useState<Array<{
    winnerMemberId: string;
    winningBid: number;
    payoutMethod: Payout['payoutMethod'];
  }>>([{
    winnerMemberId: eligibleMembers[0]?.memberId || '',
    winningBid: Math.round(pool * 0.88),
    payoutMethod: 'UPI'
  }]);
  
  const [notes, setNotes] = useState<string>(`Won at Month ${monthNumberVal} reverse auction`);

  // Run calculation dynamically
  let calculation = null;
  let calculationError = '';

  try {
    const bids = winners.map(w => w.winningBid);
    const totalBids = bids.reduce((a, b) => a + b, 0);
    
    if (bids.some(b => b <= 0)) {
       calculationError = 'All bids must be greater than 0';
    } else if (totalBids > pool) {
       calculationError = `Total winning bids (${formatINR(totalBids)}) cannot exceed total pool (${formatINR(pool)})`;
    } else {
      calculation = calculateAuctionOutcome({
        baseCollection,
        loansRecovered,
        interestEarned,
        openingCarryForward,
        winningBids: bids,
        totalMembers: chiti.totalMembers,
        monthlyContribution: chiti.monthlyContribution,
        rule: chiti.rule
      });
    }
  } catch (err: any) {
    calculationError = err.message;
  }

  const handleAddWinner = () => {
    setWinners([...winners, {
      winnerMemberId: eligibleMembers[0]?.memberId || '',
      winningBid: Math.round(pool * 0.5), // Arbitrary starting point for 2nd winner
      payoutMethod: 'UPI'
    }]);
  };

  const handleRemoveWinner = (index: number) => {
    if (winners.length > 1) {
      setWinners(winners.filter((_, i) => i !== index));
    }
  };

  const updateWinner = (index: number, field: string, value: any) => {
    const newWinners = [...winners];
    newWinners[index] = { ...newWinners[index], [field]: value };
    setWinners(newWinners);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (winners.some(w => !w.winnerMemberId)) {
      alert('Please select a member for all winning bids');
      return;
    }
    if (new Set(winners.map(w => w.winnerMemberId)).size !== winners.length) {
      alert('A member can only be selected once per auction');
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
      winners,
      notes
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, overflowY: 'auto', padding: '20px 0' }}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', margin: '0 auto', height: 'auto', overflow: 'visible' }}
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

        {/* Dynamic Pool Summary Strip */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #0D1322 0%, #070B14 100%)',
            borderRadius: '16px',
            padding: '16px',
            color: '#FFFFFF',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Dynamic Monthly Collection Pool</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }} className="tabular-nums">
                {formatINR(pool)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Rule Type</div>
              <span className="badge badge-violet" style={{ marginTop: '4px' }}>
                {chiti.rule.surplusStrategy === 'LENDING_POOL' ? 'Lending Chiti' : 'Reverse Bid'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#CBD5E1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
             <span>Base: <strong>{formatINR(baseCollection)}</strong></span>
             {loansRecovered > 0 && <span>Recovered: <strong>{formatINR(loansRecovered)}</strong></span>}
             {interestEarned > 0 && <span>Interest: <strong>{formatINR(interestEarned)}</strong></span>}
          </div>
        </div>

        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Winners List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Auction Winners</h4>
               {chiti.rule.surplusStrategy === 'LENDING_POOL' && (
                 <button 
                   type="button" 
                   onClick={handleAddWinner}
                   className="btn btn-secondary btn-sm"
                   style={{ padding: '4px 8px', fontSize: '11px', height: 'auto', minHeight: 'auto' }}
                 >
                   <Plus size={14} /> Add Another Winner
                 </button>
               )}
            </div>

            {winners.map((winner, idx) => (
              <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '12px', position: 'relative' }}>
                
                {winners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWinner(idx)}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Winner Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Select Winner {idx + 1} *
                    </label>
                    <select
                      value={winner.winnerMemberId}
                      onChange={e => updateWinner(idx, 'winnerMemberId', e.target.value)}
                      style={{ fontWeight: 600, padding: '8px', fontSize: '14px' }}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                        Winning Bid (₹) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748B' }}>
                          ₹
                        </span>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={winner.winningBid || ''}
                          onChange={e => updateWinner(idx, 'winningBid', Number(e.target.value))}
                          step={500}
                          min={1000}
                          max={pool}
                          style={{
                            paddingLeft: '30px',
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#0F172A',
                            border: '2px solid #7C3AED',
                            padding: '8px'
                          }}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Payout Method
                      </label>
                      <select
                        value={winner.payoutMethod}
                        onChange={e => updateWinner(idx, 'payoutMethod', e.target.value)}
                        style={{ fontWeight: 600, padding: '8px', fontSize: '14px' }}
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">CASH</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Total Winners Payout</div>
                  <div style={{ fontWeight: 800, color: '#10B981', fontSize: '16px', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(calculation.netPayout)}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '10px', border: '1px solid #F3E8FF' }}>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Total Auction Discount</div>
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
                ) : chiti.rule.surplusStrategy === 'LENDING_POOL' ? (
                  <div style={{ color: '#7C3AED' }}>
                    ✓ Lending Surplus of <strong>{formatINR(calculation.lentOutAmount)}</strong> is available to be issued as loans to members.
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

          {/* Confirm Payout CTA */}
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            style={{ minHeight: '50px', fontSize: '15px', marginTop: '6px' }}
            disabled={!calculation}
          >
            <Award size={18} /> Confirm {winners.length > 1 ? 'Winners' : 'Winner'} & Settle Payout
          </button>
        </form>
      </div>
    </div>
  );
};
