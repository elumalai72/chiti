import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { Chiti, ChitMonth, Loan, Member } from '../types';
import { Award, Layers, Search, TrendingUp, ChevronDown, ChevronUp, Plus, Edit2, Calendar, Banknote } from 'lucide-react';
import { IssueLoanModal } from './loans/IssueLoanModal';
import { EditLoanModal } from './loans/EditLoanModal';
import { RecordRepaymentModal } from './loans/RecordRepaymentModal';

interface CommissionViewProps {
  agentId: string;
  chitis: Chiti[];
}

export const CommissionView: React.FC<CommissionViewProps> = ({ agentId, chitis }) => {
  const [chitiMonthsMap, setChitiMonthsMap] = useState<Record<string, ChitMonth[]>>({});
  const [chitiLoansMap, setChitiLoansMap] = useState<Record<string, Loan[]>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChitiId, setExpandedChitiId] = useState<string | null>(null);

  // Modal States
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedChitiId, setSelectedChitiId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const monthsMap: Record<string, ChitMonth[]> = {};
      const loansMap: Record<string, Loan[]> = {};
      
      const allMembers = await dbService.getMembersByAgent(agentId);
      setMembers(allMembers);

      for (const c of chitis) {
        const months = await dbService.getChitMonths(c.id);
        const loans = await dbService.getLoansByChiti(c.id);
        monthsMap[c.id] = months;
        loansMap[c.id] = loans;
      }
      setChitiMonthsMap(monthsMap);
      setChitiLoansMap(loansMap);
    } catch (err) {
      console.error('Failed to load commissions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [chitis]);

  const filteredChitis = chitis.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award color="#7C3AED" /> Chiti Commission & Surplus
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Manage surplus money, agent commissions, and issue loans from the pool.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input 
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by Chiti name or code..."
          style={{ width: '100%', paddingLeft: '36px', background: '#FFFFFF' }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
      ) : filteredChitis.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '20px' }}>
          <Layers size={36} color="#7C3AED" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>No Data Yet</h3>
          <p style={{ color: '#64748B', fontSize: '13px', margin: '6px auto' }}>
            Data will appear here once auctions are completed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredChitis.map(chiti => {
            const months = chitiMonthsMap[chiti.id] || [];
            const loans = chitiLoansMap[chiti.id] || [];
            const completedMonths = months.filter(m => m.auctionStatus === 'COMPLETED');
            
            const totalSurplus = completedMonths.reduce((sum, m) => sum + (m.surplusAmount || 0), 0);
            const totalCommission = completedMonths.reduce((sum, m) => sum + (m.agentCommission || 0), 0);
            
            const activeLoans = loans.filter(l => l.status === 'ACTIVE');
            const totalLentOut = activeLoans.reduce((sum, l) => sum + (l.principalAmount - l.repaidAmount), 0);
            
            // Available to lend = Total Surplus - Agent Commission - Amount Currently Lent Out
            const availableLendingPool = totalSurplus - totalCommission - totalLentOut;

            const isExpanded = expandedChitiId === chiti.id;

            return (
              <div key={chiti.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedChitiId(isExpanded ? null : chiti.id)}
                  style={{ padding: '16px', background: isExpanded ? '#F8FAFC' : '#FFFFFF', borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                      {chiti.code}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{chiti.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Available Pool</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }} className="tabular-nums">{formatINR(availableLendingPool)}</div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px' }}>
                    {/* Summary Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Surplus</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{formatINR(totalSurplus)}</div>
                      </div>
                      <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Agent Commission</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#7C3AED', marginTop: '4px' }}>{formatINR(totalCommission)}</div>
                      </div>
                      <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Lent Out</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{formatINR(totalLentOut)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Active Loans</h4>
                      <button 
                        onClick={() => { setSelectedChitiId(chiti.id); setIsIssueModalOpen(true); }}
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={16} /> Issue Loan
                      </button>
                    </div>

                    {activeLoans.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', background: '#F8FAFC', borderRadius: '12px', color: '#64748B', fontSize: '13px' }}>
                        No active loans from this pool.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeLoans.map(loan => {
                          const remainingPrincipal = loan.principalAmount - loan.repaidAmount;
                          return (
                            <div key={loan.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>{loan.memberName}</div>
                                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <Calendar size={12} />
                                    {new Date(loan.issuedDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => { setSelectedLoan(loan); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                                    <Edit2 size={16} />
                                  </button>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>Principal Due</div>
                                  <div style={{ fontWeight: 700, color: '#EF4444' }}>{formatINR(remainingPrincipal)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>Interest Rate/Due</div>
                                  <div style={{ fontWeight: 700, color: '#F59E0B' }}>{formatINR(loan.expectedInterest)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>Total Next Month Due</div>
                                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{formatINR(remainingPrincipal + loan.expectedInterest)}</div>
                                </div>
                              </div>

                              <button 
                                onClick={() => { setSelectedLoan(loan); setIsRepayModalOpen(true); }}
                                style={{ width: '100%', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '8px', color: '#0F172A', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                              >
                                <Banknote size={16} /> Record Repayment
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedChitiId && (
        <IssueLoanModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          agentId={agentId}
          chitiId={selectedChitiId}
          members={members}
          chitMonths={chitiMonthsMap[selectedChitiId] || []}
          onSuccess={loadData}
        />
      )}

      {selectedLoan && (
        <EditLoanModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedLoan(null); }}
          loan={selectedLoan}
          onSuccess={loadData}
        />
      )}

      {selectedLoan && (
        <RecordRepaymentModal
          isOpen={isRepayModalOpen}
          onClose={() => { setIsRepayModalOpen(false); setSelectedLoan(null); }}
          agentId={agentId}
          loan={selectedLoan}
          chitMonths={chitiMonthsMap[selectedLoan.chitiId] || []}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
