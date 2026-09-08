import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { AgentAccount } from '../types';
import { ChitiLogo } from './ChitiLogo';
import { Phone, User, Building, ArrowRight, ShieldCheck, Loader2, KeyRound } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated: (agent: AgentAccount) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [town, setTown] = useState('');
  const [stateName, setStateName] = useState('Andhra Pradesh');

  // Basic sanitization utility for extra peace of mind against SQL/XSS
  const sanitizeInput = (str: string) => {
    if (!str) return '';
    return str.replace(/['";\-/\*]/g, '');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const cleanPhone = sanitizeInput(phone).trim();
      const cleanPassword = sanitizeInput(password);
      
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      if (!cleanPassword) {
        throw new Error('Please enter your password');
      }

      const agent = await dbService.loginAgent(cleanPhone, cleanPassword);
      onAuthenticated(agent);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const cleanPhone = sanitizeInput(phone).trim();
      const cleanName = sanitizeInput(name);
      const cleanPassword = sanitizeInput(password);
      const cleanBusiness = sanitizeInput(businessName);
      const cleanTown = sanitizeInput(town);

      if (!cleanPhone || cleanPhone.length < 10) throw new Error('Please enter a valid 10-digit mobile number');
      if (!cleanPassword || cleanPassword.length < 6) throw new Error('Password must be at least 6 characters');
      if (!cleanName.trim()) throw new Error('Please enter your full name');
      if (!cleanBusiness.trim()) throw new Error('Please enter your business name');
      if (!cleanTown.trim()) throw new Error('Please enter your town or city');

      const agent = await dbService.registerAgent({
        name: cleanName,
        phone: cleanPhone,
        password: cleanPassword,
        businessName: cleanBusiness,
        town: cleanTown,
        state: sanitizeInput(stateName)
      });
      onAuthenticated(agent);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(circle at 50% 20%, #151F36 0%, #070B14 80%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px calc(24px + var(--safe-bottom))',
        color: '#FFFFFF',
        width: '100%'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <ChitiLogo variant="full" size={52} theme="dark" showSubtitle={true} />
      </div>

      <div 
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px 20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          color: '#0F172A'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
            {mode === 'LOGIN' ? 'Welcome Back' : 'Create Agent Account'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {mode === 'LOGIN' ? 'Enter your mobile number and password to sign in.' 
            : 'Fill in your details to get started with Chiti Management.'}
          </p>
        </div>

        {error && (
          <div 
            style={{ 
              background: '#FEF2F2', color: '#B91C1C', padding: '10px 14px', 
              borderRadius: '12px', fontSize: '13px', marginBottom: '16px',
              border: '1px solid #FEE2E2', fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 9876543210"
                  style={{ width: '100%', paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ width: '100%', paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block"
              style={{ minHeight: '48px', marginTop: '6px', fontSize: '15px' }}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <>Sign In <ArrowRight size={16} /></>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => { setMode('REGISTER'); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: '#7C3AED', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        )}

        {/* REGISTER MODE */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Mobile Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 9876543210"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Business / Chiti Agency Name *
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Sri Lakshmi Chiti Funds"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Town / City *
                </label>
                <input
                  type="text"
                  value={town}
                  onChange={e => setTown(e.target.value)}
                  placeholder="e.g. Tirupati"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  State
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={e => setStateName(e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block"
              style={{ minHeight: '48px', marginTop: '8px', fontSize: '15px' }}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : <><ShieldCheck size={18} /> Complete Registration</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button 
                type="button" 
                onClick={() => { setMode('LOGIN'); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
