import React, { useState } from 'react';
import { Chiti } from '../types';
import { CreditCard, ChevronRight, Search, Layers } from 'lucide-react';
import { formatINR } from '../engine/calculationEngine';

interface CollectViewProps {
  chitis: Chiti[];
  onOpenChiti: (chitiId: string) => void;
}

export const CollectView: React.FC<CollectViewProps> = ({ chitis, onOpenChiti }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChitis = chitis.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard color="#10B981" /> Collect Payments
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Select a Chiti group to start collecting member payments for any month.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input 
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search Chiti group..."
          style={{ width: '100%', paddingLeft: '36px', background: '#FFFFFF' }}
        />
      </div>

      {filteredChitis.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '20px' }}>
          <Layers size={36} color="#7C3AED" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>No Chitis Found</h3>
          <p style={{ color: '#64748B', fontSize: '13px', margin: '6px auto' }}>
            Create a Chiti group first to start collecting payments.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredChitis.map(chiti => {
            const progressPercent = Math.min(100, Math.round((chiti.currentMonth / chiti.durationMonths) * 100));

            return (
              <div 
                key={chiti.id} 
                onClick={() => onOpenChiti(chiti.id)}
                className="card hover-lift" 
                style={{ cursor: 'pointer', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #10B981' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {chiti.code}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                      Month {chiti.currentMonth} / {chiti.durationMonths}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{chiti.name}</h3>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                    {chiti.totalMembers} Members • {formatINR(chiti.monthlyContribution)}/month
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }} className="desktop-only">
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Pool</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }} className="tabular-nums">
                      {formatINR(chiti.expectedMonthlyPool)}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '8px', borderRadius: '50%' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
