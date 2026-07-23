import { useState } from 'react';
import { UserPlus, LogIn as LogInIcon, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

export default function Auth() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(''); setNotice('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Enter your name.'); setBusy(false); return; }
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } }
        });
        if (signUpError) { setError(signUpError.message); setBusy(false); return; }
        setNotice('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(), password
        });
        if (signInError) { setError(signInError.message); setBusy(false); return; }
        // onAuthStateChange in App.jsx picks up the session from here
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    }
    setBusy(false);
  }

  return (
    <div className="ff-login-wrap">
      <div className="ff-aurora"></div>
      <div className="ff-grid-overlay"></div>

      <div className="ff-login-card">
        <div className="ff-lane-intro">
          <div className="blk"></div><div className="blk"></div><div className="blk"></div><div className="blk"></div><div className="blk"></div>
        </div>

        <div className="ff-login-mark-wrap">
          <div className="ff-login-mark-glow"></div>
          <div className="ff-login-mark">F</div>
        </div>

        <div className="ff-hero-eyebrow">Farmley Cold Storage</div>
        <div className="ff-hero-title">FIFO LIVE</div>
        <div className="ff-fade-up" style={{ animationDelay: '0.5s', textAlign: 'center', color: '#a89a83', fontSize: 12.5, marginTop: 6, marginBottom: 22 }}>
          Shared, live compliance tracker
        </div>

        <div className="ff-login-tabs ff-fade-up" style={{ animationDelay: '0.58s' }}>
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
        </div>

        <div className="ff-fade-up" style={{ animationDelay: '0.66s' }}>
          {mode === 'signup' && (
            <>
              <label className="ff-label">Your name</label>
              <input className="ff-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Karan Sirohi" />
            </>
          )}
          <label className="ff-label" style={{ marginTop: 14 }}>Email</label>
          <input className="ff-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          <label className="ff-label" style={{ marginTop: 14 }}>Password</label>
          <input className="ff-input" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="••••••••" />
        </div>

        {error && <div className="ff-error">{error}</div>}
        {notice && <div style={{ color: '#5fae7c', fontSize: 12, marginTop: 10 }}>{notice}</div>}

        <button type="button" className="ff-btn-primary ff-fade-up" style={{ animationDelay: '0.74s', width: '100%', marginTop: 18 }} onClick={submit} disabled={busy}>
          {mode === 'signup' ? <UserPlus size={15} /> : <LogInIcon size={15} />}
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>

        <div className="ff-login-note ff-fade-up" style={{ animationDelay: '0.82s' }}>
          <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Real email/password accounts. Admin access is automatically granted only to the accounts named
            Karan Sirohi and Yogesh Kumar when they sign up — everyone else starts as Team Member.
          </span>
        </div>
      </div>
    </div>
  );
}
