import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { Chiti, ChitMember, LedgerEntry, ChitMonth } from '../types';
import { Award, Layers, Search, ChevronDown, ChevronUp, Plus, Calendar, Save, Clock, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';

interface CommissionViewProps {
  agentId: string;
  chitis: Chiti[];
}

interface SessionItem {
  id: string;
  memberName: string;
  commission: number;
  interest: number;
  ticked: boolean;
}

export const CommissionView: React.FC<CommissionViewProps> = ({ agentId, chitis }) => {
  const [chitiMembersMap, setChitiMembersMap] = useState<Record<string, ChitMember[]>>({});
  const [savedCommissions, setSavedCommissions] = useState<Record<string, LedgerEntry[]>>({});
  const [chitiMonthsMap, setChitiMonthsMap] = useState<Record<string, ChitMonth[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChitiId, setExpandedChitiId] = useState<string | null>(null);

  // Active Notebook Session States
  const [sessionDates, setSessionDates] = useState<Record<string, string>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, SessionItem[]>>({});
  const [draftInputs, setDraftInputs] = useState<Record<string, { memberName: string, commission: string, interest: string }>>({});
  const [isSavingBatch, setIsSavingBatch] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const membersMap: Record<string, ChitMember[]> = {};
      const commissionsMap: Record<string, LedgerEntry[]> = {};
      const monthsMap: Record<string, ChitMonth[]> = {};

      const results = await Promise.all(chitis.map(async (c) => {
        const [comms, months, members] = await Promise.all([
          dbService.getExtraCommissionsByChiti(c.id),
          dbService.getChitMonths(c.id),
          dbService.getChitMembers(c.id)
        ]);
        return {
          chitiId: c.id,
          comms: comms.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          months,
          members: members.sort((a, b) => a.memberNumber - b.memberNumber)
        };
      }));

      const newSessionDates = { ...sessionDates };
      results.forEach(r => {
        commissionsMap[r.chitiId] = r.comms;
        monthsMap[r.chitiId] = r.months;
        membersMap[r.chitiId] = r.members;
        if (!newSessionDates[r.chitiId]) {
          newSessionDates[r.chitiId] = new Date().toISOString().split('T')[0];
        }
      });
      setSessionDates(newSessionDates);
      setChitiMembersMap(membersMap);
      setSavedCommissions(commissionsMap);
      setChitiMonthsMap(monthsMap);
    } catch (err) {
      console.error('Failed to load commissions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chitis]);

  const handleAddRow = (chitiId: string) => {
    const draft = draftInputs[chitiId];
    if (!draft || !draft.memberName.trim()) {
      alert("Please enter a name.");
      return;
    }
    const comm = Number(draft.commission) || 0;
    const int = Number(draft.interest) || 0;
    
    if (comm <= 0 && int <= 0) {
      alert("Please enter a valid commission or interest amount.");
      return;
    }

    const newItem: SessionItem = {
      id: Math.random().toString(36).substring(7),
      memberName: draft.memberName.trim(),
      commission: comm,
      interest: int,
      ticked: false
    };

    setActiveSessions(prev => ({
      ...prev,
      [chitiId]: [...(prev[chitiId] || []), newItem]
    }));

    setDraftInputs(prev => ({
      ...prev,
      [chitiId]: { memberName: '', commission: '', interest: '' }
    }));
  };

  const handleToggleTick = (chitiId: string, itemId: string) => {
    setActiveSessions(prev => ({
      ...prev,
      [chitiId]: (prev[chitiId] || []).map(item => 
        item.id === itemId ? { ...item, ticked: !item.ticked } : item
      )
    }));
  };

  const handleRemoveRow = (chitiId: string, itemId: string) => {
    setActiveSessions(prev => ({
      ...prev,
      [chitiId]: (prev[chitiId] || []).filter(item => item.id !== itemId)
    }));
  };

  const handleFinishAndSave = async (chitiId: string) => {
    const items = activeSessions[chitiId] || [];
    const tickedItems = items.filter(i => i.ticked);
    
    if (tickedItems.length === 0) {
      alert("You have not ticked (collected) any items to save.");
      return;
    }

    const dateStr = sessionDates[chitiId] || new Date().toISOString().split('T')[0];
    const membersList = chitiMembersMap[chitiId] || [];

    setIsSavingBatch(chitiId);
    try {
      for (const item of tickedItems) {
        // Find matching member to get their ID if possible
        const matchingMember = membersList.find(m => m.fullName.toLowerCase() === item.memberName.toLowerCase());
        const memberId = matchingMember ? matchingMember.memberId : '00000000-0000-0000-0000-000000000000';

        await dbService.recordExtraCommission({
          agentId,
          chitiId,
          monthNumber: 1, // irrelevant for pure log
          memberId: memberId,
          memberName: item.memberName,
          commissionAmount: item.commission,
          interestAmount: item.interest,
          notes: `Date: ${dateStr}. Ticked from manual sheet.`
        });
      }

      alert(`Successfully saved ${tickedItems.length} commission payments!`);
      
      // Keep unticked items in the session, remove ticked ones
      setActiveSessions(prev => ({
        ...prev,
        [chitiId]: items.filter(i => !i.ticked)
      }));

      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingBatch(null);
    }
  };

  const filteredChitis = chitis.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award color="#7C3AED" /> Commission Logbook
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Build your custom notebook sheet, add names, collect money, and check them off!
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

      <datalist id="members-list">
        {Object.values(chitiMembersMap).flat().map(m => <option key={m.id} value={m.fullName} />)}
      </datalist>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
      ) : filteredChitis.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '20px' }}>
          <Layers size={36} color="#7C3AED" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>No Data Yet</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredChitis.map(chiti => {
            const isExpanded = expandedChitiId === chiti.id;
            const history = savedCommissions[chiti.id] || [];
            const totalCollected = history.reduce((sum, h) => sum + h.amount, 0);

            const months = chitiMonthsMap[chiti.id] || [];
            const completedMonths = months.filter(m => m.auctionStatus === 'COMPLETED');
            const totalMonthlyCommission = completedMonths.reduce((sum, m) => sum + (m.agentCommission || 0), 0);

            const sessionDate = sessionDates[chiti.id] || '';
            const draft = draftInputs[chiti.id] || { memberName: '', commission: '', interest: '' };
            const activeSession = activeSessions[chiti.id] || [];
            const allTicked = activeSession.length > 0 && activeSession.every(s => s.ticked);
            const hasTicked = activeSession.some(s => s.ticked);

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
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Total Commission</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }} className="tabular-nums">{formatINR(totalCollected + totalMonthlyCommission)}</div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px', background: '#F8FAFC' }}>
                    
                    {/* Collection Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <Calendar size={18} color="#475569" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>Collection Date:</span>
                        <input 
                          type="date"
                          value={sessionDate}
                          onChange={e => setSessionDates(p => ({ ...p, [chiti.id]: e.target.value }))}
                          style={{ fontSize: '14px', padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', flex: 1, maxWidth: '200px', fontWeight: 600 }}
                        />
                      </div>
                    </div>

                    {/* ACTIVE NOTEBOOK SESSION */}
                    <div style={{ background: '#fff', border: '1px solid #d1d5db', boxShadow: '2px 4px 12px rgba(0,0,0,0.1)', position: 'relative', marginBottom: '32px' }}>
                      {/* Notebook Title Area */}
                      <div style={{ padding: '16px 20px', borderBottom: '2px solid #1f2937', background: '#fafafa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={20} color="#be185d" />
                        <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#1f2937', margin: 0, fontFamily: '"Caveat", "Kalam", "Comic Sans MS", cursive, sans-serif' }}>
                          Active Collection Sheet
                        </h4>
                      </div>

                      {/* Add Form */}
                      <div style={{ padding: '12px 20px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid #93c5fd', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 150px' }}>
                          <input 
                            list="members-list"
                            placeholder="Enter Name..."
                            value={draft.memberName}
                            onChange={e => setDraftInputs(p => ({ ...p, [chiti.id]: { ...draft, memberName: e.target.value } }))}
                            style={{ width: '100%', fontSize: '14px', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                          />
                        </div>
                        <div style={{ flex: '1 1 80px' }}>
                          <input 
                            type="number"
                            placeholder="Comm ₹"
                            value={draft.commission}
                            onChange={e => setDraftInputs(p => ({ ...p, [chiti.id]: { ...draft, commission: e.target.value } }))}
                            style={{ width: '100%', fontSize: '14px', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                          />
                        </div>
                        <div style={{ flex: '1 1 80px' }}>
                          <input 
                            type="number"
                            placeholder="Int ₹"
                            value={draft.interest}
                            onChange={e => setDraftInputs(p => ({ ...p, [chiti.id]: { ...draft, interest: e.target.value } }))}
                            style={{ width: '100%', fontSize: '14px', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                          />
                        </div>
                        <button 
                          onClick={() => handleAddRow(chiti.id)}
                          className="btn-primary" 
                          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>

                      {/* Notebook Paper Table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: '"Caveat", "Kalam", "Comic Sans MS", cursive, sans-serif' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px 16px', textAlign: 'left', borderBottom: '2px solid #1f2937', position: 'sticky', left: 0, background: '#fff', zIndex: 10, borderRight: '2px solid rgba(239, 68, 68, 0.7)' }}>
                                <div style={{ fontSize: '20px', color: '#1f2937' }}>Name</div>
                              </th>
                              <th style={{ padding: '8px 16px', textAlign: 'right', borderBottom: '2px solid #1f2937', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '20px', color: '#1f2937' }}>Comm</div>
                              </th>
                              <th style={{ padding: '8px 16px', textAlign: 'right', borderBottom: '2px solid #1f2937', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '20px', color: '#1f2937' }}>Interest</div>
                              </th>
                              <th style={{ padding: '8px 16px', textAlign: 'center', borderBottom: '2px solid #1f2937' }}>
                                <div style={{ fontSize: '20px', color: '#1f2937' }}>Tick to Collect</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeSession.length === 0 ? (
                              <tr>
                                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontFamily: 'sans-serif', fontSize: '14px' }}>
                                  No names added to sheet yet.
                                </td>
                              </tr>
                            ) : activeSession.map((item, idx) => (
                              <tr key={item.id} style={{ opacity: item.ticked ? 0.7 : 1 }}>
                                <td style={{ 
                                  padding: '12px 16px', 
                                  borderBottom: '1px solid #93c5fd',
                                  fontSize: '20px',
                                  color: '#be185d',
                                  fontWeight: 'bold',
                                  position: 'sticky',
                                  left: 0,
                                  background: '#fff',
                                  zIndex: 10,
                                  borderRight: '2px solid rgba(239, 68, 68, 0.7)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                      onClick={() => handleRemoveRow(chiti.id, item.id)}
                                      style={{ color: '#EF4444', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                                      title="Remove from sheet"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    <span style={{ color: '#1f2937', fontSize: '16px' }}>{idx + 1}.</span>
                                    <span>{item.memberName}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid #93c5fd', fontSize: '20px', color: '#1f2937' }}>
                                  {item.commission > 0 ? `₹${item.commission}` : '-'}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid #93c5fd', fontSize: '20px', color: '#1f2937' }}>
                                  {item.interest > 0 ? `₹${item.interest}` : '-'}
                                </td>
                                <td 
                                  onClick={() => handleToggleTick(chiti.id, item.id)}
                                  style={{ 
                                    padding: '0', 
                                    textAlign: 'center', 
                                    borderBottom: '1px solid #93c5fd',
                                    borderLeft: '1px solid #9ca3af',
                                    cursor: 'pointer',
                                    height: '50px',
                                    verticalAlign: 'middle',
                                    background: item.ticked ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                  }}
                                >
                                  {item.ticked ? (
                                    <div style={{ fontSize: '32px', color: '#10B981', lineHeight: '1', userSelect: 'none' }}>
                                      ✔
                                    </div>
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', minHeight: '30px' }}></div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Finish & Save Bar */}
                      {hasTicked && (
                        <div style={{ padding: '16px 20px', background: '#F0FDF4', borderTop: '2px dashed #86EFAC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', fontFamily: 'sans-serif' }}>
                            Ready to save {activeSession.filter(s => s.ticked).length} collected payment(s)!
                          </div>
                          <button 
                            onClick={() => handleFinishAndSave(chiti.id)}
                            disabled={isSavingBatch === chiti.id}
                            style={{
                              background: '#10B981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px',
                              fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'sans-serif',
                              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            {isSavingBatch === chiti.id ? <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }} /> : <CheckCircle2 size={18} />}
                            Finish & Save to History
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Saved List / History */}
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} color="#64748B" /> Commission History
                      </h4>
                      
                      {history.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#64748B', padding: '16px', background: '#FFFFFF', borderRadius: '8px', textAlign: 'center', border: '1px dashed #CBD5E1' }}>
                          No commissions saved in history yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {history.map((entry, idx) => {
                            let displayDate = new Date(entry.date).toLocaleDateString();
                            let notesDisplay = entry.notes;
                            
                            const dateMatch = entry.notes?.match(/Date: (.*?)\. (.*)/);
                            if (dateMatch) {
                              displayDate = new Date(dateMatch[1]).toLocaleDateString();
                              notesDisplay = dateMatch[2];
                            }

                            return (
                              <div key={entry.id || idx} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>{entry.memberName || 'Unknown'}</div>
                                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <Calendar size={12} /> {displayDate}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: '#64748B' }}>Total Collected</div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#065F46' }}>{formatINR(entry.amount)}</div>
                                  </div>
                                  <CheckCircle2 size={24} color="#10B981" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', margin: '24px -16px' }}></div>

                    {/* Original Commission Ledger History */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={16} color="#7C3AED" /> Monthly Cycle Commissions
                      </h4>
                      {completedMonths.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#64748B', padding: '12px', background: '#FFFFFF', borderRadius: '8px', textAlign: 'center' }}>
                          No cycle commissions earned yet.
                        </div>
                      ) : (
                        <div className="data-table-container">
                          <table className="data-table" style={{ fontSize: '13px', width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Cycle Date</th>
                                <th>Commission</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {completedMonths.map(m => (
                                <tr key={m.id}>
                                  <td style={{ fontWeight: 700 }}>Month {m.monthNumber}</td>
                                  <td>{m.cycleDate ? new Date(m.cycleDate).toLocaleDateString() : 'N/A'}</td>
                                  <td style={{ fontWeight: 700, color: '#065F46' }}>{formatINR(m.agentCommission || 0)}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className="badge badge-success" style={{ display: 'inline-flex', gap: '4px', background: '#DCFCE7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                      <ShieldCheck size={12} /> Auto-Saved
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
