import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { PaymentBottomSheet } from './PaymentBottomSheet';
import { AuctionLiveModal } from './AuctionLiveModal';
import { ReceiptModal } from './ReceiptModal';
import { LedgerTable } from './LedgerTable';
import { MasterCollectionSheet } from './MasterCollectionSheet';
import { Receipt, Member, PaymentMethod, Chiti, ChitMember, ChitMonth, LedgerEntry, Payment, AgentAccount } from '../types';
import { 
  ArrowLeft, 
  Users, 
  CreditCard, 
  Gavel, 
  BookOpen, 
  Settings, 
  CheckCircle2, 
  Clock, 
  FileText, 
  UserPlus, 
  RotateCcw, 
  Plus, 
  ChevronRight,
  Phone,
  Search,
  Check,
  Award,
  AlertCircle,
  Grid
} from 'lucide-react';

interface ChitiDetailViewProps {
  chitiId: string;
  initialSubTab?: 'overview' | 'members' | 'payments' | 'mastersheet' | 'auction' | 'ledger' | 'settings';
  onBack: () => void;
}

export const ChitiDetailView: React.FC<ChitiDetailViewProps> = ({ chitiId, initialSubTab = 'overview', onBack }) => {
  const [currentAgent, setCurrentAgent] = useState<AgentAccount | null>(null);
  const [chiti, setChiti] = useState<Chiti | null>(null);
  const [chitMembers, setChitMembers] = useState<ChitMember[]>([]);
  const [chitMonths, setChitMonths] = useState<ChitMonth[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [paymentsForCurrentMonth, setPaymentsForCurrentMonth] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'members' | 'payments' | 'mastersheet' | 'auction' | 'ledger' | 'settings'>(initialSubTab);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number | null>(null);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<Member | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [isAuctionOpen, setIsAuctionOpen] = useState<boolean>(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState<boolean>(false);
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Add Member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');

  // Re-fetch trigger
  const [rerender, setRerender] = useState(0);
  const refresh = () => setRerender(r => r + 1);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const agent = await dbService.getCurrentAgent();
        setCurrentAgent(agent);
        if (!agent) return;

        const c = await dbService.getChitiById(chitiId);
        setChiti(c);
        if (!c) return;

        const targetMonth = selectedMonthNum || c.currentMonth;
        
        const [members, months, allMem, ledger, payments] = await Promise.all([
          dbService.getChitMembers(chitiId),
          dbService.getChitMonths(chitiId),
          dbService.getMembersByAgent(agent.id),
          dbService.getLedgerByAgent(agent.id, chitiId),
          dbService.getPaymentsByMonth(chitiId, targetMonth)
        ]);

        setChitMembers(members);
        setChitMonths(months);
        setAllMembers(allMem);
        setLedgerEntries(ledger);
        setPaymentsForCurrentMonth(payments);
        
        if (selectedMonthNum === null) {
          setSelectedMonthNum(c.currentMonth);
        }
      } catch (err) {
        console.error('Error loading chiti details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [chitiId, selectedMonthNum, rerender]);

  const agentId = currentAgent?.id || '';

  if (isLoading && !chiti) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!chiti) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h3>Chiti not found</h3>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }

  // Safe fallback for current month
  const currentMonth = chitMonths.find(m => m.monthNumber === chiti.currentMonth) || chitMonths[0] || {
    id: `m-${chiti.id}-${chiti.currentMonth}`,
    chitiId,
    monthNumber: chiti.currentMonth,
    cycleDate: chiti.startDate,
    openingCarryForward: 0,
    expectedCollection: chiti.expectedMonthlyPool,
    actualCollected: 0,
    pendingCollection: chiti.expectedMonthlyPool,
    auctionStatus: 'SCHEDULED' as const,
    status: 'COLLECTION_OPEN' as const,
    closingCarryForward: 0
  };

  const eligibleMembers = chitMembers.filter(m => !m.hasWonAuction);
  const progressPercent = Math.min(100, Math.round((chiti.currentMonth / chiti.durationMonths) * 100));

  const displayMonth = selectedMonthNum !== null ? 
    (chitMonths.find(m => m.monthNumber === selectedMonthNum) || currentMonth) : currentMonth;

  const handleRecordPayment = async (amountPaid: number, method: any, notes?: string) => {
    if (!selectedMemberForPayment) return;
    try {
      const { receipt } = await dbService.recordPayment({
        agentId,
        chitiId,
        chitMonthId: currentMonth.id,
        monthNumber: chiti.currentMonth,
        memberId: selectedMemberForPayment.id,
        amountPaid,
        paymentMethod: method,
        notes
      });
      setSelectedMemberForPayment(null);
      setActiveReceipt(receipt);
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleConfirmAuctionPayout = async (params: any) => {
    try {
      await dbService.confirmAuctionsPayout({
        agentId,
        chitiId,
        monthNumber: currentMonth.monthNumber,
        winners: params.winners,
        notes: params.notes
      });
      setIsAuctionOpen(false);
      refresh();
      alert(`🎉 Month ${currentMonth.monthNumber} Auction Winner(s) Confirmed! Payout and ledger entries have been recorded.`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCloseMonth = async () => {
    if (confirm(`Reconcile and close Month ${currentMonth.monthNumber}? This will advance the Chiti to Month ${currentMonth.monthNumber + 1}.`)) {
      try {
        await dbService.closeMonth(agentId, chitiId, currentMonth.monthNumber);
        refresh();
        alert(`Month ${currentMonth.monthNumber} closed. Chiti cycle advanced to Month ${chiti.currentMonth + 1}!`);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleReversePayment = async (paymentId: string, reason: string) => {
    try {
      await dbService.reversePayment({ agentId, paymentId, reason });
      refresh();
      alert('Payment successfully reversed and reversal entry added to financial ledger.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      await dbService.addMemberToChiti({
        agentId,
        chitiId,
        fullName: newMemberName,
        phone: newMemberPhone,
        address: newMemberAddress
      });
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberAddress('');
      setIsAddMemberOpen(false);
      refresh();
      alert(`Member added successfully!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredMembers = chitMembers.filter(m => 
    m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.phone.includes(memberSearch) ||
    String(m.memberNumber).includes(memberSearch)
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px', width: '100%' }}>
      {/* Top Header / Back CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '10px' }}>
        <button 
          onClick={onBack}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px', padding: '8px 14px', minHeight: '40px' }}
        >
          <ArrowLeft size={16} /> <span>All Chitis</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-violet" style={{ fontSize: '12px' }}>
            Month {chiti.currentMonth} / {chiti.durationMonths}
          </span>
          <span className="badge badge-success">
            🟢 Ongoing
          </span>
        </div>
      </div>

      {/* Hero Navy Chiti Header Card */}
      <div className="hero-navy" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {chiti.code}
            </div>
            <h1 style={{ fontSize: 'clamp(22px, 4.5vw, 30px)', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.5px' }}>
              {chiti.name}
            </h1>
            <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '4px' }}>
              {chitMembers.length} Members • {formatINR(chiti.monthlyContribution)}/month • Due: {chiti.paymentDueDay}th
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Expected Monthly Pool</div>
            <div style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }} className="tabular-nums">
              {formatINR(chiti.expectedMonthlyPool)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
            <span style={{ color: '#E2E8F0' }}>Cycle Progress</span>
            <span style={{ color: '#A78BFA' }}>{progressPercent}%</span>
          </div>
          <div className="progress-bar-track" style={{ height: '8px', background: 'rgba(255,255,255,0.1)' }}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Month Summary Cards */}
        <div className="quick-stats-grid" style={{ marginTop: '16px' }}>
          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>Month {currentMonth.monthNumber} Collected</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', marginTop: '4px' }} className="tabular-nums">
              {formatINR(currentMonth.actualCollected)}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              {paymentsForCurrentMonth.filter(p => p.status === 'PAID').length} of {chitMembers.length} paid
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>Pending Collection</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: currentMonth.pendingCollection > 0 ? '#F59E0B' : '#10B981', marginTop: '4px' }} className="tabular-nums">
              {formatINR(currentMonth.pendingCollection)}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              {currentMonth.pendingCollection > 0 ? 'Dues to collect' : 'All cleared'}
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>Auction Floor</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: currentMonth.auctionStatus === 'COMPLETED' ? '#10B981' : '#A78BFA', marginTop: '4px' }}>
              {currentMonth.auctionStatus === 'COMPLETED' ? `Auction Settled` : 'Ready for Auction'}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              {eligibleMembers.length} eligible bidders
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' }}>Agent Commission</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }} className="tabular-nums">
              {chiti.rule.commissionType === 'FIXED' ? formatINR(chiti.rule.commissionValue) : `${chiti.rule.commissionValue}%`}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              Configured margin
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Mobile Touch-Scrollable) */}
      <div 
        className="touch-scroll-row"
        style={{ 
          marginBottom: '20px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '8px'
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'members', label: `Members (${chitMembers.length})`, icon: Users },
          { id: 'payments', label: `Collect (M${displayMonth.monthNumber})`, icon: CreditCard },
          { id: 'mastersheet', label: 'Master Sheet', icon: Grid },
          { id: 'auction', label: 'Live Auction', icon: Gavel },
          { id: 'ledger', label: 'Ledger Journal', icon: BookOpen },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className="btn btn-sm"
              style={{
                background: isActive ? 'var(--gradient-primary)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                border: isActive ? 'none' : '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                boxShadow: isActive ? 'var(--shadow-glow)' : undefined
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7C3AED', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                  <Gavel size={18} />
                  <span>Month {currentMonth.monthNumber} Auction</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  {currentMonth.auctionStatus === 'COMPLETED' ? 'Auction Settled' : 'Conduct Live Auction'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  {currentMonth.auctionStatus === 'COMPLETED' 
                    ? `Total Payout: ${formatINR(currentMonth.netPayout || 0)}`
                    : `Log member bids, calculate gross discount & agent commission, and settle payout.`}
                </p>
              </div>
              <button 
                onClick={() => setIsAuctionOpen(true)} 
                className="btn btn-primary btn-block" 
                style={{ marginTop: '16px' }}
              >
                {currentMonth.auctionStatus === 'COMPLETED' ? 'View Auction Result' : 'Start Live Auction'} <ChevronRight size={15} />
              </button>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                  <RotateCcw size={18} />
                  <span>Monthly Closing</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Close Month {currentMonth.monthNumber}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Reconciles all collections against payouts, commission, and surplus carry-forward.
                </p>
              </div>
              <button 
                onClick={handleCloseMonth} 
                className="btn btn-secondary btn-block" 
                style={{ marginTop: '16px' }}
              >
                Reconcile & Close Month <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: MEMBERS */}
      {activeSubTab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search member name, # or phone..."
                style={{ width: '100%', paddingLeft: '36px' }}
              />
            </div>
            <button 
              onClick={() => setIsAddMemberOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 16px' }}
            >
              <UserPlus size={16} /> + Add Member
            </button>
          </div>

          {chitMembers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '20px' }}>
              <p style={{ color: '#64748B', fontSize: '14px' }}>No members added to this Chiti yet.</p>
              <button onClick={() => setIsAddMemberOpen(true)} className="btn btn-primary" style={{ marginTop: '12px' }}>
                <UserPlus size={16} /> Add First Member
              </button>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Member Cards */}
              <div className="mobile-only mobile-card-list">
                {filteredMembers.map(m => {
                  const fullMember = allMembers.find(mem => mem.id === m.memberId);
                  const isPaid = m.pendingAmount === 0;

                  return (
                    <div key={m.id} className="mobile-item-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '8px', 
                              background: 'rgba(124, 58, 237, 0.1)', 
                              color: '#7C3AED', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px'
                            }}
                          >
                            #{m.memberNumber}
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                              {m.fullName}
                            </div>
                            {m.phone && (
                              <a 
                                href={`tel:${m.phone}`}
                                style={{ fontSize: '12px', color: '#7C3AED', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                              >
                                <Phone size={12} /> {m.phone}
                              </a>
                            )}
                          </div>
                        </div>

                        {m.hasWonAuction ? (
                          <span className="badge badge-success">Won M{m.wonMonth}</span>
                        ) : (
                          <span className="badge badge-pending">Eligible</span>
                        )}
                      </div>

                      {/* Financial info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'var(--surface-muted)', borderRadius: '12px', fontSize: '12px' }}>
                        <div>
                          <div style={{ color: '#64748B' }}>Total Paid</div>
                          <div style={{ fontWeight: 800, color: '#065F46', fontSize: '14px' }} className="tabular-nums">
                            {formatINR(m.totalPaid)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#64748B' }}>Pending Dues</div>
                          <div style={{ fontWeight: 800, color: m.pendingAmount > 0 ? '#DC2626' : '#10B981', fontSize: '14px' }} className="tabular-nums">
                            {formatINR(m.pendingAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => setSelectedMemberForPayment(fullMember || null)}
                        className="btn btn-primary btn-block btn-sm"
                        style={{ minHeight: '42px' }}
                      >
                        <CreditCard size={15} /> Collect Payment
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Full Data Table */}
              <div className="desktop-only data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Member Name</th>
                      <th>Phone</th>
                      <th>Total Paid</th>
                      <th>Pending Dues</th>
                      <th>Auction Winner?</th>
                      <th style={{ textAlign: 'right' }}>Collect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(m => {
                      const fullMember = allMembers.find(mem => mem.id === m.memberId);
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 800, color: '#7C3AED' }}>#{m.memberNumber}</td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{m.fullName}</td>
                          <td style={{ fontSize: '13px', color: '#64748B' }}>{m.phone || '—'}</td>
                          <td style={{ fontWeight: 700, color: '#065F46' }} className="tabular-nums">{formatINR(m.totalPaid)}</td>
                          <td style={{ fontWeight: 700, color: m.pendingAmount > 0 ? '#DC2626' : '#10B981' }} className="tabular-nums">
                            {formatINR(m.pendingAmount)}
                          </td>
                          <td>
                            {m.hasWonAuction ? (
                              <span className="badge badge-success">Won (Month {m.wonMonth})</span>
                            ) : (
                              <span className="badge badge-pending">Eligible</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedMemberForPayment(fullMember || null)}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '12px', padding: '6px 14px' }}
                            >
                              Collect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB: PAYMENTS (COLLECT) */}
      {activeSubTab === 'payments' && (
        <div>
          {/* Horizontal Month Selector */}
          <div style={{ marginBottom: '16px', overflowX: 'auto', display: 'flex', gap: '8px', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
            {Array.from({ length: chiti.durationMonths }, (_, i) => i + 1).map(mNum => {
              const isSelected = displayMonth.monthNumber === mNum;
              const mData = chitMonths.find(m => m.monthNumber === mNum);
              let statusColor = '#64748B'; // Default
              if (mData) {
                if (mData.status === 'CLOSED') statusColor = '#10B981';
                else if (mData.status === 'PAYMENT_COLLECTION') statusColor = '#7C3AED';
              }
              
              return (
                <button
                  key={mNum}
                  onClick={() => setSelectedMonthNum(mNum)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: isSelected ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                    background: isSelected ? 'rgba(124, 58, 237, 0.08)' : '#FFFFFF',
                    color: isSelected ? '#7C3AED' : '#475569',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Month {mNum}
                  {mData && mData.status === 'CLOSED' && <CheckCircle2 size={12} color="#10B981" />}
                </button>
              );
            })}
          </div>

          {/* Current Device Date & Time */}
          <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {/* Action Winner Highlight (If Auction Completed for this month) */}
          {displayMonth.auctionStatus === 'COMPLETED' && (
            <div className="card" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', marginBottom: '16px', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}>
                <Award size={120} />
              </div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, color: '#D1FAE5' }}>
                Month {displayMonth.monthNumber} Auction Details
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                Completed
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '16px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#D1FAE5' }}>Gross Discount</div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{formatINR(displayMonth.grossDiscount || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#D1FAE5' }}>Agent Comm.</div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{formatINR(displayMonth.agentCommission || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#D1FAE5' }}>Net Payout</div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{formatINR(displayMonth.netPayout || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Collection Header Strip */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px', 
              marginBottom: '16px',
              padding: '14px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Expected</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }} className="tabular-nums">
                {formatINR(displayMonth.expectedCollection)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Collected</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '2px' }} className="tabular-nums">
                {formatINR(displayMonth.actualCollected)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Pending</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: displayMonth.pendingCollection > 0 ? '#F59E0B' : '#10B981', marginTop: '2px' }} className="tabular-nums">
                {formatINR(displayMonth.pendingCollection)}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW: Collection Cards with Huge Tick Marks */}
          <div className="mobile-only mobile-card-list">
            {chitMembers.map(m => {
              const payment = paymentsForCurrentMonth.find(p => p.memberId === m.memberId);
              const fullMember = allMembers.find(mem => mem.id === m.memberId);
              const isPaid = payment?.status === 'PAID';
              const isPartial = payment?.status === 'PARTIAL';

              return (
                <div key={m.id} className="mobile-item-card" style={{ position: 'relative', overflow: 'hidden' }}>
                  {isPaid && (
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                      <CheckCircle2 size={100} color="#10B981" />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '8px', 
                          background: isPaid ? '#10B981' : 'rgba(124, 58, 237, 0.1)', 
                          color: isPaid ? '#FFFFFF' : '#7C3AED', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '12px'
                        }}
                      >
                        {isPaid ? <Check size={16} strokeWidth={3} /> : `#${m.memberNumber}`}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                          {m.fullName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          Due: <strong style={{ color: '#0F172A' }}>{formatINR(chiti.monthlyContribution)}</strong>
                        </div>
                      </div>
                    </div>

                    {isPaid ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontWeight: 800, fontSize: '14px' }}>
                        <CheckCircle2 size={18} /> PAID
                      </span>
                    ) : isPartial ? (
                      <span className="badge badge-partial"><Clock size={12} /> Partial</span>
                    ) : (
                      <span className="badge badge-danger">Pending</span>
                    )}
                  </div>

                  {payment && (
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: '8px', background: '#F8FAFC', padding: '6px', borderRadius: '6px' }}>
                      <span>Paid: <strong style={{ color: '#065F46' }}>{formatINR(payment.amountPaid)}</strong> via {payment.paymentMethod}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{payment.receiptNumber}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {!isPaid && (
                      <button
                        onClick={() => setSelectedMemberForPayment(fullMember || null)}
                        className="btn btn-primary btn-block"
                        style={{ minHeight: '44px', fontSize: '14px' }}
                      >
                        <Check size={16} strokeWidth={2.5} /> MARK PAID
                      </button>
                    )}
                    {payment && (
                      <button
                        onClick={async () => {
                          const r = await dbService.getReceiptByNumber(payment.receiptNumber);
                          if (r) setActiveReceipt(r);
                        }}
                        className="btn btn-secondary btn-block"
                        style={{ minHeight: '44px', fontSize: '13px' }}
                      >
                        <FileText size={15} /> View Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Full Data Table */}
          <div className="desktop-only data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member Name</th>
                  <th>Monthly Due</th>
                  <th>Amount Paid</th>
                  <th>Payment Mode</th>
                  <th>Status</th>
                  <th>Receipt #</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {chitMembers.map(m => {
                  const payment = paymentsForCurrentMonth.find(p => p.memberId === m.memberId);
                  const fullMember = allMembers.find(mem => mem.id === m.memberId);
                  const isPaid = payment?.status === 'PAID';
                  const isPartial = payment?.status === 'PARTIAL';

                  return (
                    <tr key={m.id} style={{ background: isPaid ? '#F0FDF4' : 'transparent' }}>
                      <td style={{ fontWeight: 800, color: '#7C3AED' }}>#{m.memberNumber}</td>
                      <td style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {m.fullName}
                        {isPaid && <CheckCircle2 size={16} color="#10B981" />}
                      </td>
                      <td className="tabular-nums">{formatINR(chiti.monthlyContribution)}</td>
                      <td style={{ fontWeight: 800, color: '#065F46' }} className="tabular-nums">
                        {payment ? formatINR(payment.amountPaid) : '₹0'}
                      </td>
                      <td>{payment ? payment.paymentMethod : '—'}</td>
                      <td>
                        {isPaid ? (
                          <span className="badge badge-success"><CheckCircle2 size={12} /> Paid</span>
                        ) : isPartial ? (
                          <span className="badge badge-partial"><Clock size={12} /> Partial</span>
                        ) : (
                          <span className="badge badge-danger">Pending</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>
                        {payment ? payment.receiptNumber : '—'}
                      </td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {payment && (
                          <button
                            onClick={async () => {
                              const r = await dbService.getReceiptByNumber(payment.receiptNumber);
                              if (r) setActiveReceipt(r);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '12px' }}
                          >
                            <FileText size={13} /> Receipt
                          </button>
                        )}
                        {!isPaid && (
                          <button
                            onClick={() => setSelectedMemberForPayment(fullMember || null)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '12px' }}
                          >
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB: MASTER SHEET */}
      {activeSubTab === 'mastersheet' && (
        <MasterCollectionSheet chiti={chiti} />
      )}

      {/* SUBTAB: AUCTION */}
      {activeSubTab === 'auction' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Month {currentMonth.monthNumber} Reverse Auction Floor
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B' }}>
                  Rule: Lowest Bid Wins Payout • Pool: {formatINR(chiti.expectedMonthlyPool)}
                </p>
              </div>

              <button 
                onClick={() => setIsAuctionOpen(true)}
                className="btn btn-primary"
              >
                <Gavel size={16} /> {currentMonth.auctionStatus === 'COMPLETED' ? 'Review Auction Record' : 'Launch Bidding Floor'}
              </button>
            </div>

            {currentMonth.auctionStatus === 'COMPLETED' ? (
              <div style={{ background: 'var(--surface-muted)', borderRadius: '16px', padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Total Net Payout</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(currentMonth.netPayout || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Gross Discount</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(currentMonth.grossDiscount || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Agent Commission</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(currentMonth.agentCommission || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Surplus / Lent Out</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }} className="tabular-nums">
                    {formatINR(currentMonth.surplusAmount || 0)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--surface-muted)', borderRadius: '16px' }}>
                <Gavel size={36} color="#7C3AED" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Auction Ready for Month {currentMonth.monthNumber}</h4>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '6px auto 16px' }}>
                  {eligibleMembers.length} members are eligible to bid for this month's pool.
                </p>
                <button onClick={() => setIsAuctionOpen(true)} className="btn btn-primary">
                  Start Live Auction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: LEDGER */}
      {activeSubTab === 'ledger' && (
        <LedgerTable 
          entries={ledgerEntries}
          onReversePayment={handleReversePayment}
        />
      )}

      {/* SUBTAB: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            Chiti Configuration & Rules
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Auction Format</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {chiti.rule.auctionType.replace(/_/g, ' ')}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Commission Structure</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {chiti.rule.commissionType} ({chiti.rule.commissionType === 'FIXED' ? formatINR(chiti.rule.commissionValue) : `${chiti.rule.commissionValue}%`})
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Surplus Strategy</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {chiti.rule.surplusStrategy.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT BOTTOM SHEET MODAL */}
      {selectedMemberForPayment && (
        <PaymentBottomSheet 
          member={selectedMemberForPayment}
          chitiName={chiti.name}
          monthNumber={chiti.currentMonth}
          expectedAmount={chiti.monthlyContribution}
          onClose={() => setSelectedMemberForPayment(null)}
          onRecordPayment={handleRecordPayment}
        />
      )}

      {/* AUCTION MODAL */}
      {isAuctionOpen && (
        <AuctionLiveModal 
          chiti={chiti}
          monthNumber={currentMonth.monthNumber}
          eligibleMembers={eligibleMembers}
          onClose={() => setIsAuctionOpen(false)}
          onConfirmPayout={handleConfirmAuctionPayout}
        />
      )}

      {/* OFFICIAL RECEIPT MODAL */}
      {activeReceipt && (
        <ReceiptModal 
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* ADD MEMBER MODAL */}
      {isAddMemberOpen && (
        <div className="modal-overlay" onClick={() => setIsAddMemberOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
              + Add Member to {chiti.name}
            </h3>
            <form onSubmit={handleAddNewMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input 
                  type="text" 
                  value={newMemberName} 
                  onChange={e => setNewMemberName(e.target.value)} 
                  placeholder="e.g. Ramesh Kumar"
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  inputMode="tel"
                  value={newMemberPhone} 
                  onChange={e => setNewMemberPhone(e.target.value)} 
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Address / Notes
                </label>
                <input 
                  type="text" 
                  value={newMemberAddress} 
                  onChange={e => setNewMemberAddress(e.target.value)} 
                  placeholder="Street / Locality"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddMemberOpen(false)} className="btn btn-secondary btn-block">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-block">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
