import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Chiti, ChitMember, ChitMonth, Payment } from '../types';
import { Loader2, Check, CheckSquare } from 'lucide-react';

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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={32} className="spin" color="#ef4444" />
      </div>
    );
  }

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.memberNumber.toString().includes(searchQuery)
  );

  return (
    <div style={{ padding: '16px', WebkitOverflowScrolling: 'touch', background: '#e5e7eb', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '900px', paddingBottom: '120px', margin: '0 auto' }}>
        
        {/* Notebook styling wrapper */}
        <div style={{ 
          background: '#fff', 
          border: '1px solid #d1d5db',
          boxShadow: '2px 4px 12px rgba(0,0,0,0.1)',
          padding: '20px',
          position: 'relative'
        }}>
          {/* Search Bar */}
          <div style={{ marginBottom: '16px', padding: '0 20px' }}>
            <input 
              type="text" 
              placeholder="Search member by name or number..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
          </div>

          <div style={{ overflowX: 'auto', position: 'relative', paddingLeft: '0', paddingRight: '0', borderRadius: '4px', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, position: 'relative', zIndex: 2, fontFamily: '"Times New Roman", Times, serif' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 16px', textAlign: 'left', minWidth: '180px', verticalAlign: 'bottom', borderBottom: '2px solid #1f2937', position: 'sticky', left: 0, background: '#fff', zIndex: 30, borderRight: '2px solid rgba(239, 68, 68, 0.7)' }}>
                    <div style={{ fontSize: '24px', color: '#1f2937', paddingLeft: '8px' }}>Name</div>
                  </th>
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
                    <th key={monthNum} style={{ padding: '6px 4px', borderLeft: '1px solid #9ca3af', borderBottom: '2px solid #1f2937', height: '175px', verticalAlign: 'bottom', width: '44px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '8px' }}>
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
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: isAllPaid ? '2px solid #10B981' : '1.5px dashed #64748B',
                            background: isAllPaid ? '#10B981' : '#F1F5F9',
                            color: isAllPaid ? '#FFFFFF' : '#0F172A',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 900,
                            padding: 0,
                            boxShadow: isAllPaid ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="spin" />
                          ) : isAllPaid ? (
                            <Check size={16} strokeWidth={3} />
                          ) : (
                            <span>ALL</span>
                          )}
                        </button>

                        <div style={{ 
                          writingMode: 'vertical-rl', 
                          transform: 'rotate(180deg)', 
                          fontSize: '16px', 
                          fontWeight: 700,
                          color: '#1f2937',
                          whiteSpace: 'nowrap',
                          margin: '0 auto',
                          letterSpacing: '0.5px'
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
              {filteredMembers.map((member, idx) => (
                <tr key={member.id}>
                  <td style={{ 
                    padding: '8px 16px', 
                    borderBottom: '1px solid #93c5fd', // Blue horizontal line
                    fontSize: '20px',
                    color: '#be185d', // Name in a pink/reddish color like the image
                    fontWeight: 'bold',
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                    zIndex: 20,
                    borderRight: '2px solid rgba(239, 68, 68, 0.7)'
                  }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '28px',
                      color: '#1f2937', 
                      fontSize: '16px',
                      textAlign: 'right',
                      marginRight: '8px'
                    }}>
                      ({member.memberNumber})
                    </span>
                    <span style={{ 
                      background: 'rgba(236, 72, 153, 0.2)', // Light pink highlighter effect behind name
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {member.fullName}
                    </span>
                  </td>
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
                          height: '40px',
                          verticalAlign: 'middle',
                          opacity: dbMonth ? (isPendingSync ? 0.6 : 1) : 0.5,
                          transition: 'opacity 0.2s ease'
                        }}
                      >
                        {isPaid ? (
                          <div style={{ 
                            fontSize: '28px', 
                            color: '#1f2937', 
                            lineHeight: '1',
                            fontFamily: 'cursive',
                            userSelect: 'none'
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
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};
