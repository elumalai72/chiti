import React, { useState } from 'react';
import { storage } from '../services/storageService';
import { AgentAccount } from '../types';
import { ChitiLogo } from './ChitiLogo';
import { Lock, Phone, User, Building, MapPin, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated: (agent: AgentAccount) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [town, setTown] = useState('');
  const [stateName, setStateName] = useState('Andhra Pradesh');
  const [address, setAddress] = useState('');

  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!phoneOrEmail.trim()) {
        setError('Please enter your phone number or email');
        return;
      }
      const agent = storage.loginAgent(phoneOrEmail, password);
      onAuthenticated(agent);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!name.trim()) throw new Error('Please enter your full name');
      if (!phone.trim() || phone.trim().length < 10) throw new Error('Please enter a valid 10-digit phone number');
      if (!businessName.trim()) throw new Error('Please enter your business / Chiti agency name');
      if (!town.trim()) throw new Error('Please enter your town or city');

      const agent = storage.registerAgent({
        name,
        phone,
        email: email || undefined,
        password: password || 'chiti123',
        businessName,
        town,
        state: stateName,
        address: address || undefined
      });
      onAuthenticated(agent);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <ChitiLogo variant="full" size={52} theme="dark" showSubtitle={true} />
      </div>

      {/* Auth Card */}
      <div 
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          color: '#0F172A'
        }}
      >
        {/* Toggle Mode */}
        <div 
          style={{ 
            display: 'flex', 
            background: '#F1F5F9', 
            padding: '4px', 
            borderRadius: '14px', 
            marginBottom: '20px' 
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: mode === 'REGISTER' ? '#FFFFFF' : 'transparent',
              color: mode === 'REGISTER' ? '#7C3AED' : '#64748B',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: mode === 'REGISTER' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
              minHeight: '40px'
            }}
          >
            Register as Agent
          </button>
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: mode === 'LOGIN' ? '#FFFFFF' : 'transparent',
              color: mode === 'LOGIN' ? '#7C3AED' : '#64748B',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: mode === 'LOGIN' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
              minHeight: '40px'
            }}
          >
            Agent Sign In
          </button>
        </div>

        {error && (
          <div 
            style={{ 
              background: '#FEF2F2', 
              color: '#B91C1C', 
              padding: '10px 14px', 
              borderRadius: '12px', 
              fontSize: '13px', 
              marginBottom: '16px',
              border: '1px solid #FEE2E2',
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Phone Number or Email
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  inputMode="tel"
                  value={phoneOrEmail}
                  onChange={e => setPhoneOrEmail(e.target.value)}
                  placeholder="Enter registered mobile or email"
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
                <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ width: '100%', paddingLeft: '40px', paddingRight: '42px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '4px'
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ minHeight: '48px', marginTop: '6px', fontSize: '15px' }}
            >
              Sign In to Agent Hub <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                Mobile Phone (10 Digits) *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
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

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Password (min 6 characters) *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create secure password"
                  style={{ width: '100%', paddingLeft: '36px', paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ minHeight: '48px', marginTop: '8px', fontSize: '15px' }}
            >
              <ShieldCheck size={18} /> Create Agent Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
