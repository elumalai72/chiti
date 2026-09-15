import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Chiti, ChitMember, ChitMonth, Payment } from '../types';
import { Loader2, Check, Trophy, Search, X } from 'lucide-react';

interface MasterCollectionSheetProps {
  chiti: Chiti;
}

const getCalculatedDate = (startDate: string, monthNumber: number) => {
  if (!startDate) return '';
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + (monthNumber - 1));
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const MasterCollectionSheet: React.FC<MasterCollectionSheetProps> = ({ chiti }) => {
  const [members, setMembers] = useState<ChitMember[]>([]);
  const [months, setMonths] = useState<ChitMonth[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Chiti Taken Feature State
  const [selectedMemberForTaken, setSelectedMemberForTaken] = useState<ChitMember | null>(null);
  const [isTakenModalOpen, setIsTakenModalOpen] = useState(false);
  const [takenMonthSelect, setTakenMonthSelect] = useState<number>(1);
  const [isSavingTaken, setIsSavingTaken] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersData, monthsData, paymentsData] = await Promise.all([
        dbService.getChitMembers(chiti.id),
        dbService.getChitMonths(chiti.id),
        dbService.getAllPaymentsForChiti(chiti.id)
      ]);
      
      setMembers(membersData.sort((a, b) => a.memberNumber - b.memberNumber));
      setMonths(monthsData.sort((a, b) => a.monthNumber - b.monthNumber));
      setPayments(paymentsData);
    } catch (error) {
      console.error('Failed to load master sheet data', error);
      alert('Failed to load master collection sheet data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [chiti.id]);

  // Payment Lookup Map: `${monthNumber}_${memberId}` -> Payment object(s)
  const paymentMap = useMemo(() => {
    const map: Record<string, { totalPaid: number, records: Payment[] }> = {};
    for (const p of payments) {
      const key = `${p.monthNumber}_${p.memberId}`;
      if (!map[key]) {
        map[key] = { totalPaid: 0, records: [] };
      }
      map[key].totalPaid += p.amountPaid;
      map[key].records.push(p);
    }
    return map;
  }, [payments]);

  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [isProcessingBatch, setIsProcessingBatch] = useState<number | null>(null);

  const handleOpenTakenModal = (member?: ChitMember) => {
    const target = member || (filteredMembers.length > 0 ? filteredMembers[0] : members[0]) || null;
    setSelectedMemberForTaken(target);
    setTakenMonthSelect(target?.wonMonth || 1);
    setIsTakenModalOpen(true);
  };

  const handleSaveTakenStatus = async (hasTaken: boolean, monthNum?: number) => {
    if (!selectedMemberForTaken) return;
    setIsSavingTaken(true);
    const targetMember = selectedMemberForTaken;
    const finalMonth = hasTaken ? (monthNum || takenMonthSelect || 1) : undefined;

    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.id === targetMember.id) {
        return {
          ...m,
          hasWonAuction: hasTaken,
          wonMonth: finalMonth
        };
      }
      return m;
    }));

    if (hasTaken) {
      setSelectedMemberForTaken(prev => prev ? { ...prev, hasWonAuction: true, wonMonth: finalMonth } : null);
    } else {
      setSelectedMemberForTaken(prev => prev ? { ...prev, hasWonAuction: false, wonMonth: undefined } : null);
    }

    try {
      await dbService.updateChitMemberTakenStatus({
        chitiId: chiti.id,
        memberId: targetMember.memberId,
        hasTaken,
        wonMonth: finalMonth
      });
      setIsTakenModalOpen(false);
    } catch (err: any) {
      console.error('Failed to update taken status', err);
      alert(`Failed to save: ${err.message || 'Error occurred'}`);
      const freshMembers = await dbService.getChitMembers(chiti.id, true);
      setMembers(freshMembers);
    } finally {
      setIsSavingTaken(false);
    }
  };

  const handleToggleAllPaid = async (monthNum: number) => {
    if (isProcessingBatch !== null) return;
    const month = months.find(m => m.monthNumber === monthNum);
    if (!month) return;

    const totalDueForMonth = chiti.monthlyContribution - ((month as any)?.memberDividendCredit || 0);
    const unpaidMembers = members.filter(m => {
      const pData = paymentMap[`${monthNum}_${m.memberId}`];
      return !pData || pData.totalPaid < totalDueForMonth;
    });

    const isAllPaid = unpaidMembers.length === 0;

    if (isAllPaid) {
      // Prompt to unmark all
      if (!confirm(`All members are already marked paid for Month ${monthNum} (${getCalculatedDate(chiti.startDate, monthNum)}). Do you want to unmark ALL members for this month?`)) {
        return;
      }
      setIsProcessingBatch(monthNum);
      const previousPayments = [...payments];
      
      const recordsToRemove: Payment[] = [];
      members.forEach(m => {
        const pData = paymentMap[`${monthNum}_${m.memberId}`];
        if (pData && pData.records) {
          recordsToRemove.push(...pData.records);
        }
      });
      const recordIdsToRemove = new Set(recordsToRemove.map(r => r.id));

      // Optimistic removal (0ms UI update)
      setPayments(prev => prev.filter(p => !recordIdsToRemove.has(p.id)));

      try {
        await Promise.all(recordsToRemove.map(r => 
          dbService.reversePayment({
            agentId: chiti.agentId,
            paymentId: r.id,
            reason: `Batch unmark for Month ${monthNum}`
          })
        ));
      } catch (err: any) {
        setPayments(previousPayments);
        alert(`Failed to unmark all: ${err.message || 'Error occurred'}`);
      } finally {
        setIsProcessingBatch(null);
      }
    } else {
      // Mark all unpaid members as paid
      if (!confirm(`Mark ALL ${unpaidMembers.length} unpaid members as Paid for Month ${monthNum} (${getCalculatedDate(chiti.startDate, monthNum)})?`)) {
        return;
      }
      setIsProcessingBatch(monthNum);

      const newTempPayments: Payment[] = [];
      const paymentPromises: Promise<any>[] = [];

      unpaidMembers.forEach(member => {
        const pData = paymentMap[`${monthNum}_${member.memberId}`] || { totalPaid: 0 };
        const pendingAmount = Math.max(0, totalDueForMonth - pData.totalPaid);
        if (pendingAmount <= 0) return;

        const tempId = `temp-batch-${Date.now()}-${member.memberId}-${monthNum}`;
        const optimisticPayment: Payment = {
          id: tempId,
          agentId: chiti.agentId,
          chitiId: chiti.id,
          chitMonthId: month.id,
          monthNumber: monthNum,
          memberId: member.memberId,
          memberName: member.fullName,
          memberNumber: member.memberNumber,
          amountDue: totalDueForMonth,
          amountPaid: pendingAmount,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'CASH',
          status: 'PAID',
          receiptNumber: '',
          notes: 'Batch Marked via Notebook Sheet'
        };
        newTempPayments.push(optimisticPayment);

        paymentPromises.push(
          dbService.recordPayment({
            agentId: chiti.agentId,
            chitiId: chiti.id,
            chitMonthId: month.id,
            monthNumber: monthNum,
            memberId: member.memberId,
            amountPaid: pendingAmount,
            paymentMethod: 'CASH',
            notes: 'Batch Marked via Notebook Sheet'
          }).then(res => ({ tempId, actualPayment: res.payment }))
        );
      });

      // Instant optimistic UI update
      setPayments(prev => [...prev, ...newTempPayments]);

      try {
        const results = await Promise.all(paymentPromises);
        const resultMap = new Map(results.map(r => [r.tempId, r.actualPayment]));
        setPayments(prev => prev.map(p => resultMap.get(p.id) || p));
      } catch (err: any) {
        console.error('Batch payment recording error', err);
        const fresh = await dbService.getAllPaymentsForChiti(chiti.id);
        setPayments(fresh);
        alert(`Some payments may not have saved: ${err.message || 'Error occurred'}`);
      } finally {
        setIsProcessingBatch(null);
      }
    }
  };

  const handleTogglePayment = async (member: ChitMember, month: ChitMonth) => {
    const key = `${month.monthNumber}_${member.memberId}`;
    if (pendingKeys.has(key)) return; // Prevent double-tap on same cell

    const paymentData = paymentMap[key] || { totalPaid: 0, records: [] };
    const totalDueForMonth = chiti.monthlyContribution - ((month as any).memberDividendCredit || 0);
    const isPaid = paymentData.totalPaid >= totalDueForMonth;

    if (isPaid) {
      // Trying to uncheck. Ensure next month is NOT checked.
      const nextMonthKey = `${month.monthNumber + 1}_${member.memberId}`;
      const nextMonthPaymentData = paymentMap[nextMonthKey] || { totalPaid: 0 };
      const isNextPaid = nextMonthPaymentData.totalPaid > 0;
      
      if (isNextPaid) {
        alert(`You must uncheck Month ${month.monthNumber + 1} before unchecking Month ${month.monthNumber}.`);
        return;
      }

      if (confirm(`Remove payment for ${member.fullName} in Month ${month.monthNumber}?`)) {
        // 1. Optimistic removal (Instant 0ms UI update)
        const previousPayments = [...payments];
        const recordIds = new Set(paymentData.records.map(r => r.id));
        setPayments(prev => prev.filter(p => !recordIds.has(p.id)));

        setPendingKeys(prev => new Set(prev).add(key));
        try {
          for (const record of paymentData.records) {
            await dbService.reversePayment({
              agentId: chiti.agentId,
              paymentId: record.id,
              reason: 'Notebook toggle unmark'
            });
          }
        } catch (err: any) {
          // Revert optimistic update on failure
          setPayments(previousPayments);
          alert(err.message || 'Failed to remove payment. Reverting.');
        } finally {
          setPendingKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      }
    } else {
      // Trying to check. If previous month is not paid, ask for confirmation
      if (month.monthNumber > 1) {
        const prevMonthKey = `${month.monthNumber - 1}_${member.memberId}`;
        const prevMonthPaymentData = paymentMap[prevMonthKey] || { totalPaid: 0 };
        const isPrevPaid = prevMonthPaymentData.totalPaid > 0;
        
        if (!isPrevPaid) {
          const proceed = confirm(`Month ${month.monthNumber - 1} is not marked as paid for ${member.fullName}. Do you still want to mark Month ${month.monthNumber}?`);
          if (!proceed) return;
        }
      }

      const pendingAmount = Math.max(0, totalDueForMonth - paymentData.totalPaid);
      if (pendingAmount <= 0) return;

      // 1. Optimistic addition (Instant 0ms UI update)
      const tempId = `temp-${Date.now()}-${member.memberId}-${month.monthNumber}`;
      const optimisticPayment: Payment = {
        id: tempId,
        agentId: chiti.agentId,
        chitiId: chiti.id,
        chitMonthId: month.id,
        monthNumber: month.monthNumber,
        memberId: member.memberId,
        memberName: member.fullName,
        memberNumber: member.memberNumber,
        amountDue: totalDueForMonth,
        amountPaid: pendingAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CASH',
        status: 'PAID',
        receiptNumber: '',
        notes: 'Marked via Notebook Sheet'
      };

      setPayments(prev => [...prev, optimisticPayment]);
      setPendingKeys(prev => new Set(prev).add(key));

      try {
        const result = await dbService.recordPayment({
          agentId: chiti.agentId,
          chitiId: chiti.id,
          chitMonthId: month.id,
          monthNumber: month.monthNumber,
          memberId: member.memberId,
          amountPaid: pendingAmount,
          paymentMethod: 'CASH',
          notes: 'Marked via Notebook Sheet'
        });
        // Replace temp payment with actual database payment
        setPayments(prev => prev.map(p => p.id === tempId ? result.payment : p));
      } catch (err: any) {
        // Revert on failure
        setPayments(prev => prev.filter(p => p.id !== tempId));
        alert(err.message || 'Failed to record payment. Please try again.');
      } finally {
        setPendingKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0', minHeight: '300px' }}>
        <Loader2 size={32} className="spin" color="#7C3AED" />
      </div>
    );
  }

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.memberNumber.toString().includes(searchQuery)
  );

  const takenCount = members.filter(m => m.hasWonAuction).length;

  return (
    <div style={{ width: '100%', background: '#FFFFFF', minHeight: '100vh', padding: 0 }}>
      {/* Search & Action Bar - Compact and mobile flush */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '8px', 
        padding: '8px 10px',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '300px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search member..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '6px 10px 6px 30px', 
              borderRadius: '8px', 
              border: '1px solid #CBD5E1', 
              fontSize: '13px',
              background: '#FFFFFF',
              outline: 'none'
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => handleOpenTakenModal()}
          className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
            borderColor: '#B45309',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
            flexShrink: 0,
            minHeight: '34px'
          }}
          title="Mark which member has taken the chiti amount that month"
        >
          <Trophy size={14} /> <span>Mark Taken</span>
        </button>
      </div>

      {/* Legend / Status Sub-bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '5px 10px', 
        background: '#F1F5F9', 
        borderBottom: '1px solid #CBD5E1',
        fontSize: '11px',
        color: '#64748B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'rgba(236, 72, 153, 0.25)', border: '1px solid #F472B6' }} />
            <span>Regular</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#FDE68A', border: '1px solid #F59E0B' }} />
            <span style={{ color: '#92400E', fontWeight: 700 }}>🏆 Taken Chiti</span>
          </span>
        </div>
        <div style={{ fontWeight: 700, color: '#334155' }}>
          {takenCount} of {members.length} Taken
        </div>
      </div>

      {/* Ledger Table Container - Edge-to-Edge with Sticky Column */}
      <div style={{ overflowX: 'auto', position: 'relative', width: '100%', background: '#FFFFFF', paddingBottom: '90px' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'separate', 
          borderSpacing: 0, 
          position: 'relative', 
          zIndex: 2, 
          fontFamily: '"Times New Roman", Times, serif' 
        }}>
          <thead>
            <tr>
              {/* Sticky Name Column Header */}
              <th style={{ 
                padding: '4px 6px', 
                textAlign: 'left', 
                minWidth: '135px', 
                maxWidth: '160px',
                width: '145px',
                verticalAlign: 'bottom', 
                borderBottom: '2px solid #1F2937', 
                position: 'sticky', 
                left: 0, 
                background: '#FFFFFF', 
                zIndex: 30, 
                borderRight: '2px solid rgba(239, 68, 68, 0.85)' // Classic red ledger line
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingLeft: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1F2937', letterSpacing: '0.5px' }}>
                    NAME
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, fontFamily: 'sans-serif' }}>
                    ({filteredMembers.length})
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#94A3B8', paddingLeft: '2px', marginTop: '2px', fontFamily: 'sans-serif', fontWeight: 500 }}>
                  Tap name to mark 🏆
                </div>
              </th>

              {/* Month Date Columns */}
              {Array.from({ length: chiti.durationMonths }, (_, i) => i + 1).map(monthNum => {
                const m = months.find(item => item.monthNumber === monthNum);
                const totalDueForMonth = chiti.monthlyContribution - ((m as any)?.memberDividendCredit || 0);
                const paidCount = members.filter(mem => {
                  const p = paymentMap[`${monthNum}_${mem.memberId}`];
                  return p && p.totalPaid >= totalDueForMonth;
                }).length;
                const isAllPaid = members.length > 0 && paidCount === members.length;
                const isBusy = isProcessingBatch === monthNum;

                return (
                  <th key={monthNum} style={{ 
                    padding: '4px 2px', 
                    borderLeft: '1px solid #9CA3AF', 
                    borderBottom: '2px solid #1F2937', 
                    height: '130px', 
                    verticalAlign: 'bottom', 
                    width: '42px',
                    minWidth: '42px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '6px' }}>
                      {/* Clickable Column-wide All Paid Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAllPaid(monthNum)}
                        disabled={isBusy}
                        title={isAllPaid ? `Month ${monthNum}: All paid! Click to unmark all` : `Month ${monthNum}: Click to mark all ${members.length - paidCount} members as paid`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          border: isAllPaid ? '2px solid #10B981' : '1.5px dashed #64748B',
                          background: isAllPaid ? '#10B981' : '#F1F5F9',
                          color: isAllPaid ? '#FFFFFF' : '#0F172A',
                          cursor: 'pointer',
                          fontSize: '9px',
                          fontWeight: 900,
                          padding: 0,
                          boxShadow: isAllPaid ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isBusy ? (
                          <Loader2 size={13} className="spin" />
                        ) : isAllPaid ? (
                          <Check size={14} strokeWidth={3} />
                        ) : (
                          <span>ALL</span>
                        )}
                      </button>

                      {/* Rotated Date */}
                      <div style={{ 
                        writingMode: 'vertical-rl', 
                        transform: 'rotate(180deg)', 
                        fontSize: '13.5px', 
                        fontWeight: 700,
                        color: '#1F2937',
                        whiteSpace: 'nowrap',
                        margin: '0 auto',
                        letterSpacing: '0.3px',
                        paddingBottom: '4px'
                      }}>
                        {getCalculatedDate(chiti.startDate, monthNum)}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(member => {
              const isTaken = member.hasWonAuction;
              
              return (
                <tr key={member.id}>
                  {/* Sticky Name Cell */}
                  <td style={{ 
                    padding: '3px 6px', 
                    borderBottom: '1px solid #93c5fd', // Blue horizontal ledger line
                    position: 'sticky', 
                    left: 0, 
                    background: '#FFFFFF', 
                    zIndex: 20, 
                    borderRight: '2px solid rgba(239, 68, 68, 0.85)', // Red vertical line
                    height: '38px',
                    verticalAlign: 'middle'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0 }}>
                      {/* Number */}
                      <span style={{ 
                        display: 'inline-block',
                        width: '20px',
                        color: '#4B5563', 
                        fontSize: '11px', 
                        textAlign: 'right',
                        flexShrink: 0,
                        fontFamily: 'sans-serif',
                        fontWeight: 600
                      }}>
                        ({member.memberNumber})
                      </span>

                      {/* Name Button with dynamic color changing */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTakenModal(member);
                        }}
                        title={isTaken ? `Month ${member.wonMonth} Chiti Taken! Click to edit` : `Click to mark ${member.fullName} as Chiti taken`}
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px',
                          background: isTaken 
                            ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' 
                            : 'rgba(236, 72, 153, 0.15)', // Light pink highlighter effect
                          color: isTaken ? '#78350F' : '#BE185D',
                          border: isTaken ? '1.5px solid #F59E0B' : '1px solid rgba(236, 72, 153, 0.35)',
                          boxShadow: isTaken ? '0 1px 4px rgba(245, 158, 11, 0.3)' : 'none',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: isTaken ? 800 : 700,
                          cursor: 'pointer',
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'left',
                          lineHeight: '1.2',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0
                        }}>
                          {member.fullName}
                        </span>
                        
                        {isTaken && (
                          <span style={{
                            background: '#B45309',
                            color: '#FFFFFF',
                            fontSize: '8.5px',
                            fontWeight: 900,
                            padding: '1px 3px',
                            borderRadius: '3px',
                            flexShrink: 0,
                            fontFamily: 'sans-serif',
                            lineHeight: 1
                          }}>
                            M{member.wonMonth || '✓'}
                          </span>
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Payment Checkmark Columns */}
                  {Array.from({ length: chiti.durationMonths }, (_, i) => i + 1).map(monthNum => {
                    const dbMonth = months.find(m => m.monthNumber === monthNum);
                    const key = `${monthNum}_${member.memberId}`;
                    const paymentData = paymentMap[key] || { totalPaid: 0, records: [] };
                    const totalDue = chiti.monthlyContribution - (dbMonth ? (dbMonth as any).memberDividendCredit || 0 : 0);
                    const isPaid = paymentData.totalPaid >= totalDue;
                    const isPendingSync = pendingKeys.has(key);

                    return (
                      <td 
                        key={key} 
                        onClick={() => {
                          if (isPendingSync) return;
                          if (!dbMonth) {
                            alert(`Month ${monthNum} has not been started in the system yet.`);
                            return;
                          }
                          handleTogglePayment(member, dbMonth);
                        }}
                        style={{ 
                          padding: '0', 
                          textAlign: 'center', 
                          borderBottom: '1px solid #93c5fd', // Blue horizontal line
                          borderLeft: '1px solid #9ca3af',
                          cursor: dbMonth ? 'pointer' : 'not-allowed',
                          height: '38px',
                          verticalAlign: 'middle',
                          opacity: dbMonth ? (isPendingSync ? 0.6 : 1) : 0.5,
                          transition: 'opacity 0.2s ease',
                          width: '42px',
                          minWidth: '42px'
                        }}
                      >
                        {isPaid ? (
                          <div style={{ 
                            fontSize: '24px', 
                            color: '#1F2937', 
                            lineHeight: '1',
                            fontFamily: 'cursive',
                            userSelect: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%'
                          }}>
                            X
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '100%' }}></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chiti Taken Selection Modal */}
      {isTakenModalOpen && selectedMemberForTaken && (
        <div 
          onClick={() => setIsTakenModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              animation: 'scaleUp 0.15s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              borderBottom: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#78350F', margin: 0 }}>
                    Chiti Taken (Lifted)
                  </h3>
                  <p style={{ fontSize: '11px', color: '#92400E', margin: 0 }}>
                    Select who took the chiti amount that month
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsTakenModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#78350F', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px' }}>
              {/* Member Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Member:
                </label>
                <select 
                  value={selectedMemberForTaken.id}
                  onChange={(e) => {
                    const mem = members.find(m => m.id === e.target.value);
                    if (mem) {
                      setSelectedMemberForTaken(mem);
                      setTakenMonthSelect(mem.wonMonth || 1);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: '#F8FAFC',
                    outline: 'none'
                  }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      ({m.memberNumber}) {m.fullName} {m.hasWonAuction ? `[Taken M${m.wonMonth}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector Grid */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Which Month did they take the Chiti?
                </label>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', 
                  gap: '6px', 
                  maxHeight: '170px', 
                  overflowY: 'auto',
                  padding: '2px'
                }}>
                  {Array.from({ length: chiti.durationMonths }, (_, i) => i + 1).map(mNum => {
                    const isSelected = takenMonthSelect === mNum;
                    const otherWinner = members.find(m => m.id !== selectedMemberForTaken.id && m.hasWonAuction && m.wonMonth === mNum);
                    const isCurrentMemberMonth = selectedMemberForTaken.hasWonAuction && selectedMemberForTaken.wonMonth === mNum;

                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={() => setTakenMonthSelect(mNum)}
                        style={{
                          padding: '7px 4px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                          background: isSelected ? '#FEF3C7' : '#FFFFFF',
                          color: isSelected ? '#78350F' : '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          position: 'relative',
                          outline: 'none'
                        }}
                      >
                        <span style={{ fontSize: '11.5px', fontWeight: 800 }}>Month {mNum}</span>
                        <span style={{ fontSize: '9px', color: '#64748B' }}>
                          {getCalculatedDate(chiti.startDate, mNum).slice(0, 5)}
                        </span>
                        {otherWinner && (
                          <span style={{ fontSize: '8px', color: '#D97706', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '68px' }} title={`Already: ${otherWinner.fullName}`}>
                            • {otherWinner.fullName.split(' ')[0]}
                          </span>
                        )}
                        {isCurrentMemberMonth && (
                          <span style={{ fontSize: '8px', color: '#16A34A', fontWeight: 700 }}>
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Preview */}
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                  Color in Table:
                </span>
                <div style={{
                  background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                  color: '#78350F',
                  border: '1.5px solid #F59E0B',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>({selectedMemberForTaken.memberNumber}) {selectedMemberForTaken.fullName}</span>
                  <span style={{ background: '#B45309', color: '#FFF', fontSize: '8.5px', fontWeight: 900, padding: '1px 3px', borderRadius: '3px' }}>
                    M{takenMonthSelect}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isSavingTaken}
                  onClick={() => handleSaveTakenStatus(true, takenMonthSelect)}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                    borderColor: '#B45309',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '10px',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                    gap: '6px'
                  }}
                >
                  {isSavingTaken ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <>
                      <Trophy size={15} /> Save & Highlight in Gold (Month {takenMonthSelect})
                    </>
                  )}
                </button>

                {selectedMemberForTaken.hasWonAuction && (
                  <button
                    type="button"
                    disabled={isSavingTaken}
                    onClick={() => handleSaveTakenStatus(false)}
                    className="btn btn-secondary"
                    style={{
                      color: '#EF4444',
                      borderColor: '#FCA5A5',
                      fontSize: '12px',
                      padding: '8px',
                      justifyContent: 'center'
                    }}
                  >
                    Remove Taken Status (Reset to Pink Tag)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsTakenModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '8px', justifyContent: 'center' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

