import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { MasterCollectionSheet } from './MasterCollectionSheet';
import { Chiti, ChitMember } from '../types';
import { ArrowLeft } from 'lucide-react';

interface ChitiDetailViewProps {
  chitiId: string;
  initialSubTab?: 'overview' | 'members' | 'payments' | 'mastersheet' | 'auction' | 'ledger' | 'settings';
  onBack: () => void;
}

export const ChitiDetailView: React.FC<ChitiDetailViewProps> = ({ chitiId, onBack }) => {
  const [chiti, setChiti] = useState<Chiti | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const c = await dbService.getChitiById(chitiId);
        setChiti(c);
      } catch (err) {
        console.error('Error loading chiti details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [chitiId]);

  if (isLoading && !chiti) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!chiti) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h3>Chiti not found</h3>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }



  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '0 0 40px' }}>
      {/* Top Header / Back CTA */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '12px 14px', 
        gap: '10px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <button 
          onClick={onBack}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px', padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}
        >
          <ArrowLeft size={15} /> <span>Back</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {chiti.name}
          </h2>
          <span className="badge badge-violet" style={{ fontSize: '11px', flexShrink: 0 }}>
            {chiti.code}
          </span>
        </div>
      </div>

      {/* ONLY THE MASTER SHEET (COLLECTION GRID) */}
      <MasterCollectionSheet chiti={chiti} />
    </div>
  );
};
