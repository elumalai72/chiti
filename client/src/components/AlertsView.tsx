import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { Chiti, Member, ChitMember, LedgerEntry } from '../types';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  Award, 
  Layers, 
  Plus, 
  Calendar, 
  Check, 
  Trash2, 
  CheckCircle2, 
  Search, 
  FileText, 
  DollarSign, 
  Loader2 
} from 'lucide-react';

interface AlertsViewProps {
  agentId: string;
  chitis: Chiti[];
  allMembers: Member[];
}

interface JamiliRow {
  id: string;
  memberName: string;
  commission: number;
  interest: number;
  ticked: boolean;
  date: string;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ agentId, chitis, allMembers }) => {
  const [activeTab, setActiveTab] = useState<'commission' | 'alerts'>('commission');

  // Risk & Alerts State
  const [upcomingChitis, setUpcomingChitis] = useState<{chiti: Chiti, days: number}[]>([]);
  const [unpaidMembers, setUnpaidMembers] = useState<any[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  // Commission Jamili State
  const [selectedChitiId, setSelectedChitiId] = useState<string>(chitis[0]?.id || '');
  const [collectionDate, setCollectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(1);
  const [jamiliRows, setJamiliRows] = useState<Record<string, JamiliRow[]>>({});
  const [savedHistory, setSavedHistory] = useState<Record<string, LedgerEntry[]>>({});
  const [enrolledMembers, setEnrolledMembers] = useState<Record<string, ChitMember[]>>({});
  const [isLoadingCommission, setIsLoadingCommission] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Form Inputs
  const [inputName, setInputName] = useState('');
  const [inputCommission, setInputCommission] = useState('');
  const [inputInterest, setInputInterest] = useState('');

  // 1. Load Risk Alerts
  useEffect(() => {
    async function loadAlerts() {
      setIsLoadingAlerts(true);
      try {
        const today = new Date();
        const currentDay = today.getDate();
        
        const upcoming: {chiti: Chiti, days: number}[] = [];
        for (const c of chitis) {
          let daysDiff = c.paymentDueDay - currentDay;
          if (daysDiff < 0) daysDiff += 30;
          if (daysDiff >= 0 && daysDiff <= 7) {
            upcoming.push({ chiti: c, days: daysDiff });
          }
        }
        setUpcomingChitis(upcoming.sort((a, b) => a.days - b.days));

        const membersPerChiti = await Promise.all(chitis.map(async (c) => {
          const members = await dbService.getChitMembers(c.id);
          return { chiti: c, members };
        }));

        const unpaid = [];
        for (const item of membersPerChiti) {
          for (const m of item.members) {
            if (m.pendingAmount > 0) {
              const fullMem = allMembers.find(mem => mem.id === m.memberId);
              if (fullMem) {
                unpaid.push({
                  member: fullMem,
                  chitiName: item.chiti.name,
                  pendingAmount: m.pendingAmount
                });
              }
            }
          }
        }
        setUnpaidMembers(unpaid.sort((a, b) => b.pendingAmount - a.pendingAmount));
      } catch (err) {
        console.error('Failed to load alerts', err);
      } finally {
        setIsLoadingAlerts(false);
      }
    }
    loadAlerts();
  }, [chitis, allMembers]);

  // 2. Load Commission Data for Selected Chiti
  useEffect(() => {
    if (!selectedChitiId) return;

    async function loadCommissionData() {
      setIsLoadingCommission(true);
      try {
        const [members, history] = await Promise.all([
          dbService.getChitMembers(selectedChitiId),
          dbService.getExtraCommissionsByChiti(selectedChitiId)
        ]);

        setEnrolledMembers(prev => ({ ...prev, [selectedChitiId]: members }));
        setSavedHistory(prev => ({ ...prev, [selectedChitiId]: history }));

        const c = chitis.find(item => item.id === selectedChitiId);
        if (c) {
          setSelectedMonthNum(c.currentMonth || 1);
        }
      } catch (err) {
        console.error('Failed to load commission data', err);
      } finally {
        setIsLoadingCommission(false);
      }
    }
    loadCommissionData();
  }, [selectedChitiId]);

  const currentChiti = chitis.find(c => c.id === selectedChitiId) || chitis[0];
  const activeRows = (selectedChitiId && jamiliRows[selectedChitiId]) || [];
  const activeHistory = (selectedChitiId && savedHistory[selectedChitiId]) || [];
  const currentMembers = (selectedChitiId && enrolledMembers[selectedChitiId]) || [];

  // Add Member to Jamili Table
  const handleAddMemberRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) {
      alert('Please enter member name.');
      return;
    }
    const comm = Number(inputCommission) || 0;
    const intVal = Number(inputInterest) || 0;

    if (comm <= 0 && intVal <= 0) {
      alert('Please enter a commission or interest amount.');
      return;
    }

    const newRow: JamiliRow = {
      id: `jamili-${Date.now()}-${Math.random().toString(36).substring(4)}`,
      memberName: inputName.trim(),
      commission: comm,
      interest: intVal,
      ticked: true, // ticked by default on adding
      date: collectionDate
    };

    setJamiliRows(prev => ({
      ...prev,
      [selectedChitiId]: [...(prev[selectedChitiId] || []), newRow]
    }));

    setInputName('');
    setInputCommission('');
    setInputInterest('');
  };

  // Toggle Tick Mark for a Member Row
  const handleToggleTick = (rowId: string) => {
    setJamiliRows(prev => ({
      ...prev,
      [selectedChitiId]: (prev[selectedChitiId] || []).map(r => 
        r.id === rowId ? { ...r, ticked: !r.ticked } : r
      )
    }));
  };

  // Remove Row from Table
  const handleRemoveRow = (rowId: string) => {
    setJamiliRows(prev => ({
      ...prev,
      [selectedChitiId]: (prev[selectedChitiId] || []).filter(r => r.id !== rowId)
    }));
  };

  // Finish Commission of this Month and save to History
  const handleFinishCommission = async () => {
    if (!currentChiti) return;
    const tickedRows = activeRows.filter(r => r.ticked);

    if (tickedRows.length === 0) {
      alert('Please tick (mark checked) at least one member row to finish commission.');
      return;
    }

    const totalAmt = tickedRows.reduce((sum, r) => sum + r.commission + r.interest, 0);

    const confirmed = confirm(
      `Finish Commission for "${currentChiti.name}" for ${tickedRows.length} member(s)?\n` +
      `Date: ${collectionDate}\n` +
      `Total Amount: ₹${totalAmt.toLocaleString('en-IN')}\n\n` +
      `This will be permanently saved to your financial history.`
    );

    if (!confirmed) return;

    setIsFinishing(true);
    try {
      await Promise.all(tickedRows.map(row => {
        const matched = currentMembers.find(m => m.fullName.toLowerCase() === row.memberName.toLowerCase());
        const memberId = matched ? matched.memberId : '00000000-0000-0000-0000-000000000000';

        return dbService.recordExtraCommission({
          agentId,
          chitiId: currentChiti.id,
          monthNumber: selectedMonthNum,
          memberId,
          memberName: row.memberName,
          commissionAmount: row.commission,
          interestAmount: row.interest,
          notes: `Date: ${row.date || collectionDate}. Jamili settlement.`
        });
      }));

      alert(`Commission of ₹${totalAmt.toLocaleString('en-IN')} successfully saved to Financial History!`);

      // Keep only unticked rows in draft
      setJamiliRows(prev => ({
        ...prev,
        [selectedChitiId]: activeRows.filter(r => !r.ticked)
      }));

      // Refresh history from DB
      const freshHistory = await dbService.getExtraCommissionsByChiti(currentChiti.id);
      setSavedHistory(prev => ({ ...prev, [selectedChitiId]: freshHistory }));
    } catch (err: any) {
      alert(`Failed to save commission: ${err.message || 'Error occurred'}`);
    } finally {
      setIsFinishing(false);
    }
  };

  // Calculations for active sticky note table
  const totalCommAmt = activeRows.reduce((sum, r) => sum + (r.ticked ? r.commission : 0), 0);
  const totalIntAmt = activeRows.reduce((sum, r) => sum + (r.ticked ? r.interest : 0), 0);
  const grandTotal = totalCommAmt + totalIntAmt;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px', width: '100%' }}>
      {/* Top Header & Tab Switcher */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              {activeTab === 'commission' ? <Award color="#7C3AED" /> : <Bell color="#F59E0B" />}
              {activeTab === 'commission' ? 'Commission Jamili' : 'Payment Due & Risk Alerts'}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              {activeTab === 'commission' 
                ? 'Sticky-notes style manual commission & interest ledger table'
                : 'Monitor upcoming Chiti due dates and unpaid member risks'}
            </p>
          </div>

          {/* Tab Pills */}
          <div style={{ display: 'flex', background: '#E2E8F0', padding: '3px', borderRadius: '12px', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('commission')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'commission' ? '#7C3AED' : 'transparent',
                color: activeTab === 'commission' ? '#FFFFFF' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Award size={15} /> Commission Jamili
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'alerts' ? '#F59E0B' : 'transparent',
                color: activeTab === 'alerts' ? '#FFFFFF' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Bell size={15} /> Due & Risks ({upcomingChitis.length + unpaidMembers.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: COMMISSION JAMILI (STICKY NOTES TABLE STYLE) */}
      {activeTab === 'commission' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Chiti Selector & Date Configuration Strip */}
          <div 
            className="card" 
            style={{ 
              padding: '16px 20px', 
              borderRadius: '18px', 
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Select Chiti Group
                </label>
                <select
                  value={selectedChitiId}
                  onChange={e => setSelectedChitiId(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: '#F8FAFC',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '220px'
                  }}
                >
                  {chitis.map(c => (
                    <option key={c.id} value={c.id}>
                      📌 {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Collection Date
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="#7C3AED" />
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={e => setCollectionDate(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#F8FAFC'
                    }}
                  />
                </div>
              </div>

              {currentChiti && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Month Cycle
                  </label>
                  <select
                    value={selectedMonthNum}
                    onChange={e => setSelectedMonthNum(Number(e.target.value))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: '#F8FAFC'
                    }}
                  >
                    {Array.from({ length: currentChiti.durationMonths }, (_, i) => i + 1).map(mNum => (
                      <option key={mNum} value={mNum}>
                        Month {mNum}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {currentChiti && (
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-primary" style={{ background: '#7C3AED', color: '#FFF', fontSize: '11px' }}>
                  {currentChiti.totalMembers} Enrolled Members
                </span>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Fixed Comm: {currentChiti.rule?.commissionType === 'FIXED' ? formatINR(currentChiti.rule.commissionValue) : `${currentChiti.rule?.commissionValue || 0}%`}
                </div>
              </div>
            )}
          </div>

          {/* Datalist for fast member name suggestions */}
          <datalist id="jamili-enrolled-members">
            {currentMembers.map(m => (
              <option key={m.id} value={m.fullName}>
                #{m.memberNumber} - {m.fullName} ({m.phone})
              </option>
            ))}
          </datalist>

          {/* Manual Member Entry Form */}
          <div 
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF'
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#7C3AED" /> Add Member Manually to Jamili Table
            </div>

            <form onSubmit={handleAddMemberRow} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Member Name *
                </label>
                <input
                  type="text"
                  value={inputName}
                  onChange={e => setInputName(e.target.value)}
                  placeholder="Select or enter member name..."
                  list="jamili-enrolled-members"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Commission Amount (₹) *
                </label>
                <input
                  type="number"
                  value={inputCommission}
                  onChange={e => setInputCommission(e.target.value)}
                  placeholder="e.g. 500"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  min="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Interest Amount (₹)
                </label>
                <input
                  type="number"
                  value={inputInterest}
                  onChange={e => setInputInterest(e.target.value)}
                  placeholder="e.g. 200 (optional)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  min="0"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 18px', fontSize: '13px', fontWeight: 800, background: '#7C3AED', gap: '6px' }}
                >
                  <Plus size={16} /> Add to Jamili
                </button>
              </div>
            </form>
          </div>

          {/* STICKY NOTES / NOTEBOOK JAMILI TABLE */}
          <div 
            style={{
              background: '#FFFDF0', // Sticky notes / ruled paper cream tone
              border: '2px solid #FDE047',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 8px 24px rgba(234, 179, 8, 0.15)',
              position: 'relative'
            }}
          >
            {/* Header banner resembling yellow sticky note header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '2px dashed #FDE047', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'inline-block', background: '#FEF08A', color: '#854D0E', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📝 Sticky-Notes Jamili Sheet
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#713F12', margin: '4px 0 0' }}>
                  {currentChiti?.name} • Month {selectedMonthNum} ({collectionDate})
                </h2>
              </div>

              {activeRows.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const allTicked = activeRows.every(r => r.ticked);
                      setJamiliRows(prev => ({
                        ...prev,
                        [selectedChitiId]: activeRows.map(r => ({ ...r, ticked: !allTicked }))
                      }));
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', background: '#FEF08A', borderColor: '#FACC15', color: '#713F12', fontWeight: 700 }}
                  >
                    {activeRows.every(r => r.ticked) ? 'Untick All' : 'Tick All ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* Table Content */}
            {activeRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#A16207' }}>
                <FileText size={40} color="#CA8A04" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#713F12' }}>
                  Jamili Sheet is Empty
                </div>
                <p style={{ fontSize: '13px', margin: '6px auto 0', maxWidth: '360px' }}>
                  Add members above to track collected commission and interest for {currentChiti?.name}.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #CA8A04', color: '#713F12', textAlign: 'left' }}>
                        <th style={{ padding: '10px 8px', width: '36px' }}>#</th>
                        <th style={{ padding: '10px 12px' }}>Member Name</th>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Commission</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Interest</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Tick Mark</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRows.map((row, idx) => {
                        const rowTotal = row.commission + row.interest;
                        return (
                          <tr 
                            key={row.id} 
                            style={{ 
                              borderBottom: '1px solid #FEF08A',
                              background: row.ticked ? 'rgba(254, 240, 138, 0.4)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '10px 8px', color: '#854D0E', fontWeight: 700 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#713F12' }}>
                              {row.memberName}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#A16207', fontSize: '12px' }}>
                              {row.date || collectionDate}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#15803D' }} className="tabular-nums">
                              {formatINR(row.commission)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#B45309' }} className="tabular-nums">
                              {formatINR(row.interest)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#713F12', fontSize: '15px' }} className="tabular-nums">
                              {formatINR(rowTotal)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleTick(row.id)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: row.ticked ? '2px solid #16A34A' : '2px dashed #CA8A04',
                                  background: row.ticked ? '#16A34A' : '#FEF9C3',
                                  color: row.ticked ? '#FFFFFF' : '#CA8A04',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  boxShadow: row.ticked ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                title={row.ticked ? 'Ticked (Collected)' : 'Click to tick'}
                              >
                                {row.ticked ? <Check size={18} strokeWidth={3} /> : <span style={{ fontSize: '11px' }}>✕</span>}
                              </button>
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', opacity: 0.6 }}
                                title="Remove row"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sticky Note Live Totalizer Strip */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '14px', 
                    marginTop: '20px', 
                    padding: '16px', 
                    background: '#FEF08A', 
                    borderRadius: '14px',
                    border: '1px solid #FACC15'
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 700 }}>Ticked Members</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#713F12' }}>
                        {activeRows.filter(r => r.ticked).length} of {activeRows.length}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 700 }}>Commission Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803D' }} className="tabular-nums">
                        {formatINR(totalCommAmt)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 700 }}>Interest Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#B45309' }} className="tabular-nums">
                        {formatINR(totalIntAmt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 800 }}>Grand Full Amount</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#713F12' }} className="tabular-nums">
                      {formatINR(grandTotal)}
                    </div>
                  </div>
                </div>

                {/* FINISH COMMISSION BUTTON */}
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleFinishCommission}
                    disabled={isFinishing || grandTotal <= 0}
                    className="btn btn-primary btn-lg btn-block"
                    style={{
                      background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      borderColor: '#16A34A',
                      padding: '14px 24px',
                      fontSize: '15px',
                      fontWeight: 800,
                      boxShadow: '0 8px 24px rgba(22, 163, 74, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    {isFinishing ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        <span>Saving to Financial History...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>🏁 FINISHED THE COMMISSION OF THIS MONTH ({formatINR(grandTotal)})</span>
                      </>
                    )}
                  </button>
                  <div style={{ fontSize: '12px', color: '#854D0E', marginTop: '6px' }}>
                    Saves to auditable Financial History with Chiti name, collection date, and full amount.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FINISHED MONTHLY COMMISSIONS HISTORY ARCHIVE */}
          <div 
            className="card"
            style={{
              padding: '20px',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Finished Commissions History ({activeHistory.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Archived monthly commission records for {currentChiti?.name}
                </p>
              </div>

              {activeHistory.length > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Earned</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }} className="tabular-nums">
                    {formatINR(activeHistory.reduce((s, h) => s + h.amount, 0))}
                  </div>
                </div>
              )}
            </div>

            {isLoadingCommission ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Loader2 size={24} className="spin" color="#7C3AED" style={{ margin: '0 auto' }} />
              </div>
            ) : activeHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748B', background: '#F8FAFC', borderRadius: '12px', fontSize: '13px' }}>
                No finished commission records yet. Finished sessions will be logged here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeHistory.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                        {item.memberName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {item.notes || 'Commission settlement'} • {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, textTransform: 'uppercase' }}>Collected</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }} className="tabular-nums">
                        {formatINR(item.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: PAYMENT DUE & FINANCIAL RISKS ALERTS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isLoadingAlerts ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Section 1: Upcoming Dates */}
              <section>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={18} color="#7C3AED" /> Upcoming Due Dates (Next 7 Days)
                </h2>
                {upcomingChitis.length === 0 ? (
                  <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No Chitis due in the next 7 days.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {upcomingChitis.map((item, idx) => (
                      <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #7C3AED' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>{item.chiti.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>Due on {item.chiti.paymentDueDay}th of month</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-violet">
                            {item.days === 0 ? 'Due Today!' : `In ${item.days} days`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section 2: Financial Risks (Unpaid Members) */}
              <section>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} color="#EF4444" /> Unpaid Members Risk ({unpaidMembers.length})
                </h2>
                {unpaidMembers.length === 0 ? (
                  <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#10B981', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <AlertCircle size={32} color="#10B981" style={{ marginBottom: '8px' }} />
                    All members are fully paid up! No pending risks.
                  </div>
                ) : (
                  <div className="mobile-card-list">
                    {unpaidMembers.map((item, idx) => (
                      <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #EF4444', padding: '12px', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>{item.member.fullName}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>Group: {item.chitiName}</div>
                          {item.member.phone && (
                            <div style={{ fontSize: '11px', color: '#7C3AED', marginTop: '4px' }}>
                              <a href={`tel:${item.member.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>📞 {item.member.phone}</a>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>Pending</div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626' }} className="tabular-nums">
                            {formatINR(item.pendingAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
};
