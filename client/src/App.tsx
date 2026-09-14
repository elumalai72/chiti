import React, { useState, useEffect, Suspense, lazy } from 'react';
import { dbService } from './services/dbService';
import { AuthView } from './components/AuthView';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AgentDashboardView } from './components/AgentDashboardView';
import { ChitiLogo } from './components/ChitiLogo';
import { SplashScreen } from './components/SplashScreen';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { usePWAInstall, InstallPwaModal } from './components/InstallPwaPrompt';
import { AgentAccount, Chiti, Member, LedgerEntry } from './types';

// Code-split dynamic views & modals for ultra-fast startup and smaller initial bundle
const ChitiDetailView = lazy(() => import('./components/ChitiDetailView').then(m => ({ default: m.ChitiDetailView })));
const CollectView = lazy(() => import('./components/CollectView').then(m => ({ default: m.CollectView })));
const CommissionView = lazy(() => import('./components/CommissionView').then(m => ({ default: m.CommissionView })));
const AlertsView = lazy(() => import('./components/AlertsView').then(m => ({ default: m.AlertsView })));
const DigitalBookView = lazy(() => import('./components/DigitalBookView').then(m => ({ default: m.DigitalBookView })));
const LedgerTable = lazy(() => import('./components/LedgerTable').then(m => ({ default: m.LedgerTable })));
const CalculatorModal = lazy(() => import('./components/CalculatorModal').then(m => ({ default: m.CalculatorModal })));
const NotepadModal = lazy(() => import('./components/NotepadModal').then(m => ({ default: m.NotepadModal })));
const EditProfileModal = lazy(() => import('./components/EditProfileModal').then(m => ({ default: m.EditProfileModal })));

const ViewLoadingFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(124,58,237,0.15)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Loading...</span>
  </div>
);
import { 
  Home, 
  Layers, 
  Users, 
  CreditCard, 
  BookOpen, 
  Image,
  LogOut,
  Phone,
  Plus,
  Calculator,
  Award,
  Bell
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
  const [chitiInitialSubTab, setChitiInitialSubTab] = useState<'overview' | 'payments'>('overview');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

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

  const handleAgentUpdated = (updated: AgentAccount) => {
    setCurrentAgent(updated);
    localStorage.setItem('chiti_v1_current_agent', JSON.stringify(updated));
  };

  const handleOpenChiti = (chitiId: string, subTab: 'overview' | 'payments' = 'overview') => {
    setSelectedChitiId(chitiId);
    setChitiInitialSubTab(subTab);
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
            onClick={() => { setSelectedChitiId(null); setActiveTab('collect'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'collect' ? 'active' : ''}`}
          >
            <CreditCard size={18} /> <span>Collect Payments</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('commission'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'commission' ? 'active' : ''}`}
          >
            <Award size={18} /> <span>Commission</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('alerts'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'alerts' ? 'active' : ''}`}
          >
            <Bell size={18} /> <span>Alerts</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('digital-book'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'digital-book' ? 'active' : ''}`}
          >
            <Image size={18} /> <span>Digital Book</span>
          </button>
          <button 
            onClick={() => { setSelectedChitiId(null); setActiveTab('history'); }}
            className={`sidebar-nav-link ${!selectedChitiId && activeTab === 'history' ? 'active' : ''}`}
          >
            <BookOpen size={18} /> <span>History</span>
          </button>
        </nav>

        {/* Sidebar Footer Agent Card */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            {currentAgent.profilePictureUrl ? (
              <img 
                src={currentAgent.profilePictureUrl} 
                alt={currentAgent.name} 
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38BDF8', flexShrink: 0 }} 
              />
            ) : (
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284C7, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '15px', flexShrink: 0 }}>
                {currentAgent.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentAgent.name}</div>
              <div style={{ color: '#94A3B8', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentAgent.businessName}</div>
              <div style={{ color: '#64748B', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentAgent.town}, {currentAgent.state}</div>
            </div>
          </div>

          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="btn btn-glass btn-sm"
            style={{ width: '100%', fontSize: '11px', color: '#38BDF8', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <span>✏️</span> Edit Profile & Password
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-glass btn-sm"
            style={{ width: '100%', fontSize: '12px', color: '#F87171' }}
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
          onEditProfile={() => setIsEditProfileOpen(true)}
        />

        <main style={{ flex: 1, width: '100%' }}>
          <Suspense fallback={<ViewLoadingFallback />}>
            {selectedChitiId ? (
              <ChitiDetailView 
                chitiId={selectedChitiId}
                initialSubTab={chitiInitialSubTab}
                onBack={() => setSelectedChitiId(null)}
              />
            ) : activeTab === 'collect' ? (
              <CollectView chitis={chitis} onOpenChiti={(id) => handleOpenChiti(id, 'payments')} />
            ) : activeTab === 'commission' ? (
              <CommissionView agentId={currentAgent.id} chitis={chitis} />
            ) : activeTab === 'alerts' ? (
              <AlertsView agentId={currentAgent.id} chitis={chitis} allMembers={allMembers} />
            ) : activeTab === 'digital-book' ? (
              <DigitalBookView />
            ) : activeTab === 'history' ? (
              <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 40px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                    All Chitis Financial History
                  </h1>
                  <p style={{ fontSize: '13px', color: '#64748B' }}>
                    Auditable double-entry journal across all your managed Chiti groups.
                  </p>
                </div>
                <LedgerTable entries={allLedger} />
              </div>
            ) : (
              <AgentDashboardView 
                agent={currentAgent} 
                onOpenChiti={handleOpenChiti} 
                onOpenCalculator={() => setIsCalculatorOpen(true)}
                onOpenInstall={!isInstalled ? handleOpenInstall : undefined}
                onEditProfile={() => setIsEditProfileOpen(true)}
                initialChitis={chitis}
                initialMembers={allMembers}
              />
            )}
          </Suspense>
        </main>

        {/* Lazy Modals Wrapped in Suspense */}
        <Suspense fallback={null}>
          {/* Global Slide-Up / Modal Calculator */}
          <CalculatorModal 
            isOpen={isCalculatorOpen} 
            onClose={() => setIsCalculatorOpen(false)} 
          />

          {/* Edit Agent Profile & Password Modal */}
          {currentAgent && (
            <EditProfileModal
              agent={currentAgent}
              isOpen={isEditProfileOpen}
              onClose={() => setIsEditProfileOpen(false)}
              onUpdated={handleAgentUpdated}
            />
          )}

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
        </Suspense>

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
