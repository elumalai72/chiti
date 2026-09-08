import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { formatINR } from '../engine/calculationEngine';
import { Chiti, ChitMonth } from '../types';
import { Award, Layers, Search, TrendingUp } from 'lucide-react';

interface CommissionViewProps {
  agentId: string;
  chitis: Chiti[];
}

export const CommissionView: React.FC<CommissionViewProps> = ({ agentId, chitis }) => {
  const [chitiMonthsMap, setChitiMonthsMap] = useState<Record<string, ChitMonth[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCommissions() {
      setIsLoading(true);
      try {
        const monthsMap: Record<string, ChitMonth[]> = {};
        for (const c of chitis) {
          const months = await dbService.getChitMonths(c.id);
          monthsMap[c.id] = months;
        }
        setChitiMonthsMap(monthsMap);
      } catch (err) {
        console.error('Failed to load commissions', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCommissions();
  }, [chitis]);

  let totalCommissionEarned = 0;
  const filteredChitis = chitis.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award color="#7C3AED" /> Agent Commission
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Track all commissions earned from completed auctions across your Chiti groups.
        </p>
      </div>

      {/* Global Commission Stats */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', color: '#FFFFFF', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#A5B4FC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Lifetime Commission</div>
          <div style={{ fontSize: '32px', fontWeight: 900, marginTop: '4px' }} className="tabular-nums">
            {formatINR(chitis.reduce((total, chiti) => {
              const months = chitiMonthsMap[chiti.id] || [];
              const chitiTotal = months.reduce((acc, m) => acc + (m.agentCommission || 0), 0);
              return total + chitiTotal;
            }, 0))}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
          <TrendingUp size={32} color="#A5B4FC" />
        </div>
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
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>No Commissions Yet</h3>
          <p style={{ color: '#64748B', fontSize: '13px', margin: '6px auto' }}>
            Commission data will appear here once auctions are completed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredChitis.map(chiti => {
            const months = chitiMonthsMap[chiti.id] || [];
            const completedMonths = months.filter(m => m.auctionStatus === 'COMPLETED');
            const totalCommission = completedMonths.reduce((sum, m) => sum + (m.agentCommission || 0), 0);

            if (completedMonths.length === 0) return null;

            return (
              <div key={chiti.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                      {chiti.code}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{chiti.name}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Chiti Commission</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }} className="tabular-nums">{formatINR(totalCommission)}</div>
                  </div>
                </div>
                <div style={{ padding: '0 16px' }}>
                  {completedMonths.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>Month {m.monthNumber}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Auction Completed</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }} className="tabular-nums">{formatINR(m.agentCommission || 0)}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
