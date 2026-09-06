import React, { useState } from 'react';
import { CalculationRule, AuctionType, CommissionType, SurplusStrategy } from '../types';
import { calculateExpectedMonthlyPool, formatINR } from '../engine/calculationEngine';
import { X, ArrowRight, ArrowLeft, Check, Plus, Trash2, ClipboardPaste, Users, Sparkles } from 'lucide-react';

interface NewChitiWizardProps {
  agentId: string;
  onClose: () => void;
  onCreated: (newChitiData: any) => void;
}

interface MemberInput {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  notes?: string;
}

export const NewChitiWizard: React.FC<NewChitiWizardProps> = ({
  agentId,
  onClose,
  onCreated
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Chiti Details
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [totalMembers, setTotalMembers] = useState<number>(41);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(3000);
  const [durationMonths, setDurationMonths] = useState<number>(41);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentDueDay, setPaymentDueDay] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');

  // Step 2: Real Members List
  const [membersList, setMembersList] = useState<MemberInput[]>([]);
  const [batchText, setBatchText] = useState<string>('');
  const [showBatchPaste, setShowBatchPaste] = useState<boolean>(false);

  // Step 3: Rules
  const [auctionType, setAuctionType] = useState<AuctionType>('REVERSE_BID_LOWEST_WINS');
  const [commissionType, setCommissionType] = useState<CommissionType>('FIXED');
  const [commissionValue, setCommissionValue] = useState<number>(5000);
  const [surplusStrategy, setSurplusStrategy] = useState<SurplusStrategy>('DIVIDEND_DEDUCTION');

  // Dynamic pool calculation
  const expectedMonthlyPool = calculateExpectedMonthlyPool(totalMembers, monthlyContribution);

  // Advance to Step 2
  const handleNextToStep2 = () => {
    if (!name.trim()) {
      alert('Please enter a Chiti Name (e.g. Lakshmi Chiti)');
      return;
    }
    if (totalMembers <= 1) {
      alert('A Chiti must have at least 2 members');
      return;
    }
    if (monthlyContribution <= 0) {
      alert('Please enter a valid monthly contribution amount');
      return;
    }

    // Auto-generate code if empty
    if (!code.trim()) {
      const generatedCode = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() + '-01';
      setCode(generatedCode);
    }

    // Initialize blank member rows up to totalMembers if list is empty
    if (membersList.length === 0) {
      const initial = Array.from({ length: totalMembers }, () => ({
        fullName: '',
        phone: '',
        address: ''
      }));
      setMembersList(initial);
    } else if (membersList.length < totalMembers) {
      const diff = totalMembers - membersList.length;
      const additional = Array.from({ length: diff }, () => ({ fullName: '', phone: '', address: '' }));
      setMembersList([...membersList, ...additional]);
    }

    setStep(2);
  };

  // Batch paste helper
  const handleApplyBatchText = () => {
    if (!batchText.trim()) return;
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const updated: MemberInput[] = [...membersList];

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      const fullName = parts[0] || '';
      const phone = parts[1] || '';
      const address = parts[2] || '';

      if (idx < updated.length) {
        updated[idx] = { fullName, phone, address };
      } else {
        updated.push({ fullName, phone, address });
      }
    });

    setMembersList(updated);
    if (updated.length > totalMembers) {
      setTotalMembers(updated.length);
      setDurationMonths(updated.length);
    }
    setShowBatchPaste(false);
    setBatchText('');
  };

  const handleUpdateMember = (index: number, field: keyof MemberInput, value: string) => {
    const updated = [...membersList];
    updated[index] = { ...updated[index], [field]: value };
    setMembersList(updated);
  };

  const handleAddSingleMemberRow = () => {
    setMembersList([...membersList, { fullName: '', phone: '', address: '' }]);
    setTotalMembers(m => m + 1);
    setDurationMonths(m => m + 1);
  };

  const handleRemoveMemberRow = (index: number) => {
    if (membersList.length <= 2) {
      alert('A Chiti needs at least 2 members');
      return;
    }
    const updated = membersList.filter((_, i) => i !== index);
    setMembersList(updated);
    setTotalMembers(updated.length);
    setDurationMonths(updated.length);
  };

  // Final Launch
  const handleConfirmAndCreate = () => {
    const validMembers = membersList
      .map((m, idx) => ({
        memberNumber: idx + 1,
        fullName: m.fullName.trim() || `Member ${idx + 1}`,
        phone: m.phone.trim(),
        address: m.address?.trim()
      }));

    const finalMemberCount = validMembers.length;

    const rule: CalculationRule = {
      id: `rule-${Date.now()}`,
      chitiId: '',
      version: 1,
      auctionType,
      commissionType,
      commissionValue,
      surplusStrategy,
      effectiveFromMonth: 1,
      description: `${auctionType} with ${commissionType} commission (${formatINR(commissionValue)})`
    };

    onCreated({
      agentId,
      code: code.trim().toUpperCase() || 'CHITI-01',
      name: name.trim(),
      totalMembers: finalMemberCount,
      monthlyContribution,
      durationMonths: finalMemberCount,
      startDate,
      paymentDueDay,
      rule,
      members: validMembers,
      notes
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Create Chiti Group
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              Step {step} of 4: {step === 1 ? 'Details' : step === 2 ? 'Real Members' : step === 3 ? 'Rules' : 'Review & Launch'}
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

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              style={{ 
                flex: 1, 
                height: '6px', 
                borderRadius: '4px',
                background: s <= step ? 'var(--gradient-primary)' : '#E2E8F0',
                transition: 'all 0.3s ease'
              }} 
            />
          ))}
        </div>

        {/* STEP 1: CHITI DETAILS */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Chiti Name *
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Lakshmi Chiti"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Chiti Code / Short ID
                </label>
                <input 
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="e.g. LAKSHMI-01"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Total Members Count (N) *
                </label>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={totalMembers}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setTotalMembers(val);
                    setDurationMonths(val);
                  }}
                  min={2}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Monthly Contribution / Member (₹) *
                </label>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={monthlyContribution}
                  onChange={e => setMonthlyContribution(parseInt(e.target.value) || 0)}
                  min={100}
                  step={100}
                  required
                />
              </div>
            </div>

            {/* Live Dynamic Expected Pool Card */}
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Dynamic Pool Calculation
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {totalMembers} Members × {formatINR(monthlyContribution)}
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#7C3AED' }} className="tabular-nums">
                {formatINR(expectedMonthlyPool)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Chiti Start Date
                </label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Payment Due Day of Month
                </label>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={paymentDueDay}
                  onChange={e => setPaymentDueDay(parseInt(e.target.value) || 1)}
                  min={1}
                  max={31}
                />
              </div>
            </div>

            <button 
              type="button"
              onClick={handleNextToStep2}
              className="btn btn-primary btn-block"
              style={{ marginTop: '8px', minHeight: '46px' }}
            >
              <span>Next: Add Real Members ({totalMembers})</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: REAL MEMBERS ENTRY */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Enter real names and phone numbers for each member slot.
              </div>
              <button 
                type="button"
                onClick={() => setShowBatchPaste(!showBatchPaste)}
                className="btn btn-secondary btn-sm"
              >
                <ClipboardPaste size={14} /> Quick Paste
              </button>
            </div>

            {showBatchPaste && (
              <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Paste members list (one per line: Name, Phone, Address):
                </div>
                <textarea 
                  rows={4}
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  placeholder="Ramesh Kumar, 9876543210, Main Street&#10;Suresh Naidu, 9876543211, Gandhi Road"
                  style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace' }}
                />
                <button 
                  type="button" 
                  onClick={handleApplyBatchText} 
                  className="btn btn-primary btn-sm" 
                  style={{ marginTop: '6px' }}
                >
                  Apply Pasted Members
                </button>
              </div>
            )}

            {/* Member Rows (Mobile Card Stack) */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {membersList.map((m, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '6px', 
                    alignItems: 'center', 
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '8px 10px'
                  }}
                >
                  <span 
                    style={{ 
                      width: '26px', 
                      height: '26px', 
                      borderRadius: '6px', 
                      background: 'rgba(124, 58, 237, 0.1)', 
                      color: '#7C3AED', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '11px',
                      flexShrink: 0
                    }}
                  >
                    #{idx + 1}
                  </span>

                  <input 
                    type="text"
                    value={m.fullName}
                    onChange={e => handleUpdateMember(idx, 'fullName', e.target.value)}
                    placeholder="Full Name"
                    style={{ flex: 2, minWidth: '130px', minHeight: '38px', fontSize: '13px', padding: '6px 10px' }}
                  />

                  <input 
                    type="tel"
                    inputMode="tel"
                    value={m.phone}
                    onChange={e => handleUpdateMember(idx, 'phone', e.target.value)}
                    placeholder="Mobile Phone"
                    style={{ flex: 1.5, minWidth: '110px', minHeight: '38px', fontSize: '13px', padding: '6px 10px' }}
                  />

                  <button 
                    type="button"
                    onClick={() => handleRemoveMemberRow(idx)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px' }}
                    aria-label="Remove slot"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              type="button"
              onClick={handleAddSingleMemberRow}
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
            >
              <Plus size={15} /> + Add Another Member Slot
            </button>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary btn-block"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button 
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-primary btn-block"
              >
                Next: Rules <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RULES CONFIGURATION */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Auction Format
              </label>
              <select 
                value={auctionType}
                onChange={e => setAuctionType(e.target.value as any)}
                style={{ fontWeight: 600 }}
              >
                <option value="REVERSE_BID_LOWEST_WINS">Reverse Bid Auction (Lowest bidder wins payout)</option>
                <option value="FIXED_DISCOUNT_LOTTERY">Fixed Discount Lucky Draw / Lottery</option>
                <option value="COMMISSION_ONLY">Fixed Pool (Agent Commission Only)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Commission Type
                </label>
                <select 
                  value={commissionType}
                  onChange={e => setCommissionType(e.target.value as any)}
                >
                  <option value="FIXED">Fixed Amount (₹)</option>
                  <option value="PERCENT_POOL">Percentage of Monthly Pool (%)</option>
                  <option value="PERCENT_DISCOUNT">Percentage of Auction Discount (%)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Commission Value ({commissionType === 'FIXED' ? '₹' : '%'})
                </label>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={commissionValue}
                  onChange={e => setCommissionValue(parseFloat(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Surplus Distribution Strategy
              </label>
              <select 
                value={surplusStrategy}
                onChange={e => setSurplusStrategy(e.target.value as any)}
                style={{ fontWeight: 600 }}
              >
                <option value="DIVIDEND_DEDUCTION">Dividend Deduction (Credited as discount off next month's payment)</option>
                <option value="POOL_CARRY_FORWARD">Pool Carry Forward (Added to next month's auction pool)</option>
                <option value="CASH_DIVIDEND">Cash Dividend (Directly paid out to members)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary btn-block"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button 
                type="button"
                onClick={() => setStep(4)}
                className="btn btn-primary btn-block"
              >
                Next: Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & LAUNCH */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--surface-muted)', borderRadius: '16px', padding: '16px' }}>
              <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                {name} ({code || 'CHITI-01'})
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Total Members:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{membersList.length} Members</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Monthly / Member:</span>
                  <div style={{ fontWeight: 800, color: '#7C3AED' }} className="tabular-nums">{formatINR(monthlyContribution)}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Expected Pool:</span>
                  <div style={{ fontWeight: 900, color: '#10B981' }} className="tabular-nums">{formatINR(expectedMonthlyPool)}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Agent Commission:</span>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>
                    {commissionType === 'FIXED' ? formatINR(commissionValue) : `${commissionValue}%`}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button 
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-secondary btn-block"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button 
                type="button"
                onClick={handleConfirmAndCreate}
                className="btn btn-primary btn-block"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Check size={18} strokeWidth={2.5} /> Launch Chiti Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
