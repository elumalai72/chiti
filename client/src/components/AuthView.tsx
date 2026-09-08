import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { AgentAccount } from '../types';
import { ChitiLogo } from './ChitiLogo';
import { Phone, User, Building, ArrowRight, ShieldCheck, Loader2, KeyRound } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated: (agent: AgentAccount) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'PHONE_ENTRY' | 'OTP_VERIFY' | 'REGISTER'>('PHONE_ENTRY');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [town, setTown] = useState('');
  const [stateName, setStateName] = useState('Andhra Pradesh');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!phone.trim() || phone.trim().length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      await dbService.sendOTP(phone);
      setMode('OTP_VERIFY');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!otp.trim()) throw new Error('Please enter the OTP');
      
      const agent = await dbService.verifyOTP(phone, otp);
      if (agent) {
        // Agent exists, log them in!
        onAuthenticated(agent);
      } else {
        // Agent does not exist, move to registration
        setMode('REGISTER');
      }
    } catch (err: any) {
      setError(err.message || 'OTP Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!name.trim()) throw new Error('Please enter your full name');
      if (!businessName.trim()) throw new Error('Please enter your business name');
      if (!town.trim()) throw new Error('Please enter your town or city');

      const agent = await dbService.registerAgent({
        name,
        phone,
        password: 'otp-authenticated', // We don't use passwords anymore
        businessName,
        town,
        state: stateName
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
            {mode === 'PHONE_ENTRY' ? 'Welcome to Agent Hub' : mode === 'OTP_VERIFY' ? 'Verify Mobile Number' : 'Complete Profile'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {mode === 'PHONE_ENTRY' ? 'Enter your mobile number to sign in or register.' 
            : mode === 'OTP_VERIFY' ? `Enter the 6-digit OTP sent to ${phone}` 
            : 'You are authenticated! Let us know your details.'}
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

        {/* STEP 1: PHONE ENTRY */}
        {mode === 'PHONE_ENTRY' && (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
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
              {isLoading ? <Loader2 size={16} className="spin" /> : <>Send OTP <ArrowRight size={16} /></>}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#94A3B8' }}>
              For demo/testing, use any 10-digit number.
            </div>
          </form>
        )}

        {/* STEP 2: OTP VERIFY */}
        {mode === 'OTP_VERIFY' && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                6-Digit OTP
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  style={{ width: '100%', paddingLeft: '40px', letterSpacing: '2px', fontWeight: 700 }}
                  required
                  maxLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block"
              style={{ minHeight: '48px', marginTop: '6px', fontSize: '15px' }}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <>Verify & Continue <ArrowRight size={16} /></>}
            </button>

            <button 
              type="button" 
              onClick={() => { setMode('PHONE_ENTRY'); setError(''); setOtp(''); }}
              style={{ background: 'transparent', border: 'none', color: '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
            >
              Change Mobile Number
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#94A3B8' }}>
              (Use <b>123456</b> for this demo)
            </div>
          </form>
        )}

        {/* STEP 3: REGISTER */}
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
          </form>
        )}
      </div>
    </div>
  );
};
