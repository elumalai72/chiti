import React, { useState } from 'react';
import { LedgerEntry } from '../types';
import { formatINR } from '../engine/calculationEngine';
import { ArrowUpRight, ArrowDownLeft, RotateCcw, Search, Filter } from 'lucide-react';

interface LedgerTableProps {
  entries: LedgerEntry[];
  onReversePayment?: (paymentId: string, reason: string) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  entries,
  onReversePayment
}) => {
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
      (e.memberName && e.memberName.toLowerCase().includes(search.toLowerCase())) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filterType === 'ALL' || e.type === filterType;

    return matchesSearch && matchesFilter;
  });

  const getBadgeForType = (type: LedgerEntry['type'], isReversal: boolean) => {
    if (isReversal) {
      return <span className="badge badge-danger">CORRECTION REVERSAL</span>;
    }
    switch (type) {
      case 'MEMBER_PAYMENT':
        return <span className="badge badge-success">MEMBER PAYMENT</span>;
      case 'PARTIAL_PAYMENT':
        return <span className="badge badge-partial">PARTIAL PAYMENT</span>;
      case 'AUCTION_PAYOUT':
        return <span className="badge badge-violet">AUCTION PAYOUT</span>;
      case 'COMMISSION_EARNED':
        return <span className="badge badge-pending">AGENT COMMISSION</span>;
      case 'DIVIDEND_CREDIT':
        return <span className="badge badge-violet">DIVIDEND REBATE</span>;
      case 'CARRY_FORWARD':
        return <span className="badge badge-partial">CARRY FORWARD</span>;
      default:
        return <span className="badge">{type}</span>;
    }
  };

  const handleReverseClick = (entry: LedgerEntry) => {
    if (!onReversePayment) return;
    const reason = prompt(`Enter reason for reversing payment of ${formatINR(entry.amount)} for ${entry.memberName}:`);
    if (reason && reason.trim()) {
      onReversePayment(entry.referenceId, reason.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by member, notes, or Txn ID..."
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ fontWeight: 600, color: '#334155' }}
          >
            <option value="ALL">All Types</option>
            <option value="MEMBER_PAYMENT">Member Payments</option>
            <option value="AUCTION_PAYOUT">Auction Payouts</option>
            <option value="COMMISSION_EARNED">Agent Commissions</option>
            <option value="DIVIDEND_CREDIT">Dividends / Rebates</option>
            <option value="CORRECTION_REVERSAL">Correction Reversals</option>
          </select>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px', borderRadius: '18px' }}>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>No financial ledger records found matching your filters.</p>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Card Feed */}
          <div className="mobile-only mobile-card-list">
            {filteredEntries.map(entry => {
              const isCredit = entry.flow === 'CREDIT';
              const canReverse = onReversePayment && !entry.isReversal && 
                (entry.type === 'MEMBER_PAYMENT' || entry.type === 'PARTIAL_PAYMENT');

              return (
                <div key={entry.id} className="mobile-item-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {getBadgeForType(entry.type, entry.isReversal)}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                        {entry.memberName || 'Pool General'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px' }}>
                        {entry.id} • {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div 
                        style={{ 
                          fontSize: '17px', 
                          fontWeight: 900, 
                          color: isCredit ? '#065F46' : '#991B1B',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          justifyContent: 'flex-end'
                        }}
                        className="tabular-nums"
                      >
                        {isCredit ? <ArrowDownLeft size={16} color="#10B981" /> : <ArrowUpRight size={16} color="#EF4444" />}
                        {isCredit ? '+' : '-'}{formatINR(entry.amount)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Bal: <strong className="tabular-nums">{formatINR(entry.runningBalance)}</strong>
                      </div>
                    </div>
                  </div>

                  {entry.notes && (
                    <div style={{ fontSize: '12px', color: '#64748B', background: 'var(--surface-muted)', padding: '6px 10px', borderRadius: '8px' }}>
                      {entry.notes}
                    </div>
                  )}

                  {canReverse && (
                    <button
                      onClick={() => handleReverseClick(entry)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#EF4444', borderColor: '#FEE2E2', background: '#FEF2F2', alignSelf: 'flex-start' }}
                    >
                      <RotateCcw size={13} /> Reverse
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Full 9-Column Journal Table */}
          <div className="desktop-only data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Member / Reference</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Running Balance</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => {
                  const isCredit = entry.flow === 'CREDIT';
                  const canReverse = onReversePayment && !entry.isReversal && 
                    (entry.type === 'MEMBER_PAYMENT' || entry.type === 'PARTIAL_PAYMENT');

                  return (
                    <tr key={entry.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#64748B' }}>
                        {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>
                        {entry.id}
                      </td>
                      <td>
                        {getBadgeForType(entry.type, entry.isReversal)}
                      </td>
                      <td>
                        {entry.memberName ? (
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{entry.memberName}</span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Pool General</span>
                        )}
                      </td>
                      <td>
                        <span 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontWeight: 700, 
                            color: isCredit ? '#10B981' : '#EF4444',
                            fontSize: '12px'
                          }}
                        >
                          {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          {entry.flow}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: isCredit ? '#065F46' : '#991B1B' }} className="tabular-nums">
                        {isCredit ? '+' : '-'}{formatINR(entry.amount)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#334155' }} className="tabular-nums">
                        {formatINR(entry.runningBalance)}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B', maxWidth: '240px' }}>
                        {entry.notes}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {canReverse ? (
                          <button
                            onClick={() => handleReverseClick(entry)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', color: '#EF4444', borderColor: '#FEE2E2', background: '#FEF2F2' }}
                          >
                            <RotateCcw size={12} /> Reverse
                          </button>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
