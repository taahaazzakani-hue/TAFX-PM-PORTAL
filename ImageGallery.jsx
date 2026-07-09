import React, { useState } from 'react';
import { call, saveSession } from './api.js';
import { LOGO, TEACH1, TEACH2, TEACH5 } from './assets.js';
import PasswordField from './PasswordField.jsx';

const PORTAL_URL = window.location.origin;

function BrandMark() {
  return (
    <div className="brand-mark">
      <img src={LOGO} alt="TA Forex Institute" />
      <div className="sub">Forex Institute</div>
    </div>
  );
}

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | register | admin
  return (
    <div className="auth-wrap">
      <div className="auth-visual">
        <img className="bg" src={mode === 'register' ? TEACH2 : mode === 'admin' ? TEACH5 : TEACH1} alt="" />
        <div className="caption">
          <div className="rule" />
          <h2>Private Mentorship, structured for mastery.</h2>
          <p>
            A guided path through Beginner, Intermediate and Advanced stages — with
            recorded sessions, notes, and progress tracked every step of the way.
          </p>
        </div>
      </div>
      <div className="auth-form-side">
        {mode === 'login' && <LoginForm onAuthed={onAuthed} setMode={setMode} />}
        {mode === 'register' && <RegisterForm setMode={setMode} />}
        {mode === 'admin' && <AdminForm onAuthed={onAuthed} setMode={setMode} />}
        {mode === 'forgot' && <ForgotForm setMode={setMode} />}
      </div>
    </div>
  );
}

function LoginForm({ onAuthed, setMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const { user } = await call('login', { email, password });
      saveSession(user);
      onAuthed(user);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth-card">
      <BrandMark />
      <h1 className="serif">Welcome back</h1>
      <p className="lead">Sign in to your mentorship portal</p>
      {err && <div className="notice err">{err}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="switch-line" style={{ marginTop: 14 }}>
        <button onClick={() => setMode('forgot')} style={{ color: 'var(--ink-soft)' }}>Forgot password?</button>
      </div>
      <div className="switch-line">
        New here? <button onClick={() => setMode('register')}>Request access</button>
      </div>
      <div className="switch-line" style={{ marginTop: 8 }}>
        <button onClick={() => setMode('admin')} style={{ color: 'var(--ink-faint)' }}>Admin login</button>
      </div>
    </div>
  );
}

function RegisterForm({ setMode }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await call('register', { ...f, portal_url: PORTAL_URL });
      setDone(true);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="auth-card">
        <BrandMark />
        <h1 className="serif">Request received</h1>
        <div className="notice ok" style={{ marginTop: 20 }}>
          Thanks, {f.name.split(' ')[0]}. Your account is pending approval. You'll get an
          email the moment your mentor grants access — then you can sign in.
        </div>
        <button className="btn ghost" onClick={() => setMode('login')}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <BrandMark />
      <h1 className="serif">Request access</h1>
      <p className="lead">For private mentorship students</p>
      {err && <div className="notice err">{err}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Full name</label>
          <input value={f.name} onChange={set('name')} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={f.email} onChange={set('email')} required />
        </div>
        <div className="field">
          <label>Cell number</label>
          <input value={f.phone} onChange={set('phone')} required placeholder="+27…" />
        </div>
        <PasswordField value={f.password} onChange={set('password')} label="Create a password" autoComplete="new-password" minLength={6} />
        <button className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
      </form>
      <div className="switch-line">
        Already approved? <button onClick={() => setMode('login')}>Sign in</button>
      </div>
    </div>
  );
}

function AdminForm({ onAuthed, setMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const { user } = await call('admin_login', { email, password });
      saveSession(user);
      onAuthed(user);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth-card">
      <BrandMark />
      <h1 className="serif">Admin</h1>
      <p className="lead">Mentor control panel</p>
      {err && <div className="notice err">{err}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Admin email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Enter panel'}</button>
      </form>
      <div className="switch-line">
        <button onClick={() => setMode('login')} style={{ color: 'var(--ink-faint)' }}>← Student login</button>
      </div>
    </div>
  );
}


function ForgotForm({ setMode }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await call('forgot_password', { email, portal_url: window.location.origin }); setDone(true); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-card">
      <BrandMark />
      <h1 className="serif">Reset password</h1>
      <p className="lead">We'll email you a reset link</p>
      {done ? (
        <>
          <div className="notice ok">If an account exists for that email, a reset link is on its way. Check your inbox (and spam).</div>
          <button className="btn ghost" onClick={() => setMode('login')}>Back to sign in</button>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <div className="switch-line" style={{ marginTop: 16 }}><button type="button" onClick={() => setMode('login')}>← Back to sign in</button></div>
        </form>
      )}
    </div>
  );
}

export function ResetPassword({ token, onDone }) {
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await call('reset_password', { token, next: pw }); setMsg({ t: 'ok', m: 'Password reset. You can now sign in.' }); setTimeout(onDone, 1500); }
    catch (err) { setMsg({ t: 'err', m: err.message }); } finally { setBusy(false); }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-visual"><img className="bg" src={TEACH1} alt="" /><div className="caption"><div className="rule" /><h2>Set a new password</h2></div></div>
      <div className="auth-form-side">
        <div className="auth-card">
          <BrandMark />
          <h1 className="serif">New password</h1>
          <p className="lead">Choose a strong new password</p>
          {msg && <div className={`notice ${msg.t}`}>{msg.m}</div>}
          <form onSubmit={submit}>
            <PasswordField value={pw} onChange={(e) => setPw(e.target.value)} label="New password" autoComplete="new-password" minLength={6} />
            <button className="btn" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
