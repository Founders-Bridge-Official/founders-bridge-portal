import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CompanyPicker from '../components/CompanyPicker';

export default function Login() {
  const { signInWithPassword, signInWithOtp, user, companies, loading } = useAuth();
  const [mode, setMode]           = useState('password');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [otpSent, setOtpSent]     = useState(false);
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    if (companies.length > 1) return <CompanyPicker />;
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'password') {
        await signInWithPassword(email, password);
      } else {
        await signInWithOtp(email);
        setOtpSent(true);
      }
    } catch (err) {
      setError(err.message ?? 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (otpSent) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo"><img src="/assets/public_images/foundersbridge-icon.jpeg" alt="Founders Bridge" /></div>
          <h2>Check your email</h2>
          <p className="login-subtitle">We sent a login link to <strong>{email}</strong>.<br />Click the link to sign in.</p>
          <button className="btn-link" onClick={() => { setOtpSent(false); setEmail(''); }}>Use a different email</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo"><img src="/assets/public_images/foundersbridge-icon.jpeg" alt="Founders Bridge" /></div>
        <h1 className="login-title">Client Portal</h1>
        <p className="login-subtitle">Sign in to track your tasks, documents &amp; filings.</p>
        <div className="login-tabs">
          <button className={mode === 'password' ? 'tab active' : 'tab'} onClick={() => { setMode('password'); setError(''); }} type="button">Password</button>
          <button className={mode === 'otp' ? 'tab active' : 'tab'} onClick={() => { setMode('otp'); setError(''); }} type="button">Magic Link</button>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          {mode === 'password' && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>
          )}
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={submitting || loading}>
            {submitting ? 'Please wait…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
          </button>
        </form>
        {mode === 'password' && (
          <p className="login-hint">Forgot your password?{' '}
            <button className="btn-link" onClick={() => setMode('otp')} type="button">Sign in with a magic link instead</button>
          </p>
        )}
      </div>
    </div>
  );
}