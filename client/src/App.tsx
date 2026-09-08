import React, { useState, useEffect } from 'react';
import { dbService } from './services/dbService';
import { AuthView } from './components/AuthView';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AgentDashboardView } from './components/AgentDashboardView';
import { ChitiDetailView } from './components/ChitiDetailView';
import { LedgerTable } from './components/LedgerTable';
import { ChitiLogo } from './components/ChitiLogo';
import { SplashScreen } from './components/SplashScreen';
import { ChitiCalculator } from './components/ChitiCalculator';
import { CalculatorModal } from './components/CalculatorModal';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { NotepadModal } from './components/NotepadModal';
import { usePWAInstall, InstallPwaModal } from './components/InstallPwaPrompt';
import { AgentAccount, Chiti, Member, LedgerEntry } from './types';
import { 
  Home, 
  Layers, 
  Users, 
  CreditCard, 
  BookOpen, 
  LogOut,
  Phone,
  Plus,
  Calculator
} from 'lucide-react';

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentAgent, setCurrentAgent] = useState<AgentAccount | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // App data state
  const [chitis, setChitis] = useState<Chiti[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allLedger, setAllLedger] = useState<LedgerEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedChitiId, setSelectedChitiId] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const { isInstalled, isIOS, triggerInstall } = usePWAInstall();

  // Load Auth State on Mount
  useEffect(() => {
    async function initAuth() {
      try {
        const agent = await dbService.getCurrentAgent();
        setCurrentAgent(agent);
      } catch (err) {
        console.error('Failed to load agent', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    initAuth();
  }, []);

  // Load Agent Data when logged in
  useEffect(() => {
    async function loadData() {
      if (!currentAgent) return;
      setIsLoadingData(true);
      try {
        const [cData, mData, lData] = await Promise.all([
          dbService.getChitisByAgent(currentAgent.id),
          dbService.getMembersByAgent(currentAgent.id),
          dbService.getLedgerByAgent(currentAgent.id)
        ]);
        setChitis(cData);
        setAllMembers(mData);
        setAllLedger(lData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, [currentAgent]);

  const handleOpenInstall = () => {
    if (isIOS) {
      setShowInstallModal(true);
    } else {
      triggerInstall(() => setShowInstallModal(true));
    }
  };

  const handleAuthenticated = (agent: any) => {
    setCurrentAgent(agent);
    setSelectedChitiId(null);
    setActiveTab('home');
  };

  const handleLogout = () => {
    dbService.logoutAgent();
    setCurrentAgent(null);
    setSelectedChitiId(null);
  };

  const handleOpenChiti = (chitiId: string) => {
    setSelectedChitiId(chitiId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (showSplash || isLoadingAuth) {
    return <SplashScreen onFinish={() => setShowSplash(false)} minDuration={1000} />;
  }

  // If no agent is logged in, show real registration/login screen
  if (!currentAgent) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  // Optionally show a loading screen while data fetches
  if (isLoadingData && chitis.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <ChitiLogo size={60} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Desktop Left Sidebar */}
      <aside className="desktop-sidebar">
        <div style={{ marginBottom: '32px', paddingLeft: '4px' }}>
          <ChitiLogo variant="full" size={38} theme="dark" showSubtitle={true} />
        </div>

        {/* Sidebar Navigation Links */}
        <nav style={{ flex: 1 }}>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('home'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'home' ? 'active' : ''}`}
          >
            <Home size={18} /> <span>Home Dashboard</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('chitis'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'chitis' ? 'active' : ''}`}
          >
            <Layers size={18} /> <span>My Chitis ({chitis.length})</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('members'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'members' ? 'active' : ''}`}
          >
            <Users size={18} /> <span>All Members ({allMembers.length})</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('ledger'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'ledger' ? 'active' : ''}`}
          >
            <BookOpen size={18} /> <span>Financial Ledger</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('calculator'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'calculator' ? 'active' : ''}`}
          >
            <Calculator size={18} color="#C084FC" /> <span>Chiti Calculator</span>
          </button>
        </nav>

        {/* Sidebar Footer Agent Card */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '12px' }}>
          <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '14px' }}>{currentAgent.name}</div>
          <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>{currentAgent.businessName}</div>
          <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>{currentAgent.town}, {currentAgent.state}</div>

          <button
            onClick={handleLogout}
            className="btn btn-glass btn-sm"
            style={{ width: '100%', marginTop: '12px', fontSize: '12px', color: '#F87171' }}
          >
            <LogOut size={13} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
        <Navbar 
          agent={currentAgent}
          onLogout={handleLogout}
          onNavigateHome={() => {
            setSelectedChitiId(null);
            setActiveTab('home');
          }}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenInstall={!isInstalled ? handleOpenInstall : undefined}
        />

        <main style={{ flex: 1, width: '100%' }}>
          {selectedChitiId ? (
            <ChitiDetailView 
              chitiId={selectedChitiId}
              onBack={() => setSelectedChitiId(null)}
            />
          ) : activeTab === 'calculator' ? (
            <div style={{ maxWidth: '440px', margin: '0 auto', padding: '24px 16px 40px' }}>
              <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                  Chiti Financial Calculator
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Quick utility for bidding differences, agent commissions, and member estimates.
                </p>
              </div>
              <ChitiCalculator isEmbedded={true} />
            </div>
          ) : activeTab === 'ledger' ? (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                  All Chitis Financial Ledger
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B' }}>
                  Auditable double-entry journal across all your managed Chiti groups.
                </p>
              </div>
              <LedgerTable entries={allLedger} />
            </div>
          ) : activeTab === 'members' ? (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                  Members Directory ({allMembers.length})
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B' }}>
                  All members registered across your active Chiti groups.
                </p>
              </div>

              {allMembers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '50px 20px', borderRadius: '20px' }}>
                  <Users size={36} color="#7C3AED" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>No members enrolled yet</h3>
                  <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '340px', margin: '6px auto 16px' }}>
                    Create your first Chiti group to add your real members.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile View: Cards */}
                  <div className="mobile-only mobile-card-list">
                    {allMembers.map((m, idx) => (
                      <div key={m.id} className="mobile-item-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '8px', 
                                background: 'rgba(124, 58, 237, 0.1)', 
                                color: '#7C3AED', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '12px'
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                              {m.fullName}
                            </div>
                          </div>
                          <span className="badge badge-success">Active</span>
                        </div>

                        {m.phone && (
                          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} color="#7C3AED" />
                            <a href={`tel:${m.phone}`} style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 600 }}>
                              {m.phone}
                            </a>
                          </div>
                        )}

                        {m.address && (
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                            📍 {m.address}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop View: Table */}
                  <div className="desktop-only data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Full Name</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Joining Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMembers.map((m, idx) => (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 800, color: '#7C3AED' }}>#{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>{m.fullName}</td>
                            <td>{m.phone || '—'}</td>
                            <td style={{ fontSize: '13px', color: '#64748B' }}>{m.address || '—'}</td>
                            <td>{m.joiningDate}</td>
                            <td><span className="badge badge-success">Active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <AgentDashboardView 
              agent={currentAgent} 
              onOpenChiti={handleOpenChiti} 
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onOpenInstall={!isInstalled ? handleOpenInstall : undefined}
            />
          )}
        </main>

        {/* Global Slide-Up / Modal Calculator */}
        <CalculatorModal 
          isOpen={isCalculatorOpen} 
          onClose={() => setIsCalculatorOpen(false)} 
        />

        {/* Floating Action Menu */}
        <FloatingActionMenu 
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenNotepad={() => setIsNotepadOpen(true)}
        />

        {/* Notepad Modal */}
        <NotepadModal
          isOpen={isNotepadOpen}
          onClose={() => setIsNotepadOpen(false)}
        />

        {/* Global PWA Install Modal (iOS Instructions & Native Helper) */}
        <InstallPwaModal 
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          isIOS={isIOS}
          onNativeInstall={() => {
            triggerInstall();
            setShowInstallModal(false);
          }}
        />

        {/* Mobile Bottom Navigation */}
        <BottomNav 
          activeTab={selectedChitiId ? 'chitis' : activeTab}
          onTabChange={tab => {
            setSelectedChitiId(null);
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
};

export default App;
