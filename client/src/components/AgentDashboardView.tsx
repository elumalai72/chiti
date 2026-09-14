import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { AgentAccount, Chiti, Member, ChitMonth, ChitMember } from '../types';
import { NewChitiWizard } from './NewChitiWizard';
import { ChitiLogo } from './ChitiLogo';
import { 
  Plus, 
  Layers, 
  Users, 
  CreditCard, 
  ArrowRight, 
  ChevronRight,
  Sparkles,
  Award,
  Calendar,
  Calculator,
  Download,
  Trash2,
  Clock,
  Phone,
  MessageCircle,
  Search,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Filter
} from 'lucide-react';

interface AgentDashboardViewProps {
  agent: AgentAccount;
  onOpenChiti: (chitiId: string) => void;
  onOpenCalculator?: () => void;
  onOpenInstall?: () => void;
  onEditProfile?: () => void;
  initialChitis?: Chiti[];
  initialMembers?: Member[];
}

export const AgentDashboardView: React.FC<AgentDashboardViewProps> = ({ 
  agent, 
  onOpenChiti, 
  onOpenCalculator,
  onOpenInstall,
  onEditProfile,
  initialChitis,
  initialMembers
}) => {
  const [isNewChitiOpen, setIsNewChitiOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const [chitis, setChitis] = useState<Chiti[]>(initialChitis || []);
  const [allMembers, setAllMembers] = useState<Member[]>(initialMembers || []);
  const [chitiMonthsMap, setChitiMonthsMap] = useState<Record<string, ChitMonth[]>>({});
  const [isLoading, setIsLoading] = useState(!initialChitis || initialChitis.length === 0);

  useEffect(() => {
    async function loadDashboard() {
      if (chitis.length === 0) {
        setIsLoading(true);
      }
      try {
        const [loadedChitis, loadedMembers] = await Promise.all([
          initialChitis && initialChitis.length > 0 ? Promise.resolve(initialChitis) : dbService.getChitisByAgent(agent.id),
          initialMembers && initialMembers.length > 0 ? Promise.resolve(initialMembers) : dbService.getMembersByAgent(agent.id)
        ]);
        
        const monthsResults = await Promise.all(loadedChitis.map(c => dbService.getChitMonths(c.id)));
        const monthsMap: Record<string, ChitMonth[]> = {};
        loadedChitis.forEach((c, idx) => {
          monthsMap[c.id] = monthsResults[idx];
        });

        setChitis(loadedChitis);
        setAllMembers(loadedMembers);
        setChitiMonthsMap(monthsMap);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [agent.id, dataVersion, initialChitis, initialMembers]);

  const [selectedChitiFilter, setSelectedChitiFilter] = useState<string>('ALL');
  const [selectedChitiMembers, setSelectedChitiMembers] = useState<ChitMember[]>([]);
  const [isLoadingChitiMembers, setIsLoadingChitiMembers] = useState<boolean>(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  useEffect(() => {
    if (selectedChitiFilter && selectedChitiFilter !== 'ALL') {
      setIsLoadingChitiMembers(true);
      dbService.getChitMembers(selectedChitiFilter)
        .then(members => {
          setSelectedChitiMembers(members);
        })
        .catch(err => {
          console.error('Failed to load chiti members:', err);
        })
        .finally(() => {
          setIsLoadingChitiMembers(false);
        });
    } else {
      setSelectedChitiMembers([]);
    }
  }, [selectedChitiFilter, dataVersion]);

  const totalMonthlyExpected = chitis.reduce((acc, c) => acc + c.expectedMonthlyPool, 0);
  const totalMembersCount = chitis.reduce((acc, c) => acc + c.totalMembers, 0);

  // Overall collection across all chitis in their current months
  let totalCurrentCollected = 0;
  let totalCurrentPending = 0;

  chitis.forEach(c => {
    const months = chitiMonthsMap[c.id] || [];
    const curM = months.find(m => m.monthNumber === c.currentMonth);
    if (curM) {
      totalCurrentCollected += curM.actualCollected;
      totalCurrentPending += curM.pendingCollection;
    }
  });

  const selectedChiti = selectedChitiFilter !== 'ALL' ? chitis.find(c => c.id === selectedChitiFilter) : null;
  const selectedChitiMonths = selectedChiti ? (chitiMonthsMap[selectedChiti.id] || []) : [];
  const selectedCompletedMonthsCount = selectedChitiMonths.filter(m => m.status === 'CLOSED' || (m.expectedCollection > 0 && m.actualCollected >= m.expectedCollection)).length;
  const selectedActiveMonthNum = selectedChiti 
    ? Math.min(selectedChiti.durationMonths, Math.max(selectedChiti.currentMonth, selectedCompletedMonthsCount > 0 && selectedCompletedMonthsCount < selectedChiti.durationMonths ? selectedCompletedMonthsCount + 1 : 1)) 
    : 1;
  const selectedMonthData = selectedChiti ? (selectedChitiMonths.find(m => m.monthNumber === selectedActiveMonthNum) || selectedChitiMonths[0]) : null;

  const displayMembersCount = selectedChiti ? selectedChiti.totalMembers : totalMembersCount;
  const displayCollected = selectedChiti ? (selectedMonthData?.actualCollected || 0) : totalCurrentCollected;
  const displayPending = selectedChiti ? (selectedMonthData?.pendingCollection || 0) : totalCurrentPending;

  const handleWhatsApp = (phone: string, name: string, chitiName: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Namaste ${name}, greeting from ${agent.businessName} regarding ${chitiName}.`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
  };

  const handleCreated = async (newChitiData: any) => {
    try {
      setIsNewChitiOpen(false);
      setIsLoading(true);
      const created = await dbService.createChiti(newChitiData);
      setDataVersion(v => v + 1);
      // Automatically open the newly created Chiti dashboard
      onOpenChiti(created.id);
    } catch (e: any) {
      alert(e.message);
      setIsLoading(false);
    }
  };

  const handleDeleteChiti = async (chitiId: string, chitiName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to completely delete "${chitiName}"? This action cannot be undone and will remove all members, payments, and history.`);
    if (confirmed) {
      setIsLoading(true);
      try {
        await dbService.deleteChiti(chitiId);
        setDataVersion(v => v + 1);
      } catch (err: any) {
        alert(`Failed to delete Chiti: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading && chitis.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px', width: '100%' }}>
      {/* Agent Hero Navy Banner */}
      <div className="hero-navy" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Agent Avatar */}
            <div 
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '20px',
                fontWeight: 800,
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                flexShrink: 0
              }}
            >
              {agent.profilePictureUrl ? (
                <img src={agent.profilePictureUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{agent.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Sparkles size={13} /> Agent Dashboard
              </div>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>WELCOME, {agent.name.toUpperCase()}</span>
                {onEditProfile && (
                  <button
                    onClick={onEditProfile}
                    type="button"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#E2E8F0',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                )}
              </h1>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
                {agent.businessName} • {agent.town}, {agent.state}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsNewChitiOpen(true)}
            className="btn btn-primary"
            style={{ 
              padding: '12px 24px', 
              fontSize: '14px',
              minHeight: '46px',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)'
            }}
          >
            <Plus size={18} strokeWidth={2.5} /> + CREATE NEW CHITI
          </button>
        </div>

        {/* Chiti Selector Filter Bar */}
        {chitis.length > 0 && (
          <div style={{ 
            marginTop: '18px', 
            marginBottom: '16px', 
            background: 'rgba(255, 255, 255, 0.08)', 
            padding: '12px 14px', 
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E2E8F0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Layers size={14} color="#A78BFA" /> Select Chiti:
                {selectedChiti && (
                  <span className="badge badge-primary" style={{ background: '#7C3AED', color: '#FFF', fontSize: '10px', textTransform: 'none' }}>
                    Active: {selectedChiti.name}
                  </span>
                )}
              </div>
              {selectedChiti && (
                <button
                  onClick={() => setSelectedChitiFilter('ALL')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 10px', minHeight: '30px', background: 'rgba(255,255,255,0.15)', color: '#FFF', border: 'none', borderRadius: '8px' }}
                >
                  ✕ Show All Chitis
                </button>
              )}
            </div>

            {/* Quick-select chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setSelectedChitiFilter('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: selectedChitiFilter === 'ALL' ? '2px solid #A78BFA' : '1px solid rgba(255,255,255,0.2)',
                  background: selectedChitiFilter === 'ALL' ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'rgba(255,255,255,0.06)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                🌐 All Chitis ({chitis.length})
              </button>
              {chitis.map(c => {
                const isSelected = selectedChitiFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChitiFilter(c.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.2)',
                      background: isSelected ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255,255,255,0.06)',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    <span>📌 {c.name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.9, background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '10px' }}>
                      {c.totalMembers}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dropdown for dropdown preference */}
            <div style={{ marginTop: '6px' }}>
              <select
                value={selectedChitiFilter}
                onChange={e => setSelectedChitiFilter(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(167, 139, 250, 0.5)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">🌐 All Chitis (Combined Overview)</option>
                {chitis.map(c => (
                  <option key={c.id} value={c.id}>
                    📌 {c.name} ({c.code}) - {c.totalMembers} Members
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 5-Second KPI Overview Strip (Updates dynamically based on selected Chiti) */}
        <div className="quick-stats-grid">
          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {selectedChiti ? 'Chiti Code' : 'Active Chitis'}
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              {selectedChiti ? selectedChiti.code : chitis.length}
            </span>
            <span style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>
              {selectedChiti ? `Due: ${selectedChiti.paymentDueDay}th of month` : (chitis.length > 0 ? `${chitis.length} Groups Active` : '0 Registered')}
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {selectedChiti ? 'Chiti Members' : 'Total Members'}
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              {displayMembersCount}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              {selectedChiti ? `${formatINR(selectedChiti.monthlyContribution)} / month per head` : 'Across all Chitis'}
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {selectedChiti ? `Collected (M${selectedActiveMonthNum})` : 'Collected'}
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', marginTop: '4px' }} className="tabular-nums">
              {formatINR(displayCollected)}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              {selectedChiti ? `Expected Pool: ${formatINR(selectedChiti.expectedMonthlyPool)}` : 'Current cycle'}
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {selectedChiti ? `Pending Dues (M${selectedActiveMonthNum})` : 'Pending Dues'}
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: displayPending > 0 ? '#F59E0B' : '#FFFFFF', marginTop: '4px' }} className="tabular-nums">
              {formatINR(displayPending)}
            </span>
            <span style={{ fontSize: '11px', color: displayPending > 0 ? '#F59E0B' : '#10B981', marginTop: '2px' }}>
              {displayPending > 0 ? 'To be collected' : chitis.length > 0 ? 'All cleared' : '—'}
            </span>
          </div>
        </div>
      </div>



      {/* PWA Mobile Installation Banner */}
      {onOpenInstall && (
        <div
          onClick={onOpenInstall}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenInstall(); }}
          style={{
            background: 'linear-gradient(135deg, #070B14 0%, #0F172A 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: '12px',
            color: '#FFFFFF'
          }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                flexShrink: 0
              }}
            >
              <Download size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Install CHITI App on Mobile
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>Installable PWA</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Fast full-screen mobile experience, home screen launcher icon & offline access
              </div>
            </div>
          </div>
          <button 
            type="button"
            className="btn btn-primary btn-sm"
            style={{ 
              fontWeight: 700, 
              flexShrink: 0,
              minHeight: '38px',
              padding: '8px 16px',
              background: '#10B981',
              borderColor: '#10B981',
              color: '#FFFFFF'
            }}
          >
            <span>Install</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* CHITI CONTENT: EITHER SPECIFIC SELECTED CHITI OR ALL CHITIS OVERVIEW */}
      {selectedChiti ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Bar with Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary" style={{ background: '#7C3AED', color: '#FFF', fontSize: '11px', fontWeight: 800 }}>
                  {selectedChiti.code}
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>
                  {selectedChiti.name}
                </h2>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                {selectedChiti.totalMembers} Members • Payment due {selectedChiti.paymentDueDay}th of every month
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedChitiFilter('ALL')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', minHeight: '38px', borderRadius: '10px' }}
              >
                🌐 View All Chitis
              </button>
              <button
                onClick={() => onOpenChiti(selectedChiti.id)}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '13px', fontWeight: 800, minHeight: '38px', padding: '8px 18px', background: '#7C3AED', borderRadius: '10px', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)' }}
              >
                <span>📊 Open Master Collection Sheet</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Selected Chiti Full Overview Card */}
          <div 
            className="card"
            style={{
              padding: '20px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Current Cycle Status
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span>Month {selectedActiveMonthNum} of {selectedChiti.durationMonths}</span>
                  {selectedCompletedMonthsCount > 0 && (
                    <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {selectedCompletedMonthsCount} Paid & Closed
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Monthly Expected Pool
                </span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#7C3AED' }} className="tabular-nums">
                  {formatINR(selectedChiti.expectedMonthlyPool)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {(() => {
              const progressPct = Math.min(100, Math.round((Math.max(selectedChiti.currentMonth - 1, selectedCompletedMonthsCount) / selectedChiti.durationMonths) * 100));
              return (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Chiti Lifecycle Progress</span>
                    <span style={{ color: '#7C3AED' }}>{progressPct}% Completed</span>
                  </div>
                  <div className="progress-bar-track" style={{ height: '8px' }}>
                    <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #7C3AED, #10B981)' }} />
                  </div>
                </div>
              );
            })()}

            {/* 4 Detail Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: '#F8FAFC', padding: '14px', borderRadius: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Per Member / Month</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }} className="tabular-nums">
                  {formatINR(selectedChiti.monthlyContribution)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Agent Commission</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }} className="tabular-nums">
                  {selectedChiti.rule?.commissionType === 'FIXED' ? formatINR(selectedChiti.rule.commissionValue) : `${selectedChiti.rule?.commissionValue || 0}%`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Collected (M{selectedActiveMonthNum})</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }} className="tabular-nums">
                  {formatINR(displayCollected)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Pending (M{selectedActiveMonthNum})</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: displayPending > 0 ? '#F59E0B' : '#10B981', marginTop: '2px' }} className="tabular-nums">
                  {formatINR(displayPending)}
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Members Section for this specific Chiti */}
          <div 
            className="card"
            style={{
              padding: '20px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Users size={18} color="#7C3AED" />
                  Enrolled Members ({selectedChitiMembers.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Members registered in {selectedChiti.name}
                </p>
              </div>

              {/* Badges strip: Auction winners vs eligible */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-success" style={{ fontSize: '11px', padding: '4px 8px' }}>
                  🏆 Won: {selectedChitiMembers.filter(m => m.hasWonAuction).length}
                </span>
                <span className="badge badge-primary" style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>
                  🎯 Eligible: {selectedChitiMembers.filter(m => !m.hasWonAuction).length}
                </span>
              </div>
            </div>

            {/* Member Search Bar */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                placeholder="Search member by name, phone, or #..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC'
                }}
              />
              {memberSearchQuery && (
                <button
                  onClick={() => setMemberSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Members List */}
            {isLoadingChitiMembers ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                <div className="spinner" style={{ width: '28px', height: '28px', border: '2px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                <span style={{ fontSize: '13px' }}>Loading members for {selectedChiti.name}...</span>
              </div>
            ) : (() => {
              const q = memberSearchQuery.toLowerCase().trim();
              const filtered = selectedChitiMembers.filter(m => {
                if (!q) return true;
                return (
                  m.fullName.toLowerCase().includes(q) ||
                  m.phone.includes(q) ||
                  String(m.memberNumber).includes(q)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', background: '#F8FAFC', borderRadius: '12px' }}>
                    <Users size={32} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>No Members Found</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      {memberSearchQuery ? 'No members match your search criteria' : 'No members enrolled in this Chiti yet.'}
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filtered.map(m => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                        <div 
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: m.hasWonAuction ? 'rgba(16, 185, 129, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                            color: m.hasWonAuction ? '#059669' : '#7C3AED',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                            flexShrink: 0
                          }}
                        >
                          #{m.memberNumber}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                            {m.fullName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{m.phone}</span>
                            {m.hasWonAuction ? (
                              <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                Won M{m.wonMonth || '—'}
                              </span>
                            ) : (
                              <span className="badge badge-secondary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                Eligible
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Paid</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }} className="tabular-nums">
                            {formatINR(m.totalPaid)}
                          </div>
                        </div>

                        {m.pendingAmount > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: '#EF4444', textTransform: 'uppercase', fontWeight: 700 }}>Due</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#EF4444' }} className="tabular-nums">
                              {formatINR(m.pendingAmount)}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {m.phone && (
                            <button
                              onClick={() => handleWhatsApp(m.phone, m.fullName, selectedChiti.name)}
                              title="Send WhatsApp message"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#059669',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}
                          {m.phone && (
                            <a
                              href={`tel:${m.phone}`}
                              title="Call member"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#2563EB',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              <Phone size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Bottom button inside card to open full collection sheet */}
            <div style={{ marginTop: '18px', textAlign: 'center' }}>
              <button
                onClick={() => onOpenChiti(selectedChiti.id)}
                className="btn btn-primary btn-block"
                style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 800, background: '#7C3AED', borderRadius: '10px' }}
              >
                <span>Open Master Collection Sheet</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ALL CHITIS OVERVIEW GRID (WHEN "ALL" IS SELECTED) */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                ALL CHITIS
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {chitis.length > 0 ? `All your active and completed Chitis (${chitis.length} groups)` : 'Your registered Chitis will appear here'}
              </div>
            </div>

            {chitis.length > 0 && (
              <button 
                onClick={() => setIsNewChitiOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700 }}
              >
                <Plus size={16} /> + New Chiti
              </button>
            )}
          </div>

          {/* REAL EMPTY STATE: When no Chitis created yet */}
          {chitis.length === 0 ? (
            <div 
              className="card"
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                border: '2px dashed #CBD5E1',
                borderRadius: '24px',
                background: '#FFFFFF'
              }}
            >
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'rgba(124, 58, 237, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7C3AED',
                  marginBottom: '16px'
                }}
              >
                <Layers size={32} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                No Chitis Yet
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '380px', margin: '8px auto 24px', lineHeight: 1.5 }}>
                Create your first real Chiti group to enroll members, record payments, and conduct monthly reverse auctions.
              </p>

              <button 
                onClick={() => setIsNewChitiOpen(true)}
                className="btn btn-primary btn-lg"
                style={{ padding: '14px 32px' }}
              >
                <Plus size={20} strokeWidth={2.5} /> + CREATE NEW CHITI
              </button>
            </div>
          ) : (
            /* UPCOMING CHITIS MOBILE-OPTIMIZED CARDS */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {(() => {
                const currentDay = new Date().getDate();
                const upcoming = [...chitis].sort((a, b) => {
                  let diffA = a.paymentDueDay - currentDay;
                  if (diffA < 0) diffA += 30;
                  let diffB = b.paymentDueDay - currentDay;
                  if (diffB < 0) diffB += 30;
                  return diffA - diffB;
                });

                if (upcoming.length === 0) {
                  return (
                    <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#64748B', gridColumn: '1 / -1' }}>
                      <Layers size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>No Chitis Found</div>
                    </div>
                  );
                }

                return upcoming.map(chiti => {
                const months = chitiMonthsMap[chiti.id] || [];
                const completedMonthsCount = months.filter(m => m.status === 'CLOSED' || (m.expectedCollection > 0 && m.actualCollected >= m.expectedCollection)).length;
                const displayCurrentMonth = Math.min(chiti.durationMonths, Math.max(chiti.currentMonth, completedMonthsCount > 0 && completedMonthsCount < chiti.durationMonths ? completedMonthsCount + 1 : 1));
                const mData = months.find(m => m.monthNumber === displayCurrentMonth) || months[0];
                const progressPercent = Math.min(100, Math.round((Math.max(chiti.currentMonth - 1, completedMonthsCount) / chiti.durationMonths) * 100));

                return (
                  <div 
                    key={chiti.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '18px',
                      borderRadius: '20px',
                      border: '1px solid #E2E8F0',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Chiti Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <span 
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '1px',
                              color: '#7C3AED',
                              textTransform: 'uppercase',
                              background: 'rgba(124, 58, 237, 0.08)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              display: 'inline-block',
                              marginBottom: '6px'
                            }}
                          >
                            {chiti.code}
                          </span>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {chiti.name}
                          </h3>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <button 
                            onClick={(e) => handleDeleteChiti(chiti.id, chiti.name, e)}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', marginBottom: '4px', opacity: 0.7 }}
                            className="hover-lift"
                            title="Delete Chiti"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Due Date</div>
                          <span className="badge badge-pending" style={{ fontSize: '12px', marginTop: '2px' }}>
                            <Clock size={12} /> {chiti.paymentDueDay}th of month
                          </span>
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(3, 1fr)', 
                          gap: '10px', 
                          marginTop: '16px',
                          padding: '12px',
                          background: 'var(--surface-muted)',
                          borderRadius: '14px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Total Members</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                            {chiti.totalMembers}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Monthly / Member</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }} className="tabular-nums">
                            {formatINR(chiti.monthlyContribution)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Agent Commission</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', marginTop: '2px' }} className="tabular-nums">
                            {chiti.rule?.commissionType === 'FIXED' ? formatINR(chiti.rule.commissionValue) : `${chiti.rule?.commissionValue || 0}%`}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Month Tracking */}
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                          <span style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Month {displayCurrentMonth} of {chiti.durationMonths}
                            {completedMonthsCount > 0 && (
                              <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                {completedMonthsCount} paid
                              </span>
                            )}
                          </span>
                          <span style={{ color: '#7C3AED' }}>{progressPercent}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      {/* Pool & Collection stats */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px' }}>
                        <span style={{ color: '#64748B' }}>
                          Expected Pool: <strong style={{ color: '#0F172A' }}>{formatINR(chiti.expectedMonthlyPool)}</strong>
                        </span>
                        {mData && mData.pendingCollection > 0 && (
                          <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                            {formatINR(mData.pendingCollection)} due
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedChitiFilter(chiti.id)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '10px 14px', fontSize: '13px', fontWeight: 700 }}
                      >
                        <Users size={14} /> View Details
                      </button>
                      <button 
                        onClick={() => onOpenChiti(chiti.id)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '10px 14px', fontSize: '13px', fontWeight: 700 }}
                      >
                        <span>Open Sheet</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          )}
        </div>
      )}

      {/* NEW CHITI WIZARD MODAL */}
      {isNewChitiOpen && (
        <NewChitiWizard 
          agentId={agent.id}
          onClose={() => setIsNewChitiOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};
