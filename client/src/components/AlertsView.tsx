import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { Chiti, Member, ChitMonth } from '../types';
import { Bell, AlertTriangle, Clock, AlertCircle } from 'lucide-react';

interface AlertsViewProps {
  agentId: string;
  chitis: Chiti[];
  allMembers: Member[];
}

export const AlertsView: React.FC<AlertsViewProps> = ({ agentId, chitis, allMembers }) => {
  const [upcomingChitis, setUpcomingChitis] = useState<{chiti: Chiti, days: number}[]>([]);
  const [unpaidMembers, setUnpaidMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      setIsLoading(true);
      try {
        const today = new Date();
        const currentDay = today.getDate();
        
        // 1. Upcoming Chitis
        const upcoming: {chiti: Chiti, days: number}[] = [];
        for (const c of chitis) {
          let daysDiff = c.paymentDueDay - currentDay;
          if (daysDiff < 0) {
            // Already passed this month, maybe due next month? 
            // We'll consider it "Overdue" if the current month isn't closed, but let's just do a basic calculation
            daysDiff += 30; // rough approx for next month
          }
          if (daysDiff >= 0 && daysDiff <= 7) {
            upcoming.push({ chiti: c, days: daysDiff });
          }
        }
        setUpcomingChitis(upcoming.sort((a, b) => a.days - b.days));

        // 2. Unpaid Members (Risk)
        const unpaid = [];
        for (const c of chitis) {
          const members = await dbService.getChitMembers(c.id);
          for (const m of members) {
            if (m.pendingAmount > 0) {
              const fullMem = allMembers.find(mem => mem.id === m.memberId);
              if (fullMem) {
                unpaid.push({
                  member: fullMem,
                  chitiName: c.name,
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
        setIsLoading(false);
      }
    }
    loadAlerts();
  }, [chitis, allMembers]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell color="#F59E0B" /> Risk & Alerts
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Action required: Upcoming payment dates and members with pending dues.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
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
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Due on {item.chiti.paymentDueDay}th</div>
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
              <AlertTriangle size={18} color="#EF4444" /> Unpaid Members Risk
            </h2>
            {unpaidMembers.length === 0 ? (
              <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#10B981', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <AlertCircle size={32} color="#10B981" style={{ marginBottom: '8px' }} />
                All members are fully paid up! No pending risks.
              </div>
            ) : (
              <div className="mobile-only mobile-card-list">
                {unpaidMembers.map((item, idx) => (
                  <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #EF4444', padding: '12px' }}>
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

        </div>
      )}
    </div>
  );
};
