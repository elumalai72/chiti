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
  Loader2,
  Users
} from 'lucide-react';

interface AlertsViewProps {
  agentId: string;
  chitis: Chiti[];
  allMembers: Member[];
}

interface JamiliRow {
  id: string;
  memberName: string;
  jamiliName?: string;
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

  // Commission State with LocalStorage Persistence
  const [selectedChitiId, setSelectedChitiId] = useState<string>(chitis[0]?.id || '');
  const [collectionDate, setCollectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(1);
  const [jamiliRows, setJamiliRows] = useState<Record<string, JamiliRow[]>>(() => {
    try {
      const saved = localStorage.getItem('chiti_commission_draft_rows');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [savedHistory, setSavedHistory] = useState<Record<string, LedgerEntry[]>>({});
  const [enrolledMembers, setEnrolledMembers] = useState<Record<string, ChitMember[]>>({});
  const [isLoadingCommission, setIsLoadingCommission] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Save draft rows to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('chiti_commission_draft_rows', JSON.stringify(jamiliRows));
    } catch (e) {
      console.warn('Failed to save draft commission rows to localStorage', e);
    }
  }, [jamiliRows]);

  // Form Inputs
  const [inputName, setInputName] = useState('');
  const [inputJamili, setInputJamili] = useState('');
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

  // Auto-populate all enrolled members into Commission table
  const handleLoadEnrolledMembers = () => {
    if (!currentChiti || currentMembers.length === 0) {
      alert('No enrolled members found for this Chiti group.');
      return;
    }

    const defaultComm = currentChiti.rule?.commissionType === 'FIXED' 
      ? Number(currentChiti.rule.commissionValue) || 4000 
      : 4000;
    const defaultInt = 200;

    const existingNames = new Set((activeRows || []).map(r => r.memberName.toLowerCase()));
    const newRowsToAdd: JamiliRow[] = [];

    currentMembers.forEach(m => {
      if (!existingNames.has(m.fullName.toLowerCase())) {
        newRowsToAdd.push({
          id: `comm-${Date.now()}-${m.id}-${Math.random().toString(36).substring(4)}`,
          memberName: m.fullName,
          jamiliName: '',
          commission: defaultComm,
          interest: defaultInt,
          ticked: true,
          date: collectionDate
        });
      }
    });

    if (newRowsToAdd.length === 0) {
      alert('All enrolled members are already in the table.');
      return;
    }

    setJamiliRows(prev => ({
      ...prev,
      [selectedChitiId]: [...(prev[selectedChitiId] || []), ...newRowsToAdd]
    }));
  };

  // Add Member to Commission Table
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
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(4)}`,
      memberName: inputName.trim(),
      jamiliName: inputJamili.trim(),
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
    setInputJamili('');
    setInputCommission('');
    setInputInterest('');
  };

  // Update Jamili Name for an individual row
  const handleUpdateJamili = (rowId: string, newJamiliName: string) => {
    setJamiliRows(prev => ({
      ...prev,
      [selectedChitiId]: (prev[selectedChitiId] || []).map(r => 
        r.id === rowId ? { ...r, jamiliName: newJamiliName } : r
      )
    }));
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
        const jamiliPart = row.jamiliName ? `Jamili: ${row.jamiliName}. ` : '';

        return dbService.recordExtraCommission({
          agentId,
          chitiId: currentChiti.id,
          monthNumber: selectedMonthNum,
          memberId,
          memberName: row.memberName,
          commissionAmount: row.commission,
          interestAmount: row.interest,
          notes: `Date: ${row.date || collectionDate}. ${jamiliPart}Commission settlement.`
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '10px 8px 60px', width: '100%' }}>
      {/* Top Header & Tab Switcher */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              {activeTab === 'commission' ? <Award color="#7C3AED" /> : <Bell color="#F59E0B" />}
              {activeTab === 'commission' ? 'Commission Ledger' : 'Payment Due & Risk Alerts'}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px', margin: 0 }}>
              {activeTab === 'commission' 
                ? 'Manual commission & interest ledger table with Jamili tracking'
                : 'Monitor upcoming Chiti due dates and unpaid member risks'}
            </p>
          </div>

          {/* Tab Pills */}
          <div style={{ display: 'flex', background: '#E2E8F0', padding: '3px', borderRadius: '12px', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('commission')}
              style={{
                padding: '7px 14px',
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
              <Award size={15} /> Commission
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              style={{
                padding: '7px 14px',
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

      {/* TAB 1: COMMISSION (NOTEBOOK TABLE STYLE WITH STICKY COLUMN) */}
      {activeTab === 'commission' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Chiti Selector & Date Configuration Strip */}
          <div 
            className="card" 
            style={{ 
              padding: '14px 16px', 
              borderRadius: '16px', 
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Select Chiti Group
                </label>
                <select
                  value={selectedChitiId}
                  onChange={e => setSelectedChitiId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: '#F8FAFC',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '240px'
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
                      padding: '6px 10px',
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
                      padding: '7px 10px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleLoadEnrolledMembers}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px', fontSize: '12px', padding: '6px 12px', background: '#F3E8FF', borderColor: '#D8B4FE', color: '#6B21A8', fontWeight: 700 }}
                  title="Auto-fill all enrolled members of this chiti into the table"
                >
                  <Users size={14} /> Load All ({currentChiti.totalMembers})
                </button>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
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

          {/* Manual Member Entry Form with Jamili Field */}
          <div 
            className="card"
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} color="#7C3AED" /> Add Member Manually to Commission Table
            </div>

            <form onSubmit={handleAddMemberRow} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Member Name *
                </label>
                <input
                  type="text"
                  value={inputName}
                  onChange={e => setInputName(e.target.value)}
                  placeholder="Member name..."
                  list="jamili-enrolled-members"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Jamili (Guarantor)
                </label>
                <input
                  type="text"
                  value={inputJamili}
                  onChange={e => setInputJamili(e.target.value)}
                  placeholder="Jamili name (optional)..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Commission (₹) *
                </label>
                <input
                  type="number"
                  value={inputCommission}
                  onChange={e => setInputCommission(e.target.value)}
                  placeholder="e.g. 4000"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  min="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Interest (₹)
                </label>
                <input
                  type="number"
                  value={inputInterest}
                  onChange={e => setInputInterest(e.target.value)}
                  placeholder="e.g. 200"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  min="0"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '9px 14px', fontSize: '13px', fontWeight: 800, background: '#7C3AED', gap: '6px', minHeight: '38px' }}
                >
                  <Plus size={16} /> Add to Commission
                </button>
              </div>
            </form>
          </div>

          {/* STICKY NOTES / NOTEBOOK COMMISSION TABLE WITH STICKY MEMBER COLUMN */}
          <div 
            style={{
              background: '#FFFDF0', // Cream tone
              border: '2px solid #FDE047',
              borderRadius: '16px',
              padding: '14px 10px',
              boxShadow: '0 6px 20px rgba(234, 179, 8, 0.12)',
              position: 'relative',
              width: '100%'
            }}
          >
            {/* Header banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '2px dashed #FDE047', paddingBottom: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'inline-block', background: '#FEF08A', color: '#854D0E', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📝 Commission Sheet
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#713F12', margin: '4px 0 0' }}>
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
                    style={{ fontSize: '11px', background: '#FEF08A', borderColor: '#FACC15', color: '#713F12', fontWeight: 700, padding: '4px 10px' }}
                  >
                    {activeRows.every(r => r.ticked) ? 'Untick All' : 'Tick All ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* Table Content */}
            {activeRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#A16207' }}>
                <FileText size={36} color="#CA8A04" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#713F12' }}>
                  Commission Sheet is Empty
                </div>
                <p style={{ fontSize: '12.5px', margin: '4px auto 14px', maxWidth: '340px' }}>
                  Add members above or click below to load all enrolled members of {currentChiti?.name}.
                </p>
                <button
                  type="button"
                  onClick={handleLoadEnrolledMembers}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#7C3AED', gap: '6px', padding: '8px 16px' }}
                >
                  <Users size={14} /> Load All {currentChiti?.totalMembers} Enrolled Members
                </button>
              </div>
            ) : (
              <div>
                {/* Horizontal scroll wrapper for table */}
                <div style={{ overflowX: 'auto', position: 'relative', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #CA8A04', color: '#713F12', textAlign: 'left' }}>
                        {/* Sticky Member Name Column Header */}
                        <th style={{ 
                          padding: '8px 8px', 
                          position: 'sticky', 
                          left: 0, 
                          background: '#FFFDF0', 
                          zIndex: 25, 
                          borderRight: '2px solid rgba(202, 138, 4, 0.8)',
                          borderBottom: '2px solid #CA8A04',
                          minWidth: '135px',
                          maxWidth: '155px',
                          width: '145px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              Member Name
                            </span>
                            <span style={{ fontSize: '10px', color: '#854D0E', fontWeight: 600 }}>
                              ({activeRows.length})
                            </span>
                          </div>
                        </th>

                        {/* Jamili (Guarantor) Column */}
                        <th style={{ padding: '8px 8px', minWidth: '115px', borderBottom: '2px solid #CA8A04', fontSize: '12px', fontWeight: 800 }}>
                          Jamili
                        </th>

                        {/* Date */}
                        <th style={{ padding: '8px 6px', minWidth: '80px', borderBottom: '2px solid #CA8A04', fontSize: '12px', fontWeight: 800 }}>
                          Date
                        </th>

                        {/* Commission */}
                        <th style={{ padding: '8px 8px', textAlign: 'right', minWidth: '90px', borderBottom: '2px solid #CA8A04', fontSize: '12px', fontWeight: 800 }}>
                          Commission
                        </th>

                        {/* Interest */}
                        <th style={{ padding: '8px 8px', textAlign: 'right', minWidth: '80px', borderBottom: '2px solid #CA8A04', fontSize: '12px', fontWeight: 800 }}>
                          Interest
                        </th>

                        {/* Total */}
                        <th style={{ padding: '8px 8px', textAlign: 'right', minWidth: '90px', borderBottom: '2px solid #CA8A04', fontSize: '12px', fontWeight: 800 }}>
                          Total
                        </th>

                        {/* Tick Mark */}
                        <th style={{ padding: '8px 6px', textAlign: 'center', minWidth: '60px', width: '65px', borderBottom: '2px solid #CA8A04', fontSize: '12px', fontWeight: 800 }}>
                          Tick
                        </th>

                        {/* Delete */}
                        <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px', borderBottom: '2px solid #CA8A04' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRows.map((row, idx) => {
                        const rowTotal = row.commission + row.interest;
                        const isRowTicked = row.ticked;

                        return (
                          <tr 
                            key={row.id} 
                            style={{ 
                              borderBottom: '1px solid #FEF08A',
                              background: isRowTicked ? 'rgba(254, 240, 138, 0.45)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {/* Sticky Member Name Cell - stays pinned during horizontal scroll */}
                            <td style={{ 
                              padding: '5px 8px', 
                              position: 'sticky', 
                              left: 0, 
                              background: isRowTicked ? '#FEF7CD' : '#FFFDF0', 
                              zIndex: 20, 
                              borderRight: '2px solid rgba(202, 138, 4, 0.8)', // Dividing line
                              borderBottom: '1px solid #FEF08A',
                              fontWeight: 700, 
                              color: '#713F12',
                              fontSize: '12px',
                              verticalAlign: 'middle'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '11px', color: '#854D0E', fontWeight: 700, width: '18px', flexShrink: 0, textAlign: 'right' }}>
                                  {idx + 1}
                                </span>
                                <span style={{ 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  minWidth: 0
                                }} title={row.memberName}>
                                  {row.memberName}
                                </span>
                              </div>
                            </td>

                            {/* Jamili Name Column Cell - with direct manual edit input */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }}>
                              <input 
                                type="text"
                                value={row.jamiliName || ''}
                                onChange={(e) => handleUpdateJamili(row.id, e.target.value)}
                                placeholder="Enter Jamili..."
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #FDE047',
                                  background: '#FFFFFF',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: '#713F12',
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Date */}
                            <td style={{ padding: '5px 6px', color: '#854D0E', fontSize: '11.5px', whiteSpace: 'nowrap', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }}>
                              {row.date || collectionDate}
                            </td>

                            {/* Commission */}
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#15803D', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }} className="tabular-nums">
                              {formatINR(row.commission)}
                            </td>

                            {/* Interest */}
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#B45309', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }} className="tabular-nums">
                              {formatINR(row.interest)}
                            </td>

                            {/* Total */}
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 900, color: '#713F12', fontSize: '13px', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }} className="tabular-nums">
                              {formatINR(rowTotal)}
                            </td>

                            {/* Tick Mark Button */}
                            <td style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleTick(row.id)}
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '8px',
                                  border: isRowTicked ? '2px solid #16A34A' : '2px dashed #CA8A04',
                                  background: isRowTicked ? '#16A34A' : '#FEF9C3',
                                  color: isRowTicked ? '#FFFFFF' : '#CA8A04',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  boxShadow: isRowTicked ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                title={isRowTicked ? 'Ticked (Collected)' : 'Click to tick'}
                              >
                                {isRowTicked ? <Check size={16} strokeWidth={3} /> : <span style={{ fontSize: '10px' }}>✕</span>}
                              </button>
                            </td>

                            {/* Delete Button */}
                            <td style={{ padding: '4px 2px', textAlign: 'center', borderBottom: '1px solid #FEF08A', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', opacity: 0.6, padding: '4px' }}
                                title="Remove row"
                              >
                                <Trash2 size={13} />
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
                    gap: '12px', 
                    marginTop: '16px', 
                    padding: '12px 14px', 
                    background: '#FEF08A', 
                    borderRadius: '12px',
                    border: '1px solid #FACC15'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 700 }}>Ticked Members</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#713F12' }}>
                        {activeRows.filter(r => r.ticked).length} of {activeRows.length}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 700 }}>Commission Total</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803D' }} className="tabular-nums">
                        {formatINR(totalCommAmt)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 700 }}>Interest Total</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#B45309' }} className="tabular-nums">
                        {formatINR(totalIntAmt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#854D0E', textTransform: 'uppercase', fontWeight: 800 }}>Grand Full Amount</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#713F12' }} className="tabular-nums">
                      {formatINR(grandTotal)}
                    </div>
                  </div>
                </div>

                {/* FINISH COMMISSION BUTTON */}
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleFinishCommission}
                    disabled={isFinishing || grandTotal <= 0}
                    className="btn btn-primary btn-lg btn-block"
                    style={{
                      background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      borderColor: '#16A34A',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: 800,
                      boxShadow: '0 6px 20px rgba(22, 163, 74, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isFinishing ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Saving to Financial History...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        <span>🏁 FINISHED THE COMMISSION OF THIS MONTH ({formatINR(grandTotal)})</span>
                      </>
                    )}
                  </button>
                  <div style={{ fontSize: '11px', color: '#854D0E', marginTop: '5px' }}>
                    Saves to auditable Financial History with Chiti name, collection date, Jamili names, and full amount.
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
