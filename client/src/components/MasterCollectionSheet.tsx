import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Chiti, ChitMember, ChitMonth, Payment } from '../types';
import { Check, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { formatINR } from '../engine/calculationEngine';

interface MasterCollectionSheetProps {
  chiti: Chiti;
}

export const MasterCollectionSheet: React.FC<MasterCollectionSheetProps> = ({ chiti }) => {
  const [members, setMembers] = useState<ChitMember[]>([]);
  const [months, setMonths] = useState<ChitMonth[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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

  // Payment Lookup Map: `${monthNumber}_${memberId}` -> totalPaid
  const paymentMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      const key = `${p.monthNumber}_${p.memberId}`;
      map[key] = (map[key] || 0) + p.amountPaid;
    }
    return map;
  }, [payments]);

  const handleMarkPaid = async (member: ChitMember, month: ChitMonth) => {
    if (month.status === 'UPCOMING') {
      alert(`Cannot collect for Month ${month.monthNumber} yet. It is upcoming.`);
      return;
    }

    const key = `${month.monthNumber}_${member.memberId}`;
    const amountPaidSoFar = paymentMap[key] || 0;
    
    // For now, assume if they click, they want to pay the full due.
    // Member dividend credit means they owe less. 
    // In ChitiDetailView, due is `chiti.monthlyContribution - (month.memberDividendCredit || 0)`
    const totalDueForMonth = chiti.monthlyContribution - (month.memberDividendCredit || 0);
    const pendingAmount = Math.max(0, totalDueForMonth - amountPaidSoFar);

    if (pendingAmount <= 0) return;

    if (confirm(`Mark ${formatINR(pendingAmount)} as paid for ${member.fullName} in Month ${month.monthNumber}?`)) {
      setIsProcessing(key);
      try {
        await dbService.recordPayment({
          agentId: chiti.agentId,
          chitiId: chiti.id,
          chitMonthId: month.id,
          monthNumber: month.monthNumber,
          memberId: member.memberId,
          amountPaid: pendingAmount,
          paymentMethod: 'CASH',
          notes: 'Marked via Master Sheet'
        });
        
        // Optimistically update
        setPayments(prev => [...prev, {
          id: `temp_${Date.now()}`,
          agentId: chiti.agentId,
          chitiId: chiti.id,
          chitMonthId: month.id,
          monthNumber: month.monthNumber,
          memberId: member.memberId,
          memberName: member.fullName,
          memberNumber: member.memberNumber,
          amountDue: totalDueForMonth,
          amountPaid: pendingAmount,
          paymentMethod: 'CASH',
          status: 'PAID',
          receiptNumber: `RCPT-${Date.now()}`
        } as Payment]);
      } catch (err: any) {
        alert(err.message);
        loadData(); // Revert on failure
      } finally {
        setIsProcessing(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={32} className="spin" color="#7C3AED" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ minWidth: '800px', paddingBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 10, background: '#F8FAFC', padding: '16px', textAlign: 'left', borderBottom: '2px solid #E2E8F0', borderRight: '2px solid #E2E8F0', fontWeight: 800, color: '#0F172A', minWidth: '200px' }}>
                Member
              </th>
              {months.map(m => (
                <th key={m.id} style={{ padding: '16px 12px', textAlign: 'center', borderBottom: '2px solid #E2E8F0', background: '#F8FAFC', color: '#334155', fontWeight: 700, fontSize: '13px', minWidth: '100px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Month</div>
                  <div style={{ fontSize: '16px', color: '#0F172A' }}>{m.monthNumber}</div>
                  {m.status === 'OPEN' && (
                    <div style={{ fontSize: '10px', color: '#10B981', marginTop: '2px', fontWeight: 800 }}>ACTIVE</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ position: 'sticky', left: 0, zIndex: 10, background: '#FFFFFF', padding: '12px 16px', borderBottom: '1px solid #E2E8F0', borderRight: '2px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                    {member.fullName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    #{member.memberNumber} • {member.phone || 'No phone'}
                  </div>
                </td>
                {months.map(month => {
                  const key = `${month.monthNumber}_${member.memberId}`;
                  const amountPaid = paymentMap[key] || 0;
                  const totalDue = chiti.monthlyContribution - (month.memberDividendCredit || 0);
                  const isPaid = amountPaid >= totalDue;
                  const isProcessingThis = isProcessing === key;
                  
                  // Cannot pay for upcoming months
                  const isUpcoming = month.status === 'UPCOMING';

                  return (
                    <td 
                      key={key} 
                      style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #E2E8F0',
                        background: isPaid ? '#F0FDF4' : (isUpcoming ? '#F8FAFC' : '#FFFFFF')
                      }}
                    >
                      {isProcessingThis ? (
                        <Loader2 size={18} className="spin" color="#7C3AED" style={{ margin: '0 auto' }} />
                      ) : isPaid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={16} strokeWidth={3} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Paid</span>
                        </div>
                      ) : isUpcoming ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
                          <Clock size={20} color="#94A3B8" />
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Wait</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkPaid(member, month)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            width: '100%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertCircle size={14} color="#94A3B8" />
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Collect</span>
                        </button>
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
  );
};
