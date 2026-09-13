import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { AgentAccount, Chiti, Member, ChitMonth } from '../types';
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
  Clock,
  Calculator,
  Download
} from 'lucide-react';

interface AgentDashboardViewProps {
  agent: AgentAccount;
  onOpenChiti: (chitiId: string) => void;
  onOpenCalculator?: () => void;
  onOpenInstall?: () => void;
}

export const AgentDashboardView: React.FC<AgentDashboardViewProps> = ({ 
  agent, 
  onOpenChiti, 
  onOpenCalculator,
  onOpenInstall
}) => {
  const [isNewChitiOpen, setIsNewChitiOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const [chitis, setChitis] = useState<Chiti[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [chitiMonthsMap, setChitiMonthsMap] = useState<Record<string, ChitMonth[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [loadedChitis, loadedMembers] = await Promise.all([
          dbService.getChitisByAgent(agent.id),
          dbService.getMembersByAgent(agent.id)
        ]);
        
        const monthsMap: Record<string, ChitMonth[]> = {};
        for (const c of loadedChitis) {
          const months = await dbService.getChitMonths(c.id);
          monthsMap[c.id] = months;
        }

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
  }, [agent.id, dataVersion]);

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
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Sparkles size={13} /> Agent Dashboard
            </div>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.5px' }}>
              WELCOME, {agent.name.toUpperCase()} 👋
            </h1>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
              {agent.businessName} • {agent.town}, {agent.state}
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

        {/* 5-Second KPI Overview Strip */}
        <div className="quick-stats-grid">
          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Chitis
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              {chitis.length}
            </span>
            <span style={{ fontSize: '11px', color: chitis.length > 0 ? '#10B981' : '#94A3B8', marginTop: '2px' }}>
              {chitis.length > 0 ? `${chitis.length} Groups Active` : '0 Registered'}
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Members
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              {totalMembersCount}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              Across all Chitis
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Collected
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', marginTop: '4px' }} className="tabular-nums">
              {formatINR(totalCurrentCollected)}
            </span>
            <span style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              Current cycle
            </span>
          </div>

          <div className="stat-card-glass">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pending Dues
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: totalCurrentPending > 0 ? '#F59E0B' : '#FFFFFF', marginTop: '4px' }} className="tabular-nums">
              {formatINR(totalCurrentPending)}
            </span>
            <span style={{ fontSize: '11px', color: totalCurrentPending > 0 ? '#F59E0B' : '#10B981', marginTop: '2px' }}>
              {totalCurrentPending > 0 ? 'To be collected' : chitis.length > 0 ? 'All cleared' : '—'}
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

      {/* UPCOMING CHITIS SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
              ALL CHITIS
            </h2>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              {chitis.length > 0 ? `All your active and completed Chitis` : 'Your registered Chitis will appear here'}
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
              const upcoming = chitis.sort((a, b) => {
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
              const mData = months.find(m => m.monthNumber === chiti.currentMonth) || months[0];
              const progressPercent = Math.min(100, Math.round((chiti.currentMonth / chiti.durationMonths) * 100));

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

                      <div style={{ textAlign: 'right' }}>
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
                        <span style={{ color: '#0F172A' }}>
                          Month {chiti.currentMonth} of {chiti.durationMonths}
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

                  {/* Primary CTA */}
                  <button 
                    onClick={() => onOpenChiti(chiti.id)}
                    className="btn btn-primary btn-block"
                    style={{ marginTop: '18px', padding: '12px 18px', minHeight: '44px' }}
                  >
                    <span>Open Chiti</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            });
            })()}
          </div>
        )}
      </div>

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
