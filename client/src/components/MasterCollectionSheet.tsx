import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Chiti, ChitMember, ChitMonth, Payment } from '../types';
import { Loader2 } from 'lucide-react';

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
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
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

  const handleTogglePayment = async (member: ChitMember, month: ChitMonth) => {
    const key = `${month.monthNumber}_${member.memberId}`;
    const paymentData = paymentMap[key] || { totalPaid: 0, records: [] };
    const totalDueForMonth = chiti.monthlyContribution - ((month as any).memberDividendCredit || 0);
    const isPaid = paymentData.totalPaid >= totalDueForMonth;

    if (isPaid) {
      // Trying to uncheck. Ensure next month is NOT checked.
      const nextMonthKey = `${month.monthNumber + 1}_${member.memberId}`;
      const nextMonthPaymentData = paymentMap[nextMonthKey] || { totalPaid: 0 };
      const isNextPaid = nextMonthPaymentData.totalPaid > 0; // if they paid anything in next month, can't uncheck this one
      
      if (isNextPaid) {
        alert(`You must uncheck Month ${month.monthNumber + 1} before unchecking Month ${month.monthNumber}.`);
        return;
      }

      if (confirm(`Remove payment for ${member.fullName} in Month ${month.monthNumber}?`)) {
        setIsProcessing(key);
        try {
          for (const record of paymentData.records) {
            await dbService.reversePayment({
              agentId: chiti.agentId,
              paymentId: record.id,
              reason: 'Notebook toggle unmark'
            });
          }
          await loadData();
        } catch (err: any) {
          alert(err.message);
        } finally {
          setIsProcessing(null);
        }
      }
    } else {
      // Trying to check. Ensure previous month is paid if month > 1.
      if (month.monthNumber > 1) {
        const prevMonthKey = `${month.monthNumber - 1}_${member.memberId}`;
        const prevMonthPaymentData = paymentMap[prevMonthKey] || { totalPaid: 0 };
        // We assume previous month is paid if they paid at least some of it, but realistically it should be fully paid.
        // For simplicity, we check if they paid > 0, or maybe we check if they paid the total due for previous month.
        // Let's just check if it's marked (totalPaid > 0).
        const isPrevPaid = prevMonthPaymentData.totalPaid > 0;
        
        if (!isPrevPaid) {
          alert(`You must check Month ${month.monthNumber - 1} before checking Month ${month.monthNumber}.`);
          return;
        }
      }

      const pendingAmount = Math.max(0, totalDueForMonth - paymentData.totalPaid);
      if (pendingAmount <= 0) return;

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
          notes: 'Marked via Notebook Sheet'
        });
        await loadData();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsProcessing(null);
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
      <div style={{ width: '100%', maxWidth: '900px', paddingBottom: '20px', margin: '0 auto' }}>
        
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
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, position: 'relative', zIndex: 2, fontFamily: '"Caveat", "Kalam", "Comic Sans MS", cursive, sans-serif' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 16px', textAlign: 'left', minWidth: '180px', verticalAlign: 'bottom', borderBottom: '2px solid #1f2937', position: 'sticky', left: 0, background: '#fff', zIndex: 30, borderRight: '2px solid rgba(239, 68, 68, 0.7)' }}>
                    <div style={{ fontSize: '24px', color: '#1f2937', paddingLeft: '8px' }}>Name</div>
                  </th>
                {Array.from({ length: chiti.durationMonths }, (_, i) => i + 1).map(monthNum => (
                  <th key={monthNum} style={{ padding: '8px 4px', borderLeft: '1px solid #9ca3af', borderBottom: '2px solid #1f2937', height: '140px', verticalAlign: 'bottom', width: '40px' }}>
                    <div style={{ 
                      writingMode: 'vertical-rl', 
                      transform: 'rotate(180deg)', 
                      fontSize: '18px', 
                      color: '#1f2937',
                      whiteSpace: 'nowrap',
                      margin: '0 auto'
                    }}>
                      {getCalculatedDate(chiti.startDate, monthNum)}
                    </div>
                  </th>
                ))}
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
                    const isProcessingThis = isProcessing === key;

                    return (
                      <td 
                        key={key} 
                        onClick={() => {
                          if (isProcessingThis) return;
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
                          opacity: dbMonth ? 1 : 0.5
                        }}
                      >
                        {isProcessingThis ? (
                          <Loader2 size={16} className="spin" color="#1f2937" style={{ margin: '0 auto' }} />
                        ) : isPaid ? (
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
